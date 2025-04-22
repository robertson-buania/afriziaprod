import { Component, OnInit, OnDestroy, ElementRef, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgbNavModule, NgbAccordionModule, NgbAlertModule, NgbTooltipModule, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { UtilisateurService } from '@/app/core/services/utilisateur.service';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Facture, Colis, STATUT_COLIS, Paiement, TYPE_PAIEMENT, FactureStatus } from '@/app/models/partenaire.model';
import { Subscription, of, Subject, timer, from, Observable } from 'rxjs';
import { PaymentService } from '@/app/core/services/payment.service';
import { AuthService } from '@/app/core/services/auth.service';
import { environment } from '@/environments/environment';
import { takeUntil, take, retry, delay, catchError, switchMap, map, filter, finalize } from 'rxjs/operators';
import { FactureService } from '@/app/core/services/facture.service';
import { ColisService } from '@/app/core/services/colis.service';
import { User } from '@/app/models/user.model';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { StripeService } from '@/app/core/services/stripe.service';
import { HttpClient } from '@angular/common/http';

interface ExtendedPaiement extends Paiement {
  date: string;
  montant: number;
  methode: string;
  statut: 'success' | 'pending' | 'failed';
}

interface BaseFacture extends Omit<Facture, 'colis'> {
  montant: number;
  montantPaye: number;
  paiements: Paiement[];
  dateCreation: string;
  prixRemise?: number;
  statut: FactureStatus;
}

interface ExtendedFacture extends BaseFacture {
  pourcentagePaye: number;
  colis: (string | Colis)[];
  colisObjets?: Colis[];
}

// Types de paiement mobile
enum MOBILE_MONEY_PROVIDER {
  MPESA = 'MPESA',
  ORANGE_MONEY = 'ORANGE_MONEY',
  AIRTEL_MONEY = 'AIRTEL_MONEY'
}

// Interface pour le mode de paiement
interface PaymentMode {
  type: 'CARD' | 'MOBILEMONEY';
  mobileProvider?: MOBILE_MONEY_PROVIDER;
  phoneNumber?: string;
}

// Interface pour la demande de paiement mobile
interface MobilePaymentRequest {
  order: {
    paymentPageId: string;
    customerFullName: string;
    customerPhoneNumber: string;
    customerEmailAddress: string;
    transactionReference: string;
    amount: number;
    currency: string;
    redirectURL: string;
  };
  paymentChannel: {
    channel: string;
    provider: string;
    walletID: string;
  };
}

// Réponse de l'API de paiement mobile
interface MobilePaymentResponse {
  transactionId: string;
  originatingTransactionId: string;
  paymentLink: string;
}

@Component({
  selector: 'app-mes-commandes',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgbNavModule,
    NgbAccordionModule,
    NgbAlertModule,
    NgbTooltipModule,
    FormsModule,
    CurrencyPipe,
    ReactiveFormsModule
  ],
  templateUrl: './mes-commandes.component.html',
  styleUrl: './mes-commandes.component.scss',
})
export class MesCommandesComponent implements OnInit, OnDestroy {
  @ViewChild('stripePaymentModal') stripePaymentModal!: TemplateRef<any>;
  @ViewChild('cardElement') cardElement!: ElementRef;
  @ViewChild('paymentMethodModal') paymentMethodModal!: TemplateRef<any>;
  @ViewChild('mobileMoneyModal') mobileMoneyModal!: TemplateRef<any>;

  factures: ExtendedFacture[] = [];
  facturesPayees: ExtendedFacture[] = [];
  facturesNonPayees: ExtendedFacture[] = [];
  factureSelectionnee: ExtendedFacture | null = null;

  isLoading = true;
  isLoadingColis = false;
  errorMessage = '';
  successMessage = '';
  isPaiementEnCours = false;
  activeTab = 1; // 1: Toutes, 2: Payées, 3: Non payées
  isOffline = false;
  retryCount = 0;
  maxRetries = 3;

  // Variables pour Stripe
  stripe: any;
  elements: any;
  paymentElement: any;
  clientSecret: string = '';
  paymentProcessing = false;
  paymentStatus: 'initial' | 'processing' | 'success' | 'error' = 'initial';

  // États pour le détail d'une facture
  detailsVisible = false;

  private subscriptions: Subscription[] = [];
  private utilisateurConnecte: any | null = null;
  private partenaireId: string | null = null;
  private destroy$ = new Subject<void>();
  private modalRef: NgbModalRef | null = null;

  // Propriétés pour le mode de paiement
  selectedPaymentMode: PaymentMode = { type: 'CARD' };
  mobileMoneyProviders = MOBILE_MONEY_PROVIDER;
  mobileMoneyForm: FormGroup;
  mobilePaymentProcessing = false;
  mobilePaymentError = '';
  mobilePaymentSuccess = '';
  readonly MOBILE_API_URL = 'https://araka-api-uat.azurewebsites.net/api/Pay/paymentrequest';

  constructor(
    private utilisateurService: UtilisateurService,
    private firebaseService: FirebaseService,
    private paymentService: PaymentService,
    private authService: AuthService,
    private factureService: FactureService,
    private colisService: ColisService,
    private modalService: NgbModal,
    private firestore: Firestore,
    private stripeService: StripeService,
    private http: HttpClient,
    private fb: FormBuilder
  ) {
    this.mobileMoneyForm = this.fb.group({
      provider: [MOBILE_MONEY_PROVIDER.MPESA, Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]],
    });
  }

  ngOnInit(): void {
    this.verifierUtilisateurConnecte();
  }

  private verifierUtilisateurConnecte(): void {
    this.subscriptions.push(
      this.utilisateurService.utilisateurCourant$.subscribe(async (utilisateur: any) => {
        this.utilisateurConnecte = utilisateur;
        this.isLoading = true;
        this.errorMessage = '';

        console.log('Utilisateur connecté:', utilisateur);

        if (utilisateur) {
          try {
            // Si l'utilisateur est un partenaire, on récupère directement son ID
            let partenaireId = null;

            if (utilisateur.partenaireId) {
              console.log('PartenaireId trouvé directement:', utilisateur.partenaireId);
              partenaireId = utilisateur.partenaireId;
            } else if (utilisateur.partenaire?.id) {
              console.log('PartenaireId trouvé via objet partenaire:', utilisateur.partenaire.id);
              partenaireId = utilisateur.partenaire.id;
            } else {
              // Si l'utilisateur n'a pas de partenaireId, essayer de le récupérer via l'email
              console.log('Recherche du partenaire par email:', utilisateur.email);
              const partenaire = await this.firebaseService.getPartenaireByEmail(utilisateur.email);

              if (partenaire?.id) {
                console.log('Partenaire trouvé par email, ID:', partenaire.id);
                partenaireId = partenaire.id;

                // Mettre à jour l'utilisateur pour la prochaine fois
                this.firebaseService.updateUtilisateur(utilisateur.id, {
                  partenaireId: partenaire.id
                }).catch(err => console.error('Erreur lors de la mise à jour du partenaireId:', err));
              }
            }

            if (partenaireId) {
              this.partenaireId = partenaireId;
              this.chargerFactures(partenaireId);
            } else {
              console.warn('Aucun partenaireId trouvé pour l\'utilisateur:', utilisateur);
              this.isLoading = false;
              this.errorMessage = 'Aucun compte partenaire associé à votre profil.';
            }
          } catch (error) {
            console.error('Erreur lors de la récupération du partenaire:', error);
            this.isLoading = false;
            this.errorMessage = 'Erreur lors de la récupération de votre profil.';
          }
        } else {
          console.log('Aucun utilisateur connecté');
          this.isLoading = false;
          this.partenaireId = null;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.destroy$.next();
    this.destroy$.complete();
    if (this.modalRef) {
      this.modalRef.close();
    }
    // Nettoyer les éléments Stripe
    if (this.paymentElement) {
      this.paymentElement.unmount();
    }
  }

  private checkFirebaseConnection(): Observable<boolean> {
    return from(getDocs(collection(this.firestore, 'factures'))).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  private retryWithBackoff<T>(operation: () => Observable<T>, maxRetries = 3): Observable<T> {
    return operation().pipe(
      retry({
        count: maxRetries,
        delay: (error, retryCount) => {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          console.log(`Tentative ${retryCount}/${maxRetries} après ${delay}ms`);
          return timer(delay);
        }
      })
    );
  }

  chargerFactures(partenaireId: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Vérifier si l'ID partenaire est valide
    if (!partenaireId) {
      this.errorMessage = 'Aucun utilisateur connecté';
      this.isLoading = false;
      return;
    }

    console.log('Chargement des factures pour le partenaire ID:', partenaireId);

    this.firebaseService.getFacturesByPartenaire(partenaireId)
      .pipe(
        takeUntil(this.destroy$),
        map((factures: Facture[]) => {
          console.log('Factures reçues du service:', factures);
          if (!factures || factures.length === 0) {
            console.log('Aucune facture trouvée');
            return [];
          }

          // Transformer les factures pour faciliter le traitement
          return factures.map(facture => {
            console.log('Traitement de la facture:', facture.id);
            // Gérer les paiements (traiter les dates de Firebase)
            const paiements = (facture.paiements || []).map(paiement => {
              // Si datepaiement est un objet Firestore Timestamp
              let datePaiement = paiement.datepaiement;
              if (datePaiement &&
                  typeof datePaiement === 'object' &&
                  'seconds' in datePaiement &&
                  typeof datePaiement.seconds === 'number') {
                datePaiement = new Date(datePaiement.seconds * 1000);
              }

              return {
                ...paiement,
                datepaiement: datePaiement
              };
            });

            // Calculer le montant total payé
            const montantPaye = (facture.montantPaye !== undefined)
              ? facture.montantPaye
              : paiements.reduce((total, p) => total + (p.montant_paye || 0), 0);

            // Déterminer le statut
            const statut = this.getFactureStatus({
              ...facture,
              montantPaye: montantPaye,
              dateCreation: facture.dateCreation || new Date().toISOString()
            } as BaseFacture);

            // Calculer le pourcentage payé
            const pourcentagePaye = this.calculerPourcentagePaye({
              ...facture,
              montantPaye: montantPaye
            });

            const processedFacture = {
              ...facture,
              paiements: paiements,
              montantPaye: montantPaye,
              statut: statut,
              pourcentagePaye: pourcentagePaye,
              colis: facture.colis || []
            } as ExtendedFacture;

            console.log('Facture traitée:', processedFacture.id, 'Statut:', processedFacture.statut);
            return processedFacture;
          });
        }),
        retry({
          count: 2,
          delay: (error, retryCount) => {
            console.log(`Tentative de chargement des factures (${retryCount}/2)...`);
            return timer(2000 * retryCount);
          }
        }),
        catchError(error => {
          console.error('Erreur lors du chargement des factures:', error);
          this.isOffline = true;
          this.errorMessage = 'Impossible de se connecter au serveur. Veuillez vérifier votre connexion Internet.';
          return of([]);
        })
      )
      .subscribe({
        next: (extendedFactures: ExtendedFacture[]) => {
          console.log('Nombre de factures traitées:', extendedFactures.length);

          // Trier les factures par date de création (les plus récentes d'abord)
          this.factures = extendedFactures.sort((a, b) => {
            if (!a.dateCreation && !b.dateCreation) return 0;
            if (!a.dateCreation) return 1;
            if (!b.dateCreation) return -1;
            return new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime();
          });

          // Filtrer les factures payées et non payées
          this.facturesPayees = this.factures.filter(f => f.montantPaye >= f.montant);
          this.facturesNonPayees = this.factures.filter(f => f.montantPaye < f.montant);

          console.log('Factures totales:', this.factures.length);
          console.log('Factures payées:', this.facturesPayees.length);
          console.log('Factures non payées:', this.facturesNonPayees.length);

          if (extendedFactures.length === 0 && !this.isOffline) {
            this.successMessage = 'Aucune commande trouvée';
          }
          this.isLoading = false;
        },
        error: (error: Error) => {
          console.error('Erreur lors du chargement des factures:', error);
          this.isOffline = true;
          this.errorMessage = 'Impossible de se connecter au serveur. Veuillez vérifier votre connexion Internet.';
          this.isLoading = false;
        }
      });
  }

  retryLoading(): void {
    if (this.partenaireId) {
      this.chargerFactures(this.partenaireId);
    }
  }

  private determinerStatutFacture(facture: Facture): 'PAYEE' | 'PARTIELLEMENT_PAYEE' | 'EN_ATTENTE' {
    if (facture.montantPaye >= facture.montant) {
      return 'PAYEE';
    } else if (facture.montantPaye > 0) {
      return 'PARTIELLEMENT_PAYEE';
    }
    return 'EN_ATTENTE';
  }

  private normaliserPaiements(paiements: Paiement[]): ExtendedPaiement[] {
    return paiements.map(paiement => ({
      ...paiement,
      date: paiement.datepaiement instanceof Date ?
            paiement.datepaiement.toISOString() :
            new Date(paiement.datepaiement).toISOString(),
      montant: paiement.montant_paye,
      methode: this.getTypePaiementLabel(paiement.typepaiement),
      statut: 'success' // Par défaut, on considère que les paiements existants sont réussis
    }));
  }

  getTypePaiementLabel(type: TYPE_PAIEMENT | undefined): string {
    if (!type) return 'Inconnu';

    switch (type) {
      case TYPE_PAIEMENT.CARTE:
        return 'Carte bancaire';
      case TYPE_PAIEMENT.MPESA:
        return 'M-Pesa';
      case TYPE_PAIEMENT.ORANGE_MONEY:
        return 'Orange Money';
      default:
        return 'Inconnu';
    }
  }

  chargerDetailsColis(facture: Facture): void {
    if (!facture.colis || facture.colis.length === 0) return;

    this.isLoadingColis = true;
    const colisIds = facture.colis.map(c => typeof c === 'string' ? c : c.id).filter((id): id is string => id !== undefined);

    this.colisService.getColisByIds(colisIds)
      .pipe(
        takeUntil(this.destroy$),
        retry({
          count: 2,
          delay: (error, retryCount) => {
            console.log(`Tentative de récupération des colis (${retryCount}/2)...`);
            return timer(2000 * retryCount);
          }
        }),
        catchError(error => {
          console.error('Erreur lors du chargement des détails des colis:', error);
          this.errorMessage = 'Impossible de charger les détails des colis. Veuillez réessayer plus tard.';
          return of([]);
        })
      )
      .subscribe({
        next: (colisDetails: Colis[]) => {
          facture.colisObjets = colisDetails;
          this.isLoadingColis = false;
        },
        error: (error: Error) => {
          console.error('Erreur lors du chargement des détails des colis:', error);
          this.errorMessage = 'Une erreur est survenue lors du chargement des détails des colis';
          this.isLoadingColis = false;
        }
      });
  }

  afficherDetailsFacture(facture: Facture): void {
    this.factureSelectionnee = facture as ExtendedFacture;
    this.detailsVisible = true;
    this.chargerDetailsColis(facture);
  }

  masquerDetailsFacture(): void {
    this.detailsVisible = false;
    this.factureSelectionnee = null;
  }

  ouvrirModalPaiement(modal: any, facture: ExtendedFacture): void {
    this.factureSelectionnee = facture;
    this.modalRef = this.modalService.open(modal, { centered: true });
  }

  fermerModalPaiement(): void {
    if (this.modalRef) {
      this.modalRef.close();
      this.modalRef = null;
    }
    this.factureSelectionnee = null;

    // Nettoyer les éléments Stripe
    if (this.paymentElement) {
      this.paymentElement.unmount();
    }
    this.paymentElement = null;
    this.elements = null;
  }

  // Initialiser le paiement Stripe
  async initStripePayment(facture: ExtendedFacture, modal: any): Promise<void> {
    try {
      this.isPaiementEnCours = true;
      this.factureSelectionnee = facture;

      const montantRestant = facture.montant - facture.montantPaye;
      if (montantRestant <= 0) {
        this.errorMessage = 'Cette facture est déjà payée';
        this.isPaiementEnCours = false;
        return;
      }

      // Calculer la commission (10%)
      const montantBase = Number(montantRestant);
      const commission = montantBase * 0.1;
      const totalAvecCommission = montantBase + commission;

      console.log('Détails du paiement:');
      console.log('Montant base:', montantBase);
      console.log('Frais Transaction:', commission);
      console.log('Total avec frais:', totalAvecCommission);

      // Obtenir le client secret
      this.clientSecret = await this.stripeService.createPaymentIntent(totalAvecCommission);

      // Obtenir l'instance de Stripe
      this.stripe = await this.stripeService.getStripeInstance();

      // Créer les éléments Stripe
      this.elements = this.stripe.elements({
        clientSecret: this.clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#007bff',
          },
        },
      });

      // Ouvrir le modal
      this.modalRef = this.modalService.open(modal, { centered: true, backdrop: 'static' });

      // Créer et monter l'élément de paiement avec un délai pour s'assurer que le DOM est prêt
      setTimeout(() => {
        if (this.cardElement) {
          this.paymentElement = this.elements.create('payment', {
            amount: {
              currency: 'usd',
              value: totalAvecCommission * 100, // Stripe attend les montants en centimes
            }
          });
          this.paymentElement.mount(this.cardElement.nativeElement);
          this.isPaiementEnCours = false;
        }
      }, 300);

    } catch (error) {
      console.error('Erreur lors de l\'initialisation du paiement:', error);
      this.errorMessage = 'Une erreur est survenue lors de l\'initialisation du paiement';
      this.isPaiementEnCours = false;
    }
  }

  // Traiter le paiement
  async processPayment(): Promise<void> {
    if (!this.stripe || !this.elements || !this.factureSelectionnee) {
      this.errorMessage = 'Le système de paiement n\'est pas initialisé';
      return;
    }

    this.paymentProcessing = true;
    this.paymentStatus = 'processing';

    try {
      // D'abord soumettre les éléments
      const { error: submitError } = await this.elements.submit();
      if (submitError) {
        this.paymentStatus = 'error';
        this.errorMessage = submitError.message || 'Erreur lors de la validation du formulaire de paiement';
        this.paymentProcessing = false;
        return;
      }

      // Ensuite confirmer le paiement
      const { error, paymentIntent } = await this.stripe.confirmPayment({
        elements: this.elements,
        clientSecret: this.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/mes-commandes`,
        },
        redirect: 'if_required'
      });

      if (error) {
        this.paymentStatus = 'error';
        this.errorMessage = error.message || 'Une erreur est survenue lors du paiement';
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        this.paymentStatus = 'success';
        this.successMessage = 'Paiement effectué avec succès!';

        // Stocker la référence de paiement pour l'utiliser dans updateFactureApresPaiement
        this.stripe.paymentIntent = paymentIntent;

        // Mettre à jour la facture après un paiement réussi
        await this.updateFactureApresPaiement(this.factureSelectionnee.id!);

        // Fermer le modal
        this.fermerModalPaiement();

        // Recharger les factures
        if (this.partenaireId) {
          this.chargerFactures(this.partenaireId);
        }
      }
    } catch (error: any) {
      this.paymentStatus = 'error';
      this.errorMessage = error.message || 'Une erreur est survenue lors du paiement';
    } finally {
      this.paymentProcessing = false;
    }
  }

  // Mettre à jour la facture après un paiement réussi
  private async updateFactureApresPaiement(factureId: string): Promise<void> {
    if (!this.factureSelectionnee) return;

    const montantRestant = this.factureSelectionnee.montant - this.factureSelectionnee.montantPaye;

    // Calculer la commission (10%)
    const commission = montantRestant * 0.1;

    // Créer un nouveau paiement avec un ID unique
    const paiementId = `PAY${new Date().getTime()}`;
    const nouveauPaiement: Paiement = {
      id: paiementId,
      montant_paye: montantRestant,
      typepaiement: TYPE_PAIEMENT.CARTE,
      datepaiement: new Date(),
      id_facture: factureId,
      facture_reference: factureId,
      stripe_reference: this.stripe.paymentIntent?.id || `stripe_${new Date().getTime()}`, // Référence Stripe
      commission: commission // Commission de 10%
    };

    try {

      // Ajouter le paiement à la collection paiements
      await this.firebaseService.addPaiement(nouveauPaiement);

      // Enregistrer le paiement directement dans la mise à jour de la facture
      // puisque le service FirebaseService n'a peut-être pas de méthode addPaiement
      const paiementsActuels = this.factureSelectionnee.paiements || [];

      // Mettre à jour la facture avec le nouveau paiement
      await this.firebaseService.updateFacture(factureId, {
        montantPaye: this.factureSelectionnee.montant, // Maintenant complètement payé
        paiements: [...paiementsActuels, nouveauPaiement]
      });

      // Mettre à jour le statut des colis
      if (this.factureSelectionnee.colisObjets) {
        for (const colis of this.factureSelectionnee.colisObjets) {
          if (colis.id) {
            await this.firebaseService.updateColis(colis.id, {
              statut: STATUT_COLIS.PAYE
            });
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la facture:', error);
      throw error;
    }
  }

  async payerFacture(facture: ExtendedFacture): Promise<void> {
    this.openPaymentMethodModal(facture);
  }

  getClassStatutColis(statut: STATUT_COLIS): string {
    switch (statut) {
      case STATUT_COLIS.EN_ATTENTE_PAIEMENT:
        return 'badge-warning';
      case STATUT_COLIS.PAYE:
        return 'badge-info';
      case STATUT_COLIS.EN_ATTENTE_EXPEDITION:
        return 'badge-primary';
      case STATUT_COLIS.EN_COURS_EXPEDITION:
        return 'badge-info';
      case STATUT_COLIS.EN_ATTENTE_LIVRAISON:
        return 'badge-warning';
      case STATUT_COLIS.LIVRE:
        return 'badge-success';
      case STATUT_COLIS.ANNULE:
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }

  formatStatutColis(statut: STATUT_COLIS): string {
    switch (statut) {
      case STATUT_COLIS.EN_ATTENTE_PAIEMENT:
        return 'En attente de paiement';
      case STATUT_COLIS.PAYE:
        return 'Payé';
      case STATUT_COLIS.EN_ATTENTE_EXPEDITION:
        return 'En attente d\'expédition';
      case STATUT_COLIS.EN_COURS_EXPEDITION:
        return 'En cours d\'expédition';
      case STATUT_COLIS.EN_ATTENTE_LIVRAISON:
        return 'En attente de livraison';
      case STATUT_COLIS.LIVRE:
        return 'Livré';
      case STATUT_COLIS.ANNULE:
        return 'Annulé';
      default:
        return 'Statut inconnu';
    }
  }

  isColisDynamic(colis: any): boolean {
    return typeof colis === 'object' && colis !== null;
  }

  aRemise(facture: Facture): boolean {
    return facture.prixRemise !== undefined && facture.prixRemise < facture.montant;
  }

  getPrixFormate(facture: Facture): string {
    if (!this.aRemise(facture)) return '';
    const remise = ((facture.montant - facture.prixRemise!) / facture.montant * 100).toFixed(0);
    return `${facture.prixRemise!.toFixed(2)} USD (-${remise}%)`;
  }

  formaterPrix(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD'
    }).format(montant);
  }

  // Méthodes manquantes pour corriger les erreurs de compilation
  getClassStatutPaiement(facture: Facture): string {
    if (facture.montantPaye >= facture.montant) {
      return 'badge-success';
    } else if (facture.montantPaye > 0) {
      return 'badge-warning';
    } else {
      return 'badge-danger';
    }
  }

  getStatutFacture(facture: Facture): string {
    if (facture.montantPaye >= facture.montant) {
      return 'Payée';
    } else if (facture.montantPaye > 0) {
      return 'Partiellement payée';
    } else {
      return 'En attente de paiement';
    }
  }

  estFacturePayee(facture: Facture): boolean {
    return facture.montantPaye >= facture.montant;
  }

  onTabChange(tabId: number): void {
    this.activeTab = tabId;
  }

  getStatutFactureExtended(facture: ExtendedFacture): string {
    if (facture.montantPaye >= facture.montant) {
      return 'Payée';
    } else if (facture.montantPaye > 0) {
      const pourcentage = this.calculerPourcentagePaye(facture);
      return `Payée à ${pourcentage}%`;
    }
    return 'En attente de paiement';
  }

  getClassStatutPaiementExtended(facture: ExtendedFacture): string {
    if (facture.montantPaye >= facture.montant) {
      return 'bg-success';
    } else if (facture.montantPaye > 0) {
      return 'bg-warning';
    }
    return 'bg-danger';
  }

  estFacturePayeeExtended(facture: ExtendedFacture): boolean {
    return facture.montantPaye >= facture.montant;
  }

  aRemiseExtended(facture: ExtendedFacture): boolean {
    return !!facture.prixRemise && facture.prixRemise < facture.montant;
  }

  getPrixFormateExtended(facture: ExtendedFacture): string {
    if (facture.prixRemise !== undefined) {
      return this.formaterPrix(facture.prixRemise);
    }
    return this.formaterPrix(facture.montant);
  }

  getFactureStatus(facture: BaseFacture): FactureStatus {
    if (!facture || typeof facture.montant !== 'number') {
      console.warn('Facture invalide ou montant non défini:', facture);
      return FactureStatus.EN_ATTENTE;
    }

    const montantPaye = typeof facture.montantPaye === 'number' ? facture.montantPaye : 0;

    if (montantPaye >= facture.montant) {
      return FactureStatus.PAYEE;
    } else if (montantPaye > 0) {
      return FactureStatus.PARTIELLEMENT_PAYEE;
    }
    return FactureStatus.EN_ATTENTE;
  }

  calculerPourcentagePaye(facture: Facture): number {
    if (!facture.montant || facture.montant === 0) return 0;
    return Math.min(100, Math.round((facture.montantPaye / facture.montant) * 100));
  }

  // Ouvrir modal de sélection du mode de paiement
  openPaymentMethodModal(facture: ExtendedFacture): void {
    this.factureSelectionnee = facture;
    this.modalRef = this.modalService.open(this.paymentMethodModal, { centered: true });
  }

  // Sélectionner le mode de paiement
  selectPaymentMode(mode: 'CARD' | 'MOBILEMONEY'): void {
    this.selectedPaymentMode = { type: mode };

    if (mode === 'CARD') {
      this.modalRef?.close();
      this.initStripePayment(this.factureSelectionnee!, this.stripePaymentModal);
    } else {
      this.modalRef?.close();
      this.openMobileMoneyModal();
    }
  }

  // Ouvrir modal de paiement mobile money
  openMobileMoneyModal(): void {
    this.modalRef = this.modalService.open(this.mobileMoneyModal, { centered: true });

    // Surveillance des changements de fournisseur pour les validations spécifiques
    this.mobileMoneyForm.get('provider')?.valueChanges.subscribe(provider => {
      const phoneControl = this.mobileMoneyForm.get('phoneNumber');
      phoneControl?.setValidators([Validators.required, Validators.pattern(/^[0-9]{9}$/)]);
      phoneControl?.updateValueAndValidity();
    });
  }

  // Vérifier si le numéro de téléphone est valide pour le fournisseur sélectionné
  isValidPhoneForProvider(provider: MOBILE_MONEY_PROVIDER, phone: string): boolean {
    if (!phone || phone.length !== 9) return false;

    const prefix = phone.substring(0, 2);

    switch (provider) {
      case MOBILE_MONEY_PROVIDER.MPESA:
        return ['81', '82', '83'].includes(prefix);
      case MOBILE_MONEY_PROVIDER.ORANGE_MONEY:
        return ['84', '85', '89'].includes(prefix);
      case MOBILE_MONEY_PROVIDER.AIRTEL_MONEY:
        return ['99', '97'].includes(prefix);
      default:
        return false;
    }
  }

  // Obtenir le préfixe valide pour le fournisseur
  getValidPrefixesForProvider(provider: MOBILE_MONEY_PROVIDER): string {
    switch (provider) {
      case MOBILE_MONEY_PROVIDER.MPESA:
        return '81, 82, 83';
      case MOBILE_MONEY_PROVIDER.ORANGE_MONEY:
        return '84, 85, 89';
      case MOBILE_MONEY_PROVIDER.AIRTEL_MONEY:
        return '99, 97';
      default:
        return '';
    }
  }

  // Soumettre le paiement par mobile money
  async submitMobilePayment(): Promise<void> {
    if (this.mobileMoneyForm.invalid) {
      this.mobileMoneyForm.markAllAsTouched();
      return;
    }

    if (!this.factureSelectionnee) {
      this.mobilePaymentError = 'Facture non sélectionnée';
      return;
    }

    const provider = this.mobileMoneyForm.get('provider')!.value;
    const phoneNumber = this.mobileMoneyForm.get('phoneNumber')!.value;

    // Vérifier si le numéro est valide pour le fournisseur
    if (!this.isValidPhoneForProvider(provider, phoneNumber)) {
      this.mobilePaymentError = `Numéro invalide pour ${provider}. Le numéro doit commencer par ${this.getValidPrefixesForProvider(provider)}.`;
      return;
    }

    this.mobilePaymentProcessing = true;
    this.mobilePaymentError = '';

    try {
      const montantRestant = this.factureSelectionnee.montant - this.factureSelectionnee.montantPaye;
      const montantBase = Number(montantRestant);
      const commission = montantBase * 0.1;
      const totalAvecCommission = montantBase + commission;

      // Récupérer les informations de l'utilisateur de manière fiable
      let user;
      try {
        user = await this.getUtilisateurCourantInfo();
      } catch (error) {
        this.mobilePaymentError = 'Veuillez vous connecter pour effectuer ce paiement.';
        this.mobilePaymentProcessing = false;
        return;
      }

      // Préparer les informations client
      const customerName = `${user.nom || ''} ${user.prenom || ''}`.trim() || 'Client';
      const customerEmail = user.email || '';

      // Créer la référence unique pour la transaction
      const transactionReference = `MB-${Date.now()}-${this.factureSelectionnee.id}`;

      // Préparer la requête pour l'API de paiement mobile
      const paymentRequest: MobilePaymentRequest = {
        order: {
          paymentPageId:environment.ARAKA_PAYMENT_PAGE_ID, // À remplacer par votre ID de page de paiement
          customerFullName: customerName,
          customerPhoneNumber: `+243${phoneNumber}`,
          customerEmailAddress: customerEmail,
          transactionReference: transactionReference,
          amount: totalAvecCommission,
          currency: "USD",
          redirectURL: `${window.location.origin}/mes-commandes` // URL de redirection après paiement
        },
        paymentChannel: {
          channel: "MOBILEMONEY",
          provider: provider,
          walletID: `+243${phoneNumber}`
        }
      };

      console.log('Envoi de la requête de paiement mobile:', paymentRequest);

      // Appeler l'API de paiement mobile
      const response = await this.http.post<MobilePaymentResponse>(
        this.MOBILE_API_URL,
        paymentRequest
      ).toPromise();

      if (response && response.paymentLink) {
        // Enregistrer les informations de paiement dans Firestore
        await this.enregistrerPaiementMobile(
          transactionReference,
          totalAvecCommission,
          commission,
          provider,
          phoneNumber
        );

        // Rediriger vers le lien de paiement fourni par l'API
        this.mobilePaymentSuccess = 'Redirection vers la page de paiement...';
        window.location.href = response.paymentLink;
      } else {
        throw new Error('Réponse de paiement invalide');
      }
    } catch (error) {
      console.error('Erreur lors du paiement mobile:', error);
      this.mobilePaymentError = `Erreur lors du paiement: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
    } finally {
      this.mobilePaymentProcessing = false;
    }
  }

  // Enregistrer les informations du paiement mobile
  async enregistrerPaiementMobile(
    reference: string,
    montant: number,
    commission: number,
    provider: string,
    phoneNumber: string
  ): Promise<void> {
    if (!this.factureSelectionnee || !this.factureSelectionnee.id) {
      throw new Error('Facture non valide');
    }

    // Créer l'objet paiement
    const paiement: Paiement = {
      id: reference,
      typepaiement: this.getTypePaiementFromProvider(provider),
      montant_paye: montant - commission,
      facture_reference: this.factureSelectionnee.id,
      id_facture: this.factureSelectionnee.id,
      datepaiement: new Date(),
      stripe_reference: reference,
      commission: commission
    };

    // Enregistrer le paiement en attente
    await this.firebaseService.addPaiementToFacture(
      this.factureSelectionnee.id,
      paiement
    );
  }

  // Convertir le fournisseur mobile en type de paiement
  getTypePaiementFromProvider(provider: string): TYPE_PAIEMENT {
    switch (provider) {
      case MOBILE_MONEY_PROVIDER.MPESA:
        return TYPE_PAIEMENT.MPESA;
      case MOBILE_MONEY_PROVIDER.ORANGE_MONEY:
        return TYPE_PAIEMENT.ORANGE_MONEY;
      case MOBILE_MONEY_PROVIDER.AIRTEL_MONEY:
        return TYPE_PAIEMENT.AIRTEL_MONEY;
      default:
        return TYPE_PAIEMENT.ESPECE;
    }
  }

  // Méthode pour obtenir les informations de l'utilisateur actuel de manière fiable
  private async getUtilisateurCourantInfo(): Promise<any> {
    // Vérifier d'abord si nous avons déjà les informations
    if (this.utilisateurConnecte && this.utilisateurConnecte.id) {
      return this.utilisateurConnecte;
    }

    // Essayer de récupérer les informations directement depuis le service
    const userFromService = await this.utilisateurService.getCurrentUser();
    if (userFromService) {
      this.utilisateurConnecte = userFromService;
      return userFromService;
    }

    // Si cela ne fonctionne pas, essayer via l'observable
    try {
      const userFromObservable = await this.utilisateurService.utilisateurCourant$.pipe(take(1)).toPromise();
      if (userFromObservable) {
        this.utilisateurConnecte = userFromObservable;
        return userFromObservable;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération utilisateur via observable:', error);
    }

    // Dernier recours: vérifier dans le localStorage
    const storedUser = localStorage.getItem('utilisateur_courant');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.id) {
          this.utilisateurConnecte = parsedUser;
          return parsedUser;
        }
      } catch (e) {
        console.error('Erreur lors du parsing utilisateur depuis localStorage:', e);
      }
    }

    // Si aucune méthode ne fonctionne, lancer une erreur
    throw new Error('Utilisateur non connecté ou impossible de récupérer les informations');
  }
}

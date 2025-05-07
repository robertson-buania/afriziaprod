import { Component, OnInit, OnDestroy, ElementRef, ViewChild, TemplateRef, HostListener, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgbNavModule, NgbAccordionModule, NgbAlertModule, NgbTooltipModule, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { UtilisateurService } from '@/app/core/services/utilisateur.service';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Facture, Colis, STATUT_COLIS, Paiement, TYPE_PAIEMENT, FactureStatus, STATUT_PAIEMENT, STATUT_PAIEMENT_ARAKA, TYPE_COLIS_EXPORTE } from '@/app/models/partenaire.model';
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
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { PaiementService } from '@/app/shared/service/paiement.service';
import { ArakaPaymentService } from '@/app/core/services/araka-payment.service';
import { set } from 'ramda';

interface ExtendedPaiement extends Paiement {
  date: string;
  montant: number;
  methode: string;
  statut: STATUT_PAIEMENT;
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
  colis: Colis[];
  colisObjets?: Colis[];
}

// Types de paiement mobile
enum MOBILE_MONEY_PROVIDER {
  MPESA = 'MPESA',
  ORANGE = 'ORANGE',
  AIRTEL = 'AIRTEL'
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
  importInProgress = signal(false);

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: BeforeUnloadEvent) {
    if (this.importInProgress()) {
      $event.preventDefault();
      $event.returnValue = 'Des données sont en cours d\'importation. Êtes-vous sûr de vouloir quitter cette page ?';
      return $event.returnValue;
    }
    return true;
  }
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
  processpaymentProcessing = false;
  readonly MOBILE_API_URL = 'https://araka-api-uat.azurewebsites.net/api/Pay/paymentrequest';

  private mobileMoneyModalRef: NgbModalRef | null = null;

  public STATUT_PAIEMENT = STATUT_PAIEMENT;

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
    private paiementService: PaiementService,
    private fb: FormBuilder,
    private arakaPaymentService: ArakaPaymentService
  ) {
    this.mobileMoneyForm = this.fb.group({
      provider: [MOBILE_MONEY_PROVIDER.MPESA, Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]],
    });
  }

  ngOnInit(): void {
    this.verifierUtilisateurConnecte();

    // Vérifier les paiements mobiles en attente
   // this.verifierPaiementsEnAttente();
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


    this.firebaseService.getFacturesByPartenaire(partenaireId)
      .pipe(
        takeUntil(this.destroy$),
        map((factures: Facture[]) => {


          if (!factures || factures.length === 0) {

            return [];
          }

          // Transformer les factures pour faciliter le traitement
          return factures.map(facture => {
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

            const montantPaye = (facture.montantPaye !== undefined)
              ? facture.montantPaye
              : paiements.reduce((total, p) => (p.statut === STATUT_PAIEMENT.CONFIRME )? total + (p.montant_paye || 0) : total, 0);
              facture.paiements.forEach(async paiement=>{
                if(paiement.statut === STATUT_PAIEMENT.EN_ATTENTE ){

                 // console.log('Paiement en attente:', paiement);
                  this.startPaymentStatusCheck(paiement.transaction_id,paiement.transaction_reference);
               //  this.updatePaiementByReferenceArakaId(paiement.transaction_id,paiement.transaction_reference);
                }
              })
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

            return processedFacture;
          });
        }),
        retry({
          count: 2,
          delay: (error, retryCount) => {
            return timer(2000 * retryCount);
          }
        }),
        catchError(error => {
          this.isOffline = true;
          this.errorMessage = 'Impossible de se connecter au serveur. Veuillez vérifier votre connexion Internet.';
          return of([]);
        })
      )
      .subscribe({
        next: (extendedFactures: ExtendedFacture[]) => {

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


          if (extendedFactures.length === 0 && !this.isOffline) {
            this.successMessage = 'Aucune commande trouvée';
          }
          this.isLoading = false;
        },
        error: (error: Error) => {
         // console.error('Erreur lors du chargement des factures:', error);
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
      statut: STATUT_PAIEMENT.CONFIRME // Par défaut, on considère que les paiements existants sont réussis
    }));
  }

  getTypePaiementLabel(type: TYPE_PAIEMENT | undefined): string {
    if (!type) return 'Inconnu';

    switch (type) {
      case TYPE_PAIEMENT.CARTE:
        return 'Carte bancaire';
      case TYPE_PAIEMENT.MPESA:
        return 'M-Pesa';
      case TYPE_PAIEMENT.ORANGE:
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
    this.modalRef = this.modalService.open(modal, { centered: true,backdrop: 'static' });
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
      const commission = montantBase > 50 ? montantBase * 0.05: montantBase * 0.075;
      const totalAvecCommission = montantBase + commission;

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

    this.paiementService.loginWithCredential().subscribe( async(responseToken) => {

      if(responseToken && responseToken.token){
        console.log('Connexion avec succès:', responseToken);
      }

    })
    // if (!this.stripe || !this.elements || !this.factureSelectionnee) {
    //   this.errorMessage = 'Le système de paiement n\'est pas initialisé';
    //   return;
    // }

    // this.paymentProcessing = true;
    // this.paymentStatus = 'processing';

    // try {
    //   // D'abord soumettre les éléments
    //   const { error: submitError } = await this.elements.submit();
    //   if (submitError) {
    //     this.paymentStatus = 'error';
    //     this.errorMessage = submitError.message || 'Erreur lors de la validation du formulaire de paiement';
    //     this.paymentProcessing = false;
    //     return;
    //   }

    //   // Ensuite confirmer le paiement
    //   const { error, paymentIntent } = await this.stripe.confirmPayment({
    //     elements: this.elements,
    //     clientSecret: this.clientSecret,
    //     confirmParams: {
    //       return_url: `${window.location.origin}/mes-commandes`,
    //     },
    //     redirect: 'if_required'
    //   });

    //   if (error) {
    //     this.paymentStatus = 'error';
    //     this.errorMessage = error.message || 'Une erreur est survenue lors du paiement';
    //   } else if (paymentIntent && paymentIntent.status === 'succeeded') {
    //     this.paymentStatus = 'success';
    //     this.successMessage = 'Paiement effectué avec succès!';

    //     // Stocker la référence de paiement pour l'utiliser dans updateFactureApresPaiement
    //     this.stripe.paymentIntent = paymentIntent;

    //     // Mettre à jour la facture après un paiement réussi
    //     await this.updateFactureApresPaiement(this.factureSelectionnee.id!);

    //     // Fermer le modal
    //     this.fermerModalPaiement();

    //     // Recharger les factures
    //     if (this.partenaireId) {
    //       this.chargerFactures(this.partenaireId);
    //     }
    //   }
    // } catch (error: any) {
    //   this.paymentStatus = 'error';
    //   this.errorMessage = error.message || 'Une erreur est survenue lors du paiement';
    // } finally {
    //   this.paymentProcessing = false;
    // }
  }

  // Mettre à jour la facture après un paiement réussi
  // private async updateFactureApresPaiement(factureId: string): Promise<void> {
  //   if (!this.factureSelectionnee) return;

  //   const montantRestant = this.factureSelectionnee.montant - this.factureSelectionnee.montantPaye;

  //   // Calculer la commission (10%)
  //   const commission = montantRestant > 50 ? montantRestant * 0.05: montantRestant * 0.075;

  //   // Créer un nouveau paiement avec un ID unique
  //   const paiementId = `PAY${new Date().getTime()}`;
  //   const nouveauPaiement: Paiement = {
  //     id: paiementId,
  //     montant_paye: montantRestant,
  //     typepaiement: TYPE_PAIEMENT.CARTE,
  //     datepaiement: new Date(),
  //     id_facture: factureId,
  //     facture_reference: factureId,
  //     transaction_reference: this.stripe.paymentIntent?.id || `stripe_${new Date().getTime()}`, // Référence Stripe
  //     transaction_id: this.stripe.paymentIntent?.id || `stripe_${new Date().getTime()}`, // Référence Stripe
  //     commission: commission, // Commission de 10%
  //     statut: STATUT_PAIEMENT.CONFIRME
  //   };

  //   try {

  //     // Ajouter le paiement à la collection paiements
  //     await this.firebaseService.addPaiement(nouveauPaiement);

  //     // Enregistrer le paiement directement dans la mise à jour de la facture
  //     // puisque le service FirebaseService n'a peut-être pas de méthode addPaiement
  //     const paiementsActuels = this.factureSelectionnee.paiements || [];

  //     // Mettre à jour la facture avec le nouveau paiement
  //     await this.firebaseService.updateFacture(factureId, {
  //       montantPaye: this.factureSelectionnee.montant, // Maintenant complètement payé
  //       paiements: [...paiementsActuels, nouveauPaiement]
  //     });

  //     // Mettre à jour le statut des colis
  //     if (this.factureSelectionnee.colisObjets) {
  //       for (const colis of this.factureSelectionnee.colisObjets) {
  //         if (colis.id) {
  //           await this.firebaseService.updateColis(colis.id, {
  //             statut: STATUT_COLIS.PAYE
  //           });
  //         }
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Erreur lors de la mise à jour de la facture:', error);
  //     throw error;
  //   }
  // }

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
    if (facture.paiements.some(p => p.statut === STATUT_PAIEMENT.EN_ATTENTE)) {
      return 'En attente de confirmation';
    }else
    if (facture.montantPaye >= facture.montant) {
      return 'Payée';
    } else if (facture.montantPaye > 0) {
      const pourcentage = this.calculerPourcentagePaye(facture);
      return `Payée à ${pourcentage}%`;
    } else
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
    this.modalRef = this.modalService.open(this.paymentMethodModal, { centered: true ,backdrop: 'static'});
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
    this.mobileMoneyModalRef = this.modalService.open(this.mobileMoneyModal,{backdrop: 'static'});
  }

  closeMobileMoneyModal(): void {
    if (this.mobileMoneyModalRef) {
      this.mobileMoneyModalRef.dismiss();
      this.mobileMoneyModalRef = null;
    }
  }

  // Vérifier si le numéro de téléphone est valide pour le fournisseur sélectionné
  isValidPhoneForProvider(provider: MOBILE_MONEY_PROVIDER, phone: string): boolean {
    if (!phone || phone.length !== 9) return false;

    const prefix = phone.substring(0, 2);

    switch (provider) {
      case MOBILE_MONEY_PROVIDER.MPESA:
        return ['81', '82', '83'].includes(prefix);
      case MOBILE_MONEY_PROVIDER.ORANGE:
        return ['84', '85', '89'].includes(prefix);
      case MOBILE_MONEY_PROVIDER.AIRTEL:
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
      case MOBILE_MONEY_PROVIDER.ORANGE:
        return '84, 85, 89';
      case MOBILE_MONEY_PROVIDER.AIRTEL:
        return '99, 97';
      default:
        return '';
    }
  }

  formaterMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD'
    }).format(Number(Number(montant).toFixed(4)));
  }
  // Soumettre le paiement par mobile money
  async submitMobilePayment(): Promise<void> {
    // Démarrer le processus de paiement
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

    const montantBase = Number(this.factureSelectionnee.montant - this.factureSelectionnee.montantPaye);
    const commission = montantBase > 50 ? montantBase * 0.05 : montantBase * 0.075;
    const totalAvecCommission = Number(montantBase + commission).toFixed(4);

    // Prepare the payment data
    const paymentData = {
      provider,
      phoneNumber,
      amount: totalAvecCommission,
      customerName: `${this.utilisateurConnecte.nom} ${this.utilisateurConnecte.prenom}`,
      customerEmail: this.utilisateurConnecte.email,
      transactionReference: `MB-${Date.now()}-${this.factureSelectionnee.id}`,
      montantBase:montantBase // Utiliser l'URL actuelle pour éviter le rechargement
    };


    try {
      this.processpaymentProcessing = true;

      const response = await this.arakaPaymentService.processPayment(paymentData).toPromise();

      if (response.statusCode == '202') {
        this.mobilePaymentSuccess = 'Paiement en attente de confirmation dans les 5 minutes : Veuillez confirmer ce paiement sur votre appareil...';
        this.firebaseService.paiements_transactions_data({...response,source:"COMMANDES"})

        this.updateFactureApresConfirmationMobile(this.factureSelectionnee.id!, response.originatingTransactionId, response.transactionId, provider, montantBase, commission);


        //  this.startPaymentStatusCheck(response.transactionId, response.originatingTransactionId);
      } else {
        this.processpaymentProcessing = false;
        this.mobilePaymentError = 'Erreur inattendue lors du traitement du paiement.';
      }
//       if (response && response.transactionId) {
//         // Stocker les informations de paiement en cours dans le localStorage
//         const paymentInfo = {
//           transactionId: response?.transactionId,
//           factureId: this.factureSelectionnee.id,
//           timestamp: Date.now()
//         };
//       //  localStorage.setItem(`pending_payment_${response.transactionId}`, JSON.stringify(paymentInfo));
//         this.mobilePaymentSuccess = 'Paiement en attente de confirmation dans les 5 minutes : Veuillez confirmer ce paiement sur votre appareil...';
//  // Démarrer la vérification du statut
//        // this.startPaymentStatusCheck(response.transactionId, '', this.mobileMoneyModal);
//       }

    } catch (error) {
      this.processpaymentProcessing = false;
     // console.error('Payment error:', error);
      this.mobilePaymentError = 'Une erreur est survenue lors du traitement du paiement.';
    } finally {
      this.mobilePaymentProcessing = false;
    }
  }

  private async startPaymentStatusCheck(transactionId: string, originatingTransactionId: string): Promise<void> {
    try {
      this.processpaymentProcessing = true;
      const statusResponse = await this.arakaPaymentService.checkTransactionStatusById(transactionId).toPromise();

      if (statusResponse.statusCode == '200' && statusResponse.status == 'APPROVED') {
        this.firebaseService.paiements_transactions_data({...statusResponse,source:"COMMANDES"})

      //  this.processpaymentProcessing = false;
    //    this.mobilePaymentSuccess = 'Paiement confirmé avec succès!';
       // if (this.factureSelectionnee) {
          this.updatePaiementByReferenceArakaId(transactionId, originatingTransactionId);

         //await this.updateFactureApresConfirmationMobile(this.factureSelectionnee.id!, statusResponse.transactionId, statusResponse.originatingTransactionId, statusResponse.provider, statusResponse.amount, statusResponse.commission);
        // } else {
        //   this.processpaymentProcessing = false;
        //   console.error('Facture selectionnée est null lors de la mise à jour après confirmation.');
        // }
      } else if (statusResponse.statusCode == '202') {
     //   this.mobilePaymentSuccess = 'Transaction en attente de confirmation. Veuillez confirmer le paiement sur votre appareil.';
      }else
      if (statusResponse.statusCode == '400' || statusResponse.status == 'DECLINED') {

       // this.processpaymentProcessing = false;
        this.updatePaiementByReferenceArakaId2(transactionId, originatingTransactionId, STATUT_PAIEMENT.ANNULE);

      //  this.mobilePaymentError = 'Le paiement a été refusé.';
      }else
      if (statusResponse.statusCode == '500') {

        //this.processpaymentProcessing = false;
        this.updatePaiementByReferenceArakaId2(transactionId, originatingTransactionId, STATUT_PAIEMENT.ANNULE);

   //     this.mobilePaymentError = 'Erreur lors de la vérification du statut du paiement.';
      }
    } catch (error) {
       console.error('Error checking payment status:', error);
    }
  }

 private async updatePaiementByReferenceArakaId(transactionId: string, originatingTransactionId: string) {

  const factureId = originatingTransactionId.split('-')[2];

    const facture = await this.firebaseService.getFactureById(factureId);

      if (!facture) {
        console.error(`Facture non trouvée: ${factureId}`);
        return;
      }
      let montantPaye = 0
      // Mettre à jour le statut des paiements existants qui sont en attente
      const paiementsUpdated = facture.paiements.map((paiement) => {
        if (
          paiement.transaction_reference == originatingTransactionId &&
          paiement.transaction_id == transactionId
        ) {
          this.firebaseService.updatePaiementByTransactionReference(
            paiement.transaction_reference!,
            {
              ...paiement,
              statut: STATUT_PAIEMENT.CONFIRME,
              statut_araka: STATUT_PAIEMENT_ARAKA.APPROVED,
            }
          )
          montantPaye = Number(paiement.montant_paye)
          return {
            ...paiement,
            statut: STATUT_PAIEMENT.CONFIRME,
            statut_araka: STATUT_PAIEMENT_ARAKA.APPROVED,
          }
        }
        return paiement
      })
      const datepaiement = new Date().toISOString()
      const all_Colis_facts = []
      const montantPayeFAct = paiementsUpdated.reduce(
        (acc, p) =>
          p.statut === STATUT_PAIEMENT.CONFIRME
            ? acc + (p.montant_paye || 0)
            : acc,
        0
      )
      const montant = facture.montant
      facture.colis.forEach((colis) => {
        all_Colis_facts.push({
          ...colis,
          derniere_date_paiement: datepaiement,
          statut:
            montantPayeFAct >= montant
              ? STATUT_COLIS.PAYE
              : STATUT_COLIS.PARTIELLEMENT_PAYEE,
        })
      })

      // Mettre à jour la facture
      await this.firebaseService.updateFacture(factureId, {
        paiements: paiementsUpdated,
        montantPaye: Number(facture.montantPaye) + montantPaye, // Considérer comme entièrement payée
      })

      // Mettre à jour le statut des colis
      if (facture.colis && facture.colis.length > 0) {
        const montantPaye = facture.paiements.reduce(
          (acc, p) =>
            p.statut === STATUT_PAIEMENT.CONFIRME
              ? acc + (p.montant_paye || 0)
              : acc,
          0
        )
        const montant = facture.montant

        for (const colisId of facture.colis) {
          //if (typeof colisId === 'string') {

          await this.firebaseService.updateColis(colisId.id!, {
            derniere_date_paiement: datepaiement,
            statut:
              montantPaye >= montant
                ? STATUT_COLIS.PAYE
                : STATUT_COLIS.PARTIELLEMENT_PAYEE,
                export:TYPE_COLIS_EXPORTE.NON_EXPORTE
          })
          // }
        }
      }

  }

  private async updatePaiementByReferenceArakaId2(transactionId: string, originatingTransactionId: string, statut: STATUT_PAIEMENT) {

    const factureId = originatingTransactionId.split('-')[2];

      const facture = await this.firebaseService.getFactureById(factureId);

      //console.log('Facture:', facture);
        if (!facture) {
          console.error(`Facture non trouvée: ${factureId}`);
          return;
        }
       // let montantPaye=0;
        // Mettre à jour le statut des paiements existants qui sont en attente
        const paiementsUpdated = facture.paiements.map(paiement => {


          if (paiement.transaction_reference && paiement.transaction_id==transactionId) {
          //  montantPaye+=paiement.montant_paye;
          this.firebaseService.updatePaiementByTransactionReference(paiement.transaction_reference!, {
            ...paiement,
            statut: STATUT_PAIEMENT.ANNULE,
            statut_araka:STATUT_PAIEMENT_ARAKA.DECLINED
          });
            return {
              ...paiement,
              statut: STATUT_PAIEMENT.ANNULE,
              statut_araka:STATUT_PAIEMENT_ARAKA.DECLINED
            };
          }
          return paiement;
        });

        // Mettre à jour la facture
        await this.firebaseService.updateFacture(factureId, {
          paiements: paiementsUpdated,
          //montantPaye: facture.montantPaye-montantPaye, // Considérer comme entièrement payée
        });

        // Mettre à jour le statut des colis


    }
  // Enregistrer les informations du paiement mobile


  // Convertir le fournisseur mobile en type de paiement
  getTypePaiementFromProvider(provider: string): TYPE_PAIEMENT {
    switch (provider) {
      case MOBILE_MONEY_PROVIDER.MPESA:
        return TYPE_PAIEMENT.MPESA;
      case MOBILE_MONEY_PROVIDER.ORANGE:
        return TYPE_PAIEMENT.ORANGE;
      case MOBILE_MONEY_PROVIDER.AIRTEL:
        return TYPE_PAIEMENT.AIRTEL;
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


  // Mettre à jour la facture après confirmation d'un paiement mobile
  private async updateFactureApresConfirmationMobile(factureId: string, transaction_reference: any, transaction_id: any, provider: string, montantRestant: number, commission: number): Promise<void> {
    try {
      this.processpaymentProcessing = true;
      // Récupérer la facture actuelle
      const paiementId = `PAY${new Date().getTime()}`;
      const nouveauPaiement: Paiement = {
        id: paiementId,
        montant_paye: montantRestant,
        typepaiement: this.getTypePaiementFromProvider(provider),
        datepaiement: new Date(),
        id_facture: factureId,
        facture_reference: factureId,
        transaction_reference: transaction_reference, // Référence Stripe
        transaction_id: transaction_id, // Référence Stripe
        commission: commission, // Commission de 10%,
        statut: STATUT_PAIEMENT.EN_ATTENTE,
        statut_araka:STATUT_PAIEMENT_ARAKA.ACCEPTED
      };


      await this.firebaseService.addPaiement(nouveauPaiement);
      const paiementsActuels = this.factureSelectionnee?.paiements || [];
      await this.firebaseService.updateFacture(this.factureSelectionnee?.id!, {
       // montantPaye: (this.factureSelectionnee?.montantPaye || 0) + montantRestant,
        paiements: [...paiementsActuels, nouveauPaiement]
      });
      this.modalService.dismissAll()
      setTimeout(() => {
        this.startPaymentStatusCheck(transaction_id, transaction_reference);
      }, 20000);

      // if (this.factureSelectionnee?.colisObjets) {
      //   for (const colis of this.factureSelectionnee.colisObjets) {
      //     if (colis.id) {
      //       await this.firebaseService.updateColis(colis.id, {
      //         statut: STATUT_COLIS.PAYE
      //       });
      //     }
      //   }
      // }

      if (this.partenaireId) {
        this.chargerFactures(this.partenaireId);
      }
    //  console.log(`Facture ${factureId} mise à jour avec succès après confirmation du paiement mobile`);
      this.processpaymentProcessing = false;
    } catch (error) {
      //console.error(`Erreur lors de la mise à jour de la facture ${factureId}:`, error);
      this.processpaymentProcessing = false;
    }
  }
}

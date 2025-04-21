import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
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
import { FormsModule } from '@angular/forms';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { StripeService } from '@/app/core/services/stripe.service';

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
    CurrencyPipe
  ],
  templateUrl: './mes-commandes.component.html',
  styleUrl: './mes-commandes.component.scss',
  providers: [StripeService]
})
export class MesCommandesComponent implements OnInit, OnDestroy {
  @ViewChild('stripePaymentModal') stripePaymentModal!: ElementRef;
  @ViewChild('cardElement') cardElement!: ElementRef;

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
  private utilisateurConnecte: User | null = null;
  private destroy$ = new Subject<void>();
  private modalRef: NgbModalRef | null = null;

  constructor(
    private utilisateurService: UtilisateurService,
    private firebaseService: FirebaseService,
    private paymentService: PaymentService,
    private authService: AuthService,
    private factureService: FactureService,
    private colisService: ColisService,
    private modalService: NgbModal,
    private firestore: Firestore,
    private stripeService: StripeService
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.authService.currentUser$.pipe(
        takeUntil(this.destroy$),
        filter((user): user is User => !!user),
        switchMap(user => {
          this.utilisateurConnecte = user;
          return this.checkFirebaseConnection();
        }),
        switchMap(isConnected => {
          if (!isConnected) {
            throw new Error('Pas de connexion à Firebase');
          }
          if (!this.utilisateurConnecte?.id) {
            throw new Error('ID utilisateur non disponible');
          }


          return this.firebaseService.getFacturesByPartenaire(this.utilisateurConnecte.id).pipe(
            map((factures: Facture[]) => {
              if (!factures || factures.length === 0) {
                return [];
              }
              return factures.map(facture => ({
                ...facture,
                statut: this.determinerStatutFacture(facture),
                colis: facture.colis || [],
                colisObjets: facture.colisObjets || []
              })) as ExtendedFacture[];
            })
          );
        })
      ).subscribe({
        next: (extendedFactures: ExtendedFacture[]) => {
          this.factures = extendedFactures;
          this.facturesPayees = extendedFactures.filter(f => f.montantPaye >= f.montant);
          this.facturesNonPayees = extendedFactures.filter(f => f.montantPaye < f.montant);
          this.isLoading = false;
        },
        error: (error: Error) => {
          console.error('Erreur lors du chargement des factures:', error);
          this.isLoading = false;
          this.errorMessage = 'Impossible de charger les factures. Veuillez vérifier votre connexion.';
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

  chargerFactures(user: User): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.factureService.getFacturesByUser(user.id)
      .pipe(
        takeUntil(this.destroy$),
        map((factures: Facture[]) => {
          if (!factures || factures.length === 0) {
            return [];
          }
          return factures.map(facture => ({
            ...facture,
            statut: this.determinerStatutFacture(facture),
            colis: facture.colis || [],
            colisObjets: facture.colisObjets || []
          })) as ExtendedFacture[];
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
          this.factures = extendedFactures;
          this.facturesPayees = extendedFactures.filter(f => f.montantPaye >= f.montant);
          this.facturesNonPayees = extendedFactures.filter(f => f.montantPaye < f.montant);

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
    if (this.utilisateurConnecte) {
      this.chargerFactures(this.utilisateurConnecte);
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

      // Obtenir le client secret
      this.clientSecret = await this.stripeService.createPaymentIntent(montantRestant);

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
          this.paymentElement = this.elements.create('payment');
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

        // Mettre à jour la facture après un paiement réussi
        await this.updateFactureApresPaiement(this.factureSelectionnee.id!);

        // Fermer le modal
        this.fermerModalPaiement();

        // Recharger les factures
        if (this.utilisateurConnecte) {
          this.chargerFactures(this.utilisateurConnecte);
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

    // Créer un nouveau paiement avec un ID unique
    const paiementId = `PAY${new Date().getTime()}`;
    const nouveauPaiement: Paiement = {
      id: paiementId,
      montant_paye: montantRestant,
      typepaiement: TYPE_PAIEMENT.CARTE,
      datepaiement: new Date(),
      id_facture: factureId,
      facture_reference: factureId
    };

    try {
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
    try {
      // Vérifier si la facture n'est pas déjà payée
      const montantRestant = facture.montant - facture.montantPaye;
      if (montantRestant <= 0) {
        this.errorMessage = 'Cette facture est déjà payée';
        return;
      }

      if (!this.stripePaymentModal) {
        this.errorMessage = 'Erreur lors de l\'initialisation du formulaire de paiement';
        return;
      }

      // Initialiser le paiement Stripe et ouvrir le modal
      await this.initStripePayment(facture, this.stripePaymentModal);

    } catch (error) {
      console.error('Erreur lors du processus de paiement:', error);
      this.errorMessage = 'Une erreur est survenue lors du processus de paiement';
      this.isPaiementEnCours = false;
    }
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
    return new Intl.NumberFormat('en-US', {
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
    switch (facture.statut) {
      case 'EN_ATTENTE':
        return 'En attente';
      case 'PAYEE':
        return 'Payée';
      case 'ANNULEE':
        return 'Annulée';
      default:
        return 'Statut inconnu';
    }
  }

  getClassStatutPaiementExtended(facture: ExtendedFacture): string {
    switch (facture.statut) {
      case 'EN_ATTENTE':
        return 'bg-warning text-dark';
      case 'PAYEE':
        return 'bg-success';
      case 'ANNULEE':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  estFacturePayeeExtended(facture: ExtendedFacture): boolean {
    return facture.statut === 'PAYEE';
  }

  aRemiseExtended(facture: ExtendedFacture): boolean {
    return !!facture.prixRemise && facture.prixRemise < facture.montant;
  }

  getPrixFormateExtended(facture: ExtendedFacture): string {
    const montant = this.aRemiseExtended(facture) ? facture.prixRemise : facture.montant;
    // Créer une nouvelle instance de CurrencyPipe ici au lieu d'utiliser l'instance injectée
    const currencyPipe = new CurrencyPipe('en-US');
    return currencyPipe.transform(montant, 'USD') || '';
  }

  getFactureStatus(facture: BaseFacture): FactureStatus {
    if (facture.montantPaye >= facture.montant) {
      return FactureStatus.PAYEE;
    } else if (facture.montantPaye > 0) {
      return FactureStatus.PARTIELLEMENT_PAYEE;
    }
    return FactureStatus.EN_ATTENTE;
  }

  calculerPourcentagePaye(facture: BaseFacture): number {
    if (facture.montant === 0) return 0;
    return (facture.montantPaye / facture.montant) * 100;
  }
}

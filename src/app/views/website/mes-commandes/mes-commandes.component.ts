import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgbNavModule, NgbAccordionModule, NgbAlertModule, NgbTooltipModule, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { UtilisateurService } from '@/app/core/services/utilisateur.service';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Facture, Colis, STATUT_COLIS, Paiement, TYPE_PAIEMENT } from '@/app/models/partenaire.model';
import { Subscription, of, Subject, timer, from, Observable } from 'rxjs';
import { PaymentService } from '@/app/core/services/payment.service';
import { AuthService } from '@/app/core/services/auth.service';
import { CinetPayService, CinetPayResponse } from '@/app/core/services/cinetpay.service';
import { environment } from '@/environments/environment';
import { takeUntil, take, retry, delay, catchError, switchMap, map, filter, finalize } from 'rxjs/operators';
import { FactureService } from '@/app/core/services/facture.service';
import { ColisService } from '@/app/core/services/colis.service';
import { User } from '@/app/models/user.model';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';

interface ExtendedPaiement extends Paiement {
  date: string;
  montant: number;
  methode: string;
  statut: 'success' | 'pending' | 'failed';
}

type FactureStatus = 'PAYEE' | 'PARTIELLEMENT_PAYEE' | 'EN_ATTENTE';

interface BaseFacture extends Omit<Facture, 'colis'> {
  montant: number;
  montantPaye: number;
  paiements: Paiement[];
  dateCreation?: string;
  partenaireId?: string;
  prixRemise?: number;
}

interface ExtendedFacture extends BaseFacture {
  statut: FactureStatus;
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
    FormsModule
  ],
  templateUrl: './mes-commandes.component.html',
  styleUrl: './mes-commandes.component.scss'
})
export class MesCommandesComponent implements OnInit, OnDestroy {
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
    private cinetPayService: CinetPayService,
    private factureService: FactureService,
    private colisService: ColisService,
    private modalService: NgbModal,
    private firestore: Firestore
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
  }

  payerFactureCinetPay(facture: ExtendedFacture): void {
    if (!facture) {
      this.errorMessage = 'Aucune facture sélectionnée';
      return;
    }

    const montantRestant = facture.montant - facture.montantPaye;
    if (montantRestant <= 0) {
      this.errorMessage = 'Cette facture est déjà payée';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.cinetPayService.initializePayment({
      amount: montantRestant,
      currency: 'XAF',
      description: `Paiement de la facture ${facture.id}`,
      return_url: `${environment.apiUrl}/paiement/succes`,
      cancel_url: `${environment.apiUrl}/paiement/annule`,
      notify_url: `${environment.apiUrl}/paiement/notification`,
      channels: 'ALL',
      lang: 'fr'
    }).pipe(
      take(1),
      retry({
        count: 2,
        delay: (error, retryCount) => {
          console.log(`Tentative d'initialisation du paiement (${retryCount}/2)...`);
          return timer(2000 * retryCount);
        }
      }),
      catchError(error => {
        console.error('Erreur lors de l\'initialisation du paiement:', error);
        this.errorMessage = 'Erreur lors de l\'initialisation du paiement. Veuillez réessayer plus tard.';
        return of(null);
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe(response => {
      if (response && response.data?.payment_url) {
        window.location.href = response.data.payment_url;
      } else {
        this.errorMessage = 'Impossible d\'initialiser le paiement';
      }
    });
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
      currency: 'CDF'
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
}

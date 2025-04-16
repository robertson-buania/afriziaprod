import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgbNavModule, NgbAccordionModule, NgbAlertModule, NgbTooltipModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { UtilisateurService } from '@/app/core/services/utilisateur.service';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Facture, Colis, STATUT_COLIS, Paiement, TYPE_PAIEMENT } from '@/app/models/partenaire.model';
import { Subscription } from 'rxjs';
import { PaymentService } from '@/app/core/services/payment.service';
import { AuthService } from '@/app/core/services/auth.service';
import { CinetPayService, CinetPayResponse } from '@/app/core/services/cinetpay.service';
import { environment } from '@/environments/environment';
import { Subject, takeUntil } from 'rxjs';
import { FactureService } from '@/app/core/services/facture.service';
import { ColisService } from '@/app/core/services/colis.service';
import { User } from '@/app/models/user.model';
import { FormsModule } from '@angular/forms';

interface ExtendedPaiement extends Paiement {
  date: Date;
  montant: number;
  methode: string;
  statut: 'success' | 'pending' | 'failed';
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
  factures: Facture[] = [];
  facturesPayees: Facture[] = [];
  facturesNonPayees: Facture[] = [];
  factureSelectionnee: Facture | null = null;

  isLoading = true;
  isLoadingColis = false;
  errorMessage = '';
  successMessage = '';
  isPaiementEnCours = false;
  activeTab = 1; // 1: Toutes, 2: Payées, 3: Non payées

  // États pour le détail d'une facture
  detailsVisible = false;

  private subscriptions: Subscription[] = [];
  private utilisateurConnecte: User | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private utilisateurService: UtilisateurService,
    private firebaseService: FirebaseService,
    private paymentService: PaymentService,
    private authService: AuthService,
    private cinetPayService: CinetPayService,
    private factureService: FactureService,
    private colisService: ColisService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.authService.currentUser$.subscribe(user => {
        this.utilisateurConnecte = user;
        if (user) {
          this.chargerFactures();
        } else {
          this.factures = [];
          this.facturesPayees = [];
          this.facturesNonPayees = [];
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.destroy$.next();
    this.destroy$.complete();
  }

  private chargerFactures(): void {
    if (!this.utilisateurConnecte?.id) {
      this.errorMessage = 'Utilisateur non connecté';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.subscriptions.push(
      this.factureService.getFacturesByUser(this.utilisateurConnecte.id)
        .subscribe({
          next: (factures) => {
            this.factures = factures;
            this.facturesPayees = factures.filter(f => f.montantPaye >= f.montant);
            this.facturesNonPayees = factures.filter(f => f.montantPaye < f.montant);
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Erreur lors du chargement des factures:', error);
            this.errorMessage = 'Erreur lors du chargement des factures. Veuillez réessayer.';
            this.isLoading = false;
          }
        })
    );
  }

  chargerDetailsColis(facture: Facture): void {
    if (!facture.colis || facture.colis.length === 0) return;

    this.isLoadingColis = true;
    const colisIds = facture.colis.map(c => typeof c === 'string' ? c : c.id).filter((id): id is string => id !== undefined);

    this.colisService.getColisByIds(colisIds)
      .pipe(takeUntil(this.destroy$))
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
    this.factureSelectionnee = facture;
    this.detailsVisible = true;
    this.chargerDetailsColis(facture);
  }

  masquerDetailsFacture(): void {
    this.detailsVisible = false;
    this.factureSelectionnee = null;
  }

  payerFactureCinetPay(facture: Facture): void {
    if (this.isPaiementEnCours) return;

    this.isPaiementEnCours = true;
    const montant = this.getMontantRestant(facture);

    this.cinetPayService.initializePayment({
      amount: montant,
      currency: 'USD',
      description: `Paiement de la facture ${facture.id}`,
      return_url: `${environment.apiUrl}/paiement/retour`,
      cancel_url: `${environment.apiUrl}/paiement/annulation`,
      notify_url: `${environment.apiUrl}/paiement/notification`,
      channels: 'ALL',
      lang: 'fr'
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: CinetPayResponse) => {
          if (response.data?.payment_url) {
            window.location.href = response.data.payment_url;
          } else {
            this.errorMessage = 'Une erreur est survenue lors de l\'initialisation du paiement';
            this.isPaiementEnCours = false;
          }
        },
        error: (error: Error) => {
          console.error('Erreur lors de l\'initialisation du paiement:', error);
          this.errorMessage = 'Une erreur est survenue lors de l\'initialisation du paiement';
          this.isPaiementEnCours = false;
        }
      });
  }

  // Méthodes utilitaires
  estFacturePayee(facture: Facture): boolean {
    return facture.montantPaye >= facture.montant;
  }

  getMontantRestant(facture: Facture): number {
    const montantTotal = facture.prixRemise || facture.montant;
    return Math.max(0, montantTotal - facture.montantPaye);
  }

  getStatutFacture(facture: Facture): string {
    if (this.estFacturePayee(facture)) return 'Payée';
    if (facture.montantPaye > 0) return 'Partiellement payée';
    return 'Non payée';
  }

  getClassStatutPaiement(facture: Facture): string {
    if (this.estFacturePayee(facture)) return 'bg-success';
    if (facture.montantPaye > 0) return 'bg-warning';
    return 'bg-danger';
  }

  getClassStatutColis(statut: STATUT_COLIS): string {
    switch (statut) {
      case STATUT_COLIS.EN_ATTENTE_PAIEMENT:
        return 'bg-warning';
      case STATUT_COLIS.PAYE:
        return 'bg-success';
      case STATUT_COLIS.EN_ATTENTE_EXPEDITION:
        return 'bg-info';
      case STATUT_COLIS.EN_COURS_EXPEDITION:
        return 'bg-primary';
      case STATUT_COLIS.EN_ATTENTE_LIVRAISON:
        return 'bg-info';
      case STATUT_COLIS.LIVRE:
        return 'bg-success';
      case STATUT_COLIS.ANNULE:
        return 'bg-danger';
      default:
        return 'bg-secondary';
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

  getTypePaiementLabel(type: TYPE_PAIEMENT | undefined): string {
    if (type === undefined) return 'Inconnu';
    
    switch (type) {
      case TYPE_PAIEMENT.ESPECE:
        return 'Espèces';
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
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgbNavModule, NgbAccordionModule, NgbAlertModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { UtilisateurService } from '@/app/core/services/utilisateur.service';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Facture, Colis, STATUT_COLIS, Paiement } from '@/app/models/partenaire.model';
import { Subscription } from 'rxjs';
import { PaymentService } from '@/app/core/services/payment.service';

@Component({
  selector: 'app-mes-commandes',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgbNavModule,
    NgbAccordionModule,
    NgbAlertModule,
    NgbTooltipModule
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

  private subscription = new Subscription();
  private utilisateurConnecte: any = null;

  constructor(
    private utilisateurService: UtilisateurService,
    private firebaseService: FirebaseService,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    this.chargerFactures();
    this.chargerUtilisateur();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private chargerUtilisateur(): void {
    this.subscription.add(
      this.utilisateurService.utilisateurCourant$.subscribe(user => {
        this.utilisateurConnecte = user;
      })
    );
  }

  private chargerFactures(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.subscription.add(
      this.utilisateurService.utilisateurCourant$.subscribe(async user => {
        if (!user || !user.partenaireId) {
          this.isLoading = false;
          this.errorMessage = 'Vous devez être connecté en tant que partenaire pour accéder à vos commandes.';
          return;
        }

        try {
          // Récupérer toutes les factures du partenaire
          this.firebaseService.getFacturesByPartenaire(user.partenaireId).subscribe(
            (factures) => {
              // Vérifier et compléter les données des factures si nécessaire
              this.factures = factures.map(facture => {
                // S'assurer que les valeurs numériques sont définies
                const factureNormalisee = {
                  ...facture,
                  montant: facture.montant || 0,
                  montantPaye: facture.montantPaye || 0
                };

                // S'assurer que colis est un tableau valide
                if (!Array.isArray(facture.colis)) {
                  factureNormalisee.colis = [];
                } else {
                  // Vérifier le type des éléments du tableau colis
                  factureNormalisee.colis = facture.colis.filter(item => item !== null && item !== undefined);
                }

                // S'assurer que paiements est un tableau valide
                if (!Array.isArray(facture.paiements)) {
                  factureNormalisee.paiements = [];
                } else {
                  factureNormalisee.paiements = facture.paiements.filter(item => item !== null && item !== undefined);
                }

                return factureNormalisee;
              });

              // Trier les factures (déjà fait dans le service, mais au cas où)
              this.factures = this.trierFacturesParDate(this.factures);

              // Séparer les factures payées et non payées
              this.facturesPayees = this.factures.filter(f => f.montant <= f.montantPaye);
              this.facturesNonPayees = this.factures.filter(f => f.montant > f.montantPaye);

              this.isLoading = false;
              console.log('Factures chargées:', this.factures);
            },
            (error) => {
              console.error('Erreur lors du chargement des factures:', error);
              this.errorMessage = 'Erreur lors du chargement de vos commandes. Veuillez réessayer plus tard.';
              this.isLoading = false;
            }
          );
        } catch (error) {
          console.error('Erreur:', error);
          this.errorMessage = 'Une erreur est survenue lors du chargement de vos commandes. Veuillez réessayer plus tard.';
          this.isLoading = false;
        }
      })
    );
  }

  // Trier les factures par date (plus récentes en premier)
  private trierFacturesParDate(factures: Facture[]): Facture[] {
    return [...factures].sort((a, b) => {
      const dateA = a.dateCreation ? new Date(a.dateCreation).getTime() : 0;
      const dateB = b.dateCreation ? new Date(b.dateCreation).getTime() : 0;
      return dateB - dateA;
    });
  }

  // Calcul du statut global de la facture
  getStatutFacture(facture: Facture): string {
    if (facture.montant <= facture.montantPaye) {
      return 'Payée';
    } else if (facture.montantPaye > 0) {
      return 'Partiellement payée';
    } else {
      return 'Non payée';
    }
  }

  // Formater le statut d'un colis en texte lisible
  formatStatutColis(statut: STATUT_COLIS | null | undefined): string {
    if (statut === null || statut === undefined) {
      return 'Statut inconnu';
    }

    switch(statut) {
      case STATUT_COLIS.EN_ATTENTE_PAIEMENT:
        return 'En attente de paiement';
      case STATUT_COLIS.EN_ATTENTE_EXPEDITION:
        return "En attente d'expédition";
      case STATUT_COLIS.EN_COURS_EXPEDITION:
        return "En cours d'expédition";
     
      case STATUT_COLIS.EN_ATTENTE_LIVRAISON:
        return 'En attente de livraison';
      case STATUT_COLIS.LIVRE:
        return 'Livré';
      default:
        return 'Annulé';
    }
  }

  // Obtenir une classe CSS en fonction du statut du colis
  getClassStatutColis(statut: STATUT_COLIS | null | undefined): string {
    if (statut === null || statut === undefined) {
      return 'bg-secondary';
    }
    switch(statut) {
      case STATUT_COLIS.EN_ATTENTE_PAIEMENT:
        return 'bg-warning text-dark';
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

  // Obtenir une classe CSS en fonction du statut de paiement
  getClassStatutPaiement(facture: Facture): string {
    if (facture.montant <= facture.montantPaye) {
      return 'bg-success';
    } else if (facture.montantPaye > 0) {
      return 'bg-warning';
    } else {
      return 'bg-danger';
    }
  }

  // Afficher les détails d'une facture
  afficherDetailsFacture(facture: Facture): void {
    this.factureSelectionnee = facture;
    this.detailsVisible = true;

    // Charger les détails complets des colis si ce sont des IDs
    this.chargerDetailsColis(facture);
  }

  // Charger les détails complets des colis
  private async chargerDetailsColis(facture: Facture): Promise<void> {
    if (!facture.colis || facture.colis.length === 0) {
      return;
    }

    try {
      // Vérifier si les colis sont des strings (IDs) ou des objets
      const premiereValeur = facture.colis[0];

      // Si les colis sont des IDs (string), charger les détails complets
      if (typeof premiereValeur === 'string') {
        console.log('Chargement des détails des colis à partir des IDs...');
        this.isLoadingColis = true;

        // Cast le tableau de colis comme un tableau de strings pour le typage
        const colisIds = facture.colis as unknown as string[];

        const colisPromises = colisIds.map(async (colisId: string) => {
          try {
            return await this.firebaseService.getColisById(colisId);
          } catch (error) {
            console.error(`Erreur lors du chargement du colis ${colisId}:`, error);
            return null;
          }
        });

        const colisComplets = await Promise.all(colisPromises);

        // Filtrer les null et mettre à jour la facture sélectionnée
        if (this.factureSelectionnee && this.factureSelectionnee.id === facture.id) {
          this.factureSelectionnee = {
            ...this.factureSelectionnee,
            colis: colisComplets.filter(colis => colis !== null) as Colis[]
          };
          console.log('Détails des colis chargés:', this.factureSelectionnee.colis);
        }

        this.isLoadingColis = false;
      } else {
        console.log('Les colis sont déjà des objets complets:', facture.colis);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des détails des colis:', error);
      this.isLoadingColis = false;
    }
  }

  // Masquer les détails d'une facture
  masquerDetailsFacture(): void {
    this.detailsVisible = false;
    this.factureSelectionnee = null;
    this.isLoadingColis = false;
  }

  /**
   * Calcule le montant restant à payer pour une facture
   */
  getMontantRestant(facture: Facture): number {
    return facture.montant - facture.montantPaye;
  }

  /**
   * Paie une facture via CinetPay
   */
  async payerFactureCinetPay(facture: Facture): Promise<void> {
    if (!facture.id) {
      this.errorMessage = "Identifiant de facture non trouvé";
      return;
    }

    if (facture.montant <= facture.montantPaye) {
      this.successMessage = "Cette facture est déjà entièrement payée";
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isPaiementEnCours = true;

    try {
      // Préparer les informations client pour CinetPay
      const customer = {
        customer_name: this.utilisateurConnecte?.nom || 'Client',
        customer_surname: this.utilisateurConnecte?.prenom || '',
        customer_email: this.utilisateurConnecte?.email || 'client@example.com',
        customer_phone_number: this.utilisateurConnecte?.telephone || '0',
        customer_address: this.utilisateurConnecte?.partenaire?.adresse || '',
        customer_city: '',
        customer_country: 'CM',
        customer_state: '',
        customer_zip_code: ''
      };

      // URL de retour après paiement
      const returnUrl = `${window.location.origin}/paiement/resultat/${facture.id}?success=true`;

      // Récupérer les objets de colis
      let colis: Colis[] = [];
      if (facture.colisObjets && Array.isArray(facture.colisObjets)) {
        colis = facture.colisObjets;
      } else if (facture.colis && Array.isArray(facture.colis)) {
        // Filtrer pour obtenir uniquement les objets Colis
        colis = facture.colis.filter(item =>
          typeof item !== 'string' && item !== null
        ) as Colis[];

        // Si ce sont tous des IDs, charger les objets Colis
        if (colis.length === 0 && facture.colis.length > 0) {
          const colisIds = facture.colis.filter(id => typeof id === 'string') as string[];
          const colisPromises = colisIds.map(id => this.firebaseService.getColisById(id));
          const colisObjets = await Promise.all(colisPromises);
          colis = colisObjets.filter(c => c !== null) as Colis[];
        }
      }

      // Préparer les articles pour le paiement
      const items = colis.map(c => ({
        id: c.id || '',
        name: c.nature || `Colis #${c.id?.substring(0, 8) || ''}`,
        price: this.getMontantRestant(facture) / colis.length,
        quantity: 1
      }));

      // Initialiser le paiement avec CinetPay
      this.paymentService.initiatePayment({
        factureId: facture.id,
        amount: this.getMontantRestant(facture),
        currency: 'USD',
        customer: customer,
        items: items,
        return_url: returnUrl,
        notify_url: `${window.location.origin}/api/payment-notification`,
        channels: 'ALL',
        metadata: {
          factureId: facture.id,
          clientId: this.utilisateurConnecte?.id || facture.partenaireId || '',
          colisIds: colis.map(c => c.id)
        }
      }).subscribe(
        (response) => {
          if (response && response.code === '201' && response.data && response.data.payment_url) {
            // Rediriger vers la page de paiement CinetPay
            window.location.href = response.data.payment_url;
          } else {
            this.errorMessage = 'Erreur lors de l\'initialisation du paiement: ' + (response.message || 'Erreur inconnue');
            this.isPaiementEnCours = false;
          }
        },
        (error) => {
          console.error('Erreur lors de l\'initialisation du paiement:', error);
          this.errorMessage = 'Une erreur est survenue lors de l\'initialisation du paiement.';
          this.isPaiementEnCours = false;
        }
      );
    } catch (error) {
      console.error('Erreur lors de la préparation du paiement:', error);
      this.errorMessage = 'Une erreur est survenue lors de la préparation du paiement.';
      this.isPaiementEnCours = false;
    }
  }

  // Vérifie si un élément est un objet Colis ou une chaîne ID
  isColisDynamic(colis: Colis | string): colis is Colis {
    return typeof colis !== 'string' && colis !== null && typeof colis === 'object';
  }
}

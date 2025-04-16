import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { NgbAlertModule, NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { PanierService } from '@/app/core/services/panier.service';
import { Colis, STATUT_COLIS, TYPE_EXPEDITION, PARAMETRAGE_COLIS, Facture } from '@/app/models/partenaire.model';
import { UtilisateurService } from '@/app/core/services/utilisateur.service';
import { Subscription } from 'rxjs';
import { AuthModalService, AuthModalType } from '@/app/core/services/auth-modal.service';
import { AuthModalModule } from '@/app/views/website/components/auth-modal/auth-modal.module';
import { PaymentService } from '@/app/core/services/payment.service';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { currentYear } from '@/app/common/constants';

@Component({
  selector: 'app-panier',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, NgbAlertModule, NgbModalModule, AuthModalModule, CurrencyPipe],
  providers: [CurrencyPipe],
  templateUrl: './panier.component.html',
  styleUrl: './panier.component.scss'
})
export class PanierComponent implements OnInit, OnDestroy {
  @ViewChild('connexionRequiseModal') connexionRequiseModal!: TemplateRef<any>;

  colis: Colis[] = [];
  total = 0;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  facturationForm!: FormGroup;
  isFacturationFormVisible = false;
  isProcessing = false;
  partenaireId: string | null = null;
  utilisateurConnecte: any = null;
  private subscription = new Subscription();

  // Ajout de l'état du processus de paiement
  isPaiementEnCours = false;

  // Type d'expédition
  readonly TYPE_EXPEDITION = TYPE_EXPEDITION;
  selectedExpeditionType: TYPE_EXPEDITION = TYPE_EXPEDITION.EXPRESS;

  // Nouvelles propriétés pour la facturation
  currentYear = currentYear;
  currentDate = new Date();
  invoiceNumber = `FA${currentYear}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

  constructor(
    private panierService: PanierService,
    private utilisateurService: UtilisateurService,
    private router: Router,
    private fb: FormBuilder,
    private modalService: NgbModal,
    private authModalService: AuthModalService,
    private paymentService: PaymentService,
    private firebaseService: FirebaseService
  ) {}

  ngOnInit(): void {
    this.chargerPanier();
    this.initFacturationForm();
    this.verifierUtilisateurConnecte();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private verifierUtilisateurConnecte(): void {
    this.subscription.add(
      this.utilisateurService.utilisateurCourant$.subscribe(utilisateur => {
        if (utilisateur) {
          this.utilisateurConnecte = utilisateur;
          this.partenaireId = utilisateur.partenaireId || null;
          if (this.partenaireId) {
            this.facturationForm.get('partenaireId')?.setValue(this.partenaireId);
          }
        } else {
          this.utilisateurConnecte = null;
          this.partenaireId = null;
        }
      })
    );
  }

  private initFacturationForm(): void {
    this.facturationForm = this.fb.group({
      partenaireId: ['', [Validators.required]]
    });
  }

  private chargerPanier(): void {
    this.isLoading = true;
    this.colis = this.panierService.obtenirContenuPanier();
    this.calculerTotal();
    this.isLoading = false;
  }

  private calculerTotal(): void {
    this.total = this.panierService.calculerTotal();
  }

  supprimerColis(id: string): void {
    this.panierService.supprimerDuPanier(id);
    this.chargerPanier();
    this.successMessage = 'Colis supprimé du panier';
    setTimeout(() => this.successMessage = '', 3000);
  }

  viderPanier(): void {
    this.panierService.viderPanier();
    this.chargerPanier();
    this.successMessage = 'Panier vidé avec succès';
    setTimeout(() => this.successMessage = '', 3000);
  }

  getStatutLabel(statut: STATUT_COLIS): string {
    switch (statut) {
      case STATUT_COLIS.EN_ATTENTE_PAIEMENT:
        return 'bg-warning text-dark';
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

  getStatutText(statut: STATUT_COLIS): string {
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

  getTypeExpeditionLabel(type: TYPE_EXPEDITION): string {
    switch (type) {
      case TYPE_EXPEDITION.EXPRESS:
        return 'Express';
      case TYPE_EXPEDITION.STANDARD:
        return 'Standard';
      default:
        return 'Inconnu';
    }
  }

  afficherFormulaireFacturation(): void {
    // Vérifier si l'utilisateur est connecté
    if (!this.utilisateurConnecte) {
      // L'utilisateur n'est pas connecté, afficher le modal de connexion
      this.errorMessage = 'Veuillez vous connecter pour poursuivre le paiement';
      this.ouvrirModalConnexion();
      return;
    }

    // Si l'utilisateur est connecté mais n'a pas complété son profil
    if (!this.utilisateurConnecte.nom || !this.utilisateurConnecte.prenom || !this.utilisateurConnecte.telephone) {
      this.errorMessage = 'Veuillez compléter votre profil pour pouvoir payer';
   
      this.router.navigate(['/profil']);
      return;
    } // Rediriger vers la page de profil
   console.log("utilisateurConnecte",this.utilisateurConnecte);
      
    this.isFacturationFormVisible = true;
  }

  annulerFacturation(): void {
    this.isFacturationFormVisible = false;
    this.facturationForm.reset();
    if (this.partenaireId) {
      this.facturationForm.get('partenaireId')?.setValue(this.partenaireId);
    }
  }

  // Méthode appelée lors du changement du type d'expédition
  onExpeditionTypeChange(): void {
    // Recalculer les coûts pour chaque colis en fonction du type d'expédition
    for (const colis of this.colis) {

      if (colis.id) {
        // Calculer le nouveau coût du colis basé sur le type d'expédition
        const typeColis = colis.type;
        const poids = colis.poids || 0;
        const quantite = Number(colis.quantite) || 1; // Convertir en nombre

        // Récupérer les tarifs correspondants
        const parametrage = PARAMETRAGE_COLIS[this.selectedExpeditionType][typeColis];

        // Calculer le coût
        let nouveauCout = parametrage.prixParKilo * poids;
        if (parametrage.prixUnitaire) {
          nouveauCout += parametrage.prixUnitaire * quantite;
        }

        // Mettre à jour le colis
        colis.cout = Math.round(nouveauCout);
        colis.typeExpedition = this.selectedExpeditionType;
      }
    }

    // Mettre à jour le panier pour persister les changements
    this.panierService.viderPanier();
    for (const colis of this.colis) {
      this.panierService.ajouterAuPanier(colis);
    }

    // Mettre à jour le total
    this.calculerTotal();

    // Informer l'utilisateur du changement
    this.successMessage = `Type d'expédition modifié pour ${this.selectedExpeditionType === TYPE_EXPEDITION.EXPRESS ? 'Express' : 'Standard'}`;
    setTimeout(() => this.successMessage = '', 3000);
  }

  // Méthode pour créer la facture
  private async createFacture(): Promise<string> {
    if (!this.utilisateurConnecte || !this.utilisateurConnecte.id) {
      throw new Error('Utilisateur non connecté');
    }

    const facture: Omit<Facture, 'id'> & { id: string } = {
      id: this.invoiceNumber,
      montant: this.total,
      montantPaye: 0,
      colis: this.colis,
      paiements: [],
      dateCreation: new Date().toISOString(),
      partenaireId: this.utilisateurConnecte.id
    };

    await this.firebaseService.createFacture(facture);
    return facture.id;
  }

  // Méthode pour mettre à jour le statut des colis
  private async updateColisStatus(factureId: string): Promise<void> {
    const updatePromises = this.colis
      .filter(colis => colis.id)
      .map(colis =>
        this.firebaseService.updateColis(colis.id!, {
          statut: STATUT_COLIS.EN_ATTENTE_PAIEMENT,
          typeExpedition: this.selectedExpeditionType
        })
      );

    await Promise.all(updatePromises);
  }

  async creerFacture(): Promise<void> {
    if (!this.utilisateurConnecte) {
      // L'utilisateur n'est pas connecté, afficher le modal de connexion
      this.errorMessage = 'Veuillez vous connecter pour poursuivre le paiement';
      this.ouvrirModalConnexion();
      return;
    }

    // Si l'utilisateur est connecté mais n'a pas complété son profil
    if (!this.utilisateurConnecte.nom || !this.utilisateurConnecte.prenom || !this.utilisateurConnecte.telephone) {
      this.errorMessage = 'Veuillez compléter votre profil pour pouvoir payer';
   
      this.router.navigate(['/profil']);
      return;
    }

    if (this.facturationForm.invalid) {
      this.facturationForm.markAllAsTouched();
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';

    try {
      // Créer la facture
      const factureId = await this.createFacture();
      
      // Mettre à jour le statut des colis
      await this.updateColisStatus(factureId);

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
      const returnUrl = `${window.location.origin}/paiement/resultat/${factureId}?success=true`;

      // Préparer les articles pour le paiement
      const items = this.colis.map(colis => ({
        id: colis.id || '',
        name: colis.nature || `Colis #${colis.id?.substring(0, 8) || ''}`,
        price: this.total / this.colis.length,
        quantity: 1
      }));

      // Initialiser le paiement avec CinetPay
      this.isPaiementEnCours = true;
      this.paymentService.initiatePayment({
        factureId: factureId,
        amount: this.total,
        currency: 'USD',
        customer: customer,
        items: items,
        return_url: returnUrl,
        notify_url: `${window.location.origin}/api/payment-notification`,
        channels: 'ALL',
        metadata: {
          factureId: factureId,
          clientId: this.utilisateurConnecte?.id || '',
          colisIds: this.colis.map(c => c.id)
        }
      }).subscribe(
        (response) => {
          if (response && response.code === '201' && response.data && response.data.payment_url) {
            // Rediriger vers la page de paiement CinetPay
            window.location.href = response.data.payment_url;
          } else {
            this.errorMessage = 'Erreur lors de l\'initialisation du paiement: ' + response.message;
            this.isPaiementEnCours = false;
            this.isProcessing = false;

            // Rediriger vers "Mes Commandes" après une erreur
            setTimeout(() => {
              this.router.navigate(['/mes-commandes']);
            }, 3000);
          }
        },
        (error) => {
          console.error('Erreur lors de l\'initialisation du paiement:', error);
          this.errorMessage = 'Une erreur est survenue lors de l\'initialisation du paiement. Vous allez être redirigé vers vos commandes.';
          this.isPaiementEnCours = false;
          this.isProcessing = false;

          // Rediriger vers "Mes Commandes" après une erreur
          setTimeout(() => {
            this.router.navigate(['/mes-commandes']);
          }, 3000);
        }
      );
    } catch (error) {
      console.error('Erreur lors de la création de la facture:', error);
      this.errorMessage = 'Une erreur est survenue lors de la création de la facture. Vous allez être redirigé vers vos commandes.';
      this.isProcessing = false;

      // Rediriger vers "Mes Commandes" après une erreur
      setTimeout(() => {
        this.router.navigate(['/mes-commandes']);
      }, 3000);
    }
  }

  confirmerSuppression(modal: any, colisId: string): void {
    this.modalService.open(modal, { centered: true }).result.then(
      (result) => {
        if (result === 'confirm') {
          this.supprimerColis(colisId);
        }
      }
    );
  }

  // Méthodes pour ouvrir les modals d'authentification
  ouvrirModalConnexion(): void {
    this.authModalService.openAuthModal(AuthModalType.LOGIN);
  }

  ouvrirModalInscription(): void {
    this.authModalService.openAuthModal(AuthModalType.REGISTER);
  }
}

import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbAlertModule, NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { PanierService } from '@/app/core/services/panier.service';
import { Colis, STATUT_COLIS, TYPE_EXPEDITION } from '@/app/models/partenaire.model';
import { UtilisateurService } from '@/app/core/services/utilisateur.service';
import { Subscription } from 'rxjs';
import { AuthModalService, AuthModalType } from '@/app/core/services/auth-modal.service';
import { AuthModalModule } from '@/app/views/website/components/auth-modal/auth-modal.module';

@Component({
  selector: 'app-panier',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, NgbAlertModule, NgbModalModule, AuthModalModule],
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
  private subscription = new Subscription();

  constructor(
    private panierService: PanierService,
    private utilisateurService: UtilisateurService,
    private router: Router,
    private fb: FormBuilder,
    private modalService: NgbModal,
    private authModalService: AuthModalService
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
          this.partenaireId = utilisateur.partenaireId || null;
          if (this.partenaireId) {
            this.facturationForm.get('partenaireId')?.setValue(this.partenaireId);
          }
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
      case STATUT_COLIS.EN_ATTENTE_VERIFICATION:
        return 'En attente de vérification';
      case STATUT_COLIS.EN_ATTENTE_FACTURATION:
        return 'En attente de facturation';
      case STATUT_COLIS.EN_ATTENTE_PAIEMENT:
        return 'En attente de paiement';
      case STATUT_COLIS.EN_ATTENTE_LIVRAISON:
        return 'En attente de livraison';
      case STATUT_COLIS.COLIS_ARRIVE:
        return 'Arrivé';
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
    if (!this.utilisateurService.estConnecte()) {
      // Au lieu de rediriger, ouvrir le modal de connexion
      this.ouvrirModalConnexion();
      return;
    }

    // L'utilisateur est connecté mais n'est pas un partenaire
    if (!this.partenaireId) {
      this.errorMessage = 'Votre compte n\'est pas associé à un partenaire. Veuillez contacter l\'administrateur.';
      return;
    }

    this.isFacturationFormVisible = true;
  }

  annulerFacturation(): void {
    this.isFacturationFormVisible = false;
    this.facturationForm.reset();
    if (this.partenaireId) {
      this.facturationForm.get('partenaireId')?.setValue(this.partenaireId);
    }
  }

  async creerFacture(): Promise<void> {
    if (this.facturationForm.invalid) {
      this.facturationForm.markAllAsTouched();
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';

    try {
      const partenaireId = this.facturationForm.get('partenaireId')?.value || this.partenaireId;

      if (!partenaireId) {
        this.errorMessage = 'ID de partenaire non spécifié';
        this.isProcessing = false;
        return;
      }

      const factureId = await this.panierService.creerFactureDepuisPanier(partenaireId);

      if (factureId) {
        this.successMessage = 'Facture créée avec succès';
        this.isFacturationFormVisible = false;
        this.facturationForm.reset();
        this.chargerPanier();

        // Redirection vers la page de paiement
        setTimeout(() => {
          this.router.navigate(['/paiement/facture', factureId]);
        }, 2000);
      } else {
        this.errorMessage = 'Erreur lors de la création de la facture';
      }
    } catch (error) {
      console.error('Erreur lors de la création de la facture:', error);
      this.errorMessage = 'Une erreur est survenue lors de la création de la facture';
    } finally {
      this.isProcessing = false;
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

  // Nouvelles méthodes pour ouvrir les modals d'authentification
  ouvrirModalConnexion(): void {
    this.authModalService.openAuthModal(AuthModalType.LOGIN);
  }

  ouvrirModalInscription(): void {
    this.authModalService.openAuthModal(AuthModalType.REGISTER);
  }
}

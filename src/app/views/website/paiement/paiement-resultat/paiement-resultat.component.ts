import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Facture, Colis, FactureStatus } from '@/app/models/partenaire.model';
import { PanierService } from '@/app/core/services/panier.service';
import { PaymentService } from '@/app/core/services/payment.service';

@Component({
  selector: 'app-paiement-resultat',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-md-8">
          <div class="card shadow">
            <div class="card-body text-center p-5">
              <div *ngIf="isLoading" class="mb-4">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Chargement...</span>
                </div>
                <p class="mt-3">Vérification du paiement en cours...</p>
              </div>

              <div *ngIf="!isLoading && success" class="text-success mb-4">
                <i class="las la-check-circle la-3x"></i>
                <h2 class="mt-3">Paiement réussi !</h2>
                <p class="text-muted">Votre paiement a été traité avec succès.</p>
              </div>

              <div *ngIf="!isLoading && !success" class="text-danger mb-4">
                <i class="las la-times-circle la-3x"></i>
                <h2 class="mt-3">Échec du paiement</h2>
                <p class="text-muted">{{ errorMessage }}</p>
              </div>

              <div class="mt-4">
                <a routerLink="/mes-commandes" class="btn btn-primary">
                  Voir mes commandes
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PaiementResultatComponent implements OnInit {
  isLoading = true;
  success = false;
  errorMessage = '';
  factureId: string | null = null;
  facture: Facture | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firebaseService: FirebaseService,
    private panierService: PanierService,
    private paymentService: PaymentService
  ) {}

  ngOnInit() {
    this.factureId = this.route.snapshot.paramMap.get('id');
    const isCanceled = this.route.snapshot.queryParamMap.get('canceled') === 'true';

    if (!this.factureId) {
      this.handleError('Facture non trouvée');
      return;
    }

    if (isCanceled) {
      this.handlePaymentCanceled();
    } else {
      this.verifyPayment();
    }
  }

  private async verifyPayment() {
    try {
      if (!this.factureId) return;

      const response = await this.paymentService.handlePaymentSuccess(this.factureId).toPromise();

      if (response && response.success) {
        this.success = true;
        // Mettre à jour le statut de la facture si nécessaire
        await this.firebaseService.updateFacture(this.factureId, {
          statut: FactureStatus.PAYEE
        });
        this.facture = await this.firebaseService.getFactureById(this.factureId);
        this.panierService.viderPanier();
      } else {
        this.handleError('Le paiement n\'a pas pu être vérifié');
      }
    } catch (error) {
      this.handleError('Une erreur est survenue lors de la vérification du paiement');
    } finally {
      this.isLoading = false;
    }
  }

  private async handlePaymentCanceled() {
    try {
      if (!this.factureId) return;

      await this.paymentService.handlePaymentCancel(this.factureId).toPromise();
      this.success = false;
      this.errorMessage = 'Le paiement a été annulé';
    } catch (error) {
      this.handleError('Une erreur est survenue lors de l\'annulation du paiement');
    } finally {
      this.isLoading = false;
    }
  }

  private handleError(message: string) {
    this.isLoading = false;
    this.success = false;
    this.errorMessage = message;
  }

  /**
   * Récupère les objets Colis de la facture de manière sécurisée
   */
  getColisObjets(): Colis[] {
    if (!this.facture) return [];

    // Si colisObjets existe, l'utiliser
    if (this.facture.colisObjets && Array.isArray(this.facture.colisObjets)) {
      return this.facture.colisObjets;
    }

    // Sinon, filtrer les objets Colis du tableau colis
    if (this.facture.colis && Array.isArray(this.facture.colis)) {
      return this.facture.colis.filter(item =>
        typeof item !== 'string' && item !== null
      ) as Colis[];
    }

    return [];
  }

  retourAccueil(): void {
    this.router.navigate(['/']);
  }

  mesFactures(): void {
    this.router.navigate(['/mes-commandes']);
  }

  nouveauColisChercher(): void {
    this.router.navigate(['/recherche-colis']);
  }
}

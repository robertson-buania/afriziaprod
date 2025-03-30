import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { NgbTooltipModule, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { PaymentService, CinetPayPaymentResponse } from '@/app/core/services/payment.service';
import { UtilisateurService } from '@/app/core/services/utilisateur.service';
import { ToastrService } from 'ngx-toastr';
import { Facture, Colis } from '@/app/models/partenaire.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-facture-detail',
  templateUrl: './facture-detail.component.html',
  styleUrls: ['./facture-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    CurrencyPipe,
    NgbTooltipModule,
    NgbModule
  ]
})
export class FactureDetailComponent implements OnInit {
  factureId: string | null = null;
  facture: Facture | null = null;
  isLoading = false;
  isLoadingColis = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isPaiementEnCours = false;
  utilisateurConnecte: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private utilisateurService: UtilisateurService,
    private paymentService: PaymentService,
    private toastr: ToastrService
  ) { }

  async ngOnInit(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = null;

    // Récupérer l'utilisateur connecté
    this.utilisateurConnecte = await firstValueFrom(this.utilisateurService.utilisateurCourant$);

    // Récupérer l'ID de la facture depuis l'URL
    this.factureId = this.route.snapshot.paramMap.get('id');

    if (this.factureId) {
      try {
        // NOTE: Cette partie sera implémentée lorsque le FactureService sera disponible
        // Pour l'instant, nous simulons un chargement de facture
        setTimeout(() => {
          this.isLoading = false;
        }, 1000);
      } catch (error) {
        console.error('Erreur lors du chargement de la facture', error);
        this.errorMessage = "Une erreur est survenue lors du chargement de la facture.";
        this.isLoading = false;
      }
    } else {
      this.errorMessage = "Identifiant de facture non spécifié.";
      this.isLoading = false;
    }
  }

  /**
   * Calcule le montant restant à payer pour une facture
   */
  getMontantRestant(): number {
    if (!this.facture) return 0;
    return this.facture.montant - this.facture.montantPaye;
  }

  /**
   * Détermine si la facture est entièrement payée
   */
  isFacturePayee(): boolean {
    if (!this.facture) return false;
    return this.facture.montantPaye >= this.facture.montant;
  }

  /**
   * Obtient la classe CSS pour le statut de paiement
   */
  getClassStatutPaiement(): string {
    if (!this.facture) return 'bg-secondary';

    if (this.facture.montantPaye >= this.facture.montant) {
      return 'bg-success';
    } else if (this.facture.montantPaye > 0) {
      return 'bg-warning';
    } else {
      return 'bg-danger';
    }
  }

  /**
   * Obtient le statut textuel de la facture
   */
  getStatutFacture(): string {
    if (!this.facture) return 'Inconnu';

    if (this.facture.montantPaye >= this.facture.montant) {
      return 'Payée';
    } else if (this.facture.montantPaye > 0) {
      return 'Partiellement payée';
    } else {
      return 'Non payée';
    }
  }

  /**
   * Rediriger vers la liste des commandes
   */
  retourListe(): void {
    this.router.navigate(['/mes-commandes']);
  }

  /**
   * Paie une facture via CinetPay
   */
  async payerFactureCinetPay(): Promise<void> {
    if (!this.facture || !this.facture.id) {
      this.toastr.error('Impossible d\'initier le paiement', 'Facture invalide');
      return;
    }

    // Vérifier si la facture est déjà payée
    if (this.isFacturePayee()) {
      this.toastr.info('Cette facture est déjà entièrement payée');
      return;
    }

    this.isPaiementEnCours = true;
    this.errorMessage = null;

    try {
      // Préparer les données du client
      const customerInfo = {
        customer_name: this.utilisateurConnecte?.displayName || 'Client',
        customer_surname: '',
        customer_email: this.utilisateurConnecte?.email || '',
        customer_phone_number: this.utilisateurConnecte?.telephone || '',
        customer_address: '',
        customer_city: '',
        customer_country: 'CM',
        customer_state: '',
        customer_zip_code: ''
      };

      // Préparer les articles (colis) pour le paiement
      const items = this.facture.colis.map(colis => {
        if (typeof colis === 'string') {
          return {
            id: colis,
            name: `Colis #${colis.substring(0, 8)}`,
            price: this.getMontantRestant() / this.facture!.colis.length,
            quantity: 1
          };
        } else {
          return {
            id: colis.id || '',
            name: colis.nature || `Colis #${colis.id?.substring(0, 8) || ''}`,
            price: this.getMontantRestant() / this.facture!.colis.length,
            quantity: 1
          };
        }
      });

      // Construire l'URL de retour
      const returnUrl = `${window.location.origin}/paiement-resultat?factureId=${this.facture.id}`;

      // Initier le paiement
      const responseObservable = this.paymentService.initiatePayment({
        factureId: this.facture.id,
        amount: this.getMontantRestant(),
        currency: 'USD',
        customer: customerInfo,
        items: items,
        return_url: returnUrl,
        notify_url: `${window.location.origin}/api/payment-notification`,
        channels: 'ALL',
        metadata: {
          factureId: this.facture.id,
          clientId: this.utilisateurConnecte?.uid || '',
          colisIds: this.facture.colis.map(c => typeof c === 'string' ? c : c.id)
        }
      });

      // Convertir l'Observable en Promise pour pouvoir utiliser await
      const response = await firstValueFrom(responseObservable);

      // Rediriger vers la page de paiement CinetPay
      if (response && response.data && response.data.payment_url) {
        window.location.href = response.data.payment_url;
      } else {
        throw new Error('URL de paiement invalide');
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du paiement CinetPay', error);
      this.errorMessage = 'Une erreur est survenue lors de l\'initialisation du paiement. Veuillez réessayer plus tard.';
      this.isPaiementEnCours = false;
      this.toastr.error('Veuillez réessayer plus tard', 'Erreur de paiement');
    }
  }
}

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Colis, Facture, Partenaire, TYPE_COLIS, TYPE_EXPEDITION } from '@/app/models/partenaire.model';
import { computed, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FacturePaiementModalComponent } from '../facture-paiement-modal/facture-paiement-modal.component';
import printJS from 'print-js';

@Component({
  selector: 'app-facture-details-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './facture-details-modal.component.html',
  styleUrl: './facture-details-modal.component.scss'
})
export class FactureDetailsModalComponent implements OnInit {
  @Input() factureId!: string;
  @Input() printOnOpen: boolean = false;
  @Output() paiementRequest = new EventEmitter<string>();

  facture = signal<Facture | null>(null);
  client = signal<Partenaire | null>(null);
  isLoading = signal(true);

  paymentPercentage = computed(() => {
    const facture = this.facture();
    if (!facture || facture.montant === 0) return 100;
    return (facture.montantPaye / facture.montant) * 100;
  });

  constructor(
    public activeModal: NgbActiveModal,
    private modalService: NgbModal,
    private firebaseService: FirebaseService
  ) {}

  ngOnInit(): void {
    this.loadFactureDetails();
    if (this.printOnOpen) {
      setTimeout(() => this.onPrint(), 500);
    }
  }

  async loadFactureDetails(): Promise<void> {
    if (!this.factureId) {
      console.error('Aucun ID de facture fourni');
      this.isLoading.set(false);
      return;
    }

    try {
      // Charger les détails de la facture
      const factures = await firstValueFrom(this.firebaseService.getFactures());
      const facture = factures.find(f => f.id === this.factureId);

      if (!facture) {
        console.error('Facture non trouvée');
        this.isLoading.set(false);
        return;
      }

      this.facture.set(facture);

      // Charger les informations du client si des colis sont disponibles
      if (facture.colis && facture.colis.length > 0) {
        const colis = facture.colis[0];
        const partenaireId = colis.partenaireId;
        if (partenaireId) {
          const partenaires = await firstValueFrom(this.firebaseService.getPartenaires());
          const client = partenaires.find(p => p.id === partenaireId);
          this.client.set(client || null);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des détails de la facture:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  getTypeColisLabel(type: number | undefined): string {
    if (type === undefined) return 'Inconnu';
    return TYPE_COLIS[type] || 'Inconnu';
  }

  getTypeExpeditionLabel(type: number | undefined): string {
    if (type === undefined) return 'Inconnu';
    return TYPE_EXPEDITION[type] || 'Inconnu';
  }

  isTypeWithUnites(type: number | undefined): boolean {
    if (type === undefined) return false;
    return type === TYPE_COLIS.ORDINATEUR || type === TYPE_COLIS.TELEPHONE;
  }

  getProgressBarClass(percentage: number): string {
    if (percentage >= 100) return 'bg-success';
    if (percentage >= 75) return 'bg-info';
    if (percentage >= 50) return 'bg-warning';
    return 'bg-danger';
  }

  getPaymentStatus(percentage: number): string {
    if (percentage >= 100) return 'Payée';
    if (percentage > 0) return 'Partiellement payée';
    return 'Non payée';
  }

  calculateOriginalTotal(): number {
    if (!this.facture() || !this.facture()?.colis) return 0;
    return this.facture()!.colis.reduce((sum, colis) => sum + (colis.cout || 0), 0);
  }

  calculateDiscount(): number {
    const facture = this.facture();
    if (!facture || facture.prixRemise === undefined) return 0;
    return this.calculateOriginalTotal() - facture.montant;
  }

  onPrint(): void {
    const printContents = document.getElementById('facture-print');
    if (printContents) {
      // Vérifier si les données sont chargées
      if (!this.facture()) {
        console.error('Impossible d\'imprimer: les données de la facture ne sont pas chargées');
        return;
      }

      // S'assurer que l'élément est visible temporairement pour l'impression
      const originalDisplay = printContents.style.display;
      printContents.style.display = 'block';

      printJS({
        printable: 'facture-print',
        type: 'html',
        documentTitle: `Facture_${this.facture()?.id || 'print'}`,
        css: [
          'assets/css/bootstrap.min.css',
          'assets/css/icons.min.css'
        ],
        style: `
          .card { box-shadow: none !important; }
          .card-body { padding: 1rem; }
          .print-header { background-color: #000 !important; color: #fff !important; padding: 15px; }
          .text-muted { color: #6c757d !important; }
          .text-white { color: #fff !important; }
          .text-primary { color: #3b7ddd !important; }
          .fw-semibold { font-weight: 600 !important; }
          .fw-bold { font-weight: 700 !important; }
          .ms-auto { margin-left: auto !important; }
          .me-1 { margin-right: 0.25rem !important; }
          .mb-0 { margin-bottom: 0 !important; }
          .mb-1 { margin-bottom: 0.25rem !important; }
          .mb-2 { margin-bottom: 0.5rem !important; }
          .mb-3 { margin-bottom: 1rem !important; }
          .mt-2 { margin-top: 0.5rem !important; }
          .mt-4 { margin-top: 1.5rem !important; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
          th { background-color: #f2f2f2; }
          .text-end { text-align: right !important; }
          .text-center { text-align: center !important; }
          .border-top { border-top: 1px solid #dee2e6 !important; }
          .border-bottom { border-bottom: 1px solid #dee2e6 !important; }
          .no-print { display: none !important; }
        `,
        onPrintDialogClose: () => {
          // Restaurer l'affichage original après l'impression
          printContents.style.display = originalDisplay;
        }
      });
    } else {
      console.error('Élément d\'impression non trouvé');
    }
  }

  onAddPayment(): void {
    this.activeModal.dismiss();
    this.paiementRequest.emit(this.factureId);

    const modalRef = this.modalService.open(FacturePaiementModalComponent, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
      keyboard: false
    });

    modalRef.componentInstance.factureId = this.factureId;
    modalRef.componentInstance.facture = this.facture();
    modalRef.componentInstance.client = this.client();

    modalRef.result.then(
      (result) => {
        if (result === 'success') {
          // Rafraîchir les données après le paiement
          console.log('Paiement effectué avec succès');
          this.loadFactureDetails();
        }
      },
      () => {}
    );
  }
}

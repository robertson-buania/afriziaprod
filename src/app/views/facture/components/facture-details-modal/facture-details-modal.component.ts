import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Colis, Facture, Partenaire, TYPE_COLIS, TYPE_EXPEDITION, Paiement } from '@/app/models/partenaire.model';
import { computed, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FacturePaiementModalComponent } from '../facture-paiement-modal/facture-paiement-modal.component';

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
  // Signal dédié pour les colis avec le type correct
  colis = signal<Colis[]>([]);
  client = signal<Partenaire | null>(null);
  isLoading = signal(true);

  paymentPercentage = computed(() => {
    const facture = this.facture();
    if (!facture || facture.montant === 0) return 100;
    return (facture.montantPaye / facture.montant) * 100;
  });

  // Propriété computée pour obtenir la date de création de manière sûre
  dateCreation = computed(() => {
    const facture = this.facture();
    if (!facture) return null;

    if (facture.colisObjets && facture.colisObjets.length > 0 && facture.colisObjets[0].dateCreation) {
      return facture.colisObjets[0].dateCreation;
    }

    return null;
  });

  // Propriété computée pour obtenir les paiements de manière sûre
  paiements = computed((): Paiement[] => {
    const facture = this.facture();
    if (!facture) return [];

    return facture.paiements || [];
  });

  // Propriété computée pour obtenir les colis de manière sûre
  colisObjets = computed((): Colis[] => {
    const facture = this.facture();
    if (!facture) return [];

    return facture.colisObjets || [];
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

      // Convertir les IDs de colis en objets complets si nécessaire
      if (facture.colis && facture.colis.length > 0) {
        const colisArray = facture.colis;
        const updatedColis: Colis[] = [];

        for (const colisDonnee of colisArray) {
          if (typeof colisDonnee === 'string') {
            try {
              // Si c'est un ID, charger l'objet colis complet
              const colis = await this.firebaseService.getColisById(colisDonnee);
              if (colis) {
                updatedColis.push(colis);
              }
            } catch (error) {
              console.error(`Erreur lors du chargement du colis ${colisDonnee}:`, error);
            }
          } else {
            // Si c'est déjà un objet colis, l'ajouter directement
            updatedColis.push(colisDonnee);
          }
        }

        // Mettre à jour le signal des colis et la propriété colisObjets de la facture
        this.colis.set(updatedColis);
        facture.colisObjets = updatedColis;
      } else {
        this.colis.set([]);
        facture.colisObjets = [];
      }

      this.facture.set(facture);

      // Charger les informations du client
      if (this.colis().length > 0) {
        const firstColis = this.colis()[0];
        if (firstColis.partenaireId) {
          const partenaires = await firstValueFrom(this.firebaseService.getPartenaires());
          const client = partenaires.find(p => p.id === firstColis.partenaireId);
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

  onPrint(): void {
    window.print();
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

  // Vérifie si un élément est un objet Colis ou une chaîne ID
  isColisDynamic(colis: Colis | string): colis is Colis {
    return typeof colis !== 'string' && colis !== null && typeof colis === 'object';
  }
}

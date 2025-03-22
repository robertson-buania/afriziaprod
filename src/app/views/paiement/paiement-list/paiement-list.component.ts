import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Facture, Paiement, TYPE_PAIEMENT } from '@/app/models/partenaire.model';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FactureDetailsModalComponent } from '../../facture/components/facture-details-modal/facture-details-modal.component';

interface PaiementAffichage extends Paiement {
  factureId: string;
  clientNom?: string;
  montantFacture?: number;
  montantPayeFacture?: number;
  reference?: string;
}

@Component({
  selector: 'app-paiement-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './paiement-list.component.html',
  styleUrl: './paiement-list.component.scss'
})
export class PaiementListComponent implements OnInit {
  paiements = signal<PaiementAffichage[]>([]);
  filteredPaiements = signal<PaiementAffichage[]>([]);
  isLoading = signal(false);
  searchTerm = '';
  typesPaiement = [0, 1, 2, 3]; // Pour itérer dans le HTML

  constructor(
    private firebaseService: FirebaseService,
    private router: Router,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.loadPaiements();
  }

  async loadPaiements(): Promise<void> {
    this.isLoading.set(true);
    try {
      // Charger tous les paiements
      const paiements = await firstValueFrom(this.firebaseService.getPaiements());

      // Charger toutes les factures pour obtenir les informations supplémentaires
      const factures = await firstValueFrom(this.firebaseService.getFactures());

      // Enrichir les paiements avec les informations de la facture
      const paiementsEnrichis = paiements.map(paiement => {
        const facture = factures.find(f => f.id === paiement.id_facture);
        const clientNom = facture?.colis && facture.colis.length > 0 ?
          `${facture.colis[0].clientNom} ${facture.colis[0].clientPrenom}` :
          'Client inconnu';

        return {
          ...paiement,
          factureId: paiement.id_facture || '',
          clientNom,
          montantFacture: facture?.montant,
          montantPayeFacture: facture?.montantPaye
        } as PaiementAffichage;
      });

      // Trier par date de paiement (le plus récent en premier)
      paiementsEnrichis.sort((a, b) => {
        const dateA = new Date(a.datepaiement);
        const dateB = new Date(b.datepaiement);
        return dateB.getTime() - dateA.getTime();
      });

      this.paiements.set(paiementsEnrichis);
      this.filteredPaiements.set(paiementsEnrichis);
    } catch (error) {
      console.error('Erreur lors du chargement des paiements:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredPaiements.set(this.paiements());
      return;
    }

    const term = this.searchTerm.toLowerCase();
    const filtered = this.paiements().filter(paiement => {
      // Recherche par ID de facture
      const factureIdMatch = paiement.factureId.toLowerCase().includes(term);

      // Recherche par ID de paiement
      const paiementIdMatch = paiement.id ? paiement.id.toLowerCase().includes(term) : false;

      // Recherche par type de paiement
      const typePaiementMatch = TYPE_PAIEMENT[paiement.typepaiement].toLowerCase().includes(term);

      // Recherche par client
      const clientMatch = paiement.clientNom ? paiement.clientNom.toLowerCase().includes(term) : false;

      // Recherche par montant
      const montantMatch = paiement.montant_paye.toString().includes(term);

      // Recherche par référence (si elle existe)
      const referenceMatch = paiement.reference ?
        paiement.reference.toLowerCase().includes(term) : false;

      return factureIdMatch || paiementIdMatch || typePaiementMatch ||
        clientMatch || montantMatch || referenceMatch;
    });

    this.filteredPaiements.set(filtered);
  }

  resetSearch(): void {
    this.searchTerm = '';
    this.filteredPaiements.set(this.paiements());
  }

  getTypePaiementLabel(type: number): string {
    return TYPE_PAIEMENT[type] || 'Inconnu';
  }

  viewFactureDetails(factureId: string): void {
    const modalRef = this.modalService.open(FactureDetailsModalComponent, {
      size: 'xl',
      centered: true,
      backdrop: 'static',
      keyboard: false
    });

    modalRef.componentInstance.factureId = factureId;

    // Rafraîchir la liste des paiements si un nouveau paiement est effectué
    modalRef.componentInstance.paiementRequest.subscribe(() => {
      this.loadPaiements();
    });

    modalRef.result.then(
      (result) => {
        if (result === 'success') {
          this.loadPaiements();
        }
      },
      () => {}
    );
  }

  formatDate(date: Date | string): string {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Méthodes pour les statistiques
  hasTypePaiement(type: number): boolean {
    return this.filteredPaiements().some(p => p.typepaiement === type);
  }

  getMontantTotalParType(type: number): number {
    return this.filteredPaiements()
      .filter(p => p.typepaiement === type)
      .reduce((total, p) => total + p.montant_paye, 0);
  }

  getNombrePaiementsParType(type: number): number {
    return this.filteredPaiements().filter(p => p.typepaiement === type).length;
  }

  getMontantTotal(): number {
    return this.filteredPaiements().reduce((total, p) => total + p.montant_paye, 0);
  }
}

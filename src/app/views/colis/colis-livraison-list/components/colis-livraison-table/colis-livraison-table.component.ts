import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Colis, STATUT_COLIS, TYPE_COLIS, TYPE_EXPEDITION } from '@/app/models/partenaire.model';
import { firstValueFrom } from 'rxjs';
import { computed, signal } from '@angular/core';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-colis-livraison-table',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbPaginationModule],
  templateUrl: './colis-livraison-table.component.html',
  styleUrl: './colis-livraison-table.component.scss'
})
export class ColisLivraisonTableComponent implements OnInit {
  Math = Math; // Pour utiliser Math dans le template
  colis = signal<Colis[]>([]);
  filteredColis = signal<Colis[]>([]);
  isLoading = signal(false);
  searchTerm = '';

  // Pagination
  page = signal(1);
  pageSize = signal(10);

  // Computed signal pour obtenir les éléments de la page courante
  paginatedColis = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredColis().slice(start, end);
  });

  // Total d'éléments pour la pagination
  total = computed(() => this.filteredColis().length);

  constructor(private firebaseService: FirebaseService) {}

  ngOnInit(): void {
    this.loadColis();
  }

  async loadColis(): Promise<void> {
    this.isLoading.set(true);
    try {
      const allColis = await firstValueFrom(this.firebaseService.getColis());
      // Filtrer pour n'avoir que les colis en attente de livraison
      const colisEnAttenteLivraison = allColis.filter(
        colis => colis.statut === STATUT_COLIS.EN_ATTENTE_LIVRAISON
      );

      this.colis.set(colisEnAttenteLivraison);
      this.filteredColis.set(colisEnAttenteLivraison);
      // Réinitialiser la pagination lorsque les données sont chargées
      this.page.set(1);
    } catch (error) {
      console.error('Erreur lors du chargement des colis:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredColis.set(this.colis());
      this.page.set(1);
      return;
    }

    const term = this.searchTerm.toLowerCase();
    const filtered = this.colis().filter(colis => {
      return (
        colis.codeSuivi.toLowerCase().includes(term) ||
        colis.clientNom.toLowerCase().includes(term) ||
        colis.clientPrenom.toLowerCase().includes(term) ||
        (colis.description && colis.description.toLowerCase().includes(term))
      );
    });

    this.filteredColis.set(filtered);
    this.page.set(1); // Réinitialiser à la première page après recherche
  }

  onPageChange(newPage: number): void {
    this.page.set(newPage);
  }

  onPageSizeChange(event: Event): void {
    const newSize = parseInt((event.target as HTMLSelectElement).value);
    this.pageSize.set(newSize);
    this.page.set(1); // Réinitialiser à la première page après changement de taille
  }

  getTypeColisLabel(type: TYPE_COLIS): string {
    return TYPE_COLIS[type].replace(/_/g, ' ');
  }

  getTypeExpeditionLabel(type: TYPE_EXPEDITION): string {
    return TYPE_EXPEDITION[type];
  }

  async marquerCommeLivre(colisId: string): Promise<void> {
    try {
      await this.firebaseService.updateColis(colisId, {
        statut: STATUT_COLIS.LIVRE
      });
      await this.loadColis(); // Recharger la liste
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  }
}

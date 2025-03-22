import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Colis, STATUT_COLIS, TYPE_COLIS, TYPE_EXPEDITION } from '@/app/models/partenaire.model';
import { firstValueFrom } from 'rxjs';
import { computed, signal } from '@angular/core';
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-colis-archives-table',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbPaginationModule],
  templateUrl: './colis-archives-table.component.html',
  styleUrl: './colis-archives-table.component.scss'
})
export class ColisArchivesTableComponent implements OnInit {
  Math = Math; // Pour utiliser Math dans le template
  colis = signal<Colis[]>([]);
  filteredColis = signal<Colis[]>([]);
  isLoading = signal(false);
  searchTerm = '';

  selectedStatut: STATUT_COLIS | 'TOUS' = 'TOUS';

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

  // Computed signals for statistics
  colisLivres = computed(() =>
    this.filteredColis().filter(c => c.statut === STATUT_COLIS.LIVRE).length
  );

  colisAnnules = computed(() =>
    this.filteredColis().filter(c => c.statut === STATUT_COLIS.ANNULE).length
  );

  montantTotal = computed(() =>
    this.filteredColis().reduce((sum, c) => sum + (c.cout || 0), 0)
  );

  // Liste des statuts pour le filtre
  statuts = [
    { value: 'TOUS', label: 'Tous les statuts' },
    { value: STATUT_COLIS.LIVRE, label: 'Livrés' },
    { value: STATUT_COLIS.ANNULE, label: 'Annulés' }
  ];

  constructor(private firebaseService: FirebaseService) {}

  ngOnInit(): void {
    this.loadColis();
  }

  async loadColis(): Promise<void> {
    this.isLoading.set(true);
    try {
      const allColis = await firstValueFrom(this.firebaseService.getColis());
      // Filtrer pour n'avoir que les colis livrés ou annulés
      const colisArchives = allColis.filter(
        colis => colis.statut === STATUT_COLIS.LIVRE || colis.statut === STATUT_COLIS.ANNULE
      );

      // Trier par date de création (le plus récent en premier)
      colisArchives.sort((a, b) => {
        const dateA = new Date(a.dateCreation || 0);
        const dateB = new Date(b.dateCreation || 0);
        return dateB.getTime() - dateA.getTime();
      });

      this.colis.set(colisArchives);
      this.applyFilters();

      // Réinitialiser la pagination
      this.page.set(1);
    } catch (error) {
      console.error('Erreur lors du chargement des colis:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  applyFilters(): void {
    let filtered = this.colis();

    // Filtre par statut
    if (this.selectedStatut !== 'TOUS') {
      filtered = filtered.filter(colis => colis.statut === this.selectedStatut);
    }

    // Filtre par terme de recherche
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(colis => {
        return (
          colis.codeSuivi.toLowerCase().includes(term) ||
          colis.clientNom.toLowerCase().includes(term) ||
          colis.clientPrenom.toLowerCase().includes(term) ||
          colis.clientEmail.toLowerCase().includes(term) ||
          (colis.description && colis.description.toLowerCase().includes(term)) ||
          this.getTypeColisLabel(colis.type).toLowerCase().includes(term)
        );
      });
    }

    this.filteredColis.set(filtered);

    // Réinitialiser la pagination après application des filtres
    this.page.set(1);
  }

  onSearch(): void {
    this.applyFilters();
  }

  onStatutChange(): void {
    this.applyFilters();
  }

  onPageChange(newPage: number): void {
    this.page.set(newPage);
  }

  onPageSizeChange(event: Event): void {
    const newSize = parseInt((event.target as HTMLSelectElement).value);
    this.pageSize.set(newSize);
    this.page.set(1); // Réinitialiser à la première page après changement de taille
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatut = 'TOUS';
    this.applyFilters();
  }

  getTypeColisLabel(type: TYPE_COLIS): string {
    return TYPE_COLIS[type].replace(/_/g, ' ');
  }

  getTypeExpeditionLabel(type: TYPE_EXPEDITION): string {
    return TYPE_EXPEDITION[type];
  }

  getStatutClass(statut: STATUT_COLIS): string {
    switch(statut) {
      case STATUT_COLIS.LIVRE:
        return 'bg-success';
      case STATUT_COLIS.ANNULE:
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  getStatutLabel(statut: STATUT_COLIS): string {
    return STATUT_COLIS[statut].replace(/_/g, ' ');
  }

  formatDate(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

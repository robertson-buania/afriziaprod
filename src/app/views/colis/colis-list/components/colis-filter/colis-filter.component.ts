import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbDropdownModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ColisFormModalComponent } from '../colis-form-modal/colis-form-modal.component';
import { ColisService } from '@/app/core/services/colis.service';
import { TableService } from '@/app/core/service/table.service';
import { FormsModule } from '@angular/forms';
import { Colis, STATUT_COLIS } from '@/app/models/partenaire.model';

@Component({
  selector: 'app-colis-filter',
  standalone: true,
  imports: [CommonModule, NgbDropdownModule, FormsModule],
  template: `
    <div class="d-flex gap-2">
      <input
        type="text"
        class="form-control"
        placeholder="Rechercher..."
        [(ngModel)]="searchTerm"
        (input)="onSearch()"
      >
      <button
        class="btn btn-primary"
        (click)="openCreateModal()"
      >
        <i class="las la-plus me-2"></i>Enregistrer un colis
      </button>
    </div>
  `
})
export class ColisFilterComponent {
  searchTerm = '';
  @Output() search = new EventEmitter<string>();
  private modalService = inject(NgbModal);
  private colisService = inject(ColisService);
  private tableService = inject(TableService);

  statuts = Object.values(STATUT_COLIS)
    .filter(v => typeof v === 'number')
    .map(v => ({
      value: v,
      label: STATUT_COLIS[v].replace(/_/g, ' '),
      class: this.getBadgeClass(v as STATUT_COLIS)
    }));

  selectedStatuts: number[] = [];

  constructor() {}

  isStatutSelected(statut: number): boolean {
    return this.selectedStatuts.includes(statut);
  }

  toggleStatutFilter(statut: number) {
    this.selectedStatuts = this.selectedStatuts.includes(statut)
      ? this.selectedStatuts.filter(s => s !== statut)
      : [...this.selectedStatuts, statut];

    // Récupération des items originaux via le service
    const originalItems = this.tableService['_originalItems'] as Colis[];

    // Filtrage des éléments
    const filteredItems = originalItems.filter(c =>
      this.selectedStatuts.length === 0 ||
      this.selectedStatuts.includes(c.statut!)
    );

    // Mise à jour via la méthode officielle du service
    this.tableService.setItems(filteredItems, this.tableService.pageSize);
  }

  private getBadgeClass(statut: STATUT_COLIS): string {
    switch(statut) {
      case STATUT_COLIS.EN_ATTENTE_VERIFICATION: return 'bg-warning text-dark';
      case STATUT_COLIS.EN_ATTENTE_PAIEMENT: return 'bg-info';
      case STATUT_COLIS.EN_ATTENTE_LIVRAISON: return 'bg-primary';
      case STATUT_COLIS.LIVRE: return 'bg-success';
      case STATUT_COLIS.ANNULE: return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  onSearch() {
    this.search.emit(this.searchTerm);
  }

  async refreshTableData() {
    const colis = await this.colisService.getColis();
    this.tableService.setItems(colis, 10);
  }

  openCreateModal() {
    const modalRef = this.modalService.open(ColisFormModalComponent, {
      size: 'lg',
      centered: true
    });

    modalRef.closed.subscribe(async () => {
      await this.refreshTableData();
    });

    modalRef.dismissed.subscribe(async () => {
      await this.refreshTableData();
    });
  }
}

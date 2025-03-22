import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbDropdownModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PartenaireFormModalComponent } from '../partenaire-form-modal/partenaire-form-modal.component';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { TableService } from '@/app/core/service/table.service';

@Component({
  selector: 'partenaire-filter',
  standalone: true,
  imports: [CommonModule, NgbDropdownModule],
  template: `
    <form class="row g-2">
      <div ngbDropdown class="col-auto">
        <a
          ngbDropdownToggle
          class="btn bg-primary-subtle text-primary dropdown-toggle d-flex align-items-center arrow-none"
          role="button"
          aria-haspopup="false"
          aria-expanded="false"
          data-bs-auto-close="outside"
        >
          <i class="iconoir-filter-alt me-1"></i> Filter
        </a>
        <div ngbDropdownMenu class="dropdown-menu dropdown-menu-start">
          <div class="p-2">
            <div class="form-check mb-2">
              <input type="checkbox" class="form-check-input" checked id="filter-all" />
              <label class="form-check-label" for="filter-all">Tous</label>
            </div>
            <div class="form-check mb-2">
              <input type="checkbox" class="form-check-input" checked id="filter-one" />
              <label class="form-check-label" for="filter-one">Nouveaux</label>
            </div>
            <div class="form-check mb-2">
              <input type="checkbox" class="form-check-input" checked id="filter-two" />
              <label class="form-check-label" for="filter-two">Actifs</label>
            </div>
            <div class="form-check">
              <input type="checkbox" class="form-check-input" checked id="filter-three" />
              <label class="form-check-label" for="filter-three">Inactifs</label>
            </div>
          </div>
        </div>
      </div>

      <div class="col-auto">
        <button type="button" class="btn btn-primary" (click)="openAddModal()">
          <i class="fa-solid fa-plus me-1"></i> Ajouter un client
        </button>
      </div>
    </form>
  `
})
export class PartenaireFilterComponent {
  searchTerm = signal<string>('');
  private modalService = inject(NgbModal);
  private firebaseService = inject(FirebaseService);
  private tableService = inject(TableService);

  onSearch() {
    this.tableService.searchTerm = this.searchTerm();
  }

  openAddModal() {
    const modalRef = this.modalService.open(PartenaireFormModalComponent, {
      size: 'lg',
      centered: true
    });

    modalRef.result.then(
      async (result) => {
        if (result) {
          try {
            await this.firebaseService.addPartenaire(result);
          } catch (error) {
            console.error('Erreur lors de l\'ajout du client:', error);
          }
        }
      },
      (reason) => {
        console.log('Modal fermé');
      }
    );
  }

  clearSearch() {
    this.searchTerm.set('');
    this.tableService.searchTerm = '';
    this.tableService.resetItems();
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableService } from '@/app/core/service/table.service';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Sac } from '@/app/models/partenaire.model';
import { TableFooterComponent } from '@/app/components/table/table-footer/table-footer.component';
import { TableHeaderComponent } from '@/app/components/table/table-header/table-header.component';
import { AsyncPipe } from '@angular/common';
import { debounceTime, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-sacs-table',
  standalone: true,
  imports: [
    CommonModule,
    TableFooterComponent,
    TableHeaderComponent,
    AsyncPipe
  ],
  template: `
    <app-table-header />
    <div class="table-responsive">
      <table class="table mb-0">
        <thead class="table-light">
          <tr>
            <th style="width: 50px"></th>
            <th>Référence</th>
            <th>Nombre de colis</th>
            <th>Date d'arrivée</th>
            <th>Statut</th>
            <th class="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          <ng-container *ngFor="let sac of sacs$ | async">
            <!-- Ligne du sac -->
            <tr class="table-primary">
              <td>
                <button
                  class="btn btn-sm btn-link p-0"
                  (click)="toggleColisDetails(sac)"
                >
                  <i class="las" [ngClass]="isExpanded(sac) ? 'la-chevron-down' : 'la-chevron-right'"></i>
                </button>
              </td>
              <td>
                <span class="fw-medium text-primary">{{ sac.reference }}</span>
              </td>
              <td>
                <span class="badge bg-info">{{ sac.colis.length }}</span>
              </td>
              <td>{{ sac.dateCreation | date: 'dd/MM/yyyy HH:mm' }}</td>
              <td>
                <span class="badge" [ngClass]="getStatusBadgeClass(sac)">
                  {{ getStatusLabel(sac) }}
                </span>
              </td>
              <td class="text-end">
                <button
                  (click)="openDeleteModal(deleteModal, sac)"
                  class="btn btn-sm btn-light"
                >
                  <i class="las la-trash"></i>
                </button>
              </td>
            </tr>
            <!-- Lignes des colis -->
            <tr *ngIf="isExpanded(sac)" class="table-light">
              <td colspan="6">
                <div class="table-responsive mb-0">
                  <table class="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Code Suivi</th>
                        <th>Client</th>
                        <th>Type</th>
                        <th>Statut</th>
                        <th>Destination</th>
                        <th>Poids</th>
                        <th>Quantité</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let colis of sac.colis">
                        <td>{{ colis.codeSuivi }}</td>
                        <td>{{ colis.clientNom }} {{ colis.clientPrenom }}</td>
                        <td>{{ colis.type }}</td>
                        <td>
                          <span class="badge" [ngClass]="getColisStatusBadgeClass(colis)">
                            {{ colis.statut }}
                          </span>
                        </td>
                        <td>{{ colis.destination }}</td>
                        <td>{{ colis.poids ? colis.poids + ' kg' : '-' }}</td>
                        <td>{{ colis.quantite }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </ng-container>
          <tr *ngIf="(sacs$ | async)?.length === 0">
            <td colspan="6" class="text-center py-4 text-muted">
              Aucun sac trouvé
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <app-table-footer [total]="total$" />

    <!-- Modal de suppression -->
    <ng-template #deleteModal let-modal>
      <div class="modal-header bg-danger">
        <h6 class="modal-title text-white">Confirmation de suppression</h6>
        <button type="button" class="btn-close" (click)="modal.dismiss()" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div class="text-center mb-3">
          <i class="las la-exclamation-triangle text-danger" style="font-size: 48px;"></i>
        </div>
        <p class="text-center mb-4">
          Êtes-vous sûr de vouloir supprimer ce sac ?<br>
          <small class="text-muted">Cette action est irréversible.</small>
        </p>
        <div class="d-flex justify-content-center">
          <button type="button" class="btn btn-light me-2" (click)="modal.dismiss()">Annuler</button>
          <button type="button" class="btn btn-danger" [disabled]="isLoading" (click)="confirmDelete(modal)">
            <span class="d-flex align-items-center">
              <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-2"></span>
              Supprimer
            </span>
          </button>
        </div>
      </div>
    </ng-template>
  `
})
export class SacsTableComponent implements OnInit {
  sacs$ = this.tableService.items$;
  total$ = this.tableService.total$;
  isLoading = false;
  sacToDelete: Sac | null = null;
  private expandedSacs = new Set<string>();

  constructor(
    public tableService: TableService<Sac>,
    private firebaseService: FirebaseService,
    private modalService: NgbModal
  ) {}

  ngOnInit() {
    this.loadSacs();
  }

  private loadSacs() {
    this.isLoading = true;
    this.firebaseService.getSacs()
      .pipe(
        map((sacs: Sac[]) => {
          console.log('Sacs reçus:', sacs);
          return sacs.sort((a: Sac, b: Sac) => 
            new Date(b.dateCreation || '').getTime() - new Date(a.dateCreation || '').getTime()
          );
        }),
        catchError(error => {
          console.error('Erreur lors du chargement des sacs:', error);
          return of([]);
        })
      )
      .subscribe((sacs: Sac[]) => {
        console.log('Sacs triés:', sacs);
        const pageSize = 10;
        this.tableService.setItems(sacs, pageSize);
        this.isLoading = false;
      });
  }

  isExpanded(sac: Sac): boolean {
    return this.expandedSacs.has(sac.reference);
  }

  toggleColisDetails(sac: Sac): void {
    if (this.isExpanded(sac)) {
      this.expandedSacs.delete(sac.reference);
    } else {
      this.expandedSacs.add(sac.reference);
    }
  }

  openDeleteModal(modal: any, sac: Sac) {
    this.sacToDelete = sac;
    this.modalService.open(modal, { centered: true });
  }

  async confirmDelete(modal: any) {
    if (!this.sacToDelete?.id) return;

    this.isLoading = true;
    try {
      await this.firebaseService.deleteSac(this.sacToDelete.id);
      this.loadSacs(); // Recharger la liste après la suppression
      modal.close();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    } finally {
      this.isLoading = false;
      this.sacToDelete = null;
    }
  }

  getStatusLabel(sac: Sac): string {
    return sac.colis.length > 0 ? 'Avec colis' : 'Vide';
  }

  getStatusBadgeClass(sac: Sac): string {
    return sac.colis.length > 0 ? 'bg-success' : 'bg-warning text-dark';
  }

  getColisStatusBadgeClass(colis: any): string {
    switch(colis.statut) {
      case 'EN_ATTENTE_VERIFICATION':
        return 'bg-warning text-dark';
      case 'EN_ATTENTE_FACTURATION':
        return 'bg-secondary text-white';
      case 'EN_ATTENTE_PAIEMENT':
        return 'bg-info text-white';
      case 'EN_ATTENTE_LIVRAISON':
        return 'bg-primary text-white';
      case 'LIVRE':
        return 'bg-success text-white';
      default:
        return 'bg-danger text-white';
    }
  }
} 
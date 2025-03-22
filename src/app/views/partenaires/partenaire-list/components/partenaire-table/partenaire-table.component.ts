import { Component, ViewChildren, QueryList, OnInit } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Observable, BehaviorSubject } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Partenaire } from '@/app/models/partenaire.model';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { TableService } from '@/app/core/service/table.service';
import { NgbdSortableHeader, SortEvent } from '@/app/core/directive/sortable.directive';
import { TableHeaderComponent } from '@/app/components/table/table-header/table-header.component';
import { TableFooterComponent } from '@/app/components/table/table-footer/table-footer.component';
import { PartenaireFormModalComponent } from '../partenaire-form-modal/partenaire-form-modal.component';

@Component({
  selector: 'partenaire-table',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    NgbdSortableHeader,
    TableHeaderComponent,
    TableFooterComponent
  ],
  template: `
    <app-table-header />
    <div class="table-responsive">
      <table class="table mb-0 table-centered" id="partenaires_table">
        <thead class="table-light">
          <tr>
            <th sortable="nom" (sort)="onSort($event)">Nom complet</th>
            <th sortable="email" (sort)="onSort($event)">Email</th>
            <th sortable="telephone" (sort)="onSort($event)">Téléphone</th>
            <th>Adresse</th>
            <th class="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (partenaire of partenaires$ | async; track partenaire.id) {
            <tr>
              <td>
                {{ partenaire.nom }} {{ partenaire.postnom }} {{ partenaire.prenom }}
              </td>
              <td>{{ partenaire.email }}</td>
              <td>{{ partenaire.telephone }}</td>
              <td>{{ partenaire.adresse }}</td>
              <td class="text-end">
                <a href="javascript:void(0);" (click)="openEditModal(partenaire)">
                  <i class="las la-pen text-secondary fs-18"></i>
                </a>
                <a href="javascript:void(0);" (click)="deletePartenaire(partenaire.id!)">
                  <i class="las la-trash-alt text-secondary fs-18"></i>
                </a>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="text-center">Aucun client trouvé</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    @if ((total$ | async) || 0) {
      <app-table-footer [total]="total$ " />
    }
  `
})
export class PartenaireTableComponent implements OnInit {
  partenaires$: Observable<Partenaire[]>;
  total$: Observable<number>;

  @ViewChildren(NgbdSortableHeader) headers!: QueryList<NgbdSortableHeader<Partenaire>>;

  constructor(
    private firebaseService: FirebaseService,
    private modalService: NgbModal,
    public tableService: TableService<Partenaire>
  ) {
    this.partenaires$ = tableService.items$;
    this.total$ = tableService.total$;
  }

  ngOnInit(): void {
    this.loadPartenaires();
  }

  private loadPartenaires(): void {
    this.firebaseService.getPartenaires().subscribe(partenaires => {
      this.tableService.setItems(partenaires, 10);
    });
  }

  onSort(event: SortEvent<Partenaire>) {
    const { column, direction } = event;

    // Réinitialiser les autres en-têtes
    this.headers.forEach(header => {
      if (header.sortable !== column) {
        header.direction = '';
      }
    });

    this.tableService.sortColumn = column;
    this.tableService.sortDirection = direction;
  }

  openEditModal(partenaire: Partenaire) {
    const modalRef = this.modalService.open(PartenaireFormModalComponent, {
      size: 'lg',
      centered: true
    });

    // Passer une copie du client pour éviter la mutation directe
    modalRef.componentInstance.partenaire = { ...partenaire };

    modalRef.result.then(
      async (updatedPartenaire: Partenaire) => {
        if (updatedPartenaire) {
          try {
            await this.firebaseService.updatePartenaire(updatedPartenaire);
            this.loadPartenaires(); // Recharger les données après mise à jour
          } catch (error) {
            console.error('Erreur lors de la mise à jour du client:', error);
            alert('Une erreur est survenue lors de la mise à jour');
          }
        }
      },
      (reason) => {
        // Gérer l'annulation
      }
    );
  }

  async deletePartenaire(id: string) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      try {
        await this.firebaseService.deletePartenaire(id);
      } catch (error) {
        console.error('Erreur lors de la suppression du client:', error);
      }
    }
  }
}

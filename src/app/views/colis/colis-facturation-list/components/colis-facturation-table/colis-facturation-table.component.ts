import { CommonModule } from '@angular/common'
import { Component, OnInit } from '@angular/core'
import { ColisService } from '@/app/core/services/colis.service'
import { TableService } from '@/app/core/service/table.service'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ColisFormModalComponent } from '../../../colis-list/components/colis-form-modal/colis-form-modal.component'
import {
  Colis,
  STATUT_COLIS,
  TYPE_COLIS,
  TYPE_EXPEDITION,
} from '@/app/models/partenaire.model'
import { TableFooterComponent } from '@/app/components/table/table-footer/table-footer.component'
import { TableHeaderComponent } from '@/app/components/table/table-header/table-header.component'
import { FirebaseService } from '@/app/core/services/firebase.service'
import { AsyncPipe } from '@angular/common'
import { PhoneFormatPipe } from '@/app/core/pipes/phone-format.pipe'
import { debounceTime, map } from 'rxjs/operators'

@Component({
  selector: 'app-colis-facturation-table',
  standalone: true,
  imports: [
    CommonModule,
    TableFooterComponent,
    TableHeaderComponent,
    AsyncPipe,
    PhoneFormatPipe,
  ],
  templateUrl:"../colis-facturation-table/colis-facturation-table.component.html",
  styleUrl:"../colis-facturation-table/colis-facturation-table.component.scss"
})
export class ColisFacturationTableComponent implements OnInit {
  colis$ = this.tableService.items$
  total$ = this.tableService.total$
  deletingId: string | null = null
  isLoading = false
  colisToDelete: Colis | null = null

  readonly STATUT_COLIS = STATUT_COLIS
  readonly TYPE_COLIS = TYPE_COLIS
  readonly TYPE_EXPEDITION = TYPE_EXPEDITION

  constructor(
    private colisService: ColisService,
    public tableService: TableService<Colis>,
    private modalService: NgbModal,
    private firebaseService: FirebaseService
  ) {}

  ngOnInit() {
    this.firebaseService.getColis()
      .pipe(
        map(colis => colis.filter(c => c.statut === STATUT_COLIS.EN_ATTENTE_FACTURATION))
      )
      .subscribe(filteredColis => {
        this.tableService.setItems(filteredColis, 10)
      })

    this.tableService.searchTerm$
      .pipe(debounceTime(300))
      .subscribe(() => {
        // La recherche est maintenant gérée par le TableService
      })
  }

  openEditModal(colis: Colis) {
    const modalRef = this.modalService.open(ColisFormModalComponent, {
      size: 'lg',
      beforeDismiss: () => !this.isLoading,
    })

    modalRef.componentInstance.colis = { ...colis }
  }

  openDeleteModal(modal: any, colis: Colis) {
    this.colisToDelete = colis
    this.modalService.open(modal, { centered: true })
  }

  async confirmDelete(modal: any) {
    if (!this.colisToDelete?.id) return

    this.isLoading = true
    try {
      await this.colisService.deleteColis(this.colisToDelete.id)
      modal.close()
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
    } finally {
      this.isLoading = false
      this.colisToDelete = null
    }
  }

  getStatutLabel(statut: STATUT_COLIS): string {
    switch(statut) {
      case STATUT_COLIS.EN_ATTENTE_VERIFICATION:
        return 'En attente de vérification';
      case STATUT_COLIS.EN_ATTENTE_FACTURATION:
        return 'En attente de facturation';
      case STATUT_COLIS.EN_ATTENTE_PAIEMENT:
        return 'En attente de paiement';
      case STATUT_COLIS.EN_ATTENTE_LIVRAISON:
        return 'En attente de livraison';
      case STATUT_COLIS.LIVRE:
        return 'Livré';
      default:
        return 'Annulé';
    }
  }

  getTypeColisLabel(type: TYPE_COLIS): string {
    return TYPE_COLIS[type].replace(/_/g, ' ')
  }

  getTypeExpeditionLabel(type: TYPE_EXPEDITION): string {
    return TYPE_EXPEDITION[type].replace(/_/g, ' ')
  }

  getStatutBadgeClass(statut: STATUT_COLIS): string {
    switch (statut) {
      case STATUT_COLIS.EN_ATTENTE_VERIFICATION:
        return 'bg-warning text-dark'
      case STATUT_COLIS.EN_ATTENTE_FACTURATION:
        return 'bg-info text-white'
      case STATUT_COLIS.EN_ATTENTE_PAIEMENT:
        return 'bg-primary text-white'
      case STATUT_COLIS.EN_ATTENTE_LIVRAISON:
        return 'bg-success text-white'
      case STATUT_COLIS.LIVRE:
        return 'bg-success text-white'
      default:
        return 'bg-secondary text-white'
    }
  }

  isTypeWithUnites(type: TYPE_COLIS): boolean {
    return type === TYPE_COLIS.ORDINATEUR || type === TYPE_COLIS.TELEPHONE;
  }
}

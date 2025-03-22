import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ColisTableComponent } from './components/colis-table/colis-table.component';
import { TableService } from '@/app/core/service/table.service';
import { Colis } from '@/app/models/partenaire.model';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ColisFormModalComponent } from './components/colis-form-modal/colis-form-modal.component';

@Component({
  selector: 'app-colis-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ColisTableComponent],
  providers: [
    { provide: TableService, useClass: TableService<Colis> }
  ],
  templateUrl:"../colis-list/colis-list.component.html"
})
export class ColisListComponent {
  constructor(private modalService: NgbModal) {}

  openNewColisModal() {
    const modalRef = this.modalService.open(ColisFormModalComponent, {
      size: 'lg'
    });
  }
}

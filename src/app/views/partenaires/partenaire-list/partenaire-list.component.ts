import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PartenaireTableComponent } from './components/partenaire-table/partenaire-table.component';
import { PartenaireFilterComponent } from './components/partenaire-filter/partenaire-filter.component';
import { TableService } from '@/app/core/service/table.service';
import { Partenaire } from '@/app/models/partenaire.model';
import { FirebaseService } from '@/app/core/services/firebase.service';

@Component({
  selector: 'app-partenaire-list',
  standalone: true,
  imports: [
    CommonModule,
    PartenaireTableComponent,
    PartenaireFilterComponent
  ],
  providers: [
    { provide: TableService, useClass: TableService<Partenaire> },
    FirebaseService
  ],
  template: `
    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <div class="row align-items-center">
              <div class="col">
                <h4 class="card-title">Clients</h4>
              </div>
              <div class="col-auto">
                <partenaire-filter />
              </div>
            </div>
          </div>
          <div class="card-body pt-0">
            <partenaire-table />
          </div>
        </div>
      </div>
    </div>
  `
})
export class PartenaireListComponent {}

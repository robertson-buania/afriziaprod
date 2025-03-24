import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TableService } from '@/app/core/service/table.service';
import { Sac } from '@/app/models/partenaire.model';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { SacsTableComponent } from './components/sacs-table/sacs-table.component';

@Component({
  selector: 'app-colis-liste-arrive',
  standalone: true,
  imports: [CommonModule, RouterLink, SacsTableComponent],
  providers: [
    { provide: TableService, useClass: TableService<Sac> },
    FirebaseService
  ],
  template: `
    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <div class="row align-items-center">
              <div class="col">
                <h4 class="card-title">
                  <i class="las la-box me-2"></i>Liste des sacs de colis arrivés
                </h4>
              </div>
              <div class="col-auto">
                <a class="btn btn-success" routerLink="/colis/import-sacs">
                  <i class="las la-plus me-1"></i>Nouveau sac
                </a>
              </div>
            </div>
          </div>
          <div class="card-body pt-0">
            <app-sacs-table />
          </div>
        </div>
      </div>
    </div>
  `
})
export class ColisListeArriveComponent implements OnInit {
  constructor(private firebaseService: FirebaseService) {}

  ngOnInit(): void {
    // Vérifions que les données sont bien récupérées
    this.firebaseService.getSacs().subscribe(sacs => {
      console.log('Sacs récupérés:', sacs);
    });
  }
} 
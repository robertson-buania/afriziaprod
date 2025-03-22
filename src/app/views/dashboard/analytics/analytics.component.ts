import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Colis, STATUT_COLIS } from '@/app/models/partenaire.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container-fluid">
      <!-- Statistiques générales -->
      <div class="row">
        <div class="col-xl-3 col-md-6">
          <div class="card">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="avatar-md bg-primary-subtle rounded">
                  <i class="las la-box avatar-title text-primary"></i>
                </div>
                <div class="ms-3">
                  <h4 class="mb-1">{{ totalColis }}</h4>
                  <p class="text-muted mb-0">Total des colis</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-xl-3 col-md-6">
          <div class="card">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="avatar-md bg-success-subtle rounded">
                  <i class="las la-check-circle avatar-title text-success"></i>
                </div>
                <div class="ms-3">
                  <h4 class="mb-1">{{ colisLivres }}</h4>
                  <p class="text-muted mb-0">Colis livrés</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-xl-3 col-md-6">
          <div class="card">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="avatar-md bg-warning-subtle rounded">
                  <i class="las la-clock avatar-title text-warning"></i>
                </div>
                <div class="ms-3">
                  <h4 class="mb-1">{{ colisEnAttente }}</h4>
                  <p class="text-muted mb-0">Colis en attente</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-xl-3 col-md-6">
          <div class="card">
            <div class="card-body">
              <div class="d-flex align-items-center">
                <div class="avatar-md bg-danger-subtle rounded">
                  <i class="las la-times-circle avatar-title text-danger"></i>
                </div>
                <div class="ms-3">
                  <h4 class="mb-1">{{ colisAnnules }}</h4>
                  <p class="text-muted mb-0">Colis annulés</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Statistiques détaillées -->
      <div class="row">
        <div class="col-xl-8">
          <div class="card">
            <div class="card-header">
              <h4 class="card-title mb-0">Répartition des colis par statut</h4>
            </div>
            <div class="card-body">
              <div class="table-responsive">
                <table class="table table-centered table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Statut</th>
                      <th>Nombre</th>
                      <th>Pourcentage</th>
                      <th>Progression</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for(stat of statsParStatut; track stat.statut) {
                      <tr>
                        <td>
                          <span class="badge" [ngClass]="getBadgeClass(stat.statut)">
                            {{ getStatutLabel(stat.statut) }}
                          </span>
                        </td>
                        <td>{{ stat.nombre }}</td>
                        <td>{{ (stat.nombre / totalColis * 100).toFixed(1) }}%</td>
                        <td>
                          <div class="progress" style="height: 5px;">
                            <div
                              class="progress-bar"
                              [ngClass]="getBadgeClass(stat.statut)"
                              [style.width.%]="(stat.nombre / totalColis * 100)"
                            ></div>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-4">
          <div class="card">
            <div class="card-header">
              <h4 class="card-title mb-0">Actions rapides</h4>
            </div>
            <div class="card-body">
              <div class="d-grid gap-2">
                <a routerLink="/dashboard/colis" class="btn btn-primary">
                  <i class="las la-box me-1"></i>Gérer les colis
                </a>
                <a routerLink="/dashboard/colis/facturation" class="btn btn-info">
                  <i class="las la-file-invoice-dollar me-1"></i>Facturation
                </a>
                <a routerLink="/dashboard/paiements" class="btn btn-success">
                  <i class="las la-money-bill-wave me-1"></i>Paiements
                </a>
                <a routerLink="/dashboard/colis/archives" class="btn btn-secondary">
                  <i class="las la-archive me-1"></i>Archives
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .avatar-md {
      height: 4rem;
      width: 4rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .avatar-title {
      font-size: 2rem;
    }

    .badge {
      padding: 0.5em 0.8em;
      font-weight: 500;
    }

    .progress {
      background-color: #e9ecef;
    }
  `]
})
export class AnalyticsComponent implements OnInit {
  totalColis = 0;
  colisLivres = 0;
  colisEnAttente = 0;
  colisAnnules = 0;
  statsParStatut: { statut: STATUT_COLIS; nombre: number }[] = [];

  constructor(private firebaseService: FirebaseService) {}

  ngOnInit() {
    this.loadStats();
  }

  async loadStats() {
    try {
      const colis = await firstValueFrom(this.firebaseService.getColis());

      // Calcul des totaux
      this.totalColis = colis.length;
      this.colisLivres = colis.filter(c => c.statut === STATUT_COLIS.LIVRE).length;
      this.colisAnnules = colis.filter(c => c.statut === STATUT_COLIS.ANNULE).length;
      this.colisEnAttente = colis.filter(c =>
        c.statut === STATUT_COLIS.EN_ATTENTE_VERIFICATION ||
        c.statut === STATUT_COLIS.EN_ATTENTE_FACTURATION ||
        c.statut === STATUT_COLIS.EN_ATTENTE_PAIEMENT ||
        c.statut === STATUT_COLIS.EN_ATTENTE_LIVRAISON
      ).length;

      // Statistiques par statut
      this.statsParStatut = Object.values(STATUT_COLIS)
        .filter(statut => typeof statut === 'number')
        .map(statut => ({
          statut: statut as STATUT_COLIS,
          nombre: colis.filter(c => c.statut === statut).length
        }));

    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  }

  getBadgeClass(statut: STATUT_COLIS): string {
    switch(statut) {
      case STATUT_COLIS.EN_ATTENTE_VERIFICATION:
        return 'bg-warning text-dark';
      case STATUT_COLIS.EN_ATTENTE_FACTURATION:
        return 'bg-info';
      case STATUT_COLIS.EN_ATTENTE_PAIEMENT:
        return 'bg-primary';
      case STATUT_COLIS.EN_ATTENTE_LIVRAISON:
        return 'bg-info';
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
}

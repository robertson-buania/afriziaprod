import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-layout">
      <!-- Barre de navigation -->
      <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container-fluid">
          <a class="navbar-brand" routerLink="/dashboard/analytics">
            <img src="assets/images/logo-sm.png" alt="Kamba Agency" height="40">
          </a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav me-auto">
              <li class="nav-item">
                <a class="nav-link" routerLink="/dashboard/analytics" routerLinkActive="active">
                  <i class="las la-chart-bar me-1"></i>Tableau de bord
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" routerLink="/dashboard/colis" routerLinkActive="active">
                  <i class="las la-box me-1"></i>Colis
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" routerLink="/dashboard/paiements" routerLinkActive="active">
                  <i class="las la-money-bill me-1"></i>Paiements
                </a>
              </li>
            </ul>
            <ul class="navbar-nav">
              <li class="nav-item">
                <a class="nav-link" routerLink="/">
                  <i class="las la-globe me-1"></i>Site web
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" routerLink="/auth/log-out">
                  <i class="las la-sign-out-alt me-1"></i>Déconnexion
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <!-- Contenu principal -->
      <div class="dashboard-content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .dashboard-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .navbar {
      padding: 0.5rem 1rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .nav-link {
      padding: 0.5rem 1rem;
      color: rgba(255,255,255,0.8);
      transition: color 0.3s ease;
    }

    .nav-link:hover, .nav-link.active {
      color: white;
    }

    .dashboard-content {
      flex: 1;
      padding: 1.5rem;
      background-color: #f8f9fa;
    }
  `]
})
export class DashboardLayoutComponent {}

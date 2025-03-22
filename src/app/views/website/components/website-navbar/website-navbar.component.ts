import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-website-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
      <div class="container">
        <a class="navbar-brand" routerLink="/">
          <img src="assets/images/logo-sm.png" alt="Kamba Agency" height="40">
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav ms-auto">
            <li class="nav-item">
              <a class="nav-link" routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
                <i class="las la-home me-1"></i>Accueil
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/tracking" routerLinkActive="active">
                <i class="las la-search me-1"></i>Suivre un colis
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/about" routerLinkActive="active">
                <i class="las la-info-circle me-1"></i>À propos
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/contact" routerLinkActive="active">
                <i class="las la-envelope me-1"></i>Contact
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/dashboard/analytics">
                <i class="las la-tachometer-alt me-1"></i>Dashboard
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/auth/log-in">
                <i class="las la-user me-1"></i>Compte
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      padding: 1rem 0;
    }
    .nav-link {
      font-weight: 500;
      color: #333;
      padding: 0.5rem 1rem;
      transition: color 0.3s ease;
    }
    .nav-link:hover, .nav-link.active {
      color: #4e73e1;
    }
    .navbar-brand {
      font-weight: 700;
      color: #333;
    }
  `]
})
export class WebsiteNavbarComponent {}

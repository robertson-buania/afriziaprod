import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PanierService } from '@/app/core/services/panier.service';
import { Subscription } from 'rxjs';

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
              <a class="nav-link" routerLink="/recherche-colis" routerLinkActive="active">
                <i class="las la-box me-1"></i>Rechercher un colis
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link position-relative" routerLink="/panier" routerLinkActive="active">
                <i class="las la-shopping-cart me-1"></i>Panier
                <span *ngIf="nombreArticles > 0" class="cart-counter">{{ nombreArticles }}</span>
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
    .cart-counter {
      position: absolute;
      top: 0;
      right: 0;
      background-color: #ff5252;
      color: white;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      transform: translate(50%, -30%);
    }
  `]
})
export class WebsiteNavbarComponent implements OnInit, OnDestroy {
  nombreArticles = 0;
  private subscription: Subscription = new Subscription();

  constructor(private panierService: PanierService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.panierService.panier$.subscribe(colis => {
        this.nombreArticles = colis.length;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}

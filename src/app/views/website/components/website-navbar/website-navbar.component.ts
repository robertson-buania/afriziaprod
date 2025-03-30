import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { PanierService } from '@/app/core/services/panier.service';
import { UtilisateurService } from '@/app/core/services/utilisateur.service';
import { Subscription } from 'rxjs';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { Utilisateur } from '@/app/models/utilisateur.model';
import { AuthModalService, AuthModalType } from '@/app/core/services/auth-modal.service';

@Component({
  selector: 'app-website-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, NgbDropdownModule],
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

            <!-- Menu utilisateur -->
            <li class="nav-item" ngbDropdown *ngIf="utilisateur">
              <a class="nav-link user-link" role="button" ngbDropdownToggle id="userDropdown">
                <i class="las la-user-circle me-1"></i>
                <span class="user-name">{{ utilisateur.prenom }}</span>
              </a>
              <div ngbDropdownMenu aria-labelledby="userDropdown" class="dropdown-menu-end">
                <div class="dropdown-header d-flex align-items-center">
                  <div class="user-avatar">
                    <i class="las la-user-circle"></i>
                  </div>
                  <div class="user-info ms-2">
                    <div class="fw-bold">{{ utilisateur.prenom }} {{ utilisateur.nom }}</div>
                    <small class="text-muted">{{ utilisateur.email }}</small>
                  </div>
                </div>
                <div class="dropdown-divider"></div>
                <a ngbDropdownItem routerLink="/profil">
                  <i class="las la-user me-2"></i>Mon profil
                </a>
                <a ngbDropdownItem routerLink="/mes-commandes">
                  <i class="las la-file-invoice me-2"></i>Mes commandes
                </a>
                <a ngbDropdownItem routerLink="/dashboard/analytics" *ngIf="estAdmin() || estPersonnel()">
                  <i class="las la-tachometer-alt me-2"></i>Tableau de bord
                </a>
                <div class="dropdown-divider"></div>
                <a ngbDropdownItem (click)="deconnecter()" class="text-danger">
                  <i class="las la-sign-out-alt me-2"></i>Déconnexion
                </a>
              </div>
            </li>

            <!-- Menu connexion/inscription si non connecté -->
            <li class="nav-item" ngbDropdown *ngIf="!utilisateur">
              <a class="nav-link" role="button" ngbDropdownToggle id="authDropdown">
                <i class="las la-user me-1"></i>Compte
              </a>
              <div ngbDropdownMenu aria-labelledby="authDropdown" class="dropdown-menu-end">
                <a ngbDropdownItem (click)="ouvrirModalConnexion()">
                  <i class="las la-sign-in-alt me-2"></i>Connexion
                </a>
                <a ngbDropdownItem (click)="ouvrirModalInscription()">
                  <i class="las la-user-plus me-2"></i>Inscription
                </a>
              </div>
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
    .user-link {
      display: flex;
      align-items: center;
    }
    .user-name {
      max-width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .dropdown-header {
      padding: 1rem;
      background-color: #f8f9fa;
    }
    .user-avatar {
      font-size: 2rem;
      color: #4e73e1;
    }
    .user-info {
      line-height: 1.2;
    }
  `]
})
export class WebsiteNavbarComponent implements OnInit, OnDestroy {
  nombreArticles = 0;
  utilisateur: Utilisateur | null = null;
  private subscription: Subscription = new Subscription();

  constructor(
    private panierService: PanierService,
    private utilisateurService: UtilisateurService,
    private router: Router,
    private authModalService: AuthModalService
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.panierService.panier$.subscribe(colis => {
        this.nombreArticles = colis.length;
      })
    );

    this.subscription.add(
      this.utilisateurService.utilisateurCourant$.subscribe(user => {
        this.utilisateur = user;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  deconnecter(): void {
    this.utilisateurService.deconnecter();
    this.router.navigate(['/']);
  }

  estAdmin(): boolean {
    return this.utilisateurService.estAdmin();
  }

  estPersonnel(): boolean {
    return this.utilisateurService.estPersonnel();
  }

  ouvrirModalConnexion(): void {
    this.authModalService.openAuthModal(AuthModalType.LOGIN);
  }

  ouvrirModalInscription(): void {
    this.authModalService.openAuthModal(AuthModalType.REGISTER);
  }
}

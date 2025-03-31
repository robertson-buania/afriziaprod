import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { PanierService } from '@/app/core/services/panier.service';
import { UtilisateurService } from '@/app/core/services/utilisateur.service';
import { Subscription } from 'rxjs';
import { NgbDropdownModule, NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import { Utilisateur } from '@/app/models/utilisateur.model';
import { AuthModalService, AuthModalType } from '@/app/core/services/auth-modal.service';
import { TranslateDirective } from '@/app/shared/directives/translate.directive';
import { LanguageSelectorComponent } from '@/app/shared/components/language-selector/language-selector.component';

@Component({
  selector: 'app-website-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgbDropdownModule,
    NgbCollapseModule,
    TranslateDirective,
    LanguageSelectorComponent
  ],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm fixed-top">
      <div class="container">
        <a class="navbar-brand" routerLink="/">
          <div class="d-flex align-items-center">
            <img src="assets/images/logo-sm.png" alt="Afrisia Logistics" height="45" class="me-2">
            <div class="brand-text">
              <span class="brand-name">Afrisia</span>
              <span class="brand-tagline">Logistics</span>
            </div>
          </div>
        </a>
        <button class="navbar-toggler" type="button" (click)="isMenuCollapsed = !isMenuCollapsed"
                aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" [ngbCollapse]="isMenuCollapsed">
          <ul class="navbar-nav ms-auto">
            <li class="nav-item">
              <a class="nav-link" routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}"
                 (click)="isMenuCollapsed = true">
                <i class="las la-home me-1"></i>
                <span translate="NAVBAR.HOME"></span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/tracking" routerLinkActive="active"
                 (click)="isMenuCollapsed = true">
                <i class="las la-search me-1"></i>
                <span translate="NAVBAR.TRACK_PACKAGE"></span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/recherche-colis" routerLinkActive="active"
                 (click)="isMenuCollapsed = true">
                <i class="las la-box me-1"></i>
                <span translate="NAVBAR.SEARCH_PACKAGE"></span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link position-relative" routerLink="/panier" routerLinkActive="active"
                 (click)="isMenuCollapsed = true">
                <i class="las la-shopping-cart me-1"></i>
                <span translate="NAVBAR.CART"></span>
                <span *ngIf="nombreArticles > 0" class="cart-counter">{{ nombreArticles }}</span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/about" routerLinkActive="active"
                 (click)="isMenuCollapsed = true">
                <i class="las la-info-circle me-1"></i>
                <span translate="NAVBAR.ABOUT"></span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/contact" routerLinkActive="active"
                 (click)="isMenuCollapsed = true">
                <i class="las la-envelope me-1"></i>
                <span translate="NAVBAR.CONTACT"></span>
              </a>
            </li>

            <!-- Sélecteur de langue -->
            <li class="nav-item">
              <app-language-selector></app-language-selector>
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
                <a ngbDropdownItem routerLink="/profil" (click)="isMenuCollapsed = true">
                  <i class="las la-user me-2"></i>
                  <span translate="NAVBAR.MY_PROFILE"></span>
                </a>
                <a ngbDropdownItem routerLink="/mes-commandes" (click)="isMenuCollapsed = true">
                  <i class="las la-file-invoice me-2"></i>
                  <span translate="NAVBAR.MY_ORDERS"></span>
                </a>
                <div class="dropdown-divider"></div>
                <a ngbDropdownItem (click)="deconnecter()" class="text-danger">
                  <i class="las la-sign-out-alt me-2"></i>
                  <span translate="NAVBAR.LOGOUT"></span>
                </a>
              </div>
            </li>

            <!-- Menu connexion/inscription si non connecté -->
            <li class="nav-item" ngbDropdown *ngIf="!utilisateur">
              <a class="nav-link" role="button" ngbDropdownToggle id="authDropdown">
                <i class="las la-user me-1"></i>
                <span translate="NAVBAR.ACCOUNT"></span>
              </a>
              <div ngbDropdownMenu aria-labelledby="authDropdown" class="dropdown-menu-end">
                <a ngbDropdownItem (click)="ouvrirModalConnexion()">
                  <i class="las la-sign-in-alt me-2"></i>
                  <span translate="NAVBAR.LOGIN"></span>
                </a>
                <a ngbDropdownItem (click)="ouvrirModalInscription()">
                  <i class="las la-user-plus me-2"></i>
                  <span translate="NAVBAR.REGISTER"></span>
                </a>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </nav>
    <div class="navbar-spacer"></div>
  `,
  styles: [`
    .navbar {
      padding: 0.75rem 0;
      z-index: 1030;
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%) !important;
    }
    .navbar-spacer {
      height: 80px;
    }
    .nav-link {
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9) !important;
      padding: 0.5rem 1rem;
      transition: color 0.3s ease;
    }
    .nav-link:hover, .nav-link.active {
      color: white !important;
    }
    .navbar-brand {
      font-weight: 700;
      color: white;
      display: flex;
      align-items: center;
    }
    .brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1;
    }
    .brand-name {
      font-size: 1.5rem;
      font-weight: 700;
    }
    .brand-tagline {
      font-size: 0.9rem;
      letter-spacing: 0.05rem;
      opacity: 0.9;
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
      color: #3498db;
    }
    .user-info {
      line-height: 1.2;
    }
    .dropdown-item {
      padding: 0.5rem 1rem;
    }
    .dropdown-item:hover {
      background-color: rgba(52, 152, 219, 0.05);
    }
    .dropdown-item i {
      width: 20px;
      text-align: center;
    }
    @media (max-width: 991.98px) {
      .navbar-collapse {
        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
        padding: 1rem;
        border-radius: 0 0 8px 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        margin-top: 0.5rem;
      }
      .navbar-nav .nav-item {
        margin: 0.25rem 0;
      }
      .brand-name {
        font-size: 1.2rem;
      }
      .brand-tagline {
        font-size: 0.8rem;
      }
    }
  `]
})
export class WebsiteNavbarComponent implements OnInit, OnDestroy {
  nombreArticles = 0;
  utilisateur: Utilisateur | null = null;
  isMenuCollapsed = true;
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
    this.isMenuCollapsed = true;
  }

  estAdmin(): boolean {
    return this.utilisateurService.estAdmin();
  }

  estPersonnel(): boolean {
    return this.utilisateurService.estPersonnel();
  }

  ouvrirModalConnexion(): void {
    this.authModalService.openAuthModal(AuthModalType.LOGIN);
    this.isMenuCollapsed = true;
  }

  ouvrirModalInscription(): void {
    this.authModalService.openAuthModal(AuthModalType.REGISTER);
    this.isMenuCollapsed = true;
  }
}

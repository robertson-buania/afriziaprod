import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-website-about',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="about-page">
      <div class="container py-5">
        <div class="row justify-content-center">
          <div class="col-lg-8">
            <h1 class="text-center mb-5">À propos de Kamba Agency</h1>

            <div class="card mb-4">
              <div class="card-body">
                <h3 class="mb-4">Notre Mission</h3>
                <p>
                  Kamba Agency est une entreprise de logistique dédiée à fournir des services de livraison
                  fiables et efficaces. Notre mission est de faciliter le commerce et les échanges en
                  assurant une livraison sûre et rapide de vos colis.
                </p>
              </div>
            </div>

            <div class="card mb-4">
              <div class="card-body">
                <h3 class="mb-4">Nos Services</h3>
                <ul class="list-unstyled">
                  <li class="mb-3">
                    <i class="las la-check-circle text-primary me-2"></i>
                    Livraison express nationale
                  </li>
                  <li class="mb-3">
                    <i class="las la-check-circle text-primary me-2"></i>
                    Suivi en temps réel des colis
                  </li>
                  <li class="mb-3">
                    <i class="las la-check-circle text-primary me-2"></i>
                    Service client disponible 24/7
                  </li>
                  <li class="mb-3">
                    <i class="las la-check-circle text-primary me-2"></i>
                    Assurance et sécurité des colis
                  </li>
                </ul>
              </div>
            </div>

            <div class="card">
              <div class="card-body">
                <h3 class="mb-4">Contactez-nous</h3>
                <p>
                  Pour toute question ou demande d'information, n'hésitez pas à nous contacter :
                </p>
                <ul class="list-unstyled">
                  <li class="mb-2">
                    <i class="las la-phone text-primary me-2"></i>
                    +243 999 888 777
                  </li>
                  <li class="mb-2">
                    <i class="las la-envelope text-primary me-2"></i>
                    contact#kamba-agency.com
                  </li>
                  <li>
                    <i class="las la-map-marker text-primary me-2"></i>
                    123 Rue Principale, Ville
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .about-page {
      background-color: #f8f9fa;
      min-height: calc(100vh - 72px);
    }

    h1 {
      color: #333;
      font-weight: 600;
    }

    h3 {
      color: #4e73e1;
      font-weight: 500;
    }

    .card {
      border: none;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .las {
      font-size: 1.2rem;
    }

    li {
      font-size: 1.1rem;
    }
  `]
})
export class WebsiteAboutComponent {}

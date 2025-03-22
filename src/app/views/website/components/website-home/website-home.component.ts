import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-website-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Hero Section -->
    <div class="hero-section">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-8 text-center">
            <h1 class="display-4 mb-4">Expédition de colis rapide et sécurisée</h1>
            <p class="lead mb-5">
              Service de livraison professionnel pour vos colis. Suivez vos envois en temps réel.
            </p>
            <div class="d-flex justify-content-center gap-3">
              <a routerLink="/tracking" class="btn btn-primary btn-lg">
                <i class="las la-box me-2"></i>Envoyer un colis
              </a>
              <button class="btn btn-outline-light btn-lg" (click)="scrollToTracking()">
                <i class="las la-search me-2"></i>Suivre un colis
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tracking Section -->
    <section class="tracking-section mt-4" id="tracking">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-8">
            <div class="tracking-form">
              <h2 class="text-center mb-4">Suivre votre colis</h2>
              <div class="input-group">
                <input
                  type="text"
                  class="form-control form-control-lg"
                  [(ngModel)]="trackingCode"
                  placeholder="Entrez votre code de suivi"
                  (keyup.enter)="trackPackage()"
                >
                <button
                  class="btn btn-primary btn-lg"
                  type="button"
                  (click)="trackPackage()"
                >
                  <i class="las la-search me-2"></i>Suivre
                </button>
              </div>
              @if (error) {
                <div class="alert alert-danger mt-3">
                  {{ error }}
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Services Section -->
    <section class="services-section">
      <div class="container">
        <div class="text-center mb-5">
          <h2 class="section-title">Nos Services</h2>
          <p class="section-subtitle">Des solutions adaptées à vos besoins</p>
        </div>
        <div class="row">
          <div class="col-md-4 mb-4">
            <div class="service-card">
              <i class="las la-shipping-fast service-icon"></i>
              <h3>Livraison Express</h3>
              <p>Service de livraison rapide pour vos colis urgents avec suivi en temps réel</p>
              <a routerLink="/tracking" class="btn btn-outline-primary mt-3">En savoir plus</a>
            </div>
          </div>
          <div class="col-md-4 mb-4">
            <div class="service-card">
              <i class="las la-globe-africa service-icon"></i>
              <h3>Couverture Nationale</h3>
              <p>Livraison dans toutes les grandes villes avec un réseau de distribution étendu</p>
              <a routerLink="/about" class="btn btn-outline-primary mt-3">Voir les zones</a>
            </div>
          </div>
          <div class="col-md-4 mb-4">
            <div class="service-card">
              <i class="las la-shield-alt service-icon"></i>
              <h3>Sécurité Garantie</h3>
              <p>Vos colis sont assurés et sécurisés pendant toute la durée du transport</p>
              <a routerLink="/about" class="btn btn-outline-primary mt-3">Garanties</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features-section">
      <div class="container">
        <div class="text-center mb-5">
          <h2 class="section-title">Pourquoi nous choisir ?</h2>
          <p class="section-subtitle">Des avantages qui font la différence</p>
        </div>
        <div class="row g-4">
          <div class="col-md-3">
            <div class="feature-item">
              <div class="feature-icon">
                <i class="las la-clock"></i>
              </div>
              <h4>Rapide</h4>
              <p>Livraison express en 24-48h</p>
            </div>
          </div>
          <div class="col-md-3">
            <div class="feature-item">
              <div class="feature-icon">
                <i class="las la-hand-holding-usd"></i>
              </div>
              <h4>Économique</h4>
              <p>Tarifs compétitifs garantis</p>
            </div>
          </div>
          <div class="col-md-3">
            <div class="feature-item">
              <div class="feature-icon">
                <i class="las la-headset"></i>
              </div>
              <h4>Support 24/7</h4>
              <p>Assistance client permanente</p>
            </div>
          </div>
          <div class="col-md-3">
            <div class="feature-item">
              <div class="feature-icon">
                <i class="las la-map-marked-alt"></i>
              </div>
              <h4>Suivi GPS</h4>
              <p>Localisation en temps réel</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-8 text-center">
            <h2 class="mb-4">Prêt à expédier votre colis ?</h2>
            <p class="mb-4">Rejoignez les milliers de clients satisfaits qui nous font confiance</p>
            <a routerLink="/tracking" class="btn btn-primary btn-lg">
              <i class="las la-paper-plane me-2"></i>Commencer maintenant
            </a>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .hero-section {
      background: linear-gradient(135deg, #4e73e1 0%, #224abe 100%);
      padding: 120px 0;
      color: white;
      position: relative;
      overflow: hidden;
    }

    .hero-section::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('/assets/images/pattern.png') repeat;
      opacity: 0.1;
    }

    .tracking-section {
      margin-top: -50px;
      padding-bottom: 80px;
    }

    .tracking-form {
      background: white;
      padding: 2rem;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }

    .form-control {
      border: 1px solid #e0e0e0;
      border-radius: 30px 0 0 30px;
      height: 60px;
      padding-left: 30px;
      font-size: 1.1rem;
      transition: all 0.3s ease;
    }

    .form-control:focus {
      border-color: #4e73e1;
      box-shadow: 0 0 0 0.2rem rgba(78,115,225,0.25);
    }

    .btn {
      border-radius: 30px;
      padding: 0 30px;
      transition: all 0.3s ease;
    }

    .btn-lg {
      height: 60px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .services-section {
      padding: 80px 0;
      background-color: #f8f9fa;
    }

    .section-title {
      font-size: 2.5rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 1rem;
    }

    .section-subtitle {
      font-size: 1.1rem;
      color: #666;
      margin-bottom: 3rem;
    }

    .service-card {
      text-align: center;
      padding: 40px 20px;
      border-radius: 15px;
      background: white;
      box-shadow: 0 5px 15px rgba(0,0,0,0.05);
      transition: transform 0.3s ease;
      height: 100%;
    }

    .service-card:hover {
      transform: translateY(-10px);
    }

    .service-icon {
      font-size: 3.5rem;
      color: #4e73e1;
      margin-bottom: 20px;
    }

    .features-section {
      padding: 80px 0;
      background: white;
    }

    .feature-item {
      text-align: center;
      padding: 30px;
      border-radius: 10px;
      transition: all 0.3s ease;
    }

    .feature-item:hover {
      background: #f8f9fa;
    }

    .feature-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      background: #4e73e1;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 2.5rem;
    }

    .feature-item h4 {
      color: #333;
      margin-bottom: 10px;
    }

    .feature-item p {
      color: #666;
      margin-bottom: 0;
    }

    .cta-section {
      padding: 100px 0;
      background: linear-gradient(135deg, #4e73e1 0%, #224abe 100%);
      color: white;
      text-align: center;
    }

    .cta-section h2 {
      font-size: 2.5rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }

    .cta-section p {
      font-size: 1.2rem;
      opacity: 0.9;
      margin-bottom: 2rem;
    }
  `]
})
export class WebsiteHomeComponent {
  trackingCode: string = '';
  error: string = '';

  constructor(private router: Router) {}

  trackPackage() {
    if (!this.trackingCode.trim()) {
      this.error = 'Veuillez entrer un code de suivi';
      return;
    }

    // Rediriger vers la page de suivi avec le code
    this.router.navigate(['/tracking'], {
      queryParams: { code: this.trackingCode }
    });
  }

  scrollToTracking() {
    const element = document.getElementById('tracking');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

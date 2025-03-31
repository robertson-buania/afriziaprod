import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-website-about',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="about-page">
      <div class="container py-5">
        <div class="row justify-content-center">
          <div class="col-lg-10">
            <h1 class="text-center mb-4">À propos d'Afrisia Logistics</h1>
            <p class="lead text-center mb-5">
              Expert en fret aérien et maritime entre la Chine et l'Afrique
            </p>

            <div class="card mb-4">
              <div class="card-body">
                <h3 class="mb-4"><i class="las la-globe-africa me-2"></i>Notre Mission</h3>
                <p>
                  Afrisia Logistics est une entreprise de fret international spécialisée dans le transport de marchandises entre la Chine et la RDC. Notre mission est de faciliter le commerce international en fournissant des services de transport fiables, rapides et sécurisés pour tous types de produits.
                </p>
                <p class="mb-0">
                  Que vous soyez un particulier souhaitant recevoir un colis ou une entreprise nécessitant un service de fret régulier, nous offrons des solutions adaptées à vos besoins spécifiques avec un engagement inébranlable envers la qualité et la satisfaction client.
                </p>
              </div>
            </div>

            <div class="row mb-4">
              <div class="col-md-6 mb-4 mb-md-0">
                <div class="card h-100">
                  <div class="card-body">
                    <h3 class="mb-4"><i class="las la-plane me-2"></i>Fret Aérien</h3>
                    <p>Notre service de fret aérien express garantit une livraison rapide en 3 à 5 jours entre la Chine et l'Afrique, idéal pour les envois urgents et de valeur.</p>
                    <div class="features-list">
                      <div class="feature-item">
                        <i class="las la-check-circle"></i>
                        <span>Transport rapide en 3-5 jours</span>
                      </div>
                      <div class="feature-item">
                        <i class="las la-check-circle"></i>
                        <span>Suivi en temps réel</span>
                      </div>
                      <div class="feature-item">
                        <i class="las la-check-circle"></i>
                        <span>Sécurité optimale</span>
                      </div>
                      <div class="feature-item">
                        <i class="las la-check-circle"></i>
                        <span>Idéal pour produits électroniques et médicaments</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="card h-100">
                  <div class="card-body">
                    <h3 class="mb-4"><i class="las la-ship me-2"></i>Fret Maritime</h3>
                    <p>Notre service de fret maritime cargo offre une solution économique pour les envois volumineux non urgents avec un délai de livraison d'environ 75 jours.</p>
                    <div class="features-list">
                      <div class="feature-item">
                        <i class="las la-check-circle"></i>
                        <span>Transport économique</span>
                      </div>
                      <div class="feature-item">
                        <i class="las la-check-circle"></i>
                        <span>Idéal pour envois non urgents</span>
                      </div>
                      <div class="feature-item">
                        <i class="las la-check-circle"></i>
                        <span>Capacité pour objets volumineux</span>
                      </div>
                      <div class="feature-item">
                        <i class="las la-check-circle"></i>
                        <span>Tarifs avantageux à partir de 540$/CBM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card mb-4">
              <div class="card-body">
                <h3 class="mb-4"><i class="las la-tags me-2"></i>Nos Tarifs et Services</h3>
                <p>
                  Chez Afrisia Logistics, nous proposons des tarifs compétitifs adaptés à chaque type de marchandise et modalité d'expédition :
                </p>

                <div class="row mb-3">
                  <div class="col-md-6">
                    <h5 class="tarif-title">Services Standard</h5>
                    <ul class="tarif-list">
                      <li>
                        <span class="fw-bold">Objets ordinaires (Cargo) :</span> 17$/kg, délai de 15 jours ou plus
                      </li>
                      <li>
                        <span class="fw-bold">Service Express :</span> 18$/kg, livraison en 3-5 jours
                      </li>
                    </ul>
                  </div>
                  <div class="col-md-6">
                    <h5 class="tarif-title">Services Spécialisés</h5>
                    <ul class="tarif-list">
                      <li>
                        <span class="fw-bold">Objets avec batteries :</span> 20$/kg, délai variable selon le cas
                      </li>
                      <li>
                        <span class="fw-bold">Médicaments/Compléments alimentaires :</span> 20$/kg, express uniquement
                      </li>
                      <li>
                        <span class="fw-bold">Cartouches :</span> 20$/kg, avec restrictions
                      </li>
                    </ul>
                  </div>
                </div>

                <div class="row">
                  <div class="col-md-6">
                    <h5 class="tarif-title">Électroniques</h5>
                    <ul class="tarif-list">
                      <li>
                        <span class="fw-bold">Téléphones :</span> 20$/kg + 10$ par téléphone
                      </li>
                      <li>
                        <span class="fw-bold">Ordinateurs :</span> 20$/kg + 30$ par ordinateur
                      </li>
                    </ul>
                  </div>
                  <div class="col-md-6">
                    <h5 class="tarif-title">Restrictions</h5>
                    <ul class="tarif-list">
                      <li>
                        Les power banks et objets avec ports USB ne sont pas acceptés
                      </li>
                      <li>
                        Consultez-nous avant d'acheter des produits avec de grosses piles
                      </li>
                    </ul>
                  </div>
                </div>

                <div class="alert alert-info mt-3">
                  <i class="las la-info-circle me-2"></i>
                  <strong>Prépaiement obligatoire :</strong> Tous nos services de fret aérien nécessitent un prépaiement de 100% avant l'expédition du colis. Pour le fret maritime, un prépaiement de 50% est requis avant l'expédition. Ce système, en place depuis fin 2023, permet de garantir un traitement prioritaire et rapide de vos envois.
                </div>
              </div>
            </div>

            <div class="card mb-4">
              <div class="card-body">
                <h3 class="mb-4"><i class="las la-question-circle me-2"></i>Foire Aux Questions</h3>

                <div class="faq-item">
                  <div class="faq-question" (click)="toggleFaq('faq1')">
                    <span>Qu'est-ce que le système de prépaiement ?</span>
                    <i class="las" [ngClass]="activeFaq === 'faq1' ? 'la-minus' : 'la-plus'"></i>
                  </div>
                  <div class="faq-answer" [ngClass]="{'show': activeFaq === 'faq1'}">
                    <p>Le prépaiement est un système qui consiste au paiement des frais d'expédition de votre colis avant l'expédition proprement dite de la Chine à Kinshasa. Pour le fret aérien, un prépaiement de 100% est obligatoire. Pour le fret maritime, un prépaiement de 50% est requis avant l'expédition. Ce système est en place depuis fin 2023.</p>
                  </div>
                </div>

                <div class="faq-item">
                  <div class="faq-question" (click)="toggleFaq('faq2')">
                    <span>Quels sont les délais d'expédition ?</span>
                    <i class="las" [ngClass]="activeFaq === 'faq2' ? 'la-minus' : 'la-plus'"></i>
                  </div>
                  <div class="faq-answer" [ngClass]="{'show': activeFaq === 'faq2'}">
                    <p>Pour le service cargo, le délai d'expédition est généralement de 15 jours ou plus selon les cas. Le service express garantit une livraison en 4 à 5 jours maximum sauf cas imprévus. Pour le fret maritime, le délai d'expédition est d'environ 75 jours.</p>
                  </div>
                </div>

                <div class="faq-item">
                  <div class="faq-question" (click)="toggleFaq('faq3')">
                    <span>Puis-je expédier des appareils électroniques ?</span>
                    <i class="las" [ngClass]="activeFaq === 'faq3' ? 'la-minus' : 'la-plus'"></i>
                  </div>
                  <div class="faq-answer" [ngClass]="{'show': activeFaq === 'faq3'}">
                    <p>Oui, nous transportons les téléphones (20$/kg + 10$ par téléphone) et ordinateurs (20$/kg + 30$ par ordinateur). Toutefois, les power banks et objets avec ports USB ne sont pas acceptés. Pour les objets contenant des piles, le tarif est de 20$/kg avec un délai potentiellement plus long.</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-body">
                <h3 class="mb-4"><i class="las la-phone-volume me-2"></i>Contactez-nous</h3>
                <p>
                  Pour toute question ou demande d'information sur nos services, n'hésitez pas à nous contacter :
                </p>
                <div class="row">
                  <div class="col-md-6">
                    <ul class="list-unstyled contact-list">
                      <li>
                        <i class="las la-phone"></i>
                        <span>+243 83 87 16 236 / +243 81 51 00 939</span>
                      </li>
                      <li>
                        <i class="las la-envelope"></i>
                        <span>moiseeloko&#64;gmail.com</span>
                      </li>
                      <li>
                        <i class="las la-map-marker"></i>
                        <span>Av. Lubefu numéro 44/95 Quartier Batetela, Commune de la Gombe</span>
                      </li>
                    </ul>
                  </div>
                  <div class="col-md-6">
                    <div class="d-flex justify-content-md-end mt-3 mt-md-0">
                      <a routerLink="/contact" class="btn btn-primary">
                        <i class="las la-paper-plane me-2"></i>Nous contacter
                      </a>
                    </div>
                  </div>
                </div>
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
      padding: 30px 0;
    }

    h1 {
      color: #3498db;
      font-weight: 600;
    }

    .lead {
      color: #555;
    }

    h3 {
      color: #3498db;
      font-weight: 500;
      display: flex;
      align-items: center;
    }

    h3 i {
      font-size: 1.5rem;
    }

    .card {
      border: none;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      margin-bottom: 20px;
      overflow: hidden;
    }

    .card-body {
      padding: 2rem;
    }

    .features-list {
      margin-top: 1.5rem;
    }

    .feature-item {
      display: flex;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .feature-item i {
      color: #28a745;
      font-size: 1.2rem;
      margin-right: 0.75rem;
    }

    .las {
      font-size: 1.2rem;
    }

    .tarif-title {
      color: #3498db;
      margin-bottom: 1rem;
      font-weight: 600;
    }

    .tarif-list {
      list-style: none;
      padding-left: 0;
    }

    .tarif-list li {
      padding: 0.5rem 0;
      border-bottom: 1px solid #eee;
    }

    .tarif-list li:last-child {
      border-bottom: none;
    }

    .faq-item {
      margin-bottom: 1rem;
      border: 1px solid #eee;
      border-radius: 8px;
      overflow: hidden;
    }

    .faq-question {
      padding: 1rem 1.5rem;
      background-color: #f8f9fa;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .faq-question:hover {
      background-color: rgba(26, 58, 143, 0.05);
    }

    .faq-answer {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease, padding 0.3s ease;
      padding: 0 1.5rem;
    }

    .faq-answer.show {
      max-height: 300px;
      padding: 1rem 1.5rem;
    }

    .faq-answer p {
      margin-bottom: 0;
    }

    .contact-list li {
      display: flex;
      align-items: center;
      margin-bottom: 1rem;
      font-size: 1.1rem;
    }

    .contact-list i {
      width: 2rem;
      font-size: 1.5rem;
      color: #3498db;
    }

    @media (max-width: 768px) {
      .card-body {
        padding: 1.5rem;
      }
    }

    .btn-primary {
      background-color: #3498db;
      border-color: #3498db;
    }

    .btn-primary:hover, .btn-primary:focus {
      background-color: #2980b9;
      border-color: #2980b9;
    }
  `]
})
export class WebsiteAboutComponent {
  activeFaq: string | null = null;

  toggleFaq(faqId: string): void {
    if (this.activeFaq === faqId) {
      this.activeFaq = null;
    } else {
      this.activeFaq = faqId;
    }
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-website-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Footer -->
    <footer class="site-footer bg-dark text-white py-5">
      <div class="container">
        <div class="row">
          <div class="col-md-4 mb-4 mb-md-0">
            <h3 class="h5 mb-3">Afrisia Logistics</h3>
            <p>Spécialiste du fret aérien et maritime international entre la Chine et l'Afrique.</p>
            <div class="d-flex align-items-center mt-3">
              <a href="https://wa.me/243838716236" class="btn btn-outline-light whatsapp-btn">
                <i class="lab la-whatsapp me-2"></i>Nous contacter sur WhatsApp
              </a>
            </div>

            <!-- Modes de paiement -->
            <div class="payment-methods mt-4">
              <h5 class="h6 text-white mb-3">Modes de paiement acceptés</h5>
              <div class="payment-icons d-flex flex-wrap gap-2">
                <img src="assets/images/payement/visa.jpg" alt="VISA" class="payment-icon" />
                <img src="assets/images/payement/MasterCard.png" alt="MasterCard" class="payment-icon" />
                <img src="assets/images/payement/mpesa.png" alt="M-PESA" class="payment-icon" />
                <img src="assets/images/payement/orange_money.png" alt="Orange Money" class="payment-icon" />
                <img src="assets/images/payement/aitel_money.png" alt="Airtel Money" class="payment-icon" />
              </div>
            </div>
          </div>
          <div class="col-md-4 mb-4 mb-md-0">
            <h3 class="h5 mb-3">Coordonnées</h3>
            <p><i class="las la-map-marker me-2"></i>Av. Lubefu numéro 44/95 Quartier Batetela, Commune de la Gombe</p>
            <p><i class="las la-phone me-2"></i>+243 83 87 16 236 / +243 81 51 00 939</p>
            <p><i class="las la-envelope me-2"></i>moiseeloko&#64;gmail.com</p>
          </div>
          <div class="col-md-4">
            <h3 class="h5 mb-3">Horaires d'ouverture</h3>
            <p><i class="las la-clock me-2"></i>Lundi - Vendredi: 8:30 - 17:30</p>
            <p><i class="las la-clock me-2"></i>Samedi - Dimanche: 9:00 - 15:00</p>
          </div>
        </div>
        <hr class="my-4">
        <div class="row">
          <div class="col-12 text-center">
            <p class="mb-0">&copy; 2024 Afrisia Logistics. Tous droits réservés.</p>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .site-footer {
      background-color: #1a2234;
    }

    .site-footer h3 {
      color: white;
      font-weight: 600;
    }

    .site-footer p {
      opacity: 0.8;
    }

    .site-footer hr {
      opacity: 0.2;
    }

    .whatsapp-btn {
      border-radius: 50px;
      padding: 0.5rem 1rem;
      transition: all 0.3s ease;
    }

    .whatsapp-btn:hover {
      background-color: #25D366;
      border-color: #25D366;
      transform: translateY(-3px);
    }

    .lab.la-whatsapp {
      font-size: 1.5rem;
    }

    .payment-methods {
      margin-top: 1.5rem;
    }

    .payment-icon {
      height: 40px;
      border-radius: 5px;
      background-color: white;
      padding: 5px;
      transition: transform 0.2s ease;
    }

    .payment-icon:hover {
      transform: translateY(-3px);
    }

    @media (max-width: 768px) {
      .site-footer {
        padding: 40px 0;
      }

      .payment-icon {
        height: 30px;
      }
    }
  `]
})
export class WebsiteFooterComponent {}

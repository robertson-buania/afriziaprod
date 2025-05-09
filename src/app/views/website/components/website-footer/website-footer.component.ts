import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-website-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  template: `
    <!-- Footer -->
    <footer class="site-footer bg-dark text-white py-5">
      <div class="container">
        <div class="row">
          <!-- À propos de l'entreprise -->
          <div class="col-md-4 mb-4 mb-md-0">
            <h3 class="h5 mb-3">{{ 'FOOTER.COMPANY.TITLE' | translate }}</h3>
            <p>{{ 'FOOTER.COMPANY.DESCRIPTION' | translate }}</p>
            <div class="d-flex align-items-center mt-3">
              <a href="https://wa.me/243838716236" class="btn btn-outline-light whatsapp-btn">
                <i class="lab la-whatsapp me-2"></i>{{ 'CONTACT.WHATSAPP_BUTTON' | translate }}
              </a>
            </div>

            <!-- Modes de paiement -->
            <div class="payment-methods mt-4">
              <h5 class="h6 text-white mb-3">{{ 'HOME.PAYMENT.TITLE' | translate }}</h5>
              <div class="payment-icons d-flex flex-wrap gap-2">
                <img src="assets/images/payement/visa.jpg" alt="VISA" class="payment-icon" />
                <img src="assets/images/payement/MasterCard.png" alt="MasterCard" class="payment-icon" />
                <img src="assets/images/payement/mpesa.png" alt="M-PESA" class="payment-icon" />
                <img src="assets/images/payement/orange_money.png" alt="Orange Money" class="payment-icon" />
                <img src="assets/images/payement/aitel_money.png" alt="Airtel Money" class="payment-icon" />
              </div>
            </div>
          </div>

          <!-- Liens rapides -->
          <div class="col-md-4 mb-4 mb-md-0">
            <h3 class="h5 mb-3">{{ 'FOOTER.QUICK_LINKS.TITLE' | translate }}</h3>
            <ul class="list-unstyled footer-links">
              <li><a routerLink="/" class="text-white-50"><i class="las la-chevron-right me-2"></i>{{ 'NAVBAR.HOME' | translate }}</a></li>
              <li><a routerLink="/about" class="text-white-50"><i class="las la-chevron-right me-2"></i>{{ 'NAVBAR.ABOUT' | translate }}</a></li>
              <li><a routerLink="/tracking" class="text-white-50"><i class="las la-chevron-right me-2"></i>{{ 'NAVBAR.TRACK_PACKAGE' | translate }}</a></li>
              <li><a routerLink="/recherche-colis" class="text-white-50"><i class="las la-chevron-right me-2"></i>{{ 'NAVBAR.SEARCH_PACKAGE' | translate }}</a></li>
              <li><a routerLink="/contact" class="text-white-50"><i class="las la-chevron-right me-2"></i>{{ 'NAVBAR.CONTACT' | translate }}</a></li>
              <li><a routerLink="/politique-confidentialite" class="text-white-50"><i class="las la-chevron-right me-2"></i>{{ 'FOOTER.PRIVACY_POLICY' | translate }}</a></li>
              <li><a routerLink="/politique-remboursement" class="text-white-50"><i class="las la-chevron-right me-2"></i>{{ 'FOOTER.REFUND_POLICY' | translate }}</a></li>
            </ul>
          </div>

          <!-- Contact et horaires -->
          <div class="col-md-4">
            <h3 class="h5 mb-3">{{ 'FOOTER.CONTACT.TITLE' | translate }}</h3>
            <ul class="list-unstyled footer-contact">
              <li><i class="las la-map-marker me-2"></i>{{ 'FOOTER.COMPANY.ADDRESS' | translate }}</li>
              <li><i class="las la-phone me-2"></i>+243 83 87 16 236 / +243 81 51 00 939</li>
              <li><i class="las la-envelope me-2"></i>moiseeloko&#64;gmail.com</li>
            </ul>

            <h3 class="h5 mb-3 mt-4">{{ 'FOOTER.HOURS.TITLE' | translate }}</h3>
            <ul class="list-unstyled footer-hours">
              <li><i class="las la-clock me-2"></i>{{ 'FOOTER.HOURS.WEEKDAYS' | translate }}</li>
              <li><i class="las la-clock me-2"></i>{{ 'FOOTER.HOURS.SATURDAY' | translate }}</li>
              <li><i class="las la-clock me-2"></i>{{ 'FOOTER.HOURS.SUNDAY' | translate }}</li>
            </ul>
          </div>
        </div>

        <hr class="my-4">

        <div class="row">
          <div class="col-12 text-center">
            <p class="mb-0">{{ 'FOOTER.BOTTOM.COPYRIGHT' | translate }}</p>
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
      height: 25px;
      border-radius: 5px;
      background-color: white;
      padding: 3px;
      transition: transform 0.2s ease;
    }

    .payment-icon:hover {
      transform: translateY(-3px);
    }

    .footer-links li, .footer-contact li, .footer-hours li {
      margin-bottom: 0.75rem;
    }

    .footer-links a {
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .footer-links a:hover {
      color: white !important;
      padding-left: 5px;
    }

    @media (max-width: 768px) {
      .site-footer {
        padding: 40px 0;
      }

      .payment-icon {
        height: 20px;
      }
    }
  `]
})
export class WebsiteFooterComponent {}

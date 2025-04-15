import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-politique-remboursement',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="refund-policy-page">
      <div class="container py-5">
        <div class="row justify-content-center">
          <div class="col-lg-10">
            <h1 class="text-center mb-4">Politique de remboursement</h1>
            <p class="lead text-center mb-5">
              Afrisia Logistics sarl s'efforce d'offrir le meilleur service personnalisé possible
            </p>

            <div class="card mb-4">
              <div class="card-body">
                <h3 class="mb-4"><i class="las la-info-circle me-2"></i>Conditions de remboursement</h3>
                <p>
                  Si vous n'êtes pas satisfait après le paiement de votre colis pour qu'il soit expédié dans le délai d'expédition et que le vôtre n'a pas quitté la Chine, nous sommes heureux de vous offrir un remboursement dans les conditions suivantes :
                </p>
                <div class="alert alert-info">
                  <i class="las la-exclamation-circle me-2"></i>
                  Pour tout le colis divers (qui ne contient pas de pile) dépassant 7 jours sans être expédié, nous serons obligés de vous faire un remboursement total.
                </div>
              </div>
            </div>

            <div class="card mb-4">
              <div class="card-body">
                <h3 class="mb-4"><i class="las la-money-bill-wave me-2"></i>Montant du remboursement</h3>
                <p>
                  Le client sera remboursé du montant total payé pour le service non rendu.
                </p>
              </div>
            </div>

            <div class="card mb-4">
              <div class="card-body">
                <h3 class="mb-4"><i class="las la-file-alt me-2"></i>Processus de remboursement</h3>
                <p>
                  Pour demander un remboursement, veuillez suivre les étapes suivantes :
                </p>
                <ol class="process-list">
                  <li>Contactez notre service client par téléphone ou email</li>
                  <li>Fournissez les détails de votre commande et le numéro de suivi</li>
                  <li>Remplissez le formulaire de demande de remboursement</li>
                  <li>Attendez la confirmation de notre équipe</li>
                </ol>
                <p class="mt-3">
                  Les remboursements sont effectués par virement bancaire uniquement. Veuillez nous fournir vos coordonnées bancaires lors de la demande de remboursement.
                </p>
              </div>
            </div>

            <div class="card">
              <div class="card-body">
                <h3 class="mb-4"><i class="las la-phone-volume me-2"></i>Contactez-nous</h3>
                <p>
                  Pour toute question concernant notre politique de remboursement, n'hésitez pas à nous contacter :
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
    .refund-policy-page {
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

    .process-list {
      padding-left: 1.5rem;
    }

    .process-list li {
      margin-bottom: 0.5rem;
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
export class PolitiqueRemboursementComponent implements OnInit {
  currentDate = new Date();

  constructor() { }

  ngOnInit(): void {
  }
}

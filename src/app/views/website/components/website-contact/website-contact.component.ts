import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-website-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="contact-page">
      <div class="container py-5">
        <div class="row justify-content-center">
          <div class="col-lg-10">
            <h1 class="text-center mb-5">Contactez Afrisia Logistics</h1>
            <p class="lead text-center mb-5">
              Nous sommes à votre disposition pour répondre à toutes vos questions concernant nos services de fret aérien et maritime
            </p>

            <div class="row mb-5">
              <div class="col-md-4 mb-4 mb-md-0">
                <div class="contact-info-card">
                  <i class="las la-phone"></i>
                  <h4>Téléphone</h4>
                  <p>+243 83 87 16 236</p>
                  <p>+243 81 51 00 939</p>
                  <p>+243 82 62 74 009</p>
                  <p class="text-muted small">Disponible 7j/7 de 8h à 20h</p>
                </div>
              </div>
              <div class="col-md-4 mb-4 mb-md-0">
                <div class="contact-info-card">
                  <i class="las la-envelope"></i>
                  <h4>Email</h4>
                  <p>moiseeloko&#64;gmail.com</p>
                  <p class="text-muted small">Réponse sous 24h ouvrables</p>
                </div>
              </div>
              <div class="col-md-4">
                <div class="contact-info-card">
                  <i class="las la-map-marker"></i>
                  <h4>Bureaux</h4>
                  <p>Av. Lubefu numéro 44/95 Quartier Batetela, Commune de la Gombe</p>
                  <p class="text-muted small">Ouvert du lundi au samedi</p>
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-md-6 mb-4 mb-md-0">
                <div class="card">
                  <div class="card-body">
                    <h3 class="card-title mb-4">Information sur le fret</h3>
                    <div class="info-block mb-4">
                      <h5><i class="las la-plane me-2"></i>Fret Aérien Express</h5>
                      <p>Livraison en 3-5 jours entre la Chine et l'Afrique. Idéal pour les produits électroniques, médicaments et envois urgents.</p>
                      <p class="price-tag">À partir de 18$/kg</p>
                    </div>

                    <div class="info-block mb-4">
                      <h5><i class="las la-ship me-2"></i>Fret Maritime</h5>
                      <p>Solution économique pour les envois non urgents. Délai de 75 jours ou plus selon la destination.</p>
                      <p class="price-tag">À partir de 540$/CBM</p>
                    </div>

                    <div class="alert alert-info">
                      <strong>Important :</strong> Tous nos services nécessitent un prépaiement de 100% avant expédition. Veuillez nous contacter avant d'acheter des produits contenant des piles ou batteries.
                    </div>
                  </div>
                </div>
              </div>

              <div class="col-md-6">
                <div class="card">
                  <div class="card-body">
                    <h3 class="card-title mb-4">Envoyez-nous un message</h3>
                    <form [formGroup]="contactForm" (ngSubmit)="onSubmit()">
                      <div class="mb-3">
                        <label class="form-label">Nom complet</label>
                        <input type="text" class="form-control" formControlName="name" placeholder="Votre nom">
                        <div class="form-text text-danger" *ngIf="contactForm.get('name')?.invalid && contactForm.get('name')?.touched">
                          Le nom est requis
                        </div>
                      </div>

                      <div class="mb-3">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-control" formControlName="email" placeholder="votre@email.com">
                        <div class="form-text text-danger" *ngIf="contactForm.get('email')?.invalid && contactForm.get('email')?.touched">
                          Email invalide
                        </div>
                      </div>

                      <div class="mb-3">
                        <label class="form-label">Service concerné</label>
                        <select class="form-select" formControlName="subject">
                          <option value="">Sélectionnez un service</option>
                          <option value="Fret aérien">Fret aérien</option>
                          <option value="Fret maritime">Fret maritime</option>
                          <option value="Produits électroniques">Produits électroniques</option>
                          <option value="Objets avec batteries">Objets avec batteries</option>
                          <option value="Autre">Autre</option>
                        </select>
                        <div class="form-text text-danger" *ngIf="contactForm.get('subject')?.invalid && contactForm.get('subject')?.touched">
                          Veuillez sélectionner un service
                        </div>
                      </div>

                      <div class="mb-4">
                        <label class="form-label">Message</label>
                        <textarea class="form-control" rows="5" formControlName="message" placeholder="Décrivez votre demande, incluez des détails sur le type de colis, poids approximatif, etc."></textarea>
                        <div class="form-text text-danger" *ngIf="contactForm.get('message')?.invalid && contactForm.get('message')?.touched">
                          Le message est requis
                        </div>
                      </div>

                      <button type="submit" class="btn btn-primary" [disabled]="contactForm.invalid || isSubmitting">
                        <i class="las" [ngClass]="{'la-paper-plane': !isSubmitting, 'la-spinner la-spin': isSubmitting}"></i>
                        {{ isSubmitting ? 'Envoi en cours...' : 'Envoyer le message' }}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            <div class="card mt-4">
              <div class="card-body">
                <h3 class="card-title mb-3">Horaires d'ouverture</h3>
                <div class="row">
                  <div class="col-md-6">
                    <table class="table table-borderless mb-0">
                      <tbody>
                        <tr>
                          <td><strong>Lundi - Vendredi</strong></td>
                          <td>8:30 - 17:30</td>
                        </tr>
                        <tr>
                          <td><strong>Samedi</strong></td>
                          <td>9:00 - 15:00</td>
                        </tr>
                        <tr>
                          <td><strong>Dimanche</strong></td>
                          <td>9:00 - 15:00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div class="col-md-6">
                    <p class="mb-1"><strong>Service client téléphonique :</strong></p>
                    <p>Disponible tous les jours de 8h à 20h</p>
                    <p class="mb-1"><strong>Réponse aux emails :</strong></p>
                    <p class="mb-0">Dans les 24h ouvrables</p>
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
    .contact-page {
      background-color: #f8f9fa;
      min-height: calc(100vh - 72px);
      padding: 30px 0;
    }

    h1, h4 {
      color: #3498db;
      margin-bottom: 1.5rem;
    }

    .lead {
      color: #555;
    }

    .contact-info-card {
      text-align: center;
      padding: 2rem;
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      height: 100%;
      transition: transform 0.3s ease;
    }

    .contact-info-card:hover {
      transform: translateY(-5px);
    }

    .contact-info-card i {
      font-size: 3rem;
      color: #3498db;
      margin-bottom: 1rem;
    }

    .contact-info-card h4 {
      color: #333;
      margin-bottom: 0.5rem;
    }

    .contact-info-card p {
      color: #666;
      margin-bottom: 0;
    }

    .card {
      border: none;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    h3 {
      color: #1a3a8f;
      font-weight: 500;
    }

    h5 {
      color: #333;
      font-weight: 500;
      display: flex;
      align-items: center;
    }

    h5 i {
      color: #1a3a8f;
      font-size: 1.3rem;
    }

    .price-tag {
      color: #e63946;
      font-weight: 600;
      font-size: 1.1rem;
    }

    .info-block {
      padding-bottom: 1rem;
      border-bottom: 1px solid #eee;
    }

    .info-block:last-child {
      border-bottom: none;
    }

    .form-control, .form-select {
      border-radius: 8px;
      padding: 0.75rem 1rem;
    }

    .form-control:focus, .form-select:focus {
      border-color: #3498db;
      box-shadow: 0 0 0 0.25rem rgba(52, 152, 219, 0.25);
    }

    .btn-primary {
      background-color: #3498db;
      border-color: #3498db;
      padding: 0.5rem 2rem;
      font-weight: 500;
      border-radius: 8px;
    }

    .btn-primary:hover, .btn-primary:focus {
      background-color: #2980b9;
      border-color: #2980b9;
    }

    .btn-primary i {
      margin-right: 0.5rem;
    }

    table {
      color: #555;
    }

    table td {
      padding: 0.5rem 0;
    }

    @media (max-width: 768px) {
      .card-body {
        padding: 1.5rem;
      }
    }
  `]
})
export class WebsiteContactComponent {
  contactForm: FormGroup;
  isSubmitting = false;

  constructor(private fb: FormBuilder) {
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      message: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.contactForm.invalid) return;

    this.isSubmitting = true;

    // Simuler l'envoi du message
    setTimeout(() => {
      console.log('Message envoyé:', this.contactForm.value);
      this.contactForm.reset();
      this.isSubmitting = false;
      // TODO: Implémenter l'envoi réel du message
    }, 1500);
  }
}

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
          <div class="col-lg-8">
            <h1 class="text-center mb-5">Contactez-nous</h1>

            <div class="row mb-5">
              <div class="col-md-4">
                <div class="contact-info-card">
                  <i class="las la-phone"></i>
                  <h4>Téléphone</h4>
                  <p>+243 999 888 777</p>
                </div>
              </div>
              <div class="col-md-4">
                <div class="contact-info-card">
                  <i class="las la-envelope"></i>
                  <h4>Email</h4>
                  <p>contact#kamba-agency.com</p>
                </div>
              </div>
              <div class="col-md-4">
                <div class="contact-info-card">
                  <i class="las la-map-marker"></i>
                  <h4>Adresse</h4>
                  <p>123 Rue Principale, Ville</p>
                </div>
              </div>
            </div>

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
                    <label class="form-label">Sujet</label>
                    <input type="text" class="form-control" formControlName="subject" placeholder="Sujet de votre message">
                    <div class="form-text text-danger" *ngIf="contactForm.get('subject')?.invalid && contactForm.get('subject')?.touched">
                      Le sujet est requis
                    </div>
                  </div>

                  <div class="mb-4">
                    <label class="form-label">Message</label>
                    <textarea class="form-control" rows="5" formControlName="message" placeholder="Votre message"></textarea>
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
      </div>
    </div>
  `,
  styles: [`
    .contact-page {
      background-color: #f8f9fa;
      min-height: calc(100vh - 72px);
    }

    h1 {
      color: #333;
      font-weight: 600;
    }

    .contact-info-card {
      text-align: center;
      padding: 2rem;
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      height: 100%;
    }

    .contact-info-card i {
      font-size: 2.5rem;
      color: #4e73e1;
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
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .form-control {
      border-radius: 8px;
      padding: 0.75rem 1rem;
    }

    .form-control:focus {
      border-color: #4e73e1;
      box-shadow: 0 0 0 0.2rem rgba(78,115,225,0.25);
    }

    .btn-primary {
      padding: 0.75rem 2rem;
      font-weight: 500;
    }

    .btn-primary i {
      margin-right: 0.5rem;
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

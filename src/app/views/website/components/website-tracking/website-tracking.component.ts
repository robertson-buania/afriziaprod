import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Colis, STATUT_COLIS, TYPE_COLIS, TYPE_EXPEDITION, Partenaire, Facture, PARAMETRAGE_COLIS } from '@/app/models/partenaire.model';
import { PartenaireService } from '@/app/core/services/partenaire.service';
import { CountryService, CountryCode } from '@/app/core/services/country.service';
import { PaymentService } from '@/app/core/services/payment.service';
import { firstValueFrom } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-website-tracking',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  template: `
    <div class="tracking-page">
      <div class="container py-5">
        <div class="row justify-content-center">
          <div class="col-lg-8">
            <!-- Onglets -->
            <ul class="nav nav-pills nav-justified mb-4">
              <li class="nav-item">
                <a class="nav-link" [class.active]="activeTab === 'track'" (click)="setActiveTab('track')">
                  <i class="las la-search me-2"></i>Suivre un colis
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" [class.active]="activeTab === 'register'" (click)="setActiveTab('register')">
                  <i class="las la-box me-2"></i>Enregistrer un colis
                </a>
              </li>
            </ul>

            <!-- Formulaire de suivi -->
            @if (activeTab === 'track') {
              <div class="tracking-search mb-5">
                <h2 class="text-center mb-4">Suivi de votre colis</h2>
                <form [formGroup]="trackingForm" (ngSubmit)="searchPackage()">
                  <div class="input-group">
                    <input
                      type="text"
                      class="form-control form-control-lg"
                      formControlName="codeSuivi"
                      placeholder="Entrez votre code de suivi"
                    >
                    <button
                      class="btn btn-primary btn-lg"
                      type="submit"
                      [disabled]="isLoading || trackingForm.invalid"
                    >
                      <i class="las" [ngClass]="{'la-search': !isLoading, 'la-spinner la-spin': isLoading}"></i>
                      {{ isLoading ? 'Recherche...' : 'Rechercher' }}
                    </button>
                  </div>
                </form>
              </div>

              @if (error) {
                <div class="alert alert-danger">
                  <i class="las la-exclamation-circle me-2"></i>{{ error }}
                </div>
              }

              @if (colis) {
                <div class="tracking-result">
                  <div class="card">
                    <div class="card-header bg-primary text-white">
                      <h5 class="mb-0">
                        <i class="las la-box me-2"></i>Détails du colis
                      </h5>
                    </div>
                    <div class="card-body">
                      <div class="tracking-info">
                        <div class="row mb-4">
                          <div class="col-md-6">
                            <h6 class="text-muted mb-2">Code de suivi</h6>
                            <p class="h5">{{ colis.codeSuivi }}</p>
                          </div>
                          <div class="col-md-6">
                            <h6 class="text-muted mb-2">Statut</h6>
                            <span class="badge" [ngClass]="getStatusClass()">
                              {{ getStatusLabel() }}
                            </span>
                          </div>
                        </div>

                        <div class="row mb-4">
                          <div class="col-md-6">
                            <h6 class="text-muted mb-2">Type de colis</h6>
                            <p>{{ getTypeColisLabel(colis.type) }}</p>
                          </div>
                          <div class="col-md-6">
                            <h6 class="text-muted mb-2">Type d'expédition</h6>
                            <p>{{ getTypeExpeditionLabel() }}</p>
                          </div>
                        </div>

                        <div class="row mb-4">
                          <div class="col-md-6">
                            <h6 class="text-muted mb-2">Date d'enregistrement</h6>
                            <p>{{ formatDate(colis.dateCreation) }}</p>
                          </div>
                          <div class="col-md-6">
                            <h6 class="text-muted mb-2">Poids</h6>
                            <p>{{ colis.poids ? colis.poids + ' kg' : 'Non spécifié' }}</p>
                          </div>
                        </div>

                        <div class="tracking-timeline">
                          <h6 class="text-muted mb-3">Progression</h6>
                          <div class="timeline">
                            <div class="timeline-item" [class.active]="isStatusReached(STATUT_COLIS.EN_ATTENTE_VERIFICATION)">
                              <div class="timeline-point"></div>
                              <div class="timeline-content">
                                <h6>Vérification</h6>
                                <p>Colis en attente de vérification</p>
                              </div>
                            </div>
                            <div class="timeline-item" [class.active]="isStatusReached(STATUT_COLIS.EN_ATTENTE_FACTURATION)">
                              <div class="timeline-point"></div>
                              <div class="timeline-content">
                                <h6>Facturation</h6>
                                <p>Colis en cours de facturation</p>
                              </div>
                            </div>
                            <div class="timeline-item" [class.active]="isStatusReached(STATUT_COLIS.EN_ATTENTE_PAIEMENT)">
                              <div class="timeline-point"></div>
                              <div class="timeline-content">
                                <h6>Paiement</h6>
                                <p>En attente de paiement</p>
                              </div>
                            </div>
                            <div class="timeline-item" [class.active]="isStatusReached(STATUT_COLIS.EN_ATTENTE_LIVRAISON)">
                              <div class="timeline-point"></div>
                              <div class="timeline-content">
                                <h6>Livraison</h6>
                                <p>En cours de livraison</p>
                              </div>
                            </div>
                            <div class="timeline-item" [class.active]="isStatusReached(STATUT_COLIS.LIVRE)">
                              <div class="timeline-point"></div>
                              <div class="timeline-content">
                                <h6>Livré</h6>
                                <p>Colis livré avec succès</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              }
            }

            <!-- Formulaire d'enregistrement -->
            @if (activeTab === 'register') {
              <div class="register-form">
                <div class="card">
                  <div class="card-body">
                    <h2 class="text-center mb-4">Enregistrer un nouveau colis</h2>

                    @if (registrationSuccess) {
                      <div class="alert alert-success">
                        <i class="las la-check-circle me-2"></i>
                        Votre colis a été enregistré avec succès !<br>
                        Code de suivi : <strong>{{ registrationSuccess }}</strong>
                      </div>
                    }

                    <!-- Étape 1 : Recherche ou enregistrement du client -->
                    @if (registrationStep === 'client') {
                      <div class="client-step">
                        <h5 class="mb-4">Étape 1 : Informations du client</h5>

                        @if (clientSearchMode) {
                          <div class="mb-4">
                            <div class="input-group">
                              <input
                                type="email"
                                class="form-control"
                                formControlName="email"
                                placeholder="Entrez votre email"
                              >
                              <button
                                class="btn btn-outline-primary"
                                type="button"
                                (click)="searchClient()"
                                [disabled]="isLoading || !clientForm.get('email')?.valid"
                              >
                                <i class="las" [ngClass]="{'la-search': !isLoading, 'la-spinner la-spin': isLoading}"></i>
                                Rechercher
                              </button>
                            </div>
                            @if (clientSearchError) {
                              <div class="alert alert-danger mt-3">
                                {{ clientSearchError }}
                              </div>
                            }
                          </div>
                        }

                        <form [formGroup]="clientForm" (ngSubmit)="onClientSubmit()">
                          <div class="row mb-4">
                            <div class="col-md-6 mb-3">
                              <label class="form-label">Nom</label>
                              <input type="text" class="form-control" formControlName="nom">
                              @if (clientForm.get('nom')?.invalid && clientForm.get('nom')?.touched) {
                                <div class="text-danger mt-1">Le nom est requis</div>
                              }
                            </div>
                            <div class="col-md-6 mb-3">
                              <label class="form-label">Prénom</label>
                              <input type="text" class="form-control" formControlName="prenom">
                              @if (clientForm.get('prenom')?.invalid && clientForm.get('prenom')?.touched) {
                                <div class="text-danger mt-1">Le prénom est requis</div>
                              }
                            </div>
                            <div class="col-md-6 mb-3">
                              <label class="form-label">Email</label>
                              <input type="email" class="form-control" formControlName="email">
                              @if (clientForm.get('email')?.invalid && clientForm.get('email')?.touched) {
                                <div class="text-danger mt-1">Email invalide</div>
                              }
                            </div>
                            <div class="col-md-6 mb-3">
                              <label class="form-label">Téléphone</label>
                              <div class="input-group">
                                <select class="form-select" style="max-width: 200px;" formControlName="countryCode" (change)="onCountryChange()">
                                  @for(country of countries; track country.code) {
                                    <option [value]="country.code">{{ country.name }} ({{ country.dialCode }})</option>
                                  }
                                </select>
                                <input type="tel" class="form-control" formControlName="telephone" [placeholder]="getPhonePlaceholder()">
                              </div>
                              @if (clientForm.get('telephone')?.invalid && clientForm.get('telephone')?.touched) {
                                <div class="text-danger mt-1">Format de téléphone invalide pour le pays sélectionné</div>
                              }
                            </div>
                            <div class="col-12 mb-3">
                              <label class="form-label">Adresse</label>
                              <input type="text" class="form-control" formControlName="adresse">
                            </div>
                          </div>

                          <div class="d-flex justify-content-between">
                            <button
                              type="button"
                              class="btn btn-outline-primary"
                              (click)="toggleClientSearchMode()"
                            >
                              <i class="las" [ngClass]="{'la-search': !clientSearchMode, 'la-user-plus': clientSearchMode}"></i>
                              {{ clientSearchMode ? 'Nouveau client' : 'Client existant' }}
                            </button>
                            <button
                              type="submit"
                              class="btn btn-primary"
                              [disabled]="clientForm.invalid || isSubmitting"
                            >
                              <i class="las" [ngClass]="{'la-arrow-right': !isSubmitting, 'la-spinner la-spin': isSubmitting}"></i>
                              {{ isSubmitting ? 'Enregistrement...' : 'Suivant' }}
                            </button>
                          </div>
                        </form>
                      </div>
                    }

                    <!-- Étape 2 : Informations du colis -->
                    @if (registrationStep === 'colis') {
                      <div class="colis-step">
                        <h5 class="mb-4">Étape 2 : Informations du colis</h5>

                        <form [formGroup]="colisForm" (ngSubmit)="onColisSubmit()">
                          <div class="row mb-4">
                            <div class="col-md-6 mb-3">
                              <label class="form-label">Code de suivi</label>
                              <input type="text" class="form-control" formControlName="codeSuivi" placeholder="Ex: KA123456">
                              @if (colisForm.get('codeSuivi')?.invalid && colisForm.get('codeSuivi')?.touched) {
                                <div class="text-danger mt-1">Le code de suivi est requis (minimum 3 caractères)</div>
                              }
                            </div>
                            <div class="col-md-6 mb-3">
                              <label class="form-label">Type de colis</label>
                              <select class="form-select" formControlName="type">
                                @for (type of getTypeColis(); track type.value) {
                                  <option [value]="type.value">{{ type.label }}</option>
                                }
                              </select>
                            </div>
                            <div class="col-md-6 mb-3">
                              <label class="form-label">Type d'expédition</label>
                              <select class="form-select" formControlName="typeExpedition">
                                @for (type of getTypeExpedition(); track type.value) {
                                  <option [value]="type.value">{{ type.label }}</option>
                                }
                              </select>
                            </div>
                            <div class="col-md-6 mb-3">
                              <label class="form-label">Poids (kg)</label>
                              <input type="number" class="form-control" formControlName="poids">
                            </div>
                            <div class="col-md-6 mb-3" *ngIf="showUnites()">
                              <label class="form-label">Nombre d'unités</label>
                              <input type="number" class="form-control" formControlName="nombreUnites">
                            </div>
                            <div class="col-12">
                              <label class="form-label">Description</label>
                              <textarea class="form-control" rows="3" formControlName="description"></textarea>
                            </div>
                          </div>

                          <div class="d-flex justify-content-between">
                            <button
                              type="button"
                              class="btn btn-outline-secondary"
                              (click)="registrationStep = 'client'"
                            >
                              <i class="las la-arrow-left me-2"></i>Retour
                            </button>
                            <div>
                              <button
                                type="button"
                                class="btn btn-outline-primary me-2"
                                (click)="addAnotherColis()"
                                [disabled]="colisForm.invalid || isSubmitting"
                              >
                                <i class="las la-plus me-2"></i>Ajouter un autre colis
                              </button>
                              <button
                                type="submit"
                                class="btn btn-primary"
                                [disabled]="colisForm.invalid || isSubmitting"
                              >
                                <i class="las" [ngClass]="{'la-paper-plane': !isSubmitting, 'la-spinner la-spin': isSubmitting}"></i>
                                {{ isSubmitting ? 'Enregistrement...' : 'Terminer' }}
                              </button>
                            </div>
                          </div>
                        </form>

                        @if (colisList.length > 0) {
                          <div class="mt-4">
                            <h6 class="mb-3">Colis enregistrés</h6>
                            <div class="table-responsive">
                              <table class="table table-sm">
                                <thead>
                                  <tr>
                                    <th>Type</th>
                                    <th>Poids</th>
                                    <th>Description</th>
                                    <th class="text-end">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  @for (colis of colisList; track colis.codeSuivi) {
                                    <tr>
                                      <td>{{ getTypeColisLabel(colis.type) }}</td>
                                      <td>{{ colis.poids }} kg</td>
                                      <td>{{ colis.description }}</td>
                                      <td class="text-end">
                                        <button
                                          class="btn btn-sm btn-outline-danger"
                                          (click)="removeColis(colis)"
                                        >
                                          <i class="las la-trash"></i>
                                        </button>
                                      </td>
                                    </tr>
                                  }
                                </tbody>
                              </table>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tracking-page {
      background-color: #f8f9fa;
      min-height: calc(100vh - 72px);
    }

    .nav-pills {
      background: white;
      padding: 1rem;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .nav-pills .nav-link {
      border-radius: 30px;
      padding: 0.75rem 1.5rem;
      color: #666;
      cursor: pointer;
    }

    .nav-pills .nav-link.active {
      background-color: #4e73e1;
      color: white; /* Added white text color for active tab */
    }

    .tracking-search, .register-form {
      background: white;
      padding: 2rem;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .form-control, .form-select {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      transition: all 0.3s ease;
    }

    .form-control:focus, .form-select:focus {
      border-color: #4e73e1;
      box-shadow: 0 0 0 0.2rem rgba(78,115,225,0.25);
    }

    .btn-lg {
      padding: 0.75rem 2rem;
    }

    .card {
      border: none;
      border-radius: 10px;
    }

    h5 {
      color: #333;
      font-weight: 600;
    }

    .text-danger {
      font-size: 0.875rem;
    }

    .timeline {
      position: relative;
      padding: 20px 0;
    }

    .timeline::before {
      content: '';
      position: absolute;
      left: 20px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #e0e0e0;
    }

    .timeline-item {
      position: relative;
      padding-left: 50px;
      margin-bottom: 30px;
      opacity: 0.5;
    }

    .timeline-item.active {
      opacity: 1;
    }

    .timeline-point {
      position: absolute;
      left: 12px;
      top: 0;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #e0e0e0;
      border: 4px solid white;
    }

    .timeline-item.active .timeline-point {
      background: #4e73e1;
    }

    .timeline-content h6 {
      margin-bottom: 5px;
      color: #333;
    }

    .timeline-content p {
      margin-bottom: 0;
      color: #666;
    }
  `]
})
export class WebsiteTrackingComponent implements OnInit {
  colis: Colis | null = null;
  isLoading: boolean = false;
  error: string = '';
  STATUT_COLIS = STATUT_COLIS;
  activeTab: 'track' | 'register' = 'track';
  trackingForm: FormGroup;
  clientForm: FormGroup;
  colisForm: FormGroup;
  isSubmitting = false;
  registrationSuccess: string | null = null;
  registrationStep: 'client' | 'colis' = 'client';
  clientSearchMode = false;
  clientSearchError: string | null = null;
  selectedClient: Partenaire | null = null;
  countries: CountryCode[] = [];
  private readonly phonePattern = '^[0-9]{9}$';
  colisList: Omit<Colis, 'id'>[] = [];
  isProcessingPayment = false;
  showPaymentButton = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firebaseService: FirebaseService,
    private partenaireService: PartenaireService,
    private countryService: CountryService,
    private paymentService: PaymentService,
    private fb: FormBuilder
  ) {
    this.trackingForm = this.fb.group({
      codeSuivi: ['', [Validators.required, Validators.minLength(3)]]
    });

    this.clientForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern(this.phonePattern)]],
      adresse: [''],
      countryCode: ['', Validators.required]
    });

    this.colisForm = this.fb.group({
      type: [TYPE_COLIS.ORDINAIRE, Validators.required],
      typeExpedition: [TYPE_EXPEDITION.STANDARD, Validators.required],
      poids: [null, [Validators.required, Validators.min(0.1)]],
      nombreUnites: [1],
      description: [''],
      codeSuivi: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  ngOnInit() {
    const code = this.route.snapshot.queryParams['code'];
    if (code) {
      this.trackingForm.patchValue({ codeSuivi: code });
      this.searchPackage();
    }

    // Vérifier le statut du paiement
    this.checkPaymentStatus();

    this.loadCountries();
  }

  private loadCountries(): void {
    this.countryService.getCountries().subscribe(countries => {
      this.countries = countries;
      if (countries.length > 0) {
        const defaultCountry = countries.find(c => c.code === 'CD') || countries[0];
        this.clientForm.patchValue({ countryCode: defaultCountry.code });
      }
      this.updatePhoneValidators();
    });
  }

  private updatePhoneValidators(): void {
    const telephoneControl = this.clientForm.get('telephone');
    if (telephoneControl) {
      telephoneControl.setValidators([
        Validators.required,
        Validators.pattern(this.phonePattern)
      ]);
      telephoneControl.updateValueAndValidity();
    }
  }

  onCountryChange(): void {
    this.updatePhoneValidators();
  }

  getPhonePlaceholder(): string {
    const country = this.getSelectedCountry();
    return country ? `Ex: ${country.dialCode} 999 888 777` : 'Numéro de téléphone';
  }

  getSelectedCountry(): CountryCode | undefined {
    const countryCode = this.clientForm?.get('countryCode')?.value;
    return this.countries.find(c => c.code === countryCode);
  }

  setActiveTab(tab: 'track' | 'register') {
    this.activeTab = tab;
    this.error = '';
    this.registrationSuccess = null;
    this.registrationStep = 'client';
    this.clientSearchMode = false;
    this.selectedClient = null;
    this.clientForm.reset();
    this.colisForm.reset();
  }

  toggleClientSearchMode() {
    this.clientSearchMode = !this.clientSearchMode;
    this.clientSearchError = null;
    if (this.clientSearchMode) {
      this.clientForm.patchValue({
        nom: '',
        prenom: '',
        telephone: '',
        adresse: ''
      });
    }
  }

  async searchClient() {
    const email = this.clientForm.get('email')?.value;
    if (!email) {
      this.clientSearchError = 'Veuillez entrer une adresse email';
      return;
    }

    this.isLoading = true;
    this.clientSearchError = null;

    try {
      const partenaires = await firstValueFrom(this.partenaireService.getPartenaires());
      const client = partenaires.find(p => p.email === email);

      if (client) {
        this.selectedClient = client;
        this.clientForm.patchValue({
          nom: client.nom,
          prenom: client.prenom,
          email: client.email,
          telephone: client.telephone,
          adresse: client.adresse
        });
        this.registrationStep = 'colis';
      } else {
        this.clientSearchError = 'Aucun client trouvé avec cette adresse email';
      }
    } catch (error) {
      console.error('Erreur lors de la recherche du client:', error);
      this.clientSearchError = 'Une erreur est survenue lors de la recherche';
    } finally {
      this.isLoading = false;
    }
  }

  async onClientSubmit() {
    if (this.clientForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    this.error = '';

    try {
      const formData = this.clientForm.value;
      const selectedCountry = this.getSelectedCountry();

      if (!selectedCountry) {
        throw new Error('Pays non sélectionné');
      }

      const fullPhoneNumber = this.countryService.formatFullPhoneNumber(
        selectedCountry.dialCode,
        formData.telephone
      );

      const newClient: Omit<Partenaire, 'id'> = {
        nom: formData.nom,
        prenom: formData.prenom,
        postnom: '', // Champ requis par le modèle Partenaire
        email: formData.email,
        telephone: Number(fullPhoneNumber),
        adresse: formData.adresse,
        factures: []
      };

      await this.partenaireService.addPartenaire(newClient);

      // Récupérer le client créé pour avoir son ID
      const partenaires = await firstValueFrom(this.partenaireService.getPartenaires());
      this.selectedClient = partenaires.find(p => p.email === formData.email) || null;

      if (this.selectedClient) {
        this.registrationStep = 'colis';
      } else {
        throw new Error('Erreur lors de la création du client');
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du client:', error);
      this.error = 'Une erreur est survenue lors de l\'enregistrement du client';
    } finally {
      this.isSubmitting = false;
    }
  }

  async onColisSubmit() {
    if (this.colisForm.invalid || !this.selectedClient || this.colisList.length === 0) {
      this.error = 'Veuillez ajouter au moins un colis valide';
      return;
    }

    if (!this.selectedClient.id) {
      this.error = 'Erreur: ID du client non défini';
      return;
    }

    this.isSubmitting = true;
    this.error = '';

    try {
      // Vérifier que tous les colis ont un code de suivi unique
      const codesSuivi = new Set<string>();
      for (const colis of this.colisList) {
        if (!colis.codeSuivi) {
          throw new Error('Tous les colis doivent avoir un code de suivi');
        }
        if (codesSuivi.has(colis.codeSuivi)) {
          throw new Error('Les codes de suivi doivent être uniques');
        }
        codesSuivi.add(colis.codeSuivi);
      }

      // Créer les colis dans Firebase
      const colisIds = await Promise.all(
        this.colisList.map(async (colis) => {
          const colisData: Omit<Colis, 'id'> = {
            ...colis,
            partenaireId: this.selectedClient!.id!,
            clientNom: this.selectedClient!.nom,
            clientPrenom: this.selectedClient!.prenom,
            clientEmail: this.selectedClient!.email,
            clientTelephone: this.selectedClient!.telephone,
            statut: STATUT_COLIS.EN_ATTENTE_VERIFICATION,
            dateCreation: new Date().toISOString()
          };
          return await this.firebaseService.addColis(colisData);
        })
      );

      // Créer une nouvelle facture pour les colis
      const newFacture: Facture = {
        id: undefined,
        montant: 0, // Le montant sera calculé plus tard
        montantPaye: 0,
        colis: this.colisList,
        paiements: []
      };

      // Mettre à jour le partenaire avec la nouvelle facture
      const updatedPartenaire: Partenaire = {
        ...this.selectedClient,
        factures: [...(this.selectedClient.factures || []), newFacture]
      };
      await this.partenaireService.updatePartenaire(updatedPartenaire);

      // Réinitialiser le formulaire et la liste des colis
      this.colisForm.reset({
        type: TYPE_COLIS.ORDINAIRE,
        typeExpedition: TYPE_EXPEDITION.STANDARD,
        nombreUnites: 1,
        codeSuivi: '' // Réinitialiser le code de suivi
      });
      this.colisList = [];
      this.registrationStep = 'client';
      this.selectedClient = null;
      this.registrationSuccess = 'Vos colis ont été enregistrés avec succès !';
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement des colis:', error);
      this.error = error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'enregistrement des colis';
    } finally {
      this.isSubmitting = false;
    }
  }

  addAnotherColis() {
    if (this.colisForm.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs de validation
      Object.keys(this.colisForm.controls).forEach(key => {
        this.colisForm.get(key)?.markAsTouched();
      });
      return;
    }

    if (!this.selectedClient) {
      this.error = 'Client non sélectionné';
      return;
    }

    const formData = this.colisForm.value;

    // Vérifier si le code de suivi est déjà utilisé
    if (this.colisList.some(c => c.codeSuivi === formData.codeSuivi)) {
      this.error = 'Ce code de suivi est déjà utilisé pour un autre colis';
      return;
    }

    // Calculer le coût du colis avant de l'ajouter
    const cout = this.calculateColisCost(
      formData.type,
      formData.typeExpedition,
      formData.poids,
      formData.nombreUnites || 1
    );

    const newColis: Omit<Colis, 'id'> = {
      ...formData,
      statut: STATUT_COLIS.EN_ATTENTE_VERIFICATION,
      dateCreation: new Date().toISOString(),
      partenaireId: this.selectedClient.id || '',
      clientNom: this.selectedClient.nom,
      clientPrenom: this.selectedClient.prenom,
      clientEmail: this.selectedClient.email,
      clientTelephone: this.selectedClient.telephone,
      cout: cout
    };

    this.colisList.push(newColis);
    this.error = ''; // Effacer les messages d'erreur précédents

    // Réinitialiser le formulaire mais garder les paramètres de base
    this.colisForm.reset({
      type: TYPE_COLIS.ORDINAIRE,
      typeExpedition: TYPE_EXPEDITION.STANDARD,
      nombreUnites: 1,
      codeSuivi: '' // Réinitialiser le code de suivi
    });

    // S'assurer que le formulaire est valide après la réinitialisation
    this.colisForm.patchValue({
      type: TYPE_COLIS.ORDINAIRE,
      typeExpedition: TYPE_EXPEDITION.STANDARD,
      nombreUnites: 1
    });
  }

  /**
   * Calcule le coût d'un colis en fonction de son type, type d'expédition, poids et nombre d'unités
   */
  calculateColisCost(type: TYPE_COLIS, typeExpedition: TYPE_EXPEDITION, poids: number, nombreUnites: number = 1): number {
    const params = PARAMETRAGE_COLIS[typeExpedition][type];
    let cout = params.prixParKilo * poids;

    if (params.prixUnitaire && params.prixUnitaire > 0) {
      cout += params.prixUnitaire * nombreUnites;
    }

    return Math.round(cout * 100) / 100; // Arrondir à 2 décimales
  }

  /**
   * Calcule le coût total de tous les colis dans la liste
   */
  getTotalCost(): number {
    return this.colisList.reduce((total, colis) => total + (colis.cout || 0), 0);
  }

  /**
   * Initie le paiement direct des colis via CinetPay
   */
  async initiatePayment() {
    if (!this.selectedClient || this.colisList.length === 0) {
      this.error = 'Veuillez d\'abord ajouter des colis';
      return;
    }

    this.isProcessingPayment = true;
    this.error = '';

    try {
      // S'assurer que tous les colis ont un coût calculé
      this.colisList.forEach(colis => {
        if (!colis.cout) {
          colis.cout = this.calculateColisCost(
            colis.type,
            colis.typeExpedition,
            colis.poids || 0,
            colis.nombreUnites || 1
          );
        }
      });

      // Obtenir l'URL de retour
      const returnUrl = `${window.location.origin}/tracking?payment=success`;

      // Initier le paiement
      const response = await firstValueFrom(
        this.paymentService.initiatePayment(this.colisList, this.selectedClient, returnUrl)
      );

      // Rediriger vers la page de paiement
      if (response && response.data && response.data.payment_url) {
        window.location.href = response.data.payment_url;
      } else {
        throw new Error('Erreur lors de l\'initialisation du paiement');
      }
    } catch (error) {
      console.error('Erreur de paiement:', error);
      this.error = 'Une erreur est survenue lors de l\'initialisation du paiement';
      this.isProcessingPayment = false;
    }
  }

  /**
   * Vérifie le statut du paiement après redirection
   */
  checkPaymentStatus() {
    const paymentStatus = this.route.snapshot.queryParams['payment'];
    if (paymentStatus === 'success') {
      this.registrationSuccess = 'Paiement effectué avec succès ! Vos colis sont enregistrés.';
      this.colisList = [];
      this.registrationStep = 'client';
      this.selectedClient = null;
    } else if (paymentStatus === 'failed') {
      this.error = 'Le paiement a échoué. Veuillez réessayer.';
    }
  }

  removeColis(colis: Omit<Colis, 'id'>) {
    const index = this.colisList.findIndex(c => c.codeSuivi === colis.codeSuivi);
    if (index !== -1) {
      this.colisList.splice(index, 1);
    }
  }

  getTypeColis() {
    return Object.keys(TYPE_COLIS)
      .filter(key => !isNaN(Number(key)))
      .map(key => ({
        value: key,
        label: TYPE_COLIS[Number(key)].replace(/_/g, ' ')
      }));
  }

  getTypeExpedition() {
    return Object.keys(TYPE_EXPEDITION)
      .filter(key => !isNaN(Number(key)))
      .map(key => ({
        value: key,
        label: TYPE_EXPEDITION[Number(key)]
      }));
  }

  showUnites(): boolean {
    const type = this.colisForm.get('type')?.value;
    return type === TYPE_COLIS.ORDINATEUR || type === TYPE_COLIS.TELEPHONE;
  }

  async searchPackage() {
    if (this.trackingForm.invalid) return;

    const trackingCode = this.trackingForm.get('codeSuivi')?.value;
    if (!trackingCode) return;

    this.isLoading = true;
    this.error = '';
    this.colis = null;

    try {
      const colis = await firstValueFrom(this.firebaseService.getColisByCode(trackingCode));
      if (!colis) {
        this.error = 'Aucun colis trouvé avec ce code de suivi';
        return;
      }
      this.colis = colis;
    } catch (error) {
      console.error('Erreur lors de la recherche du colis:', error);
      this.error = 'Une erreur est survenue lors de la recherche du colis';
    } finally {
      this.isLoading = false;
    }
  }

  getStatusClass(): string {
    if (!this.colis) return '';

    switch(this.colis.statut) {
      case STATUT_COLIS.LIVRE:
        return 'bg-success';
      case STATUT_COLIS.EN_ATTENTE_LIVRAISON:
        return 'bg-primary';
      case STATUT_COLIS.EN_ATTENTE_PAIEMENT:
        return 'bg-warning';
      case STATUT_COLIS.ANNULE:
        return 'bg-danger';
      default:
        return 'bg-info';
    }
  }

  getStatusLabel(): string {
    if (!this.colis) return '';
    return STATUT_COLIS[this.colis.statut].replace(/_/g, ' ');
  }

  getTypeColisLabel(type: TYPE_COLIS): string {
    return TYPE_COLIS[type] || 'Inconnu';
  }

  getTypeExpeditionLabel(): string {
    if (!this.colis) return '';
    return TYPE_EXPEDITION[this.colis.typeExpedition];
  }

  formatDate(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isStatusReached(status: STATUT_COLIS): boolean {
    if (!this.colis) return false;

    const statusOrder = [
      STATUT_COLIS.EN_ATTENTE_VERIFICATION,
      STATUT_COLIS.EN_ATTENTE_FACTURATION,
      STATUT_COLIS.EN_ATTENTE_PAIEMENT,
      STATUT_COLIS.EN_ATTENTE_LIVRAISON,
      STATUT_COLIS.LIVRE
    ];

    const currentIndex = statusOrder.indexOf(this.colis.statut);
    const targetIndex = statusOrder.indexOf(status);

    return currentIndex >= targetIndex;
  }
}

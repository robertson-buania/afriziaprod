import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Partenaire } from '@/app/models/partenaire.model';
import { CountryService, CountryCode } from '@/app/core/services/country.service';

@Component({
  selector: 'app-partenaire-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-header">
      <h6 class="modal-title m-0">{{ partenaire ? 'Modifier le client' : 'Ajouter un client' }}</h6>
      <button type="button" class="btn-close" (click)="activeModal.dismiss()" aria-label="Close"></button>
    </div>
    <div class="modal-body">
      <form [formGroup]="clientForm">
        <div class="row">
          <div class="col-md-4">
            <div class="mb-3">
              <label for="nom" class="form-label">Nom</label>
              <input type="text" class="form-control" id="nom" formControlName="nom" required />
              <div *ngIf="clientForm.get('nom')?.invalid && clientForm.get('nom')?.touched" class="text-danger">
                <small *ngIf="clientForm.get('nom')?.errors?.['required']">Le nom est requis</small>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="mb-3">
              <label for="prenom" class="form-label">Prénom</label>
              <input type="text" class="form-control" id="prenom" formControlName="prenom" required />
              <div *ngIf="clientForm.get('prenom')?.invalid && clientForm.get('prenom')?.touched" class="text-danger">
                <small *ngIf="clientForm.get('prenom')?.errors?.['required']">Le prénom est requis</small>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="mb-3">
              <label for="postnom" class="form-label">Post-nom</label>
              <input type="text" class="form-control" id="postnom" formControlName="postnom" required />
              <div *ngIf="clientForm.get('postnom')?.invalid && clientForm.get('postnom')?.touched" class="text-danger">
                <small *ngIf="clientForm.get('postnom')?.errors?.['required']">Le post-nom est requis</small>
              </div>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-md-6">
            <div class="mb-3">
              <label for="telephone" class="form-label">Téléphone</label>
              <div class="input-group">
                <select class="form-select" style="max-width: 200px;" formControlName="countryCode" (change)="onCountryChange()">
                  @for(country of countries; track country.code) {
                    <option [value]="country.code">{{ country.name }} ({{ country.dialCode }})</option>
                  }
                </select>
                <input type="tel" class="form-control" id="telephone" formControlName="telephone"
                       [placeholder]="getPhonePlaceholder()" required />
              </div>
              <div *ngIf="clientForm.get('telephone')?.invalid && clientForm.get('telephone')?.touched" class="text-danger">
                <small *ngIf="clientForm.get('telephone')?.errors?.['required']">Le téléphone est requis</small>
                <small *ngIf="clientForm.get('telephone')?.errors?.['pattern']">Format invalide pour le pays sélectionné</small>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="mb-3">
              <label for="email" class="form-label">Email</label>
              <input type="email" class="form-control" id="email" formControlName="email" required />
              <div *ngIf="clientForm.get('email')?.invalid && clientForm.get('email')?.touched" class="text-danger">
                <small *ngIf="clientForm.get('email')?.errors?.['required']">L'email est requis</small>
                <small *ngIf="clientForm.get('email')?.errors?.['email']">Email invalide</small>
              </div>
            </div>
          </div>
        </div>
        <div class="mb-3">
          <label for="adresse" class="form-label">Adresse</label>
          <textarea class="form-control" id="adresse" formControlName="adresse" rows="2"></textarea>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary btn-sm" (click)="activeModal.dismiss()">Annuler</button>
      <button type="button" class="btn btn-primary btn-sm" (click)="onSubmit()" [disabled]="!clientForm.valid">
        {{ partenaire ? 'Modifier' : 'Ajouter' }}
      </button>
    </div>
  `
})
export class PartenaireFormModalComponent implements OnInit {
  @Input() partenaire?: Partenaire;
  clientForm!: FormGroup;
  countries: CountryCode[] = [];
  private readonly phonePattern = '^[0-9]{9}$';

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private countryService: CountryService
  ) {
    this.initForm();
  }

  private initForm(): void {
    this.clientForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      postnom: ['', Validators.required],
      countryCode: ['CD', Validators.required],
      telephone: ['', [Validators.required, Validators.pattern(this.phonePattern)]],
      email: ['', [Validators.required, Validators.email]],
      adresse: [''],
      factures: [[]]
    });
  }

  ngOnInit(): void {
    this.loadCountries();
    this.initializeFormData();
  }

  private loadCountries(): void {
    this.countryService.getCountries().subscribe(countries => {
      this.countries = countries;
      this.updatePhoneValidators();
    });
  }

  private initializeFormData(): void {
    if (this.partenaire) {
      const countryCode = this.countryService.extractCountryCode(
        this.partenaire.telephone.toString(),
        this.countries
      );
      const phoneNumber = this.countryService.extractPhoneNumber(
        this.partenaire.telephone.toString(),
        this.countries
      );

      this.clientForm.patchValue({
        ...this.partenaire,
        countryCode: countryCode || 'CD',
        telephone: phoneNumber
      });
    }
  }

  getSelectedCountry(): CountryCode | undefined {
    const countryCode = this.clientForm?.get('countryCode')?.value;
    return this.countries.find(c => c.code === countryCode);
  }

  getPhonePlaceholder(): string {
    return '#'.repeat(9);
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

  onSubmit(): void {
    if (this.clientForm.valid) {
      const updatedPartenaire = {
        ...this.partenaire,
        ...this.clientForm.value,
        telephone: Number(this.clientForm.value.telephone)
      };

      this.activeModal.close(updatedPartenaire);
    }
  }
}

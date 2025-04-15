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
import { UtilisateurService } from '@/app/core/services/utilisateur.service';
import { TranslateModule } from '@ngx-translate/core';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-website-tracking',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, TranslateModule, NgbAlertModule],
  templateUrl: './website-tracking.component.html',
  styleUrl: './website-tracking.component.scss'
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
  colisList: Colis[] = [];
  isProcessingPayment = false;
  showPaymentButton = true;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  partenaireId: string = '';
  currentUser: any = null;
  message: { type: 'success' | 'error' | 'info', text: string } | null = null;

  // Types de colis disponibles
  colisTypes = [
    { value: TYPE_COLIS.ORDINAIRE, label: 'Ordinaire' },
    { value: TYPE_COLIS.AVEC_BATTERIE, label: 'Avec batterie' },
    { value: TYPE_COLIS.ORDINATEUR, label: 'Ordinateur' },
    { value: TYPE_COLIS.TELEPHONE, label: 'Téléphone' }
  ];

  // Statuts de colis disponibles
  colisStatuses = [
    { value: STATUT_COLIS.EN_ATTENTE_PAIEMENT, label: 'En attente de paiement' },
    { value: STATUT_COLIS.PAYE, label: 'Payé' },
    { value: STATUT_COLIS.EN_ATTENTE_EXPEDITION, label: 'En attente d\'expédition' },
    { value: STATUT_COLIS.EN_COURS_EXPEDITION, label: 'En cours d\'expédition' },
    { value: STATUT_COLIS.EN_ATTENTE_LIVRAISON, label: 'En attente de livraison' },
    { value: STATUT_COLIS.LIVRE, label: 'Livré' },
    { value: STATUT_COLIS.ANNULE, label: 'Annulé' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firebaseService: FirebaseService,
    private partenaireService: PartenaireService,
    private countryService: CountryService,
    private paymentService: PaymentService,
    private fb: FormBuilder,
    private utilisateurService: UtilisateurService
  ) {
    this.trackingForm = this.fb.group({
      codeSuivi: ['', [Validators.required, Validators.minLength(5)]]
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
      description: ['', Validators.required],
      poids: [null, [Validators.required, Validators.min(0)]],
      cout: [null, [Validators.required, Validators.min(0)]],
      codeSuivi: ['', Validators.required],
      destinataire: ['', Validators.required],
      destination: ['', Validators.required],
      quantite: ['', [Validators.required, Validators.min(1)]],
      nature: ['', Validators.required],
      transporteur: ['', Validators.required]
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

    // Initialiser le partenaireId depuis le service d'authentification ou le stockage local
    this.partenaireId = localStorage.getItem('partenaireId') || '';

    this.utilisateurService.utilisateurCourant$.subscribe((user: any) => {
      this.currentUser = user;
      if (user && user.id) {
        this.partenaireId = user.id;
        localStorage.setItem('partenaireId', user.id);
        this.loadColis();
      }
    });
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
    if (this.colisForm.invalid) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires';
      return;
    }

    try {
      const user = await firstValueFrom(this.utilisateurService.utilisateurCourant$);
      if (!user || !user.partenaireId) {
        this.errorMessage = 'Vous devez être connecté en tant que partenaire pour soumettre des colis';
        return;
      }

      // Vérifier si le code de suivi existe déjà
      const codeSuivi = this.colisForm.get('codeSuivi')?.value;
      if (!codeSuivi) {
        this.errorMessage = 'Le code de suivi est requis';
        return;
      }

      const existingColis = await this.firebaseService.getColisByCode(codeSuivi);
      if (existingColis) {
        this.errorMessage = 'Ce code de suivi existe déjà';
        return;
      }

      // Créer le colis
      const colis: Omit<Colis, 'id'> = {
        ...this.colisForm.value,
        partenaireId: user.partenaireId,
        statut: STATUT_COLIS.EN_ATTENTE_PAIEMENT,
        dateCreation: new Date().toISOString()
      };

      // Créer la facture
      const facture: Omit<Facture, 'id'> = {
        montant: this.colisForm.value.cout,
        montantPaye: 0,
        colis: [],
        paiements: [],
        dateCreation: new Date().toISOString(),
        partenaireId: user.partenaireId
      };

      // Créer la facture et obtenir son ID
      const factureId = await this.firebaseService.createFactureFromColis(facture);

      // Réinitialiser le formulaire et afficher le message de succès
      this.colisForm.reset({
        type: TYPE_COLIS.ORDINAIRE,
        typeExpedition: TYPE_EXPEDITION.STANDARD,
        quantite: 1
      });
      this.successMessage = 'Colis enregistré avec succès';
      setTimeout(() => this.successMessage = '', 3000);

    } catch (error) {
      console.error('Erreur lors de la soumission du colis:', error);
      this.errorMessage = 'Une erreur est survenue lors de la soumission du colis';
    }
  }

  addColisToList() {
    if (this.colisForm.valid) {
      const newColis: Colis = {
        ...this.colisForm.value,
        partenaireId: this.partenaireId,
        statut: STATUT_COLIS.EN_ATTENTE_PAIEMENT,
        dateCreation: new Date().toISOString()
      };
      this.colisList.push(newColis);
      this.colisForm.reset({
        type: TYPE_COLIS.ORDINAIRE,
        typeExpedition: TYPE_EXPEDITION.STANDARD,
        quantite: 1
      });
    }
  }

  removeColisFromList(index: number) {
    this.colisList.splice(index, 1);
  }

  async updateColisStatus(colis: Colis, newStatus: STATUT_COLIS) {
    if (!colis.id) {
      this.errorMessage = 'ID du colis non défini';
      return;
    }

    try {
      this.isLoading = true;

      // Mettre à jour le statut du colis
      const updatedColis = { ...colis, statut: newStatus };
      await this.firebaseService.updateColis(colis.id, updatedColis);

      // Mettre à jour la liste locale
      const index = this.colisList.findIndex(c => c.id === colis.id);
      if (index !== -1) {
        this.colisList[index] = updatedColis;
      }

      this.successMessage = 'Statut du colis mis à jour avec succès';
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      this.errorMessage = 'Erreur lors de la mise à jour du statut du colis';
    } finally {
      this.isLoading = false;
    }
  }

  getTypeColisLabel(type: TYPE_COLIS): string {
    return TYPE_COLIS[type] || 'Type inconnu';
  }

  getTypeExpeditionLabel(type: TYPE_EXPEDITION): string {
    return TYPE_EXPEDITION[type] || 'Type d\'expédition inconnu';
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
      STATUT_COLIS.EN_ATTENTE_PAIEMENT,
      STATUT_COLIS.EN_ATTENTE_EXPEDITION,
      STATUT_COLIS.EN_COURS_EXPEDITION,
      STATUT_COLIS.EN_ATTENTE_LIVRAISON,
      STATUT_COLIS.LIVRE
    ];

    const currentIndex = statusOrder.indexOf(this.colis.statut);
    const targetIndex = statusOrder.indexOf(status);

    return currentIndex >= targetIndex;
  }

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

  async loadColis(): Promise<void> {
    if (!this.currentUser || !this.currentUser.id) {
      this.message = { type: 'error', text: 'Utilisateur non connecté' };
      return;
    }

    try {
      this.isLoading = true;
      const factures = await firstValueFrom(this.firebaseService.getFacturesByPartenaire(this.currentUser.id));

      // Fix the type issue by filtering out string values and only keeping Colis objects
      this.colisList = factures.flatMap((facture: Facture) =>
        facture.colis.filter((item): item is Colis => typeof item !== 'string')
      );
    } catch (error) {
      console.error('Erreur lors du chargement des colis:', error);
      this.message = { type: 'error', text: 'Erreur lors du chargement des colis' };
    } finally {
      this.isLoading = false;
    }
  }

  async processPayment(factureId: string): Promise<void> {
    if (!factureId) {
      this.errorMessage = 'ID de facture non défini';
      return;
    }

    try {
      this.isProcessingPayment = true;

      // Mettre à jour le statut de la facture
      await this.firebaseService.updateFacture(factureId, { montantPaye: 0 });

      this.message = { type: 'success', text: 'Paiement traité avec succès' };
    } catch (error) {
      console.error('Erreur lors du traitement du paiement:', error);
      this.errorMessage = 'Erreur lors du traitement du paiement';
    } finally {
      this.isProcessingPayment = false;
    }
  }

  getColisTypeLabel(type: TYPE_COLIS): string {
    return this.colisTypes.find(t => t.value === type)?.label || 'Type inconnu';
  }

  getColisStatusLabel(status: STATUT_COLIS): string {
    return this.colisStatuses.find(s => s.value === status)?.label || 'Statut inconnu';
  }

  getColisStatusClass(status: STATUT_COLIS): string {
    switch (status) {
      case STATUT_COLIS.EN_ATTENTE_PAIEMENT:
        return 'status-pending';
      case STATUT_COLIS.EN_COURS_EXPEDITION:
        return 'status-transit';
      case STATUT_COLIS.LIVRE:
        return 'status-delivered';
      case STATUT_COLIS.ANNULE:
        return 'status-cancelled';
      default:
        return '';
    }
  }

  getTypeExpeditionOptions() {
    return [
      { value: TYPE_EXPEDITION.STANDARD, label: 'Standard' },
      { value: TYPE_EXPEDITION.EXPRESS, label: 'Express' }
    ];
  }

  getTypeColis(type: TYPE_COLIS): string {
    return this.colisTypes.find(t => t.value === type)?.label || 'Type inconnu';
  }

  getTypeExpedition(type: TYPE_EXPEDITION): string {
    return this.getTypeExpeditionOptions().find(t => t.value === type)?.label || 'Type d\'expédition inconnu';
  }

  getTotalCost(): number {
    return this.colisList.reduce((total, colis) => total + (colis.cout || 0), 0);
  }
}

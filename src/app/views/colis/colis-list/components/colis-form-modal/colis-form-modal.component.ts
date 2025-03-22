import { Component, Inject, Input, OnInit } from '@angular/core';
import { NgbActiveModal, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { TYPE_COLIS, Colis, Partenaire, STATUT_COLIS, TYPE_EXPEDITION, PARAMETRAGE_COLIS } from '@/app/models/partenaire.model';
import { CommonModule } from '@angular/common';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { PhoneFormatPipe } from '@/app/core/pipes/phone-format.pipe';

@Component({
  selector: 'app-colis-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgbNavModule,
    FormsModule,
    PhoneFormatPipe
  ],
  templateUrl:"../colis-form-modal/colis-form-modal.component.html",
  styleUrl:"../colis-form-modal/colis-form-modal.component.scss"
})
export class ColisFormModalComponent implements OnInit {
  @Input() colis?: Colis;
  @Input() selectedClient?: any;

  colisForm: FormGroup;
  isLoading = false;
  showNombreUnites = false;
  colisList: Omit<Colis, 'id'>[] = [];
  activeStep = '1';
  clientSearch = '';
  showResults = false;
  filteredClients: any[] = [];

  readonly TYPE_COLIS = TYPE_COLIS;
  readonly TYPE_EXPEDITION = TYPE_EXPEDITION;

  typesColis = Object.values(TYPE_COLIS)
    .filter(v => typeof v === 'number')
    .map(v => ({
      value: v,
      label: TYPE_COLIS[v].replace(/_/g, ' ')
    }));

  typesExpedition = Object.values(TYPE_EXPEDITION)
    .filter(v => typeof v === 'number')
    .map(v => ({
      value: v,
      label: TYPE_EXPEDITION[v].replace(/_/g, ' ')
    }));

  private searchSubject = new Subject<string>();

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal,
    private firebaseService: FirebaseService
  ) {
    this.colisForm = this.fb.group({
      type: [TYPE_COLIS.ORDINAIRE, [Validators.required]],
      typeExpedition: [TYPE_EXPEDITION.STANDARD, [Validators.required]],
      poids: [undefined as number | undefined, [Validators.min(0.1)]],
      nombreUnites: [1, [Validators.required, Validators.min(1)]],
      cout: [{ value: 0, disabled: true }],
      description: [''],
      codeSuivi: ['', [Validators.required]]
    });

    // Écouter les changements sur les champs qui affectent le prix
    this.colisForm.get('type')?.valueChanges.subscribe((type: TYPE_COLIS) => {
     this.showNombreUnites = this.isTypeWithUnites(type);

      const nombreUnitesControl = this.colisForm.get('nombreUnites');
      if (this.showNombreUnites) {
        nombreUnitesControl?.setValidators([Validators.required, Validators.min(1)]);
      } else {
        nombreUnitesControl?.clearValidators();
        nombreUnitesControl?.setErrors(null);
        this.colisForm.patchValue({ nombreUnites: 1 }, { emitEvent: false });
      }
      nombreUnitesControl?.updateValueAndValidity({ emitEvent: false });

      this.calculateCost();
    });

    this.colisForm.get('typeExpedition')?.valueChanges.subscribe(() => {
      this.calculateCost();
    });

    this.colisForm.get('poids')?.valueChanges.subscribe(() => {
      this.calculateCost();
    });

    this.colisForm.get('nombreUnites')?.valueChanges.subscribe(() => {
      this.calculateCost();
    });

    // Configure search debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.searchClients(searchTerm);
    });
  }

  ngOnInit() {
    if (this.colis) {
      this.colisForm.patchValue({
        type: this.colis.type,
        typeExpedition: this.colis.typeExpedition,
        poids: this.colis.poids,
        nombreUnites: this.colis.nombreUnites || 1,
        cout: this.colis.cout,
        description: this.colis.description,
        codeSuivi: this.colis.codeSuivi
      });

      // Désactiver le code de suivi en mode édition
      this.colisForm.get('codeSuivi')?.disable();
    }

    // Initialiser l'affichage du champ nombreUnites
    const type = this.colisForm.get('type')?.value;
    this.showNombreUnites = type !== null && this.isTypeWithUnites(type as TYPE_COLIS);
  }

  isTypeWithUnites(type: TYPE_COLIS): boolean {
    console.log('Checking type:', type, 'ORDINATEUR:', TYPE_COLIS.ORDINATEUR, 'TELEPHONE:', TYPE_COLIS.TELEPHONE);
    return type == TYPE_COLIS.ORDINATEUR || type == TYPE_COLIS.TELEPHONE;
  }

  getTypeColisLabel(type: TYPE_COLIS): string {
    return TYPE_COLIS[type].replace(/_/g, ' ');
  }

  getTypeExpeditionLabel(type: TYPE_EXPEDITION): string {
    return TYPE_EXPEDITION[type].replace(/_/g, ' ');
  }

  getStatutLabel(statut: STATUT_COLIS): string {
    switch(statut) {
      case STATUT_COLIS.EN_ATTENTE_VERIFICATION:
        return 'En attente de vérification';
      case STATUT_COLIS.EN_ATTENTE_FACTURATION:
        return 'En attente de facturation';
      case STATUT_COLIS.EN_ATTENTE_PAIEMENT:
        return 'En attente de paiement';
      case STATUT_COLIS.EN_ATTENTE_LIVRAISON:
        return 'En attente de livraison';
      case STATUT_COLIS.LIVRE:
        return 'Livré';
      default:
        return 'Annulé';
    }
  }

  getStatutBadgeClass(statut: STATUT_COLIS): string {
    switch(statut) {
      case STATUT_COLIS.EN_ATTENTE_VERIFICATION:
        return 'bg-warning text-dark';
      case STATUT_COLIS.EN_ATTENTE_FACTURATION:
        return 'bg-info text-white';
      case STATUT_COLIS.EN_ATTENTE_PAIEMENT:
        return 'bg-primary text-white';
      case STATUT_COLIS.EN_ATTENTE_LIVRAISON:
        return 'bg-success text-white';
      case STATUT_COLIS.LIVRE:
        return 'bg-success text-white';
      default:
        return 'bg-secondary text-white';
    }
  }

  updateNombreUnitesVisibility() {
    const type = this.colisForm.get('type')?.value as TYPE_COLIS;
    console.log('Updating visibility for type:', type);

    this.showNombreUnites = this.isTypeWithUnites(type);
    console.log('showNombreUnites set to:', this.showNombreUnites);

    const nombreUnitesControl = this.colisForm.get('nombreUnites');
    if (this.showNombreUnites) {
      console.log('Activating validators for nombreUnites');
      nombreUnitesControl?.setValidators([Validators.required, Validators.min(1)]);
    } else {
      console.log('Clearing validators for nombreUnites');
      nombreUnitesControl?.clearValidators();
      nombreUnitesControl?.setErrors(null);
      this.colisForm.patchValue({ nombreUnites: 1 }, { emitEvent: false });
    }
    nombreUnitesControl?.updateValueAndValidity({ emitEvent: false });
  }

  private calculateCost() {
    const type = this.colisForm.get('type')?.value as TYPE_COLIS;
    const typeExpedition = this.colisForm.get('typeExpedition')?.value as TYPE_EXPEDITION;
    const poids = this.colisForm.get('poids')?.value as number;
    const nombreUnites = this.colisForm.get('nombreUnites')?.value as number;

    // Vérifier si les valeurs nécessaires sont définies
    if (type === null || type === undefined || typeExpedition === null || typeExpedition === undefined) {
      this.colisForm.patchValue({ cout: 0 }, { emitEvent: false });
      return;
    }

    // Si pas de poids, calculer uniquement le prix unitaire si applicable
    if (!poids || poids <= 0) {
      const parametrage = PARAMETRAGE_COLIS[typeExpedition][type];
      if (parametrage?.prixUnitaire && this.isTypeWithUnites(type)) {
        const cout = parametrage.prixUnitaire * nombreUnites;
        this.colisForm.patchValue({ cout }, { emitEvent: false });
      } else {
        this.colisForm.patchValue({ cout: 0 }, { emitEvent: false });
      }
      return;
    }

    // Si poids présent, calculer le prix total
    const parametrage = PARAMETRAGE_COLIS[typeExpedition][type];
    if (!parametrage) {
      this.colisForm.patchValue({ cout: 0 }, { emitEvent: false });
      return;
    }

    let cout = poids * parametrage.prixParKilo;

    // Ajouter le prix unitaire si applicable
    if (parametrage.prixUnitaire && this.isTypeWithUnites(type)) {
      cout += parametrage.prixUnitaire * nombreUnites;
    }

    this.colisForm.patchValue({ cout }, { emitEvent: false });
  }

  addToList() {
    if (!this.colisForm.valid || !this.selectedClient) return;

    const formValue = this.colisForm.getRawValue();
    const type = formValue.type as TYPE_COLIS;

    // Créer l'objet de base sans les champs optionnels
    const newColis: Partial<Omit<Colis, 'id'>> = {
      type: formValue.type,
      typeExpedition: formValue.typeExpedition,
      codeSuivi: formValue.codeSuivi,
      partenaireId: this.selectedClient.id!,
      clientNom: this.selectedClient.nom,
      clientPrenom: this.selectedClient.prenom,
      clientTelephone: this.selectedClient.telephone,
      clientEmail: this.selectedClient.email,
      statut: formValue.poids > 0 ? STATUT_COLIS.EN_ATTENTE_FACTURATION : STATUT_COLIS.EN_ATTENTE_VERIFICATION,
      dateCreation: new Date().toISOString()
    };

    // Ajouter les champs optionnels seulement s'ils ont une valeur
    if (formValue.poids && formValue.poids > 0) {
      newColis.poids = formValue.poids;
    }

    if (formValue.cout && formValue.cout > 0) {
      newColis.cout = formValue.cout;
    }

    if (formValue.description?.trim()) {
      newColis.description = formValue.description.trim();
    }

    if (this.isTypeWithUnites(type) && formValue.nombreUnites > 0) {
      newColis.nombreUnites = formValue.nombreUnites;
    }

    this.colisList.push(newColis as Omit<Colis, 'id'>);

    // Réinitialiser le formulaire
    this.colisForm.patchValue({
      codeSuivi: '',
      poids: undefined,
      cout: 0,
      description: ''
    });
    this.colisForm.markAsUntouched();
  }

  removeFromList(index: number) {
    this.colisList.splice(index, 1);
  }

  async onSubmit() {
    this.isLoading = true;
    try {
      if (this.colis) {
        // Mode édition
        const formValue = this.colisForm.getRawValue();
        const updatedColis: Partial<Colis> = {
          type: formValue.type,
          typeExpedition: formValue.typeExpedition,
          statut: formValue.poids > 0
            ? STATUT_COLIS.EN_ATTENTE_FACTURATION
            : STATUT_COLIS.EN_ATTENTE_VERIFICATION
        };

        // Ajouter les champs optionnels seulement s'ils ont une valeur
        if (formValue.poids && formValue.poids > 0) {
          updatedColis.poids = formValue.poids;
        }

        if (formValue.cout && formValue.cout > 0) {
          updatedColis.cout = formValue.cout;
        }

        if (formValue.description?.trim()) {
          updatedColis.description = formValue.description.trim();
        }

        if (this.isTypeWithUnites(formValue.type) && formValue.nombreUnites > 0) {
          updatedColis.nombreUnites = formValue.nombreUnites;
        }

        if (!this.colis.id) throw new Error('ID du colis requis');
        await this.firebaseService.updateColis(this.colis.id, updatedColis);
      } else {
        // Mode création
        if (this.colisList.length === 0) return;
        // Enregistrer tous les colis
        for (const colis of this.colisList) {
          await this.firebaseService.addColis(colis);
        }
      }

      this.activeModal.close();
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async searchClients(searchTerm: string) {
    if (!searchTerm.trim()) {
      this.filteredClients = [];
      this.showResults = false;
      return;
    }

    try {
      // Search in Firestore for clients matching the search term
      const clients = await this.firebaseService.searchPartenaires(searchTerm.toLowerCase());
      this.filteredClients = clients;
      this.showResults = true;
    } catch (error) {
      console.error('Erreur lors de la recherche des clients:', error);
      this.filteredClients = [];
    }
  }

  onSearchInput() {
    const searchTerm = this.clientSearch;
    this.searchSubject.next(searchTerm);
  }

  onSearchBlur() {
    // Add a small delay before hiding results to allow for click events
    setTimeout(() => {
      this.showResults = false;
    }, 200);
  }

  selectClient(client: Partenaire) {
    this.selectedClient = client;
    this.clientSearch = `${client.nom} ${client.prenom}`;
    this.showResults = false;
  }

  trackByClientId(index: number, client: any) {
    return client.id;
  }
}

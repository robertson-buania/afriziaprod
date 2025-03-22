import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Colis, Partenaire, STATUT_COLIS, TYPE_COLIS, TYPE_EXPEDITION, Facture } from '@/app/models/partenaire.model';
import { debounceTime, distinctUntilChanged, Subject, firstValueFrom, map } from 'rxjs';
import { PhoneFormatPipe } from '@/app/core/pipes/phone-format.pipe';
import { currentYear } from '@/app/common/constants';

@Component({
  selector: 'app-facturation-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PhoneFormatPipe
  ],
  styles: [`
    .table-container {
      max-height: 400px;
      overflow-y: auto;
    }
    .removed-items {
      max-height: 200px;
      overflow-y: auto;
    }
  `],
  template: `
    <div class="modal-header bg-black">
      <div class="row w-100">
        <div class="col-4 align-self-center">
          <img src="assets/images/logo-sm.png" alt="logo-small" class="logo-sm me-1" height="70"/>
        </div>
        <div class="col-8 text-end align-self-center">
          <h5 class="mb-1 fw-semibold text-white">
            <span class="text-muted">Facture:</span> #{{ invoiceNumber }}
          </h5>
          <h5 class="mb-0 fw-semibold text-white">
            <span class="text-muted">Date:</span> {{ currentDate | date:'dd/MM/yyyy' }}
          </h5>
        </div>
      </div>
    </div>

    <div class="modal-body">
      <!-- Recherche client -->
      <div class="mb-4 position-relative">
        <label class="form-label fw-bold">
          <i class="las la-search me-2"></i>Rechercher un client
        </label>
        <div class="input-group">
          <input
            type="text"
            class="form-control border-primary"
            placeholder="Nom, email ou téléphone..."
            [(ngModel)]="clientSearch"
            (input)="onSearchInput()"
            (blur)="onSearchBlur()"
            #searchInput
          >
          <button class="input-group-text bg-primary text-white" (click)="searchInput.focus()">
            <i class="las la-user"></i>
          </button>
        </div>

        <div class="autocomplete-results shadow-sm p-2" *ngIf="showResults && filteredClients().length > 0">
          <div
            class="list-group-item list-group-item-action d-flex justify-content-between align-items-center m-2"
            *ngFor="let client of filteredClients(); trackBy: trackByClientId"
            (mousedown)="selectClient(client)"
            [class.active]="selectedClient()?.id === client.id"
          >
            <div>
              <h6 class="mb-1 text-primary">{{ client.nom }} {{ client.prenom }}</h6>
              <small class="text-muted">
                <i class="las la-envelope me-1"></i>{{ client.email }}
                <i class="las la-phone ms-3 me-1"></i>{{ client.telephone | phoneFormat }}
              </small>
            </div>
          </div>
        </div>
      </div>

      <div class="row" *ngIf="selectedClient()">
        <!-- Informations de l'entreprise -->
        <div class="col-lg-12 col-xl-4">
          <div class="card">
            <div class="card-body">
              <h5 class="mb-3">Kamba Agency</h5>
              <p class="mb-2">Adresse: 123 Rue Principale</p>
              <p class="mb-2">Téléphone: +243 999 888 777</p>
              <p class="mb-2">Email: contact.#kamba-agency.com</p>
              <p class="mb-0">Site web: www.kamba-agency.com</p>
            </div>
          </div>
        </div>

        <!-- Informations du client -->
        <div class="col-lg-12 col-xl-4">
          <div class="card">
            <div class="card-body">
              <h5 class="mb-3">Informations du client</h5>
              <p class="mb-2">{{ selectedClient()?.nom }} {{ selectedClient()?.prenom }}</p>
              <p class="mb-2">{{ selectedClient()?.email }}</p>
              <p class="mb-2">{{ selectedClient()?.telephone  }}</p>
              <p class="mb-0" *ngIf="selectedClient()?.adresse">{{ selectedClient()?.adresse }}</p>
            </div>
          </div>
        </div>

        <!-- Résumé de la facture -->
        <div class="col-lg-12 col-xl-4">
          <div class="card">
            <div class="card-body">
              <h5 class="mb-3">Résumé de la facture</h5>
              <p class="mb-2">Facture #: {{ invoiceNumber }}</p>
              <p class="mb-2">Date: {{ currentDate | date:'dd/MM/yyyy' }}</p>
              <p class="mb-2">Nombre de colis: {{ colisList().length }}</p>
              <p class="mb-0 text-primary fw-bold">Total: {{ total() | currency:'USD':'symbol' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Liste des colis -->
      <div class="mt-4" *ngIf="selectedClient() && colisList().length > 0">
        <div class="card">
          <div class="card-header bg-light">
            <h5 class="mb-0">Détail des colis</h5>
          </div>
          <div class="card-body">
            <div class="table-container">
              <table class="table table-bordered mb-0">
                <thead class="sticky-top bg-white">
                  <tr>
                    <th>Code de suivi</th>
                    <th>Code d'expédition</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Expédition</th>
                    <th>Poids</th>
                    <th>Unités</th>
                    <th class="text-end">Coût</th>
                    <th class="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  @for(colis of colisList(); track colis.id) {
                    <tr>
                      <td>{{ colis.codeSuivi }}</td>
                      <td>{{ colis.codeexpedition || '-' }}</td>
                      <td>{{ colis.description || '-' }}</td>
                      <td>{{ getTypeColisLabel(colis.type) }}</td>
                      <td>{{ getTypeExpeditionLabel(colis.typeExpedition) }}</td>
                      <td>{{ colis.poids ? colis.poids + ' kg' : '-' }}</td>
                      <td>{{ isTypeWithUnites(colis.type) ? (colis.nombreUnites || 1) : '-' }}</td>
                      <td class="text-end">{{ colis.cout | currency:'USD':'symbol' }}</td>
                      <td class="text-center">
                        <button type="button" class="btn btn-sm btn-outline-danger" (click)="removeColis(colis)">
                          <i class="las la-trash"></i>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Résumé des coûts -->
            <div class="row justify-content-end mt-4">
              <div class="col-lg-4">
                <table class="table table-sm">
                  <tbody>
                    <tr class="border-top">
                      <td><strong>Total:</strong></td>
                      <td class="text-end"><strong>{{ total() | currency:'USD':'symbol' }}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Colis supprimés -->
            <div class="mt-3" *ngIf="removedColisList().length > 0">
              <div class="alert alert-warning">
                <h6 class="mb-2">
                  <i class="las la-archive me-2"></i>Colis supprimés ({{ removedColisList().length }})
                </h6>
                <div class="removed-items">
                  <div class="list-group">
                    @for(colis of removedColisList(); track colis.id) {
                      <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{{ colis.codeSuivi }}</strong>
                          <small class="text-muted ms-2">{{ colis.cout | currency:'USD':'symbol' }}</small>
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-success" (click)="restoreColis(colis)">
                          <i class="las la-undo-alt"></i> Restaurer
                        </button>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>

            <!-- Notes et conditions -->
            <div class="row mt-4">
              <div class="col-lg-8">
                <h6>Notes:</h6>
                <p class="text-muted mb-0">
                  Tous les colis doivent être payés dans un délai de 30 jours à compter de la date de facturation.
                  Les frais de retard seront appliqués sur les paiements en retard.
                </p>
              </div>
            </div>

            <!-- Signatures -->
            <div class="row mt-4 pt-4 border-top">
              <div class="col-6">
                <h6 class="mb-3">Signature du client</h6>
                <div class="border-bottom" style="width: 200px; height: 60px;"></div>
                <p class="mt-2">{{ selectedClient()?.nom }} {{ selectedClient()?.prenom }}</p>
              </div>
              <div class="col-6 text-end">
                <h6 class="mb-3">Pour Kamba Agency</h6>
                <div class="border-bottom ms-auto" style="width: 200px; height: 60px;"></div>
                <p class="mt-2">Agent autorisé</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4" *ngIf="selectedClient() && colisList().length === 0">
        <div class="alert alert-info">
          Aucun colis en attente de facturation pour ce client.
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <div class="row d-flex justify-content-center w-100">
        <div class="col-lg-12 col-xl-4 ms-auto align-self-center">
          <div class="text-center">
            <small class="fs-12">Merci de faire affaire avec nous.</small>
          </div>
        </div>
        <div class="col-lg-12 col-xl-4">
          <div class="float-end d-print-none mt-2 mt-md-0">
            <button type="button" class="btn btn-info me-2" (click)="onPrint()">
              <i class="las la-print me-1"></i>Imprimer
            </button>
            <button type="button" class="btn btn-primary me-2" [disabled]="!canSubmit()" (click)="onSubmit()">
              <i class="las la-save me-1"></i>Enregistrer
            </button>
            <button type="button" class="btn btn-danger" (click)="activeModal.dismiss()">
              <i class="las la-times me-1"></i>Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class FacturationModalComponent implements OnInit {
  currentYear = currentYear;
  currentDate = new Date();
  clientSearch = '';
  showResults = false;
  invoiceNumber = `FA${currentYear}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

  private searchSubject = new Subject<string>();

  filteredClients = signal<Partenaire[]>([]);
  selectedClient = signal<Partenaire | undefined>(undefined);
  colisList = signal<Colis[]>([]);
  isLoading = signal(false);
  removedColisList = signal<Colis[]>([]);

  total = computed(() => {
    return this.colisList().reduce((sum, colis) => sum + (colis.cout || 0), 0);
  });

  canSubmit = computed(() => {
    return this.selectedClient() !== undefined && this.colisList().length > 0;
  });

  constructor(
    public activeModal: NgbActiveModal,
    private firebaseService: FirebaseService
  ) {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.searchClients();
      });
  }

  ngOnInit(): void {
    // Initialization code if needed
  }

  onSearchInput(): void {
    this.showResults = true;
    this.searchSubject.next(this.clientSearch);
  }

  onSearchBlur(): void {
    setTimeout(() => {
      this.showResults = false;
    }, 200);
  }

  async searchClients(): Promise<void> {
    if (this.clientSearch.trim().length === 0) {
      this.filteredClients.set([]);
      return;
    }

    try {
      const searchTerm = this.clientSearch.toLowerCase();
      const clients = await firstValueFrom(this.firebaseService.getPartenaires());

      const filtered = clients.filter(client => {
        const nomMatch = client.nom.toLowerCase().includes(searchTerm);
        const emailMatch = (client.email || '').toLowerCase().includes(searchTerm);
        const telMatch = String(client.telephone || '').includes(searchTerm);
        return nomMatch || emailMatch || telMatch;
      });

      this.filteredClients.set(filtered);
    } catch (error) {
      console.error('Erreur lors de la recherche des clients:', error);
      this.filteredClients.set([]);
    }
  }

  async selectClient(client: Partenaire): Promise<void> {
    this.selectedClient.set(client);
    this.showResults = false;
    this.isLoading.set(true);

    try {
      console.log('Chargement des colis pour le client:', client.id);
      const colis = await firstValueFrom(this.firebaseService.getColis());

      const filteredColis = colis.filter(c =>
        c.partenaireId === client.id &&
        c.statut === STATUT_COLIS.EN_ATTENTE_FACTURATION
      );

      console.log('Colis filtrés:', filteredColis);
      this.colisList.set(filteredColis);
    } catch (error) {
      console.error('Erreur lors du chargement des colis:', error);
      this.colisList.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  getTypeColisLabel(type: number | undefined): string {
    if (type === undefined) return 'Inconnu';
    return TYPE_COLIS[type] || 'Inconnu';
  }

  getTypeExpeditionLabel(type: number | undefined): string {
    if (type === undefined) return 'Inconnu';
    return TYPE_EXPEDITION[type] || 'Inconnu';
  }

  isTypeWithUnites(type: number | undefined): boolean {
    if (type === undefined) return false;
    return type === TYPE_COLIS.ORDINATEUR || type === TYPE_COLIS.TELEPHONE;
  }

  trackByClientId(_index: number, client: Partenaire): string {
    return client.id || '';
  }

  onPrint(): void {
    window.print();
  }

  private async createFacture(): Promise<string> {
    const client = this.selectedClient();
    if (!client || !client.id) throw new Error('Aucun client sélectionné');

    const facture: Omit<Facture, 'id'> & { id: string } = {
      id: this.invoiceNumber,
      montant: this.total(),
      montantPaye:0,
      colis: this.colisList(),
      paiements: []
    };

    await this.firebaseService.createFacture(facture);
    return facture.id;
  }

  private async updateColisStatus(factureId: string): Promise<void> {
    const updatePromises = this.colisList()
      .filter(colis => colis.id)
      .map(colis =>
        this.firebaseService.updateColis(colis.id!, {
          statut: STATUT_COLIS.EN_ATTENTE_PAIEMENT
        })
      );

    await Promise.all(updatePromises);
  }

  async onSubmit(): Promise<void> {
    if (!this.canSubmit()) {
      return;
    }

    this.isLoading.set(true);

    try {
      const factureId = await this.createFacture();
      await this.updateColisStatus(factureId);

      this.activeModal.close({
        success: true,
        message: 'Facture créée avec succès',
        factureId: factureId
      });
    } catch (error) {
      console.error('Erreur lors de la création de la facture:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  removeColis(colis: Colis): void {
    const currentList = this.colisList();
    const updatedList = currentList.filter(c => c.id !== colis.id);
    this.colisList.set(updatedList);

    const removedList = this.removedColisList();
    this.removedColisList.set([...removedList, colis]);
  }

  restoreColis(colis: Colis): void {
    const currentList = this.colisList();
    this.colisList.set([...currentList, colis]);

    const removedList = this.removedColisList();
    const updatedRemovedList = removedList.filter(c => c.id !== colis.id);
    this.removedColisList.set(updatedRemovedList);
  }
}

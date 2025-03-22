import { currentYear } from '@/app/common/constants';
//import { PhoneFormatPipe } from '@/app/core/pipes/phone-format.pipe';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Colis, Facture, Partenaire, STATUT_COLIS, TYPE_COLIS, TYPE_EXPEDITION } from '@/app/models/partenaire.model';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, firstValueFrom, Subject } from 'rxjs';
import printJS from 'print-js';

@Component({
  selector: 'app-facture-new',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
   // PhoneFormatPipe,
  ],
  templateUrl: './facture-new.component.html',
  styleUrl: './facture-new.component.scss'
})
export class FactureNewComponent {
  @ViewChild('printSection') printSection!: ElementRef;

  currentYear = currentYear;
  currentDate = new Date();
  clientSearch = '';
  showResults = false;
  invoiceNumber = `FA${currentYear}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
  isPrinting = signal(false);

  private searchSubject = new Subject<string>();

  filteredClients = signal<Partenaire[]>([]);
  selectedClient = signal<Partenaire | undefined>(undefined);
  colisList = signal<Colis[]>([]);
  isLoading = signal(false);
  isSearchingClients = signal(false);
  isSubmitting = signal(false);
  removedColisList = signal<Colis[]>([]);

  total = computed(() => {
    return this.colisList().reduce((sum, colis) => sum + (colis.cout || 0), 0);
  });

  canSubmit = computed(() => {
    return this.selectedClient() !== undefined && this.colisList().length > 0 && !this.isSubmitting();
  });

  constructor(
    private router: Router,
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

    this.isSearchingClients.set(true);
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
    } finally {
      this.isSearchingClients.set(false);
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
    this.isPrinting.set(true);

    setTimeout(() => {
      if (this.printSection) {
        printJS({
          printable: 'print-section',
          type: 'html',
          documentTitle: `Facture_${this.invoiceNumber}`,
          css: [
            'assets/css/bootstrap.min.css',
            'assets/css/icons.min.css'
          ],
          style: `
            .card { box-shadow: none !important; }
            .card-body { padding: 1rem; }
            .print-header { background-color: #000 !important; color: #fff !important; padding: 15px; }
            .text-muted { color: #6c757d !important; }
            .text-white { color: #fff !important; }
            .text-primary { color: #3b7ddd !important; }
            .fw-semibold { font-weight: 600 !important; }
            .fw-bold { font-weight: 700 !important; }
            .ms-auto { margin-left: auto !important; }
            .me-1 { margin-right: 0.25rem !important; }
            .mb-0 { margin-bottom: 0 !important; }
            .mb-1 { margin-bottom: 0.25rem !important; }
            .mb-2 { margin-bottom: 0.5rem !important; }
            .mb-3 { margin-bottom: 1rem !important; }
            .mt-2 { margin-top: 0.5rem !important; }
            .mt-4 { margin-top: 1.5rem !important; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
            th { background-color: #f2f2f2; }
            .text-end { text-align: right !important; }
            .text-center { text-align: center !important; }
            .border-top { border-top: 1px solid #dee2e6 !important; }
            .border-bottom { border-bottom: 1px solid #dee2e6 !important; }
            .no-print { display: none !important; }
          `,
          onPrintDialogClose: () => {
            this.isPrinting.set(false);
          }
        });
      }
    }, 500);
  }

  private async createFacture(): Promise<string> {
    const client = this.selectedClient();
    if (!client || !client.id) throw new Error('Aucun client sélectionné');

    const facture: Omit<Facture, 'id'> & { id: string } = {
      id: this.invoiceNumber,
      montant: this.total(),
      montantPaye: 0,
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

    this.isSubmitting.set(true);

    try {
      const factureId = await this.createFacture();
      await this.updateColisStatus(factureId);

      this.router.navigate(['/facture/list'], {
        queryParams: {
          success: true,
          message: 'Facture créée avec succès',
          factureId: factureId
        }
      });
    } catch (error) {
      console.error('Erreur lors de la création de la facture:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onCancel(): void {
    this.router.navigate(['/facture/list']);
  }

  goToFactureList(): void {
    this.router.navigate(['/facture/list']);
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

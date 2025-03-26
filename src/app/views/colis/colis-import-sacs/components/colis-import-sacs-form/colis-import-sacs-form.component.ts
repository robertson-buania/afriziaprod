import { Component, OnInit, OnDestroy, signal, HostListener, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Colis, sac, STATUT_COLIS, TYPE_COLIS, TYPE_EXPEDITION } from '@/app/models/partenaire.model';
import * as XLSX from 'xlsx';
import { Subscription, interval } from 'rxjs';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

// Interface pour les données Excel originales avec des en-têtes en chinois
interface ExcelSacOriginal {
  袋号: string; // Numéro de sac (reference)
  运单编号: string; // Numéro de suivi (codeSuivi)
  收件人: string; // Destinataire (destinataire)
  目的地: string; // Destination (destination)
  数量: string | number; // Quantité (quantite)
  重量: string | number; // Poids (poids)
  物品名称: string; // Nom de l'article (nature)
  转运单号: string; // Numéro d'expédition (codeexpedition)
  承运商: string; // Transporteur (transporteur)

  // Métadonnées pour le suivi
  __rowNum?: number; // Numéro de ligne dans le fichier Excel
  __sheetName?: string; // Nom de la feuille dans le fichier Excel
}

// Interface pour les données affichées dans l'interface utilisateur
interface ExcelSacDisplay {
  bagNo: string; // Numéro de sac
  trackingNo: string; // Numéro de suivi
  recipient: string; // Destinataire
  destination: string; // Destination
  quantity: string; // Quantité
  weight: string; // Poids
  itemName: string; // Nom de l'article
  shipmentNo: string; // Numéro d'expédition
  carrier: string; // Transporteur
  rowNum?: number; // Numéro de ligne
  sheetName?: string; // Nom de la feuille
}

// Interface pour les groupements par sac
interface SacGroup {
  reference: string; // Numéro de sac
  colis: Colis[]; // Liste des colis dans ce sac
}

// Interface pour les statistiques
interface ImportStats {
  totalReaded: number; // Total de lignes lues
  totalValid: number; // Total de lignes valides
  totalInvalid: number; // Total de lignes invalides
  currentProcessed: number; // Nombre de lignes traitées actuellement
  currentSuccessCount: number; // Nombre de succès
  currentErrorCount: number; // Nombre d'erreurs
}

// Interface pour les erreurs
interface ImportError {
  item: any; // Données de la ligne
  error: string; // Message d'erreur
}

@Component({
  selector: 'app-colis-import-sacs-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './colis-import-sacs-form.component.html',
  styleUrl: './colis-import-sacs-form.component.scss'
})
export class ColisImportSacsFormComponent implements OnInit, OnDestroy {
  importForm!: FormGroup;
  file: File | null = null;
  extractedData: ExcelSacOriginal[] = [];
  previewData: ExcelSacDisplay[] = [];
  invalidRows: any[] = [];
  importErrors: ImportError[] = [];
  sacGroups: SacGroup[] = [];

  // Signals pour l'état de l'UI
  isLoading = signal(false);
  showPreview = signal(false);
  showInvalidRows = signal(false);
  importInProgress = signal(false);
  isSuccess = signal(false);
  isError = signal(false);
  errorMessage = signal('');
  showErrors = signal(false);
  stats = signal<ImportStats>({
    totalReaded: 0,
    totalValid: 0,
    totalInvalid: 0,
    currentProcessed: 0,
    currentSuccessCount: 0,
    currentErrorCount: 0
  });

  private subscription: Subscription | null = null;

  // Template reference for confirmation modal
  @ViewChild('confirmExitModal') confirmExitModal!: TemplateRef<any>;

  @HostListener('window:beforeunload', ['$event'])
  onWindowClose($event: BeforeUnloadEvent) {
    if (this.importInProgress()) {
      $event.preventDefault();
      $event.returnValue = 'Importation en cours. Êtes-vous sûr de vouloir quitter la page?';
      return $event;
    }
    return true;
  }

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private router: Router,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.restoreImportStateIfExists();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  initForm(): void {
    this.importForm = this.fb.group({
      file: ['', Validators.required]
    });
  }

  onFileChange(event: Event): void {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files.length > 0) {
      this.file = element.files[0];

      if (!this.file.name.endsWith('.xlsx') && !this.file.name.endsWith('.xls')) {
        this.isError.set(true);
        this.errorMessage.set('Veuillez sélectionner un fichier Excel valide (.xlsx ou .xls)');
        this.file = null;
        return;
      }

      this.isError.set(false);
      this.errorMessage.set('');

      this.previewExcel();
    }
  }

  previewExcel(): void {
    if (!this.file) return;

    this.isLoading.set(true);
    this.showPreview.set(false);
    this.showInvalidRows.set(false);
    this.isSuccess.set(false);
    this.isError.set(false);

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        this.extractedData = [];
        this.invalidRows = [];
        let totalRowCount = 0;

        for (const sheetName of workbook.SheetNames) {
          const result = this.extractSheetData(workbook, sheetName);
          this.extractedData = [...this.extractedData, ...result.validData];
          this.invalidRows = [...this.invalidRows, ...result.invalidRows];
          totalRowCount += result.totalRowCount;
        }

        this.stats.update(state => ({
          ...state,
          totalReaded: totalRowCount,
          totalValid: this.extractedData.length,
          totalInvalid: this.invalidRows.length
        }));

        this.previewData = this.extractedData.map(item => this.convertToDisplayFormat(item));

        this.groupColisBySac();

        this.showPreview.set(true);
        if (this.invalidRows.length > 0) {
          this.showInvalidRows.set(true);
        }

      } catch (error) {
        console.error('Erreur lors de la lecture du fichier Excel:', error);
        this.isError.set(true);
        this.errorMessage.set('Erreur lors de la lecture du fichier Excel. Vérifiez que le format est correct.');
      } finally {
        this.isLoading.set(false);
      }
    };

    reader.onerror = () => {
      this.isLoading.set(false);
      this.isError.set(true);
      this.errorMessage.set('Erreur lors de la lecture du fichier.');
    };

    reader.readAsArrayBuffer(this.file);
  }

  private extractSheetData(workbook: XLSX.WorkBook, sheetName: string): { validData: ExcelSacOriginal[], invalidRows: any[], totalRowCount: number } {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    const validData: ExcelSacOriginal[] = [];
    const invalidRows: any[] = [];

    jsonData.forEach((row: any, index: number) => {
      row.__rowNum = index + 2;
      row.__sheetName = sheetName;

      if (this.isValidSacRow(row)) {
        validData.push(row as ExcelSacOriginal);
      } else {
        invalidRows.push(row);
      }
    });

    return {
      validData,
      invalidRows,
      totalRowCount: jsonData.length
    };
  }

  private isValidSacRow(row: any): boolean {
    return Boolean(
      row['袋号'] &&
      row['运单编号'] &&
      row['收件人'] &&
      row['目的地']
    );
  }

  private convertToDisplayFormat(item: ExcelSacOriginal): ExcelSacDisplay {
    return {
      bagNo: String(item.袋号 || ''),
      trackingNo: String(item.运单编号 || ''),
      recipient: String(item.收件人 || ''),
      destination: String(item.目的地 || ''),
      quantity: String(item.数量 || ''),
      weight: String(item.重量 || ''),
      itemName: String(item.物品名称 || ''),
      shipmentNo: String(item.转运单号 || ''),
      carrier: String(item.承运商 || ''),
      rowNum: item.__rowNum,
      sheetName: item.__sheetName
    };
  }

  private groupColisBySac(): void {
    this.sacGroups = [];

    const sacMap = new Map<string, Colis[]>();

    this.extractedData.forEach(item => {
      const sacReference = String(item.袋号).trim();

      const colis: Colis = {
        partenaireId: '',
        clientNom: String(item.收件人 || '').split(' ')[0] || '',
        clientPrenom: String(item.收件人 || '').split(' ')[1] || '',
        clientTelephone: 0,
        clientEmail: '',
        type: 0,
        statut: STATUT_COLIS.EN_ATTENTE_VERIFICATION,
        typeExpedition: 0,
        codeSuivi: String(item.运单编号 || ''),
        destinataire: String(item.收件人 || ''),
        destination: String(item.目的地 || ''),
        quantite: String(item.数量 || ''),
        poids: Number(item.重量) || 0,
        nature: String(item.物品名称 || ''),
        codeexpedition: String(item.转运单号 || ''),
        transporteur: String(item.承运商 || '')
      };

      if (!sacMap.has(sacReference)) {
        sacMap.set(sacReference, []);
      }
      sacMap.get(sacReference)?.push(colis);
    });

    sacMap.forEach((colis, reference) => {
      this.sacGroups.push({
        reference,
        colis
      });
    });
  }

  async importExcel(): Promise<void> {
    if (this.extractedData.length === 0) {
      this.isError.set(true);
      this.errorMessage.set('Aucune donnée valide à importer.');
      return;
    }

    try {
      this.importInProgress.set(true);
      this.resetStats();
      this.importErrors = [];
      this.showErrors.set(false);

      this.saveImportState();

      this.subscription = interval(300).subscribe(() => {
        this.saveImportState();
      });

      for (let i = 0; i < this.sacGroups.length; i++) {
        const sacGroup = this.sacGroups[i];

        try {
          const sacData: Omit<sac, 'id'> = {
            reference: sacGroup.reference,
            colis: []
          };

          const sacId = await this.firebaseService.addSac(sacData);

          for (let j = 0; j < sacGroup.colis.length; j++) {
            try {
              this.stats.update(state => ({
                ...state,
                currentProcessed: state.currentProcessed + 1
              }));

              const colis = sacGroup.colis[j];
              const colisId = await this.firebaseService.addColis(colis);

              await this.firebaseService.updateSac(sacId, {
                colis: [...sacGroup.colis]
              });

              this.stats.update(state => ({
                ...state,
                currentSuccessCount: state.currentSuccessCount + 1
              }));

              await new Promise(resolve => setTimeout(resolve, 50));

            } catch (error) {
              console.error('Erreur lors de l\'importation d\'un colis:', error);
              this.importErrors.push({
                item: sacGroup.colis[j],
                error: 'Erreur lors de l\'importation: ' + (error instanceof Error ? error.message : String(error))
              });

              this.stats.update(state => ({
                ...state,
                currentErrorCount: state.currentErrorCount + 1
              }));
            }
          }

        } catch (error) {
          console.error('Erreur lors de la création du sac:', error);
          this.importErrors.push({
            item: sacGroup,
            error: 'Erreur lors de la création du sac: ' + (error instanceof Error ? error.message : String(error))
          });

          this.stats.update(state => ({
            ...state,
            currentProcessed: state.currentProcessed + sacGroup.colis.length,
            currentErrorCount: state.currentErrorCount + sacGroup.colis.length
          }));
        }
      }

      this.isSuccess.set(true);
      if (this.importErrors.length > 0) {
        this.showErrors.set(true);
      }

      sessionStorage.removeItem('importSacsState');

    } catch (error) {
      console.error('Erreur lors de l\'importation:', error);
      this.isError.set(true);
      this.errorMessage.set('Erreur lors de l\'importation: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      this.importInProgress.set(false);
      if (this.subscription) {
        this.subscription.unsubscribe();
        this.subscription = null;
      }
    }
  }

  private resetStats(): void {
    this.stats.set({
      totalReaded: this.stats().totalReaded,
      totalValid: this.stats().totalValid,
      totalInvalid: this.stats().totalInvalid,
      currentProcessed: 0,
      currentSuccessCount: 0,
      currentErrorCount: 0
    });
  }

  private saveImportState(): void {
    if (this.importInProgress()) {
      const state = {
        file: this.file ? { name: this.file.name, size: this.file.size } : null,
        extractedDataCount: this.extractedData.length,
        sacGroupsCount: this.sacGroups.length,
        stats: this.stats(),
        importInProgress: true,
        errors: this.importErrors,
        timestamp: Date.now()
      };
      sessionStorage.setItem('importSacsState', JSON.stringify(state));
    }
  }

  private restoreImportStateIfExists(): void {
    const savedState = sessionStorage.getItem('importSacsState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);

        if (state.importInProgress && state.timestamp && Date.now() - state.timestamp < 3600000) {
          this.stats.set(state.stats);
          this.importErrors = state.errors || [];
          this.importInProgress.set(true);
          this.showErrors.set(this.importErrors.length > 0);

          if (this.stats().currentErrorCount > 0 || this.importErrors.length > 0) {
            this.isError.set(true);
            this.errorMessage.set('L\'importation précédente a rencontré des erreurs.');
          }
        }
      } catch (error) {
        console.error('Erreur lors de la restauration de l\'état:', error);
        sessionStorage.removeItem('importSacsState');
      }
    }
  }

  canDeactivate(): boolean | Promise<boolean> {
    if (this.importInProgress()) {
      return new Promise<boolean>(resolve => {
        const modalRef = this.modalService.open(this.confirmExitModal, { centered: true, backdrop: 'static' });
        modalRef.result.then(
          result => resolve(result === 'confirm'),
          () => resolve(false)
        );
      });
    }
    return true;
  }

  getProgressPercentage(): number {
    const total = this.stats().totalValid;
    const current = this.stats().currentProcessed;

    if (total === 0) return 0;
    return Math.round((current / total) * 100);
  }

  goToColisList(): void {
    if (this.importInProgress()) {
      const modalRef = this.modalService.open(this.confirmExitModal, { centered: true, backdrop: 'static' });
      modalRef.result.then(
        result => {
          if (result === 'confirm') {
            this.router.navigate(['/colis/verification']);
          }
        },
        () => {}
      );
    } else {
      this.router.navigate(['/colis/verification']);
    }
  }

  getChineseProperty(item: any, property: string): string {
    const mapping: { [key: string]: string } = {
      'bagNo': '袋号',
      'trackingNo': '运单编号'
    };
    return mapping[property] || property;
  }

  truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
}

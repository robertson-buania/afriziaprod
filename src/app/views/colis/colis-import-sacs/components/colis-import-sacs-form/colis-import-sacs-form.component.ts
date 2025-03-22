import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Colis, sac, STATUT_COLIS, TYPE_COLIS, TYPE_EXPEDITION } from '@/app/models/partenaire.model';
import * as XLSX from 'xlsx';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

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
export class ColisImportSacsFormComponent implements OnInit {
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

  @HostListener('window:beforeunload', ['$event'])
  onWindowClose($event: BeforeUnloadEvent) {
    if (this.importInProgress()) {
      $event.returnValue = true;
      return true;
    }
    return false;
  }

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.importForm = this.fb.group({
      excelFile: [null, Validators.required]
    });
  }

  onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    if (files && files.length > 0) {
      this.file = files[0];
      this.importForm.patchValue({ excelFile: this.file });
      this.extractedData = [];
      this.previewData = [];
      this.showPreview.set(false);
      this.isSuccess.set(false);
      this.isError.set(false);
      this.resetStats();
      this.invalidRows = [];
      this.showInvalidRows.set(false);
      this.sacGroups = [];
    }
  }

  /**
   * Prévisualiser le fichier Excel
   */
  previewExcel(): void {
    if (!this.file) {
      this.errorMessage.set('Veuillez sélectionner un fichier Excel');
      return;
    }

    try {
      this.isLoading.set(true);
      this.errorMessage.set('');
      this.previewData = [];
      this.invalidRows = [];
      this.showInvalidRows.set(false);
      this.sacGroups = [];

      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });

          if (workbook.SheetNames.length === 0) {
            this.errorMessage.set('Le fichier Excel ne contient aucune feuille de calcul.');
            this.isLoading.set(false);
            return;
          }

          // Extract data from all sheets
          let allValidData: ExcelSacOriginal[] = [];
          let allInvalidRows: any[] = [];
          let totalRowCount = 0;

          workbook.SheetNames.forEach(sheetName => {
            const result = this.extractSheetData(workbook, sheetName);
            totalRowCount += result.totalRowCount;
            allValidData = [...allValidData, ...result.validData];
            allInvalidRows = [...allInvalidRows, ...result.invalidRows];
          });

          // Convertir les données du format original au format d'affichage
          this.extractedData = allValidData;
          this.previewData = allValidData.map(item => this.convertToDisplayFormat(item));
          this.invalidRows = allInvalidRows;
          this.showInvalidRows.set(this.invalidRows.length > 0);

          // Grouper les colis par sac
          this.groupColisBySac();

          // Mise à jour des statistiques
          this.stats.set({
            totalReaded: totalRowCount,
            totalValid: allValidData.length,
            totalInvalid: allInvalidRows.length,
            currentProcessed: 0,
            currentSuccessCount: 0,
            currentErrorCount: 0
          });

          // Afficher la prévisualisation
          this.showPreview.set(this.previewData.length > 0);

          // Reset other variables
          this.importInProgress.set(false);
          this.isSuccess.set(false);
          this.isError.set(false);
          this.importErrors = [];

          this.isLoading.set(false);
        } catch (error) {
          console.error('Erreur lors de la lecture du fichier Excel:', error);
          this.errorMessage.set('Erreur lors de la lecture du fichier Excel. Vérifiez le format du fichier.');
          this.isLoading.set(false);
        }
      };

      reader.onerror = (error) => {
        console.error('Erreur lors de la lecture du fichier:', error);
        this.errorMessage.set('Erreur lors de la lecture du fichier.');
        this.isLoading.set(false);
      };

      reader.readAsArrayBuffer(this.file);
    } catch (error) {
      console.error('Erreur lors de la prévisualisation:', error);
      this.errorMessage.set('Erreur lors de la prévisualisation du fichier.');
      this.isLoading.set(false);
    }
  }

  /**
   * Extraire les données d'une feuille Excel
   */
  private extractSheetData(workbook: XLSX.WorkBook, sheetName: string): { validData: ExcelSacOriginal[], invalidRows: any[], totalRowCount: number } {
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '', raw: false });

    const validData: ExcelSacOriginal[] = [];
    const invalidRows: any[] = [];

    rawData.forEach((row, index) => {
      // Ajouter des métadonnées pour faciliter le traçage
      row.__rowNum = index + 2; // +2 car la première ligne est l'en-tête et les indices commencent à 0
      row.__sheetName = sheetName;

      // Valider que la ligne a les champs requis
      if (this.isValidSacRow(row)) {
        validData.push(row as ExcelSacOriginal);
      } else {
        invalidRows.push(row);
      }
    });

    return {
      validData,
      invalidRows,
      totalRowCount: rawData.length
    };
  }

  /**
   * Vérifier si une ligne contient les données requises pour un sac
   */
  private isValidSacRow(row: any): boolean {
    // Vérifier que les champs obligatoires existent
    return (
      row['袋号'] !== undefined && row['袋号'] !== '' &&
      row['运单编号'] !== undefined && row['运单编号'] !== '' &&
      row['收件人'] !== undefined && row['收件人'] !== ''
    );
  }

  /**
   * Convertir les données du format original au format d'affichage
   */
  private convertToDisplayFormat(item: ExcelSacOriginal): ExcelSacDisplay {
    return {
      bagNo: String(item['袋号'] || ''),
      trackingNo: String(item['运单编号'] || ''),
      recipient: String(item['收件人'] || ''),
      destination: String(item['目的地'] || ''),
      quantity: String(item['数量'] || ''),
      weight: String(item['重量'] || ''),
      itemName: String(item['物品名称'] || ''),
      shipmentNo: String(item['转运单号'] || ''),
      carrier: String(item['承运商'] || ''),
      rowNum: item.__rowNum,
      sheetName: item.__sheetName
    };
  }

  /**
   * Grouper les colis par sac
   */
  private groupColisBySac(): void {
    const sacMap = new Map<string, Colis[]>();

    // Grouper les colis par numéro de sac
    this.extractedData.forEach(item => {
      const sacReference = String(item['袋号']).trim();

      if (!sacMap.has(sacReference)) {
        sacMap.set(sacReference, []);
      }

      const colis: Colis = {
        codeSuivi: String(item['运单编号'] || ''),
        destinataire: String(item['收件人'] || ''),
        destination: String(item['目的地'] || ''),
        quantite: String(item['数量'] || '1'),
        poids: Number(item['重量']) || 0,
        nature: String(item['物品名称'] || ''),
        codeexpedition: String(item['转运单号'] || ''),
        transporteur: String(item['承运商'] || ''),
        dateCreation: new Date().toISOString(),
        statut: STATUT_COLIS.EN_ATTENTE_VERIFICATION,
        type: TYPE_COLIS.ORDINAIRE,
        typeExpedition: TYPE_EXPEDITION.STANDARD,
        partenaireId: '', // À remplir si nécessaire
        clientNom: '', // À remplir si nécessaire
        clientPrenom: '', // À remplir si nécessaire
        clientTelephone: 0, // À remplir si nécessaire
        clientEmail: '' // À remplir si nécessaire
      };

      sacMap.get(sacReference)?.push(colis);
    });

    // Convertir la Map en tableau de SacGroup
    this.sacGroups = Array.from(sacMap.entries()).map(([reference, colis]) => ({
      reference,
      colis
    }));
  }

  /**
   * Importer les données dans Firebase
   */
  async importExcel(): Promise<void> {
    if (this.extractedData.length === 0) {
      this.errorMessage.set('Aucune donnée valide à importer. Veuillez d\'abord prévisualiser le fichier.');
      return;
    }

    try {
      this.importInProgress.set(true);
      this.importErrors = [];
      this.showErrors.set(false);
      this.isSuccess.set(false);
      this.isError.set(false);

      // Mettre à jour les statistiques
      const currentStats = this.stats();
      this.stats.set({
        ...currentStats,
        currentProcessed: 0,
        currentSuccessCount: 0,
        currentErrorCount: 0
      });

      // Traiter chaque groupe de sac
      for (let i = 0; i < this.sacGroups.length; i++) {
        const sacGroup = this.sacGroups[i];

        try {
          // Créer un objet sac
          const newSac: Omit<sac, 'id'> = {
            reference: sacGroup.reference,
            colis: sacGroup.colis
          };

          // Ajouter le sac à Firebase
          await this.firebaseService.addSac(newSac);

          // Mettre à jour les statistiques
          const stats = this.stats();
          this.stats.set({
            ...stats,
            currentProcessed: i + 1,
            currentSuccessCount: stats.currentSuccessCount + 1
          });
        } catch (error) {
          console.error(`Erreur lors de l'ajout du sac ${sacGroup.reference}:`, error);

          // Ajouter l'erreur à la liste
          this.importErrors.push({
            item: { reference: sacGroup.reference, nombreColis: sacGroup.colis.length },
            error: `Erreur lors de l'ajout du sac: ${(error as Error).message || 'Erreur inconnue'}`
          });

          // Mettre à jour les statistiques
          const stats = this.stats();
          this.stats.set({
            ...stats,
            currentProcessed: i + 1,
            currentErrorCount: stats.currentErrorCount + 1
          });
        }
      }

      // Vérifier s'il y a eu des erreurs
      if (this.importErrors.length > 0) {
        this.showErrors.set(true);
        this.isError.set(true);
      } else {
        this.isSuccess.set(true);
      }
    } catch (error) {
      console.error('Erreur globale lors de l\'importation:', error);
      this.errorMessage.set(`Erreur lors de l'importation: ${(error as Error).message || 'Erreur inconnue'}`);
      this.isError.set(true);
    } finally {
      this.importInProgress.set(false);
    }
  }

  /**
   * Réinitialiser les statistiques
   */
  private resetStats(): void {
    this.stats.set({
      totalReaded: 0,
      totalValid: 0,
      totalInvalid: 0,
      currentProcessed: 0,
      currentSuccessCount: 0,
      currentErrorCount: 0
    });
  }

  /**
   * Calculer le pourcentage de progression
   */
  getProgressPercentage(): number {
    const { currentProcessed, totalValid } = this.stats();
    if (totalValid === 0) return 0;
    return Math.round((currentProcessed / totalValid) * 100);
  }

  /**
   * Retourner à la liste des colis
   */
  goToColisList(): void {
    this.router.navigate(['/colis/verification']);
  }

  /**
   * Récupérer une propriété à partir de son nom chinois
   */
  getChineseProperty(item: any, property: string): string {
    return item[property] || '';
  }

  /**
   * Tronquer un texte s'il est trop long
   */
  truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
}

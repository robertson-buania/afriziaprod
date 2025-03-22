import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Colis, TYPE_COLIS, TYPE_EXPEDITION, STATUT_COLIS } from '@/app/models/partenaire.model';
import * as XLSX from 'xlsx';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

// Interface pour les données Excel originales avec des en-têtes en chinois
interface ExcelColisOriginal {
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
interface ExcelColisDisplay {
  trackingNo: string;
  recipient: string;
  destination: string;
  quantity: string;
  weight: string;
  itemName: string;
  shipmentNo: string;
  carrier: string;
  rowNum?: number; // Numéro de ligne
  sheetName?: string; // Nom de la feuille
}

// Interface pour les statistiques d'importation
interface ImportStats {
  totalReaded: number;
  totalValid: number;
  totalInvalid: number;
  currentProcessed: number;
  currentSuccessCount: number;
  currentErrorCount: number;
}

// Interface pour le formulaire de création manuelle de colis
interface ManualColisForm {
  codeSuivi: string;
  destinataire: string;
  destination: string;
  quantite: string;
  poids: string;
  nature: string;
  codeexpedition: string;
  transporteur: string;
}

interface InvalidRow {
  rowNum: number;
  sheetName: string;
  row: ExcelColisOriginal;
  reason: string;
}

@Component({
  selector: 'app-colis-excel-import-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './colis-excel-import-form.component.html',
  styleUrl: './colis-excel-import-form.component.scss'
})
export class ColisExcelImportFormComponent implements OnInit {
  importForm!: FormGroup;
  manualForm!: FormGroup;
  file: File | null = null;
  isLoading = signal(false);
  isSuccess = signal(false);
  isError = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  extractedData: ExcelColisOriginal[] = [];
  previewData: ExcelColisDisplay[] = [];
  showPreview = signal(false);
  importInProgress = signal(false);
  showManualForm = signal(false);

  // Liste des lignes non valides
  invalidRows: InvalidRow[] = [];
  showInvalidRows = signal<boolean>(false);

  // Statistiques d'importation
  stats = signal<ImportStats>({
    totalReaded: 0,
    totalValid: 0,
    totalInvalid: 0,
    currentProcessed: 0,
    currentSuccessCount: 0,
    currentErrorCount: 0
  });

  // Gestion des erreurs
  importErrors: { item: ExcelColisOriginal, error: string }[] = [];
  showErrors = signal(false);

  private subscription = new Subscription();

  // Correspondance des champs chinois vers anglais
  private readonly fieldMap = {
    '运单编号': 'trackingNo',
    '收件人': 'recipient',
    '目的地': 'destination',
    '数量': 'quantity',
    '重量': 'weight',
    '物品名称': 'itemName',
    '转运单号': 'shipmentNo',
    '承运商': 'carrier'
  };

  // Protection contre la fermeture de page pendant l'importation
  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: BeforeUnloadEvent) {
    if (this.importInProgress()) {
      $event.preventDefault();
      $event.returnValue = 'Des données sont en cours d\'importation. Êtes-vous sûr de vouloir quitter cette page ?';
      return $event.returnValue;
    }
    return true;
  }

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.initManualForm();

    // Intercepter la navigation pendant l'importation
    this.router.events.subscribe((event) => {
      if (this.importInProgress()) {
        if (confirm('Des données sont en cours d\'importation. Êtes-vous sûr de vouloir quitter cette page ?')) {
          // Laisser la navigation continuer
        } else {
          // Empêcher la navigation
          this.router.navigate(['/colis/import-excel']);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  initForm(): void {
    this.importForm = this.fb.group({
      excelFile: [null, Validators.required]
    });
  }

  initManualForm(): void {
    this.manualForm = this.fb.group({
      codeSuivi: ['', Validators.required],
      destinataire: ['', Validators.required],
      destination: [''],
      quantite: ['1'],
      poids: ['0'],
      nature: [''],
      codeexpedition: [''],
      transporteur: ['']
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

          // Extract data from the first sheet by default
          const sheetName = workbook.SheetNames[0];
          const result = this.extractSheetData(workbook, sheetName);

          // Convertir les données du format original au format d'affichage
          this.extractedData = result.validData;
          this.previewData = result.validData.map(item => this.convertToDisplayFormat(item));
          this.invalidRows = result.invalidRows;
          this.showInvalidRows.set(this.invalidRows.length > 0);

          // Mise à jour des statistiques
          this.stats.set({
            totalReaded: result.totalRowCount,
            totalValid: result.validData.length,
            totalInvalid: result.invalidRows.length,
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
        } catch (error: any) {
          console.error('Error processing Excel file:', error);
          this.errorMessage.set('Erreur lors du traitement du fichier Excel: ' + error.message);
          this.isLoading.set(false);
        }
      };

      reader.onerror = () => {
        this.errorMessage.set('Erreur lors de la lecture du fichier.');
        this.isLoading.set(false);
      };

      reader.readAsArrayBuffer(this.file);
    } catch (error: any) {
      console.error('Error in previewExcel:', error);
      this.errorMessage.set('Erreur lors de la prévisualisation du fichier: ' + error.message);
      this.isLoading.set(false);
    }
  }

  async importExcel(): Promise<void> {
    if (this.importForm.invalid) {
      this.setErrorMessage('Veuillez sélectionner un fichier Excel');
      return;
    }

    if (this.extractedData.length === 0) {
      this.setErrorMessage('Aucune donnée à importer');
      return;
    }

    this.isLoading.set(true);
    this.importInProgress.set(true);
    this.isSuccess.set(false);
    this.isError.set(false);
    this.importErrors = [];
    this.showErrors.set(false);

    try {
      const totalItems = this.extractedData.length;
      const batchSize = 10; // Nombre d'éléments à traiter par lot pour montrer la progression

      // Démarrer l'importation en arrière-plan pour permettre à l'utilisateur de continuer à utiliser l'interface
      setTimeout(async () => {
        try {
          for (let i = 0; i < totalItems; i += batchSize) {
            const batch = this.extractedData.slice(i, Math.min(i + batchSize, totalItems));
            await this.processBatch(batch, i, totalItems);
          }

          const statsValue = this.stats();
          this.setSuccessMessage(`Importation terminée. ${statsValue.currentSuccessCount} colis importés avec succès sur ${totalItems}`);

          if (statsValue.currentErrorCount > 0) {
            this.showErrors.set(true);
          }
        } catch (error) {
          console.error('Erreur lors de l\'importation des colis:', error);
          this.setErrorMessage('Erreur lors de l\'importation des colis');
        } finally {
          this.isLoading.set(false);
          this.importInProgress.set(false);
        }
      }, 100);

      // Ne pas attendre la fin de l'importation pour rendre l'interface responsive
      this.isLoading.set(false);

    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'importation:', error);
      this.setErrorMessage('Erreur lors de l\'initialisation de l\'importation');
      this.isLoading.set(false);
      this.importInProgress.set(false);
    }
  }

  async processBatch(batch: ExcelColisOriginal[], startIndex: number, totalItems: number): Promise<void> {
    for (const item of batch) {
      try {
        // Déterminer le partenaire et le type d'expédition à partir des données du colis
        const partenaireInfo = this.extractPartenaireInfo(item);
        const typeExpedition = this.determineTypeExpedition(item);

        // Convertir le colis et l'enregistrer
        const colis = this.convertToColisModel(item, partenaireInfo.partenaireId, typeExpedition);
        await this.firebaseService.addColis(colis);

        // Mettre à jour les statistiques
        const stats = this.stats();
        const updatedStats = { ...stats };
        updatedStats.currentProcessed++;
        updatedStats.currentSuccessCount++;
        this.stats.set(updatedStats);
      } catch (error) {
        // Gérer l'erreur pour cet élément
        this.importErrors.push({
          item,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        });

        // Mettre à jour les statistiques
        const stats = this.stats();
        const updatedStats = { ...stats };
        updatedStats.currentProcessed++;
        updatedStats.currentErrorCount++;
        this.stats.set(updatedStats);
      }

      // Petite pause pour permettre à l'interface de se mettre à jour
      await new Promise(resolve => setTimeout(resolve, 5));
    }
  }

  // Détermine le partenaire en fonction des données du colis
  private extractPartenaireInfo(item: ExcelColisOriginal): { partenaireId: string, nom?: string } {
    // Dans cet exemple, nous utilisons un ID par défaut ou généré
    // Vous pourriez implémenter une logique plus sophistiquée basée sur vos données
    return {
      // Utiliser une valeur par défaut ou générer un ID basé sur les données du colis
      partenaireId: `PART_${item?.收件人?.replace(/\s+/g, '_') || 'INCONNU'}_${Date.now().toString(36)}`
    };
  }

  // Détermine le type d'expédition en fonction des données du colis
  private determineTypeExpedition(item: ExcelColisOriginal): TYPE_EXPEDITION {
    // Dans cet exemple, nous utilisons le type standard par défaut
    // Vous pourriez implémenter une logique basée sur des règles métier
    return TYPE_EXPEDITION.STANDARD;
  }

  private convertToDisplayFormat(item: ExcelColisOriginal): ExcelColisDisplay {
    return {
      trackingNo: item?.运单编号 || 'N/A',
      recipient: item?.收件人 || 'N/A',
      destination: item?.目的地 || 'N/A',
      quantity: item?.数量?.toString() || 'N/A',
      weight: item?.重量?.toString() || 'N/A',
      itemName: item?.物品名称 || 'N/A',
      shipmentNo: item?.转运单号 || 'N/A',
      carrier: item?.承运商 || 'N/A',
      rowNum: item?.__rowNum,
      sheetName: item?.__sheetName
    };
  }

  private async readExcelFile(file: File): Promise<XLSX.WorkBook> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          resolve(workbook);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => {
        reject(error);
      };

      reader.readAsArrayBuffer(file);
    });
  }

  private extractSheetData(workbook: XLSX.WorkBook, sheetName: string): { validData: ExcelColisOriginal[], invalidRows: InvalidRow[], totalRowCount: number } {
    const validData: ExcelColisOriginal[] = [];
    const invalidRows: InvalidRow[] = [];
    let totalRowCount = 0;

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false,
      blankrows: false,
      header: 1
    }) as any[];

    totalRowCount += jsonData.length > 0 ? jsonData.length - 1 : 0; // Soustraire l'en-tête

    // Passer la première ligne (en-têtes)
    if (jsonData.length > 1) {
      const headers = jsonData[0];

      // Vérifier si les en-têtes chinois sont présents
      const hasChineseHeaders = this.containsChineseHeaders(this.arrayToObject(headers));

      if (hasChineseHeaders) {
        // Convertir chaque ligne en objet avec les en-têtes
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row && row.length > 0) {
            const obj = this.arrayToObject(headers, row);

            // Ajouter les métadonnées de ligne
            obj.__rowNum = i + 1; // +1 car nous commençons l'index à 0 mais Excel à 1
            obj.__sheetName = sheetName;

            // Vérifier si la ligne est valide
            const invalidReason = this.getInvalidReason(obj);
            if (invalidReason) {
              invalidRows.push({
                rowNum: i + 1,
                sheetName: sheetName,
                row: obj,
                reason: invalidReason
              });
            } else {
              validData.push(obj as ExcelColisOriginal);
            }
          }
        }
      } else {
        // Pour les feuilles sans en-têtes chinois, enregistrer toutes les données comme non valides
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row && row.length > 0) {
            const obj = this.arrayToObject(headers, row);
            invalidRows.push({
              rowNum: i + 1,
              sheetName: sheetName,
              row: obj,
              reason: "En-têtes chinois manquants"
            });
          }
        }
      }
    }

    return { validData, invalidRows, totalRowCount };
  }

  // Obtient la raison pour laquelle une ligne est invalide
  private getInvalidReason(row: ExcelColisOriginal): string | null {
    if (!row['运单编号'] || row['运单编号'].trim() === '') {
      return 'Numéro de suivi manquant';
    }

    if (!row['收件人'] || row['收件人'].trim() === '') {
      return 'Nom du destinataire manquant';
    }

    // Autres validations selon les besoins
    return null;
  }

  // Convertit un tableau d'en-têtes et un tableau de valeurs en un objet
  private arrayToObject(headers: string[], values?: any[]): any {
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = values && index < values.length ? values[index] : '';
    });
    return obj;
  }

  // Compte le nombre total de lignes dans toutes les feuilles du classeur
  private countTotalRows(workbook: XLSX.WorkBook): number {
    let totalRows = 0;

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
      totalRows += jsonData.length;
    }

    return totalRows;
  }

  // Vérifie si une ligne contient les champs obligatoires
  private isValidRow(row: any): boolean {
    // Définir les champs obligatoires pour qu'un colis soit valide
    const requiredFields = ['运单编号', '收件人'];
    return requiredFields.every(field => field in row && row[field]);
  }

  private containsChineseHeaders(row: any): boolean {
    // Vérifier les en-têtes chinois nécessaires
    const requiredHeaders = ['运单编号', '收件人', '目的地', '数量', '重量', '物品名称', '转运单号', '承运商'];
    return requiredHeaders.some(header => header in row);
  }

  private convertToColisModel(item: ExcelColisOriginal, partenaireId: string, typeExpedition: TYPE_EXPEDITION): Omit<Colis, 'id'> {
    // Générer un code de suivi unique si non présent
    const codeSuivi = item?.运单编号 || `COL${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Conversion des données
    const poids = typeof item?.重量 === 'string' ? parseFloat(item?.重量) : item?.重量;

    return {
      partenaireId: partenaireId,
      codeSuivi: codeSuivi,
      clientNom: item?.收件人 || 'Non spécifié',
      clientPrenom: '',
      clientTelephone: 0, // À compléter manuellement
      clientEmail: '', // À compléter manuellement
      type: TYPE_COLIS.ORDINAIRE, // Par défaut, à ajuster manuellement
      statut: STATUT_COLIS.EN_ATTENTE_VERIFICATION,
      typeExpedition: typeExpedition,
      description: `Importé depuis Excel - ${item?.物品名称 || 'Non spécifié'} -${ item?.物品名称 }`,
      poids: isNaN(poids as number) ? 0 : poids as number,
      dateCreation: new Date().toISOString(),
      codeexpedition: item?.转运单号 || '',
      destinataire: item?.收件人 || '',
      destination: item?.目的地 || '',
      quantite: item?.数量?.toString() || '1',
      nature: item?.物品名称 || '',
      transporteur: item?.承运商 || ''
    };
  }

  private setErrorMessage(message: string): void {
    this.isError.set(true);
    this.errorMessage.set(message);
    this.isSuccess.set(false);
  }

  private setSuccessMessage(message: string): void {
    this.isSuccess.set(true);
    this.successMessage.set(message);
    this.isError.set(false);
  }

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

  resetForm(): void {
    this.importForm.reset({
      excelFile: null
    });
    this.file = null;
    this.extractedData = [];
    this.previewData = [];
    this.showPreview.set(false);
    this.resetStats();
    this.importErrors = [];
    this.showErrors.set(false);
    this.invalidRows = [];
    this.showInvalidRows.set(false);
  }

  // Calcule le pourcentage de progression de l'importation
  getProgressPercentage(): number {
    const { currentProcessed, totalValid } = this.stats();
    if (totalValid === 0) return 0;
    return Math.round((currentProcessed / totalValid) * 100);
  }

  // Affiche les X premiers caractères d'un texte suivi de "..." si le texte est plus long
  truncateText(text: string, maxLength: number = 20): string {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  }

  // Méthode pour accéder de manière sécurisée aux propriétés avec des noms en chinois
  getChineseProperty(item: any, property: string): string {
    if (!item) return '';

    // Utiliser une notation dynamique pour accéder à la propriété
    return (item as any)[property] || '';
  }

  // Ouvre le formulaire de création manuelle
  openManualForm(): void {
    this.manualForm.reset({
      codeSuivi: '',
      destinataire: '',
      destination: '',
      quantite: '1',
      poids: '0',
      nature: '',
      codeexpedition: '',
      transporteur: ''
    });
    this.showManualForm.set(true);
  }

  // Ferme le formulaire de création manuelle
  closeManualForm(): void {
    this.showManualForm.set(false);
  }

  // Crée un colis manuellement à partir des valeurs du formulaire
  async createManualColis(): Promise<void> {
    if (this.manualForm.invalid) {
      this.setErrorMessage('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.isLoading.set(true);

    try {
      const formValues = this.manualForm.value as ManualColisForm;

      // Générer l'ID partenaire
      const partenaireId = `PART_${formValues.destinataire.replace(/\s+/g, '_') || 'INCONNU'}_${Date.now().toString(36)}`;

      // Créer le modèle de colis
      const colis: Omit<Colis, 'id'> = {
        partenaireId: partenaireId,
        codeSuivi: formValues.codeSuivi,
        clientNom: formValues.destinataire,
        clientPrenom: '',
        clientTelephone: 0,
        clientEmail: '',
        type: TYPE_COLIS.ORDINAIRE,
        statut: STATUT_COLIS.EN_ATTENTE_VERIFICATION,
        typeExpedition: TYPE_EXPEDITION.STANDARD,
        description: `Création manuelle - ${formValues.nature || 'Non spécifié'}`,
        poids: parseFloat(formValues.poids) || 0,
        dateCreation: new Date().toISOString(),
        codeexpedition: formValues.codeexpedition,
        destinataire: formValues.destinataire,
        destination: formValues.destination,
        quantite: formValues.quantite,
        nature: formValues.nature,
        transporteur: formValues.transporteur
      };

      // Enregistrer le colis
      await this.firebaseService.addColis(colis);

      this.setSuccessMessage('Colis créé avec succès');
      this.closeManualForm();

    } catch (error) {
      console.error('Erreur lors de la création du colis:', error);
      this.setErrorMessage('Erreur lors de la création du colis');
    } finally {
      this.isLoading.set(false);
    }
  }

  // Initialise le formulaire manuel avec les données d'une erreur
  useErrorData(error: { item: ExcelColisOriginal, error: string }): void {
    if (!error || !error.item) return;

    this.manualForm.patchValue({
      codeSuivi: error.item?.运单编号 || '',
      destinataire: error.item?.收件人 || '',
      destination: error.item?.目的地 || '',
      quantite: error.item?.数量?.toString() || '1',
      poids: error.item?.重量?.toString() || '0',
      nature: error.item?.物品名称 || '',
      codeexpedition: error.item?.转运单号 || '',
      transporteur: error.item?.承运商 || ''
    });

    this.showManualForm.set(true);
  }

  /**
   * Ouvre le formulaire manuel et remplit les données
   * à partir d'une ligne non valide
   */
  useInvalidRowData(invalidRow: InvalidRow): void {
    // Préparer le formulaire avec les données de la ligne invalide
    this.manualForm.patchValue({
      codeSuivi: this.getChineseProperty(invalidRow.row, '运单编号') || '',
      destinataire: this.getChineseProperty(invalidRow.row, '收件人') || '',
      destination: this.getChineseProperty(invalidRow.row, '目的地') || '',
      quantite: this.getChineseProperty(invalidRow.row, '数量') || '1',
      poids: this.getChineseProperty(invalidRow.row, '重量') || '0',
      nature: this.getChineseProperty(invalidRow.row, '物品名称') || '',
      codeexpedition: this.getChineseProperty(invalidRow.row, '转运单号') || '',
      transporteur: this.getChineseProperty(invalidRow.row, '承运商') || ''
    });

    // Ouvrir le formulaire
    this.showManualForm.set(true);
  }
}

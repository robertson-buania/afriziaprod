import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Facture, Partenaire, Paiement, TYPE_PAIEMENT } from '@/app/models/partenaire.model';
import { computed, signal } from '@angular/core';
import { STATUT_COLIS } from '@/app/models/partenaire.model';
import { Colis } from '@/app/models/partenaire.model';

interface PaiementForm {
  typePaiement: number;
  montant: number;
  reference?: string;
}

@Component({
  selector: 'app-facture-paiement-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './facture-paiement-modal.component.html',
  styleUrl: './facture-paiement-modal.component.scss'
})
export class FacturePaiementModalComponent implements OnInit {
  @Input() factureId!: string;
  @Input() facture: Facture | null = null;
  @Input() client: Partenaire | null = null;

  // Signal pour les colis
  colisArray = signal<Colis[]>([]);
  paiementForm!: FormGroup;
  isSubmitting = signal(false);
  typePaiementOptions = Object.keys(TYPE_PAIEMENT)
    .filter(key => !isNaN(Number(key)))
    .map(key => ({
      value: Number(key),
      label: TYPE_PAIEMENT[Number(key)]
    }));

  montantRestant = computed(() => {
    if (!this.facture) return 0;
    return this.facture.montant - this.facture.montantPaye;
  });

  constructor(
    public activeModal: NgbActiveModal,
    private formBuilder: FormBuilder,
    private firebaseService: FirebaseService
  ) {}

  async ngOnInit(): Promise<void> {
    this.initForm();

    // Charger les colis complets
    if (this.facture && this.facture.colis) {
      await this.loadColis();
    }
  }

  initForm(): void {
    this.paiementForm = this.formBuilder.group({
      typePaiement: [0, Validators.required],
      montant: [this.montantRestant(), [
        Validators.required,
        Validators.min(1),
        Validators.max(this.montantRestant())
      ]],
      reference: ['']
    });
  }

  onMontantChange(): void {
    const montantControl = this.paiementForm.get('montant');
    if (montantControl && montantControl.value > this.montantRestant()) {
      montantControl.setValue(this.montantRestant());
    }
  }

  isTypeRequiringReference(): boolean {
    const typePaiement = this.paiementForm.get('typePaiement')?.value;
    // Carte, M-Pesa ou Orange Money nécessitent une référence
    return typePaiement === 1 || typePaiement === 2 || typePaiement === 3;
  }

  getModeLabel(type: number): string {
    return TYPE_PAIEMENT[type] || 'Inconnu';
  }

  async onSubmit(): Promise<void> {
    if (this.paiementForm.invalid) {
      return;
    }

    this.isSubmitting.set(true);

    try {
      const formValues = this.paiementForm.value as PaiementForm;

      // Création du paiement avec un ID unique
      const paiementId = `PAY${new Date().getTime()}`;
      const paiement: Omit<Paiement, 'id'> & { id: string } = {
        id: paiementId,
        typepaiement: formValues.typePaiement,
        montant_paye: formValues.montant,
        facture_reference: this.facture?.id || '',
        id_facture: this.factureId,
        datepaiement: new Date()
      };

      // Si une référence est fournie et le type de paiement le nécessite, on l'ajoute dans une propriété personnalisée
      const paiementData: any = { ...paiement };
      if (formValues.reference && this.isTypeRequiringReference()) {
        paiementData.reference = formValues.reference;
      }

      // Mise à jour de la facture avec le nouveau montant payé
      if (this.facture && this.factureId) {
        // Mise à jour du montant payé de la facture
        const nouveauMontantPaye = this.facture.montantPaye + formValues.montant;

        // Enregistrer le paiement dans la collection des paiements
        await this.firebaseService.addPaiement(paiementData);

        // Mettre à jour la facture dans Firebase avec le nouveau montant payé
        await this.firebaseService.updateFacture(this.factureId, {
          montantPaye: nouveauMontantPaye
        });

        // Vérifier si la facture est complètement payée
        if (nouveauMontantPaye >= this.facture.montant) {
          // Mettre à jour le statut des colis
          await this.updateColisStatus();
        }

        this.activeModal.close('success');
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du paiement:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // Mettre à jour le statut des colis si la facture est complètement payée
  private async updateColisStatus(): Promise<void> {
    const colis = this.colisArray();
    if (colis.length === 0) return;

    try {
      // Filtrer les colis qui doivent être mis à jour (uniquement ceux avec statut approprié)
      const colisToUpdate = colis.filter(c =>
        c.statut === STATUT_COLIS.EN_ATTENTE_PAIEMENT ||
        c.statut === STATUT_COLIS.EN_ATTENTE_FACTURATION
      );

      if (colisToUpdate.length === 0) return;

      // Créer un tableau de promesses pour les mises à jour
      const updatePromises = colisToUpdate.map(c => {
        console.log(`Mise à jour du statut du colis ${c.id} vers EN_ATTENTE_LIVRAISON`);
        return this.firebaseService.updateColis(c.id!, {
          statut: STATUT_COLIS.EN_ATTENTE_LIVRAISON
        });
      });

      // Exécuter toutes les mises à jour en parallèle
      await Promise.all(updatePromises);

      console.log(`${updatePromises.length} colis mis à jour vers le statut EN_ATTENTE_LIVRAISON`);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut des colis:', error);
      throw error; // Propager l'erreur pour la gestion dans onSubmit
    }
  }

  onCancel(): void {
    this.activeModal.dismiss();
  }

  // Charger les colis complets (convertir les IDs en objets)
  private async loadColis(): Promise<void> {
    if (!this.facture || !this.facture.colis) return;

    try {
      const colisComplets: Colis[] = [];

      for (const colisDonnee of this.facture.colis) {
        if (typeof colisDonnee === 'string') {
          try {
            // Si c'est un ID, charger l'objet colis complet
            const colis = await this.firebaseService.getColisById(colisDonnee);
            if (colis) {
              colisComplets.push(colis);
            }
          } catch (error) {
            console.error(`Erreur lors du chargement du colis ${colisDonnee}:`, error);
          }
        } else {
          // Si c'est déjà un objet colis, l'ajouter directement
          colisComplets.push(colisDonnee);
        }
      }

      // Mettre à jour le signal pour les colis et la propriété colisObjets
      this.colisArray.set(colisComplets);
      if (this.facture) {
        this.facture.colisObjets = colisComplets;
      }
    } catch (error) {
      console.error('Erreur lors du chargement des colis:', error);
    }
  }
}

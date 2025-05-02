import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Facture, Paiement, STATUT_PAIEMENT, TYPE_PAIEMENT } from '@/app/models/partenaire.model';

@Component({
  selector: 'app-paiement-facture',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NgbAlertModule],
  templateUrl: './paiement-facture.component.html',
  styleUrl: './paiement-facture.component.scss'
})
export class PaiementFactureComponent implements OnInit {
  factureId: string | null = null;
  facture: Facture | null = null;
  paiementForm!: FormGroup;
  isLoading = true;
  errorMessage = '';
  successMessage = '';
  isProcessing = false;

  readonly TYPE_PAIEMENT = TYPE_PAIEMENT;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private firebaseService: FirebaseService
  ) {}

  ngOnInit(): void {
    this.initPaiementForm();
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.factureId = id;
        this.chargerFacture(id);
      } else {
        this.errorMessage = 'Identifiant de facture non trouvé';
        this.isLoading = false;
      }
    });
  }

  private initPaiementForm(): void {
    this.paiementForm = this.fb.group({
      montant: ['', [Validators.required, Validators.min(1)]],
      typePaiement: [TYPE_PAIEMENT.ESPECE, Validators.required]
    });
  }

  private async chargerFacture(id: string): Promise<void> {
    try {
      const facture = await this.firebaseService.getFactureById(id);

      if (facture) {
        this.facture = facture;

        // Pré-remplir le montant avec le montant restant à payer
        const montantRestant = this.getMontantRestant();
        this.paiementForm.get('montant')?.setValue(montantRestant);
      } else {
        this.errorMessage = 'Facture non trouvée';
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la facture:', error);
      this.errorMessage = 'Erreur lors du chargement de la facture';
    } finally {
      this.isLoading = false;
    }
  }

  getMontantRestant(): number {
    if (!this.facture) return 0;

    return Math.max(0, this.facture.montant - this.facture.montantPaye);
  }

  getMontantProgressPercentage(): number {
    if (!this.facture || this.facture.montant === 0) return 0;

    return Math.min(100, (this.facture.montantPaye / this.facture.montant) * 100);
  }

  getTypePaiementLabel(type: TYPE_PAIEMENT): string {
    switch (type) {
      case TYPE_PAIEMENT.ESPECE:
        return 'Espèce';
      case TYPE_PAIEMENT.CARTE:
        return 'Carte bancaire';
      case TYPE_PAIEMENT.MPESA:
        return 'M-Pesa';
      case TYPE_PAIEMENT.ORANGE:
        return 'Orange Money';
      default:
        return 'Inconnu';
    }
  }

  async onSubmit(): Promise<void> {
    if (this.paiementForm.invalid) {
      this.paiementForm.markAllAsTouched();
      return;
    }

    if (!this.factureId || !this.facture) {
      this.errorMessage = 'Données de facture invalides';
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const montant = parseFloat(this.paiementForm.get('montant')?.value);
      const typePaiement = this.paiementForm.get('typePaiement')?.value;

      if (montant <= 0) {
        this.errorMessage = 'Le montant doit être supérieur à 0';
        return;
      }

      if (montant > this.getMontantRestant()) {
        this.errorMessage = 'Le montant ne peut pas dépasser le montant restant à payer';
        return;
      }

      // Créer le paiement
      const paiement: Omit<Paiement, 'id'> = {
        typepaiement: typePaiement,
        montant_paye: montant,
        id_facture: this.factureId,
        datepaiement: new Date(),
        statut: STATUT_PAIEMENT.EN_ATTENTE
      };

      // Ajouter le paiement
      const paiementId = await this.firebaseService.addPaiement(paiement);

      // Mettre à jour le montant payé de la facture
      await this.firebaseService.updateFacture(this.factureId, {
        montantPaye: this.facture.montantPaye + montant,
        paiements: [...(this.facture.paiements || []), { id: paiementId, ...paiement }]
      });

      this.successMessage = 'Paiement effectué avec succès';

      // Recharger la facture
      setTimeout(() => {
        this.chargerFacture(this.factureId!);
        this.paiementForm.get('montant')?.setValue(this.getMontantRestant());
      }, 1000);
    } catch (error) {
      console.error('Erreur lors du paiement:', error);
      this.errorMessage = 'Une erreur est survenue lors du paiement';
    } finally {
      this.isProcessing = false;
    }
  }
}

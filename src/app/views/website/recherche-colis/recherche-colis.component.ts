import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Colis, STATUT_COLIS, TYPE_COLIS, TYPE_EXPEDITION } from '@/app/models/partenaire.model';
import { PanierService } from '@/app/core/services/panier.service';

@Component({
  selector: 'app-recherche-colis',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NgbAlertModule],
  templateUrl: './recherche-colis.component.html',
  styleUrl: './recherche-colis.component.scss'
})
export class RechercheColisComponent implements OnInit {
  searchForm!: FormGroup;
  colis: Colis | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private firebaseService: FirebaseService,
    private panierService: PanierService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.searchForm = this.fb.group({
      codeSuivi: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  onSubmit(): void {
    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.colis = null;
    this.isLoading = true;

    const codeSuivi = this.searchForm.get('codeSuivi')?.value;

    this.firebaseService.getColisByCode(codeSuivi).subscribe(
      (colis) => {
        this.isLoading = false;
        if (colis) {
          this.colis = colis;
        } else {
          this.errorMessage = 'Aucun colis trouvé avec ce code de suivi';
        }
      },
      (error) => {
        this.isLoading = false;
        this.errorMessage = 'Une erreur est survenue lors de la recherche';
        console.error('Erreur lors de la recherche de colis:', error);
      }
    );
  }

  ajouterAuPanier(): void {
    if (!this.colis) return;

    if (this.colis.statut !== STATUT_COLIS.EN_ATTENTE_PAIEMENT) {
      this.errorMessage = 'Ce colis ne peut pas être ajouté au panier car il n\'est pas en attente de facturation';
      return;
    }

    const ajoutReussi = this.panierService.ajouterAuPanier(this.colis);
    if (ajoutReussi) {
      this.successMessage = 'Colis ajouté au panier avec succès';
    } else {
      this.errorMessage = 'Ce colis est déjà dans votre panier ou ne peut pas être ajouté';
    }
  }

  peutEtreAjouteAuPanier(): boolean {
    return this.colis?.statut === STATUT_COLIS.EN_ATTENTE_PAIEMENT;
  }

  getTypeColisLabel(type: TYPE_COLIS): string {
    switch (type) {
      case TYPE_COLIS.ORDINAIRE:
        return 'Ordinaire';
      case TYPE_COLIS.AVEC_BATTERIE:
        return 'Avec batterie';
      case TYPE_COLIS.ORDINATEUR:
        return 'Ordinateur';
      case TYPE_COLIS.TELEPHONE:
        return 'Téléphone';
      default:
        return 'Inconnu';
    }
  }

  getTypeExpeditionLabel(type: TYPE_EXPEDITION): string {
    switch (type) {
      case TYPE_EXPEDITION.EXPRESS:
        return 'Express';
      case TYPE_EXPEDITION.STANDARD:
        return 'Standard';
      default:
        return 'Inconnu';
    }
  }

  getStatutLabel(statut: STATUT_COLIS): string {
    switch(statut) {
      case STATUT_COLIS.EN_ATTENTE_PAIEMENT:
        return 'bg-warning text-dark';
      case STATUT_COLIS.EN_ATTENTE_EXPEDITION:
        return 'bg-info';
      case STATUT_COLIS.EN_COURS_EXPEDITION:
        return 'bg-primary';
      case STATUT_COLIS.EN_ATTENTE_LIVRAISON:
        return 'bg-secondary';
      case STATUT_COLIS.LIVRE:
        return 'bg-success';
      case STATUT_COLIS.ANNULE:
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  getStatutClass(statut: STATUT_COLIS): string {
    switch(statut) {
      case STATUT_COLIS.EN_ATTENTE_PAIEMENT:
        return 'En attente de paiement';
      case STATUT_COLIS.EN_ATTENTE_EXPEDITION:
        return "En attente d'expédition";
      case STATUT_COLIS.EN_COURS_EXPEDITION:
        return "En cours d'expédition";
     
      case STATUT_COLIS.EN_ATTENTE_LIVRAISON:
        return 'En attente de livraison';
      case STATUT_COLIS.LIVRE:
        return 'Livré';
      default:
        return 'Annulé';
    }
  }
}

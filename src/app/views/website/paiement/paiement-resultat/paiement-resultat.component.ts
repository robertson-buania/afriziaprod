import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Facture, Colis } from '@/app/models/partenaire.model';
import { PanierService } from '@/app/core/services/panier.service';

@Component({
  selector: 'app-paiement-resultat',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './paiement-resultat.component.html',
  styleUrls: ['./paiement-resultat.component.scss']
})
export class PaiementResultatComponent implements OnInit {
  factureId: string | null = null;
  facture: Facture | null = null;
  isLoading: boolean = true;
  isSuccess: boolean = false;
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private firebaseService: FirebaseService,
    private panierService: PanierService
  ) {}

  ngOnInit(): void {
    // Récupérer les paramètres de l'URL
    this.factureId = this.route.snapshot.paramMap.get('id');
    this.isSuccess = this.route.snapshot.queryParamMap.get('success') === 'true';

    if (this.factureId) {
      this.chargerFacture();
    } else {
      this.isLoading = false;
      this.errorMessage = "Aucune référence de facture trouvée.";
    }
  }

  private async chargerFacture(): Promise<void> {
    if (!this.factureId) return;

    try {
      // getFactureById retourne déjà une Promise
      this.facture = await this.firebaseService.getFactureById(this.factureId);
      this.isLoading = false;

      // Si le paiement a réussi, vider le panier
      if (this.isSuccess) {
        this.panierService.viderPanier();
      }
    } catch (error: unknown) {
      console.error("Erreur lors du chargement de la facture:", error);
      this.isLoading = false;
      this.errorMessage = "Impossible de charger les détails de la facture.";
    }
  }

  /**
   * Récupère les objets Colis de la facture de manière sécurisée
   */
  getColisObjets(): Colis[] {
    if (!this.facture) return [];

    // Si colisObjets existe, l'utiliser
    if (this.facture.colisObjets && Array.isArray(this.facture.colisObjets)) {
      return this.facture.colisObjets;
    }

    // Sinon, filtrer les objets Colis du tableau colis
    if (this.facture.colis && Array.isArray(this.facture.colis)) {
      return this.facture.colis.filter(item =>
        typeof item !== 'string' && item !== null
      ) as Colis[];
    }

    return [];
  }

  retourAccueil(): void {
    this.router.navigate(['/']);
  }

  mesFactures(): void {
    this.router.navigate(['/mes-commandes']);
  }

  nouveauColisChercher(): void {
    this.router.navigate(['/recherche-colis']);
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Colis, STATUT_COLIS } from '@/app/models/partenaire.model';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class PanierService {
  private panierSubject = new BehaviorSubject<Colis[]>([]);
  panier$ = this.panierSubject.asObservable();

  constructor(private firebaseService: FirebaseService) {
    this.chargerPanierDuLocalStorage();
  }

  /**
   * Ajoute un colis au panier s'il est en attente de facturation
   */
  ajouterAuPanier(colis: Colis): boolean {
    if (colis.statut !== STATUT_COLIS.EN_ATTENTE_FACTURATION) {
      return false;
    }

    const panierCourant = this.panierSubject.value;

    // Vérifier si le colis est déjà dans le panier
    if (panierCourant.some(item => item.id === colis.id)) {
      return false;
    }

    const nouveauPanier = [...panierCourant, colis];
    this.panierSubject.next(nouveauPanier);
    this.sauvegarderPanierDansLocalStorage();
    return true;
  }

  /**
   * Supprime un colis du panier
   */
  supprimerDuPanier(colisId: string): void {
    const panierCourant = this.panierSubject.value;
    const nouveauPanier = panierCourant.filter(colis => colis.id !== colisId);
    this.panierSubject.next(nouveauPanier);
    this.sauvegarderPanierDansLocalStorage();
  }

  /**
   * Vide complètement le panier
   */
  viderPanier(): void {
    this.panierSubject.next([]);
    localStorage.removeItem('panier_colis');
  }

  /**
   * Récupère le contenu actuel du panier
   */
  obtenirContenuPanier(): Colis[] {
    return this.panierSubject.value;
  }

  /**
   * Calcule le montant total du panier
   */
  calculerTotal(): number {
    return this.panierSubject.value.reduce((total, colis) => {
      return total + (colis.cout || 0);
    }, 0);
  }

  /**
   * Retourne le nombre d'articles dans le panier
   */
  obtenirNombreArticles(): number {
    return this.panierSubject.value.length;
  }

  /**
   * Sauvegarde le panier dans le localStorage
   */
  private sauvegarderPanierDansLocalStorage(): void {
    const colisIds = this.panierSubject.value.map(colis => colis.id);
    localStorage.setItem('panier_colis', JSON.stringify(colisIds));
  }

  /**
   * Charge le panier depuis le localStorage
   */
  private async chargerPanierDuLocalStorage(): Promise<void> {
    const panierSauvegarde = localStorage.getItem('panier_colis');

    if (panierSauvegarde) {
      try {
        const colisIds = JSON.parse(panierSauvegarde) as string[];
        const colis: Colis[] = [];

        for (const id of colisIds) {
          if (!id) continue;

          try {
            // Charger chaque colis individuellement de manière asynchrone
            const colisItem = await this.firebaseService.getColisById(id);
            if (colisItem && colisItem.statut === STATUT_COLIS.EN_ATTENTE_FACTURATION) {
              colis.push(colisItem);
            }
          } catch (error) {
            console.error(`Erreur lors du chargement du colis ${id}:`, error);
          }
        }

        // Mettre à jour le panier avec tous les colis récupérés
        this.panierSubject.next(colis);
      } catch (error) {
        console.error('Erreur lors du chargement du panier:', error);
        localStorage.removeItem('panier_colis');
      }
    }
  }

  /**
   * Transforme le panier en facture
   */
  async creerFactureDepuisPanier(partenaireId: string): Promise<string | null> {
    const colisDuPanier = this.panierSubject.value;

    if (colisDuPanier.length === 0) {
      return null;
    }

    try {
      // Calculer le montant total
      const montantTotal = this.calculerTotal();

      // Créer la facture
      const factureId = await this.firebaseService.createFactureFromColis({
        montant: montantTotal,
        montantPaye: 0,
        partenaireId: partenaireId,
        colis: colisDuPanier,
        paiements: [],
        dateCreation: new Date().toISOString()
      });

      // Mettre à jour le statut des colis
      for (const colis of colisDuPanier) {
        if (colis.id) {
          await this.firebaseService.updateColis(colis.id, {
            statut: STATUT_COLIS.EN_ATTENTE_PAIEMENT
          });
        }
      }

      // Vider le panier après création de la facture
      this.viderPanier();

      return factureId;
    } catch (error) {
      console.error('Erreur lors de la création de la facture:', error);
      return null;
    }
  }
}

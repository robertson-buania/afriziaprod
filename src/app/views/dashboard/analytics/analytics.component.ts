import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Colis, STATUT_COLIS } from '@/app/models/partenaire.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
   
  `,
  styles: [`
    .avatar-md {
      height: 4rem;
      width: 4rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .avatar-title {
      font-size: 2rem;
    }

    .badge {
      padding: 0.5em 0.8em;
      font-weight: 500;
    }

    .progress {
      background-color: #e9ecef;
    }
  `]
})
export class AnalyticsComponent implements OnInit {
  totalColis = 0;
  colisLivres = 0;
  colisEnAttente = 0;
  colisAnnules = 0;
  statsParStatut: { statut: STATUT_COLIS; nombre: number }[] = [];

  constructor(private firebaseService: FirebaseService) {}

  ngOnInit() {
    //this.loadStats();
  }

  // async loadStats() {
  //   try {
  //     const colis = await firstValueFrom(this.firebaseService.getColis());

  //     // Calcul des totaux
  //     this.totalColis = colis.length;
  //     this.colisLivres = colis.filter(c => c.statut === STATUT_COLIS.LIVRE).length;
  //     this.colisAnnules = colis.filter(c => c.statut === STATUT_COLIS.ANNULE).length;
  //     this.colisEnAttente = colis.filter(c =>
  //       c.statut === STATUT_COLIS.EN_ATTENTE_VERIFICATION ||
  //       c.statut === STATUT_COLIS.EN_ATTENTE_FACTURATION ||
  //       c.statut === STATUT_COLIS.EN_ATTENTE_PAIEMENT ||
  //       c.statut === STATUT_COLIS.EN_ATTENTE_LIVRAISON
  //     ).length;

  //     // Statistiques par statut
  //     this.statsParStatut = Object.values(STATUT_COLIS)
  //       .filter(statut => typeof statut === 'number')
  //       .map(statut => ({
  //         statut: statut as STATUT_COLIS,
  //         nombre: colis.filter(c => c.statut === statut).length
  //       }));

  //   } catch (error) {
  //     console.error('Erreur lors du chargement des statistiques:', error);
  //   }
  // }

  // getBadgeClass(statut: STATUT_COLIS): string {
  //   switch(statut) {
  //     case STATUT_COLIS.EN_ATTENTE_VERIFICATION:
  //       return 'bg-warning text-dark';
  //     case STATUT_COLIS.EN_ATTENTE_FACTURATION:
  //       return 'bg-info';
  //     case STATUT_COLIS.EN_ATTENTE_PAIEMENT:
  //       return 'bg-primary';
  //     case STATUT_COLIS.EN_ATTENTE_LIVRAISON:
  //       return 'bg-info';
  //     case STATUT_COLIS.LIVRE:
  //       return 'bg-success';
  //     case STATUT_COLIS.ANNULE:
  //       return 'bg-danger';
  //     default:
  //       return 'bg-secondary';
  //   }
  // }

  getStatutLabel(statut: STATUT_COLIS): string {
    return STATUT_COLIS[statut].replace(/_/g, ' ');
  }
}

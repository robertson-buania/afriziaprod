import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UtilisateurService } from '@/app/core/services/utilisateur.service';
import { ROLE_UTILISATEUR, Utilisateur } from '@/app/models/utilisateur.model';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';
import { Partenaire } from '@/app/models/partenaire.model';

@Component({
  selector: 'app-utilisateur-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, NgbModalModule],
  templateUrl: './utilisateur-detail.component.html',
  styleUrl: './utilisateur-detail.component.scss'
})
export class UtilisateurDetailComponent implements OnInit {
  utilisateurId: string | null = null;
  utilisateur: Utilisateur | null = null;
  partenaire: Partenaire | null = null;
  isLoading = false;
  errorMessage: string | null = null;

  readonly ROLE_UTILISATEUR = ROLE_UTILISATEUR;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private utilisateurService: UtilisateurService,
    private firebaseService: FirebaseService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.utilisateurId = id;
        this.loadUtilisateur(id);
      } else {
        this.errorMessage = 'Identifiant utilisateur non trouvé';
      }
    });
  }

  private async loadUtilisateur(id: string): Promise<void> {
    this.isLoading = true;
    try {
      // Charger l'utilisateur
      this.utilisateur = await this.firebaseService.getUtilisateurById(id);

      if (!this.utilisateur) {
        this.errorMessage = 'Utilisateur non trouvé';
        return;
      }

      // Charger le partenaire associé si existant
      if (this.utilisateur.partenaireId) {
        try {
          this.partenaire = await this.firebaseService.getPartenaireById(this.utilisateur.partenaireId);
        } catch (error) {
          console.error('Erreur lors du chargement du partenaire:', error);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'utilisateur:', error);
      this.errorMessage = 'Erreur lors du chargement de l\'utilisateur';
    } finally {
      this.isLoading = false;
    }
  }

  getRoleLabel(role: ROLE_UTILISATEUR): string {
    switch (role) {
      case ROLE_UTILISATEUR.ADMINISTRATEUR:
        return 'Administrateur';
      case ROLE_UTILISATEUR.PERSONNEL:
        return 'Personnel';
      case ROLE_UTILISATEUR.WEBSITE:
        return 'Utilisateur du site web';
      default:
        return 'Inconnu';
    }
  }

  getStatusClass(estActif: boolean): string {
    return estActif ? 'bg-success' : 'bg-danger';
  }

  getStatusLabel(estActif: boolean): string {
    return estActif ? 'Actif' : 'Inactif';
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'Non disponible';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  onEdit(): void {
    if (this.utilisateurId) {
      this.router.navigate(['/utilisateurs/edit', this.utilisateurId]);
    }
  }

  async onDelete(modal: any): Promise<void> {
    this.modalService.open(modal, { centered: true }).result.then(
      async (result) => {
        if (result === 'confirm' && this.utilisateurId) {
          try {
            await this.utilisateurService.supprimerUtilisateur(this.utilisateurId);
            this.router.navigate(['/utilisateurs/list']);
          } catch (error: any) {
            this.errorMessage = error.message || 'Erreur lors de la suppression';
          }
        }
      },
      () => {} // Dismiss
    );
  }
}

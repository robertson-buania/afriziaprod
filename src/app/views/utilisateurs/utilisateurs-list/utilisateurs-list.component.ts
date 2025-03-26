import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UtilisateurService } from '@/app/core/services/utilisateur.service';
import { Utilisateur, ROLE_UTILISATEUR } from '@/app/models/utilisateur.model';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-utilisateurs-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './utilisateurs-list.component.html',
  styleUrl: './utilisateurs-list.component.scss'
})
export class UtilisateursListComponent implements OnInit {
  utilisateurs: Utilisateur[] = [];
  utilisateursFiltres: Utilisateur[] = [];
  isLoading = true;
  searchTerm = '';
  selectedRole: ROLE_UTILISATEUR | 'tous' = 'tous';
  utilisateurASupprimer: Utilisateur | null = null;

  readonly ROLE_UTILISATEUR = ROLE_UTILISATEUR;

  constructor(
    private utilisateurService: UtilisateurService,
    private router: Router,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.chargerUtilisateurs();
  }

  chargerUtilisateurs(): void {
    this.isLoading = true;
    this.utilisateurService.getUtilisateurs().subscribe(
      (utilisateurs) => {
        this.utilisateurs = utilisateurs;
        this.filtrerUtilisateurs();
        this.isLoading = false;
      },
      (error) => {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        this.isLoading = false;
      }
    );
  }

  filtrerUtilisateurs(): void {
    this.utilisateursFiltres = this.utilisateurs.filter(utilisateur => {
      const matchRole = this.selectedRole === 'tous' || utilisateur.role === this.selectedRole;
      const matchSearch = this.searchTerm.trim() === '' ||
        utilisateur.nom.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        utilisateur.prenom.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        utilisateur.email.toLowerCase().includes(this.searchTerm.toLowerCase());

      return matchRole && matchSearch;
    });
  }

  onSearchChange(): void {
    this.filtrerUtilisateurs();
  }

  onRoleChange(): void {
    this.filtrerUtilisateurs();
  }

  creerUtilisateur(): void {
    this.router.navigate(['/utilisateurs/new']);
  }

  modifierUtilisateur(id: string): void {
    this.router.navigate(['/utilisateurs/edit', id]);
  }

  ouvrirModalSuppression(modal: any, utilisateur: Utilisateur): void {
    this.utilisateurASupprimer = utilisateur;
    this.modalService.open(modal, { centered: true });
  }

  async confirmerSuppression(): Promise<void> {
    if (!this.utilisateurASupprimer || !this.utilisateurASupprimer.id) return;

    try {
      await this.utilisateurService.supprimerUtilisateur(this.utilisateurASupprimer.id);
      this.modalService.dismissAll();
      this.utilisateurASupprimer = null;
      this.chargerUtilisateurs();
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    }
  }

  getNomComplet(utilisateur: Utilisateur): string {
    return `${utilisateur.prenom} ${utilisateur.nom}`;
  }

  getLabelRole(role: ROLE_UTILISATEUR): string {
    switch (role) {
      case ROLE_UTILISATEUR.ADMINISTRATEUR:
        return 'Administrateur';
      case ROLE_UTILISATEUR.PERSONNEL:
        return 'Personnel';
      case ROLE_UTILISATEUR.WEBSITE:
        return 'Website';
      default:
        return 'Inconnu';
    }
  }

  getRoleClass(role: ROLE_UTILISATEUR): string {
    switch (role) {
      case ROLE_UTILISATEUR.ADMINISTRATEUR:
        return 'bg-danger';
      case ROLE_UTILISATEUR.PERSONNEL:
        return 'bg-primary';
      case ROLE_UTILISATEUR.WEBSITE:
        return 'bg-success';
      default:
        return 'bg-secondary';
    }
  }

  getDateFormatee(date: string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  voirDemandes(): void {
    this.router.navigate(['/utilisateurs/demandes']);
  }
}

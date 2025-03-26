import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UtilisateurService } from '@/app/core/services/utilisateur.service';
import { DemandeUtilisateur, ROLE_UTILISATEUR } from '@/app/models/utilisateur.model';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-demandes-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './demandes-list.component.html',
  styleUrl: './demandes-list.component.scss'
})
export class DemandesListComponent implements OnInit {
  demandes: DemandeUtilisateur[] = [];
  demandesFiltrees: DemandeUtilisateur[] = [];
  isLoading = true;
  searchTerm = '';
  selectedStatut: 'tous' | 'en_attente' | 'approuvee' | 'rejetee' = 'tous';
  demandeSelectionnee: DemandeUtilisateur | null = null;
  isProcessing = false;
  rejectionMessage = '';

  readonly ROLE_UTILISATEUR = ROLE_UTILISATEUR;

  constructor(
    private utilisateurService: UtilisateurService,
    private router: Router,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.chargerDemandes();
  }

  chargerDemandes(): void {
    this.isLoading = true;
    this.utilisateurService.getDemandesUtilisateurs().subscribe(
      (demandes) => {
        this.demandes = demandes;
        this.filtrerDemandes();
        this.isLoading = false;
      },
      (error) => {
        console.error('Erreur lors du chargement des demandes:', error);
        this.isLoading = false;
      }
    );
  }

  filtrerDemandes(): void {
    this.demandesFiltrees = this.demandes.filter(demande => {
      const matchStatut = this.selectedStatut === 'tous' || demande.statut === this.selectedStatut;
      const matchSearch = this.searchTerm.trim() === '' ||
        demande.nom.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        demande.prenom.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        demande.email.toLowerCase().includes(this.searchTerm.toLowerCase());

      return matchStatut && matchSearch;
    });
  }

  onSearchChange(): void {
    this.filtrerDemandes();
  }

  onStatutChange(): void {
    this.filtrerDemandes();
  }

  ouvrirModalApprobation(modal: any, demande: DemandeUtilisateur): void {
    this.demandeSelectionnee = demande;
    this.modalService.open(modal, { centered: true, size: 'lg' });
  }

  ouvrirModalRejet(modal: any, demande: DemandeUtilisateur): void {
    this.demandeSelectionnee = demande;
    this.rejectionMessage = '';
    this.modalService.open(modal, { centered: true });
  }

  async approuverDemande(): Promise<void> {
    if (!this.demandeSelectionnee || !this.demandeSelectionnee.id) return;

    this.isProcessing = true;
    try {
      await this.utilisateurService.approuverDemande(this.demandeSelectionnee.id);
      this.modalService.dismissAll();
      this.demandeSelectionnee = null;
      this.chargerDemandes();
    } catch (error) {
      console.error('Erreur lors de l\'approbation de la demande:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async rejeterDemande(): Promise<void> {
    if (!this.demandeSelectionnee || !this.demandeSelectionnee.id) return;

    this.isProcessing = true;
    try {
      await this.utilisateurService.rejeterDemande(this.demandeSelectionnee.id, this.rejectionMessage);
      this.modalService.dismissAll();
      this.demandeSelectionnee = null;
      this.rejectionMessage = '';
      this.chargerDemandes();
    } catch (error) {
      console.error('Erreur lors du rejet de la demande:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  retourListe(): void {
    this.router.navigate(['/utilisateurs/list']);
  }

  getNomComplet(demande: DemandeUtilisateur): string {
    return `${demande.prenom} ${demande.nom}`;
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

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'en_attente':
        return 'bg-warning text-dark';
      case 'approuvee':
        return 'bg-success';
      case 'rejetee':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  getStatutLabel(statut: string): string {
    switch (statut) {
      case 'en_attente':
        return 'En attente';
      case 'approuvee':
        return 'Approuvée';
      case 'rejetee':
        return 'Rejetée';
      default:
        return 'Inconnu';
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
}

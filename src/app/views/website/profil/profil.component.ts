import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { UtilisateurService } from '@/app/core/services/utilisateur.service';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { Utilisateur } from '@/app/models/utilisateur.model';
import { Partenaire } from '@/app/models/partenaire.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, NgbAlertModule],
  templateUrl: './profil.component.html',
  styleUrl: './profil.component.scss'
})
export class ProfilComponent implements OnInit, OnDestroy {
  utilisateur: Utilisateur | null = null;
  partenaire: Partenaire | null = null;
  profilForm!: FormGroup;
  isLoading = true;
  errorMessage = '';
  successMessage = '';
  isUpdating = false;
  isEditMode = false; // Mode d'édition désactivé par défaut
  estPartenaire = false; // Indique si l'utilisateur est un partenaire
  private subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private utilisateurService: UtilisateurService,
    private firebaseService: FirebaseService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.chargerUtilisateur();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private initForms(): void {
    this.profilForm = this.fb.group({
      nom: ['', [Validators.required]],
      prenom: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required]],
      adresse: ['']
    });
  }

  // Basculer entre le mode d'affichage et le mode d'édition
  toggleEditMode(): void {
    if (!this.isEditMode) {
      // Assurez-vous que le formulaire est rempli avec les données actuelles avant d'entrer en mode édition
      this.profilForm.patchValue({
        nom: this.utilisateur?.nom || '',
        prenom: this.utilisateur?.prenom || '',
        email: this.utilisateur?.email || '',
        telephone: this.utilisateur?.telephone || '',
        adresse: this.partenaire?.adresse || ''
      });
    }
    this.isEditMode = !this.isEditMode;
  }

  private chargerUtilisateur(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.subscription.add(
      this.utilisateurService.utilisateurCourant$.subscribe(async user => {
        if (!user) {
          // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
          this.router.navigate(['/']);
          return;
        }

        this.utilisateur = user;
        console.log('Utilisateur chargé:', this.utilisateur);

        // Vérifier si l'utilisateur est associé à un partenaire
        if (user.partenaireId) {
          this.estPartenaire = true;
          try {
            this.partenaire = await this.firebaseService.getPartenaireById(user.partenaireId);
            console.log('Partenaire chargé:', this.partenaire);
          } catch (error) {
            console.error('Erreur lors du chargement du partenaire:', error);
            this.errorMessage = 'Erreur lors du chargement des informations du partenaire.';
          }
        }

        // Pré-remplir le formulaire avec les données de l'utilisateur
        this.profilForm.patchValue({
          nom: this.utilisateur.nom || '',
          prenom: this.utilisateur.prenom || '',
          email: this.utilisateur.email || '',
          telephone: this.utilisateur.telephone || '',
          adresse: this.partenaire?.adresse || ''
        });

        this.isLoading = false;
      })
    );
  }

  async onSubmitProfile(): Promise<void> {
    if (this.profilForm.invalid) {
      this.profilForm.markAllAsTouched();
      return;
    }

    if (!this.utilisateur || !this.utilisateur.id) {
      this.errorMessage = 'Impossible de mettre à jour votre profil. Veuillez vous reconnecter.';
      return;
    }

    this.isUpdating = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const formData = this.profilForm.value;

      // Utiliser la nouvelle méthode pour mettre à jour l'utilisateur et le partenaire en une seule opération
      await this.utilisateurService.mettreAJourProfilUtilisateur(
        this.utilisateur.id,
        {
          nom: formData.nom,
          prenom: formData.prenom,
          email: formData.email,
          telephone: formData.telephone,
          adresse: formData.adresse
        },
        this.estPartenaire && this.partenaire ? this.partenaire.id : undefined
      );

      this.successMessage = 'Profil mis à jour avec succès';
      this.isEditMode = false; // Revenir au mode d'affichage après la mise à jour

      // Recharger la page après un court délai pour refléter les changements
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      this.errorMessage = 'Une erreur est survenue lors de la mise à jour de votre profil';
    } finally {
      this.isUpdating = false;
    }
  }
}

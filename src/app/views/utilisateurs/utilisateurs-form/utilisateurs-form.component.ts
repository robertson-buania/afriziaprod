import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UtilisateurService } from '@/app/core/services/utilisateur.service';
import { ROLE_UTILISATEUR, Utilisateur } from '@/app/models/utilisateur.model';
import { FirebaseService } from '@/app/core/services/firebase.service';
import { firstValueFrom } from 'rxjs';
import { Partenaire } from '@/app/models/partenaire.model';

@Component({
  selector: 'app-utilisateurs-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './utilisateurs-form.component.html',
  styleUrl: './utilisateurs-form.component.scss'
})
export class UtilisateursFormComponent implements OnInit {
  utilisateurForm!: FormGroup;
  isLoading = false;
  isSubmitting = false;
  isEditMode = false;
  utilisateurId: string | null = null;
  errorMessage: string | null = null;
  partenaires: Partenaire[] = [];

  readonly ROLE_UTILISATEUR = ROLE_UTILISATEUR;

  constructor(
    private fb: FormBuilder,
    private utilisateurService: UtilisateurService,
    private firebaseService: FirebaseService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadPartenaires();
    this.checkEditMode();
  }

  private initForm(): void {
    this.utilisateurForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', this.isEditMode ? [] : [Validators.required, Validators.minLength(6)]],
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      telephone: [''],
      role: [ROLE_UTILISATEUR.WEBSITE, Validators.required],
      estActif: [true],
      partenaireId: ['']
    });
  }

  private async loadPartenaires(): Promise<void> {
    try {
      this.partenaires = await firstValueFrom(this.firebaseService.getPartenaires());
    } catch (error) {
      console.error('Erreur lors du chargement des partenaires:', error);
    }
  }

  private checkEditMode(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.utilisateurId = id;
        this.loadUtilisateur(id);
      }
    });
  }

  private async loadUtilisateur(id: string): Promise<void> {
    this.isLoading = true;
    try {
      const utilisateur = await this.firebaseService.getUtilisateurById(id);
      if (utilisateur) {
        // Mettre à jour le formulaire sans le mot de passe
        this.utilisateurForm.patchValue({
          email: utilisateur.email,
          nom: utilisateur.nom,
          prenom: utilisateur.prenom,
          telephone: utilisateur.telephone || '',
          role: utilisateur.role,
          estActif: utilisateur.estActif,
          partenaireId: utilisateur.partenaireId || ''
        });
        // Rendre l'email en lecture seule en mode édition
        this.utilisateurForm.get('email')?.disable();
      } else {
        this.errorMessage = 'Utilisateur non trouvé';
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'utilisateur:', error);
      this.errorMessage = 'Erreur lors du chargement de l\'utilisateur';
    } finally {
      this.isLoading = false;
    }
  }

  async onSubmit(): Promise<void> {
    if (this.utilisateurForm.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.utilisateurForm.controls).forEach(key => {
        const control = this.utilisateurForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    try {
      const formValues = this.utilisateurForm.getRawValue(); // Obtenir les valeurs même des champs désactivés

      if (this.isEditMode && this.utilisateurId) {
        // Mode édition
        const updateData: Partial<Utilisateur> = {
          nom: formValues.nom,
          prenom: formValues.prenom,
          telephone: formValues.telephone,
          role: formValues.role,
          estActif: formValues.estActif,
          partenaireId: formValues.partenaireId || null
        };

        // Ajouter le mot de passe s'il a été modifié
        if (formValues.password) {
          updateData.password = formValues.password;
        }

        await this.utilisateurService.mettreAJourUtilisateur(this.utilisateurId, updateData);
      } else {
        // Mode création
        await this.utilisateurService.creerUtilisateur({
          email: formValues.email,
          password: formValues.password,
          nom: formValues.nom,
          prenom: formValues.prenom,
          telephone: formValues.telephone,
          role: formValues.role,
          partenaireId: formValues.partenaireId || undefined
        });
      }

      // Rediriger vers la liste des utilisateurs
      this.router.navigate(['/utilisateurs/list']);
    } catch (error: any) {
      console.error('Erreur lors de l\'enregistrement:', error);
      this.errorMessage = error.message || 'Une erreur est survenue lors de l\'enregistrement';
    } finally {
      this.isSubmitting = false;
    }
  }

  onCancel(): void {
    this.router.navigate(['/utilisateurs/list']);
  }

  // Getters pour faciliter l'accès aux contrôles de formulaire dans le template
  get emailControl() { return this.utilisateurForm.get('email'); }
  get passwordControl() { return this.utilisateurForm.get('password'); }
  get nomControl() { return this.utilisateurForm.get('nom'); }
  get prenomControl() { return this.utilisateurForm.get('prenom'); }
  get telephoneControl() { return this.utilisateurForm.get('telephone'); }
  get roleControl() { return this.utilisateurForm.get('role'); }
  get estActifControl() { return this.utilisateurForm.get('estActif'); }
  get partenaireIdControl() { return this.utilisateurForm.get('partenaireId'); }

  getRoleLabel(role: ROLE_UTILISATEUR): string {
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
}

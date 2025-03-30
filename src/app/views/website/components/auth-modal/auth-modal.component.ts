import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthModalService, AuthModalType } from '@/app/core/services/auth-modal.service';
import { UtilisateurService } from '@/app/core/services/utilisateur.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { ROLE_UTILISATEUR } from '@/app/models/utilisateur.model';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgbNavModule],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.scss'
})
export class AuthModalComponent implements OnInit, OnDestroy {
  @Output() closeModal = new EventEmitter<void>();
  @Input() returnUrl: string = '/';

  activeTab = 1; // 1 = login, 2 = register, 3 = forgot password
  loginForm!: FormGroup;
  registerForm!: FormGroup;
  forgotPasswordForm!: FormGroup;

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  currentYear = new Date().getFullYear();

  private subscription = new Subscription();

  constructor(
    public activeModal: NgbActiveModal,
    private authModalService: AuthModalService,
    private fb: FormBuilder,
    private utilisateurService: UtilisateurService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.subscription.add(
      this.authModalService.modalType$.subscribe(type => {
        switch (type) {
          case AuthModalType.LOGIN:
            this.activeTab = 1;
            break;
          case AuthModalType.REGISTER:
            this.activeTab = 2;
            break;
          case AuthModalType.FORGOT_PASSWORD:
            this.activeTab = 3;
            break;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private initForms(): void {
    // Formulaire de connexion
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      rememberMe: [false]
    });

    // Formulaire d'inscription
    this.registerForm = this.fb.group({
      nom: ['', [Validators.required]],
      prenom: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validator: this.checkPasswords });

    // Formulaire de récupération de mot de passe
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  checkPasswords(group: FormGroup) {
    const pass = group.get('password')?.value;
    const confirmPass = group.get('confirmPassword')?.value;
    return pass === confirmPass ? null : { notMatching: true };
  }

  onTabChange(tabId: number): void {
    this.activeTab = tabId;
    this.errorMessage = '';
    this.successMessage = '';
  }

  async onLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const { email, password } = this.loginForm.value;
      await this.utilisateurService.connecter(email, password);

      // Fermer le modal
      this.activeModal.close('logged-in');

      // Rediriger si nécessaire
      if (this.returnUrl) {
        this.router.navigateByUrl(this.returnUrl);
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Erreur lors de la connexion';
    } finally {
      this.isLoading = false;
    }
  }

  async onRegister(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const formData = this.registerForm.value;

      // Soumettre une demande d'utilisateur partenaire
      await this.utilisateurService.soumettreDemandeUtilisateur({
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        telephone: formData.telephone,
        role: ROLE_UTILISATEUR.PERSONNEL, // Rôle personnel qui peut être partenaire
      }, formData.password); // Passer le mot de passe pour créer directement l'utilisateur

      this.successMessage = 'Votre compte a été créé avec succès et vous êtes désormais enregistré comme partenaire. Vous pouvez maintenant vous connecter.';
      this.registerForm.reset();

      // Basculer vers l'onglet de connexion après 3 secondes
      setTimeout(() => {
        this.activeTab = 1;
        this.successMessage = '';
      }, 3000);
    } catch (error: any) {
      this.errorMessage = error.message || 'Erreur lors de l\'inscription';
    } finally {
      this.isLoading = false;
    }
  }

  async onForgotPassword(): Promise<void> {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const { email } = this.forgotPasswordForm.value;

      // Simuler l'envoi d'un email de récupération
      // À remplacer par votre logique réelle
      setTimeout(() => {
        this.successMessage = 'Un email de réinitialisation a été envoyé à ' + email;
        this.forgotPasswordForm.reset();
      }, 1500);
    } catch (error: any) {
      this.errorMessage = error.message || 'Erreur lors de la demande de réinitialisation';
    } finally {
      this.isLoading = false;
    }
  }

  close(): void {
    this.activeModal.dismiss('cancel');
  }
}

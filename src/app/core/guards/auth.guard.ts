import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { UtilisateurService } from '../services/utilisateur.service';
import { ROLE_UTILISATEUR } from '@/app/models/utilisateur.model';

export const AuthGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);
  const utilisateurService = inject(UtilisateurService);

  if (!utilisateurService.estConnecte()) {
    // Rediriger vers la page de connexion avec l'URL d'origine en paramètre
    router.navigate(['/auth/log-in'], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  }

  // Vérifier les autorisations basées sur le rôle si spécifié dans les données de route
  const roleRequis = route.data['roleRequis'] as ROLE_UTILISATEUR | ROLE_UTILISATEUR[] | undefined;

  if (roleRequis) {
    const roleUtilisateur = utilisateurService.obtenirRoleUtilisateur();

    if (!roleUtilisateur) {
      router.navigate(['/auth/log-in']);
      return false;
    }

    if (Array.isArray(roleRequis)) {
      // Vérifier si le rôle de l'utilisateur est dans la liste des rôles autorisés
      if (!roleRequis.includes(roleUtilisateur)) {
        router.navigate(['/acces-refuse']);
        return false;
      }
    } else {
      // Vérifier si le rôle de l'utilisateur correspond au rôle requis
      if (roleUtilisateur !== roleRequis) {
        router.navigate(['/acces-refuse']);
        return false;
      }
    }
  }

  return true;
};

// Garde spécifique pour les administrateurs
export const AdminGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);
  const utilisateurService = inject(UtilisateurService);

  if (!utilisateurService.estConnecte() || !utilisateurService.estAdmin()) {
    router.navigate(['/acces-refuse']);
    return false;
  }

  return true;
};

// Garde spécifique pour le personnel
export const PersonnelGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);
  const utilisateurService = inject(UtilisateurService);

  if (!utilisateurService.estConnecte() || !utilisateurService.estPersonnel()) {
    router.navigate(['/acces-refuse']);
    return false;
  }

  return true;
};

// Garde spécifique pour les utilisateurs website
export const WebsiteGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);
  const utilisateurService = inject(UtilisateurService);

  if (!utilisateurService.estConnecte() || !utilisateurService.estWebsite()) {
    router.navigate(['/acces-refuse']);
    return false;
  }

  return true;
};

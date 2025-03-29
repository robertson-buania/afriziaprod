import { Routes } from '@angular/router';
import { UtilisateursListComponent } from './utilisateurs-list/utilisateurs-list.component';
import { UtilisateursFormComponent } from './utilisateurs-form/utilisateurs-form.component';
import { DemandesListComponent } from './demandes-list/demandes-list.component';
import { UtilisateurDetailComponent } from './utilisateur-detail/utilisateur-detail.component';
import { AdminGuard } from '@/app/core/guards/auth.guard';

export default [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    component: UtilisateursListComponent,
    title: 'Gestion des utilisateurs',
    canActivate: [AdminGuard]
  },
  {
    path: 'new',
    component: UtilisateursFormComponent,
    title: 'Nouvel utilisateur',
    canActivate: [AdminGuard]
  },
  {
    path: 'edit/:id',
    component: UtilisateursFormComponent,
    title: 'Modifier un utilisateur',
    canActivate: [AdminGuard]
  },
  {
    path: 'detail/:id',
    component: UtilisateurDetailComponent,
    title: 'Détails de l\'utilisateur',
    canActivate: [AdminGuard]
  },
  {
    path: 'demandes',
    component: DemandesListComponent,
    title: 'Demandes d\'accès',
    canActivate: [AdminGuard]
  }
] as Routes;

import { Route } from "@angular/router";
import { UtilisateursListComponent } from "./utilisateurs-list/utilisateurs-list.component";
import { UtilisateursFormComponent } from "./utilisateurs-form/utilisateurs-form.component";
import { DemandesListComponent } from "./demandes-list/demandes-list.component";
import { AdminGuard } from "@/app/core/guards/auth.guard";

export const UTILISATEURS_ROUTES: Route[] = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    component: UtilisateursListComponent,
    canActivate: [AdminGuard],
    data: { title: 'Liste des utilisateurs' }
  },
  {
    path: 'new',
    component: UtilisateursFormComponent,
    canActivate: [AdminGuard],
    data: { title: 'Nouvel utilisateur' }
  },
  {
    path: 'edit/:id',
    component: UtilisateursFormComponent,
    canActivate: [AdminGuard],
    data: { title: 'Modifier un utilisateur' }
  },
  {
    path: 'demandes',
    component: DemandesListComponent,
    canActivate: [AdminGuard],
    data: { title: 'Demandes d\'utilisateurs' }
  }
];

import { RedirectCommand, Router, Routes, UrlTree, Route } from '@angular/router'
import { LayoutComponent } from './layouts/layout/layout.component'
import { Error404Component } from './views/auth/error404/error404.component'
import { Error500Component } from './views/auth/error500/error500.component'
import { MaintenanceComponent } from './views/auth/maintenance/maintenance.component'
import { inject } from '@angular/core'
import { AuthenticationService } from './core/service/auth.service'
import { WEBSITE_ROUTES } from './views/website/website.routes'
import { AUTH_ROUTES } from './views/auth/auth.route'
import { AuthGuard } from './core/guards/auth.guard'

export const APP_ROUTES: Route[] = [
  // Routes du site web public
  ...WEBSITE_ROUTES,

  // Routes d'authentification
  {
    path: 'auth',
    children: AUTH_ROUTES
  },

  // Routes protégées (dashboard)
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./views/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES)
      },
      {
        path: 'facture',
        loadChildren: () => import('./views/facture/facture.routes').then(m => m.FACTURE_ROUTES)
      },
      {
        path: 'paiement',
        loadChildren: () => import('./views/paiement/paiement.routes').then(m => m.PAIEMENT_ROUTES)
      },
      {
        path: 'partenaires',
        loadChildren: () => import('./views/partenaires/partenaire.routes').then(m => m.PARTENAIRES_ROUTES)
      },
      {
        path: 'colis',
        loadChildren: () => import('./views/colis/colis.routes').then(m => m.COLIS_ROUTES)
      },
      {
        path: 'utilisateurs',
        loadChildren: () => import('./views/utilisateurs/utilisateurs.routes').then(m => m.UTILISATEURS_ROUTES)
      },
      {
        path: '',
        redirectTo: 'dashboard/analytics',
        pathMatch: 'full'
      }
    ]
  },

  {
    path: 'not-found',
    component: Error404Component,
    data: { title: '404 - Error' },
  },
  {
    path: 'error-500',
    component: Error500Component,
    data: { title: '500 - Error' },
  },
  {
    path: 'maintenance',
    component: MaintenanceComponent,
    data: { title: 'Maintenance' },
  },
  {
    path: '**',
    redirectTo: 'not-found'
  }
]

// Export routes to match what app.config.ts expects
export const routes = APP_ROUTES;

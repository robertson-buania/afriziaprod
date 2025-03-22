import { Route } from '@angular/router';
import { DashboardLayoutComponent } from '@/app/layouts/dashboard-layout/dashboard-layout.component';

export const DASHBOARD_ROUTES: Route[] = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      {
        path: 'analytics',
        loadComponent: () => import('./analytics/analytics.component').then(m => m.AnalyticsComponent),
        data: { title: 'Tableau de bord' }
      },
      {
        path: 'colis',
        loadComponent: () => import('../colis/colis-list/colis-list.component').then(m => m.ColisListComponent),
        data: { title: 'Colis en attente' }
      },
      {
        path: 'colis/facturation',
        loadComponent: () => import('../colis/colis-facturation-list/colis-facturation-list.component').then(m => m.ColisFacturationListComponent),
        data: { title: 'Colis à facturer' }
      },
      {
        path: 'colis/livraison',
        loadComponent: () => import('../colis/colis-livraison-list/colis-livraison-list.component').then(m => m.ColisLivraisonListComponent),
        data: { title: 'Colis à livrer' }
      },
      {
        path: 'colis/archives',
        loadComponent: () => import('../colis/colis-archives-list/colis-archives-list.component').then(m => m.ColisArchivesListComponent),
        data: { title: 'Archives des colis' }
      },
      {
        path: 'paiements',
        loadComponent: () => import('../paiement/paiement-list/paiement-list.component').then(m => m.PaiementListComponent),
        data: { title: 'Historique des paiements' }
      },
      {
        path: '',
        redirectTo: 'analytics',
        pathMatch: 'full'
      }
    ]
  }
];

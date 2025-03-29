import { Route } from '@angular/router';
import { WebsiteComponent } from './website.component';
import { WebsiteHomeComponent } from './components/website-home/website-home.component';

export const WEBSITE_ROUTES: Route[] = [
  {
    path: '',
    component: WebsiteComponent,
    children: [
      {
        path: '',
        component: WebsiteHomeComponent,
        data: { title: 'Accueil' }
      },
      {
        path: 'tracking',
        loadComponent: () =>
          import('./components/website-tracking/website-tracking.component')
            .then(m => m.WebsiteTrackingComponent),
        data: { title: 'Suivi de colis' }
      },
      {
        path: 'recherche-colis',
        loadComponent: () =>
          import('./recherche-colis/recherche-colis.component')
            .then(m => m.RechercheColisComponent),
        data: { title: 'Recherche de colis' }
      },
      {
        path: 'panier',
        loadComponent: () =>
          import('./panier/panier.component')
            .then(m => m.PanierComponent),
        data: { title: 'Mon panier' }
      },
      {
        path: 'paiement/:id',
        loadComponent: () =>
          import('./paiement-facture/paiement-facture.component')
            .then(m => m.PaiementFactureComponent),
        data: { title: 'Paiement de facture' }
      },
      {
        path: 'about',
        loadComponent: () =>
          import('./components/website-about/website-about.component')
            .then(m => m.WebsiteAboutComponent),
        data: { title: 'À propos' }
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./components/website-contact/website-contact.component')
            .then(m => m.WebsiteContactComponent),
        data: { title: 'Contact' }
      }
    ]
  }
];

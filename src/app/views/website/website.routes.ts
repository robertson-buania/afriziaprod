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

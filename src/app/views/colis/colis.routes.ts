
import { ColisListComponent } from "./colis-list/colis-list.component";
import { ColisFacturationListComponent } from "./colis-facturation-list/colis-facturation-list.component";
import { ColisLivraisonListComponent } from "./colis-livraison-list/colis-livraison-list.component";
import { ColisArchivesListComponent } from "./colis-archives-list/colis-archives-list.component";
import { ColisImportExcelComponent } from "./colis-import-excel/colis-import-excel.component";
import { ColisImportSacsComponent } from "./colis-import-sacs/colis-import-sacs.component";
import { path } from "ramda";
import { Component } from "@angular/core";
import { SacsListComponent } from "./colis-import-sacs/components/sacs-list/sacs-list.component";
import { Route } from "@angular/router";
import { ColisListeArriveComponent } from "./colis-liste-arrive/colis-liste-arrive.component";

export const COLIS_ROUTES: Route[] = [
  {
    path: '',
    redirectTo: 'verification',
    pathMatch: 'full'
  },
  {
    path: 'verification',
    component: ColisListComponent,
    data: { title: 'Colis en attente de vérification' }
  },
  {
    path: 'facturation',
    component: ColisFacturationListComponent,
    data: { title: 'Colis en attente de facturation' }
  },
  {
    path: 'livraison',
    component: ColisLivraisonListComponent,
    data: { title: 'Colis à livrer' }
  },
  {
    path: 'archive',
    component: ColisArchivesListComponent,
    data: { title: 'Colis archivés' }
  },
  {
    path: 'import-excel',
    component: ColisImportExcelComponent,
    data: { title: 'Importation de colis depuis Excel' }
  },
  {
    path: 'import-sacs',
    component: ColisImportSacsComponent,
    data: { title: 'Importation de colis arrivés' }
  },
  {
    path:"liste-arrive",
    component:ColisListeArriveComponent,
    data: { title: 'Sac colis arrivés' }
  }
];

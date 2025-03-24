import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColisImportSacsFormComponent } from './components/colis-import-sacs-form/colis-import-sacs-form.component';
import { SacsListComponent } from './components/sacs-list/sacs-list.component';
import { Sac } from '@/app/models/partenaire.model';

@Component({
  selector: 'app-colis-import-sacs',
  standalone: true,
  imports: [
    CommonModule,
    ColisImportSacsFormComponent,
    SacsListComponent
  ],
  templateUrl: './colis-import-sacs.component.html',
  styleUrl: './colis-import-sacs.component.scss'
})
export class ColisImportSacsComponent implements OnInit {
  sacs: Sac[] = [];

  constructor() {}

  ngOnInit(): void {
    // Initialize data
  }

  onSacsImported(newSacs: Sac[]): void {
    this.sacs = [...this.sacs, ...newSacs];
  }
}

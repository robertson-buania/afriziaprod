import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColisImportSacsFormComponent } from './components/colis-import-sacs-form/colis-import-sacs-form.component';

@Component({
  selector: 'app-colis-import-sacs',
  standalone: true,
  imports: [CommonModule, ColisImportSacsFormComponent],
  templateUrl: './colis-import-sacs.component.html',
  styleUrl: './colis-import-sacs.component.scss'
})
export class ColisImportSacsComponent {
  constructor() {}
}

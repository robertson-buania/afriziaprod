import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColisImportSacsFormComponent } from './components/colis-import-sacs-form/colis-import-sacs-form.component';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-colis-import-sacs',
  standalone: true,
  imports: [CommonModule, ColisImportSacsFormComponent],
  templateUrl: './colis-import-sacs.component.html',
  styleUrl: './colis-import-sacs.component.scss'
})
export class ColisImportSacsComponent {
  @ViewChild(ColisImportSacsFormComponent) formComponent!: ColisImportSacsFormComponent;

  constructor() {}

  // Method used by the can-deactivate guard
  canDeactivate(): Observable<boolean> | Promise<boolean> | boolean {
    // Delegate to the form component if it exists
    if (this.formComponent) {
      return this.formComponent.canDeactivate();
    }
    return true;
  }
}

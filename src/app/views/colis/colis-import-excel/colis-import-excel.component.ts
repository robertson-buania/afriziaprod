import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColisExcelImportFormComponent } from './components/colis-excel-import-form/colis-excel-import-form.component';

@Component({
  selector: 'app-colis-import-excel',
  standalone: true,
  imports: [CommonModule, ColisExcelImportFormComponent],
  templateUrl: './colis-import-excel.component.html',
  styleUrl: './colis-import-excel.component.scss'
})
export class ColisImportExcelComponent {
  constructor() {}
}

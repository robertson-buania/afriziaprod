import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColisArchivesTableComponent } from './components/colis-archives-table/colis-archives-table.component';

@Component({
  selector: 'app-colis-archives-list',
  standalone: true,
  imports: [CommonModule, ColisArchivesTableComponent],
  templateUrl: './colis-archives-list.component.html',
  styleUrl: './colis-archives-list.component.scss'
})
export class ColisArchivesListComponent {
  constructor() {}
}

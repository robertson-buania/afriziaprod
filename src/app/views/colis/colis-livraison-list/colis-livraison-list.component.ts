import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColisLivraisonTableComponent } from './components/colis-livraison-table/colis-livraison-table.component';

@Component({
  selector: 'app-colis-livraison-list',
  standalone: true,
  imports: [CommonModule, ColisLivraisonTableComponent],
  templateUrl: './colis-livraison-list.component.html',
  styleUrl: './colis-livraison-list.component.scss'
})
export class ColisLivraisonListComponent {
  constructor() {}
}

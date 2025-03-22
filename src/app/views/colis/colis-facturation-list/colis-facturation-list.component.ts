import { Component } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ColisFacturationTableComponent } from './components/colis-facturation-table/colis-facturation-table.component'
import { Router } from '@angular/router'

@Component({
  selector: 'app-colis-facturation-list',
  standalone: true,
  imports: [CommonModule, ColisFacturationTableComponent],
  templateUrl:"../colis-facturation-list/colis-facturation-list.component.html",
  styleUrl:"../colis-facturation-list/colis-facturation-list.component.scss"
})
export class ColisFacturationListComponent {
  constructor(private router: Router) {}

  onCreateFacture() {
    this.router.navigate(['/facture/new']);
  }
}

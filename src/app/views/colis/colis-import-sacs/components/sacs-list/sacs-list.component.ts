import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sac } from '@/app/models/partenaire.model';

@Component({
  selector: 'app-sacs-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mt-4">
      <h5 class="mb-3">Sacs importés</h5>
      <div class="table-responsive">
        <table class="table table-bordered table-hover">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Nombre de colis</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let sac of sacs">
              <td>{{ sac.reference }}</td>
              <td>{{ sac.colis.length }}</td>
              <td>
                <button class="btn btn-sm btn-primary" (click)="toggleColis(sac)">
                  {{ isExpanded(sac) ? 'Masquer' : 'Afficher' }} les colis
                </button>
              </td>
            </tr>
            <tr *ngIf="sacs.length === 0">
              <td colspan="3" class="text-center">Aucun sac importé</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Détails des colis -->
      <div *ngFor="let sac of sacs" class="mt-3" [class.d-none]="!isExpanded(sac)">
        <div class="card">
          <div class="card-header">
            <h6 class="mb-0">Colis du sac {{ sac.reference }}</h6>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Code Suivi</th>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Statut</th>
                    <th>Destination</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let colis of sac.colis">
                    <td>{{ colis.codeSuivi }}</td>
                    <td>{{ colis.clientNom }} {{ colis.clientPrenom }}</td>
                    <td>{{ colis.type }}</td>
                    <td>{{ colis.statut }}</td>
                    <td>{{ colis.destination }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SacsListComponent {
  @Input() sacs: Sac[] = [];
  private expandedSacs = new Set<string>();

  isExpanded(sac: Sac): boolean {
    return this.expandedSacs.has(sac.reference);
  }

  toggleColis(sac: Sac): void {
    if (this.isExpanded(sac)) {
      this.expandedSacs.delete(sac.reference);
    } else {
      this.expandedSacs.add(sac.reference);
    }
  }
} 
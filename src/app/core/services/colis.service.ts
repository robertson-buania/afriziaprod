import { Injectable } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { FirebaseService } from './firebase.service';
import { Colis, STATUT_COLIS } from '@/app/models/partenaire.model';

@Injectable({
  providedIn: 'root'
})
export class ColisService {
  constructor(private firebaseService: FirebaseService) {}

  getColis(): Observable<Colis[]> {
    return this.firebaseService.getColis();
  }

  getColisById(id: string): Promise<Colis | null> {
    return this.firebaseService.getColisById(id);
  }

  getColisByIds(ids: string[]): Observable<Colis[]> {
    return from(Promise.all(ids.map(id => this.getColisById(id))))
      .pipe(
        map(colisList => colisList.filter((colis): colis is Colis => colis !== null))
      );
  }

  createColis(colis: Omit<Colis, 'id'>): Promise<string> {
    return this.firebaseService.addColis({
      ...colis,
      statut: STATUT_COLIS.EN_ATTENTE_PAIEMENT
    });
  }

  updateColis(id: string, data: Partial<Colis>): Promise<void> {
    return this.firebaseService.updateColis(id, data);
  }

  deleteColis(id: string): Promise<void> {
    return this.firebaseService.deleteColis(id);
  }
}

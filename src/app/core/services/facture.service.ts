import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FirebaseService } from './firebase.service';
import { Facture } from '@/app/models/partenaire.model';

@Injectable({
  providedIn: 'root'
})
export class FactureService {
  constructor(private firebaseService: FirebaseService) {}

  getFacturesByUser(userId: string): Observable<Facture[]> {
    return this.firebaseService.getFacturesByPartenaire(userId);
  }

  getFactureById(id: string): Promise<Facture | null> {
    return this.firebaseService.getFactureById(id);
  }

  createFacture(facture: Omit<Facture, 'id'>): Promise<string> {
    return this.firebaseService.createFactureFromColis(facture);
  }

  updateFacture(id: string, data: Partial<Facture>): Promise<void> {
    return this.firebaseService.updateFacture(id, data);
  }
} 
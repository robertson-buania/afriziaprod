import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Partenaire } from '@/app/models/partenaire.model';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class PartenaireService {
  private partenairesSubject = new BehaviorSubject<Partenaire[]>([]);
  partenaires$ = this.partenairesSubject.asObservable();

  constructor(private firebaseService: FirebaseService) {
    this.loadPartenaires();
  }

  private loadPartenaires(): void {
    this.firebaseService.getPartenaires().subscribe(
      partenaires => this.partenairesSubject.next(partenaires),
      error => {
        console.error('Erreur lors du chargement des clients:', error);
        this.partenairesSubject.next([]);
      }
    );
  }

  getPartenaires(): Observable<Partenaire[]> {
    return this.partenaires$;
  }

  async addPartenaire(partenaire: Omit<Partenaire, 'id'>): Promise<void> {
    try {
      await this.firebaseService.addPartenaire(partenaire);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du client:', error);
      throw error;
    }
  }

  async updatePartenaire(partenaire: Partenaire): Promise<void> {
    try {
      await this.firebaseService.updatePartenaire(partenaire);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du client:', error);
      throw error;
    }
  }

  async deletePartenaire(id: string): Promise<void> {
    try {
      await this.firebaseService.deletePartenaire(id);
    } catch (error) {
      console.error('Erreur lors de la suppression du client:', error);
      throw error;
    }
  }

  getPartenaireById(id: string): Partenaire | undefined {
    const partenaires = this.partenairesSubject.getValue();
    return partenaires.find(p => p.id === id);
  }
}

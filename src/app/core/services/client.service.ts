import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Client } from '@/app/models/client.model';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private clientsSubject = new BehaviorSubject<Client[]>([]);
  clients$ = this.clientsSubject.asObservable();

  constructor(private firebaseService: FirebaseService) {
    this.loadClients();
  }

  private loadClients(): void {
    this.firebaseService.getClients().subscribe(
      clients => this.clientsSubject.next(clients),
      error => {
        console.error('Erreur lors du chargement des clients:', error);
        this.clientsSubject.next([]);
      }
    );
  }

  getClients(): Observable<Client[]> {
    return this.clients$;
  }

  async addClient(client: Omit<Client, 'id'>): Promise<string> {
    try {
      return await this.firebaseService.addClient(client);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du client:', error);
      throw error;
    }
  }

  async updateClient(client: Client): Promise<void> {
    try {
      await this.firebaseService.updateClient(client);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du client:', error);
      throw error;
    }
  }

  async deleteClient(id: string): Promise<void> {
    try {
      await this.firebaseService.deleteClient(id);
    } catch (error) {
      console.error('Erreur lors de la suppression du client:', error);
      throw error;
    }
  }

  async searchClients(searchTerm: string): Promise<Client[]> {
    try {
      return await this.firebaseService.searchClients(searchTerm);
    } catch (error) {
      console.error('Erreur lors de la recherche des clients:', error);
      return [];
    }
  }

  async getClientByEmail(email: string): Promise<Client | null> {
    try {
      return await this.firebaseService.getClientByEmail(email);
    } catch (error) {
      console.error('Erreur lors de la recherche du client par email:', error);
      return null;
    }
  }

  getClientById(id: string): Client | undefined {
    const clients = this.clientsSubject.getValue();
    return clients.find(c => c.id === id);
  }
}

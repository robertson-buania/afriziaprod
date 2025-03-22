import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  getDocs,
  DocumentData,
  QuerySnapshot,
  CollectionReference,
  addDoc,
  deleteDoc,
  collectionData,
  limit
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Colis, Facture, Partenaire, Paiement } from '@/app/models/partenaire.model';
import { Client } from '@/app/models/client.model';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  constructor(private firestore: Firestore) {}

  // Méthodes pour les partenaires
  getPartenaires(): Observable<Partenaire[]> {
    const colRef = collection(this.firestore, 'partenaires');
    return from(getDocs(colRef)).pipe(
      map((snapshot: QuerySnapshot<DocumentData>) => {
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Partenaire[];
      })
    );
  }

  async addPartenaire(partenaire: Omit<Partenaire, 'id'>): Promise<void> {
    const colRef = collection(this.firestore, 'partenaires');
    await addDoc(colRef, partenaire);
  }

  async updatePartenaire(partenaire: Partenaire): Promise<void> {
    if (!partenaire.id) throw new Error('ID du partenaire requis');
    const docRef = doc(this.firestore, 'partenaires', partenaire.id);
    const { id, ...data } = partenaire;
    await updateDoc(docRef, data as DocumentData);
  }

  async deletePartenaire(id: string): Promise<void> {
    const docRef = doc(this.firestore, 'partenaires', id);
    await deleteDoc(docRef);
  }

  async searchPartenaires(searchTerm: string): Promise<Partenaire[]> {
    const colRef = collection(this.firestore, 'partenaires');
    const snapshot = await getDocs(colRef);
    const partenaires = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Partenaire[];

    return partenaires.filter(p =>
      p.nom.toLowerCase().includes(searchTerm) ||
      p.email.toLowerCase().includes(searchTerm) ||
      String(p.telephone).includes(searchTerm)
    );
  }

  // Méthodes pour les colis
  getColis(): Observable<Colis[]> {
    const colRef = collection(this.firestore, 'colis');
    return from(getDocs(colRef)).pipe(
      map((snapshot: QuerySnapshot<DocumentData>) => {
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Colis[];
      })
    );
  }

  async addColis(colis: Omit<Colis, 'id'>): Promise<string> {
    const colRef = collection(this.firestore, 'colis');
    const docRef = await addDoc(colRef, colis);
    return docRef.id;
  }

  async updateColis(id: string, data: Partial<Colis>): Promise<void> {
    const docRef = doc(this.firestore, 'colis', id);
    await updateDoc(docRef, data as DocumentData);
  }

  async deleteColis(id: string): Promise<void> {
    const docRef = doc(this.firestore, 'colis', id);
    await deleteDoc(docRef);
  }

  // Méthodes pour les factures
  getFactures(): Observable<Facture[]> {
    const colRef = collection(this.firestore, 'factures');
    return from(getDocs(colRef)).pipe(
      map((snapshot: QuerySnapshot<DocumentData>) => {
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Facture[];
      })
    );
  }

  async createFacture(facture: Omit<Facture, 'id'> & { id?: string }): Promise<void> {
    const docRef = doc(this.firestore, 'factures', facture.id || String(Date.now()));
    await setDoc(docRef, {
      ...facture,
      paiements: facture.paiements || []
    } as DocumentData);
  }

  async updateFacture(id: string, data: Partial<Facture>): Promise<void> {
    const docRef = doc(this.firestore, 'factures', id);
    await updateDoc(docRef, data as DocumentData);
  }

  // Méthodes pour les paiements
  getPaiements(): Observable<Paiement[]> {
    const colRef = collection(this.firestore, 'paiements');
    return from(getDocs(colRef)).pipe(
      map((snapshot: QuerySnapshot<DocumentData>) => {
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Paiement[];
      })
    );
  }

  async addPaiement(paiement: Omit<Paiement, 'id'>): Promise<string> {
    const colRef = collection(this.firestore, 'paiements');
    const docRef = await addDoc(colRef, paiement);
    return docRef.id;
  }

  async updatePaiement(id: string, data: Partial<Paiement>): Promise<void> {
    const docRef = doc(this.firestore, 'paiements', id);
    await updateDoc(docRef, data as DocumentData);
  }

  async deletePaiement(id: string): Promise<void> {
    const docRef = doc(this.firestore, 'paiements', id);
    await deleteDoc(docRef);
  }

  getFacturesByPartenaire(partenaireId: string): Observable<Facture[]> {
    const colRef = collection(this.firestore, 'factures');
    const q = query(
      colRef,
      where('partenaireId', '==', partenaireId),
      orderBy('dateCreation', 'desc')
    );
    return from(getDocs(q)).pipe(
      map((snapshot: QuerySnapshot<DocumentData>) => {
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Facture[];
      })
    );
  }

  getColisByCode(codeSuivi: string): Observable<Colis | null> {
    const colisRef = collection(this.firestore, 'colis') as CollectionReference<Colis>;
    const q = query<Colis, DocumentData>(
      colisRef,
      where('codeSuivi', '==', codeSuivi),
      limit(1)
    );
    return collectionData<Colis>(q, { idField: 'id' }).pipe(
      map(colis => colis[0] || null)
    );
  }

  // Méthodes pour les clients
  getClients(): Observable<Client[]> {
    const colRef = collection(this.firestore, 'clients');
    return from(getDocs(colRef)).pipe(
      map((snapshot: QuerySnapshot<DocumentData>) => {
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Client[];
      })
    );
  }

  async addClient(client: Omit<Client, 'id'>): Promise<string> {
    const colRef = collection(this.firestore, 'clients');
    const docRef = await addDoc(colRef, {
      ...client,
      dateCreation: new Date().toISOString(),
      colis: []
    });
    return docRef.id;
  }

  async updateClient(client: Client): Promise<void> {
    if (!client.id) throw new Error('ID du client requis');
    const docRef = doc(this.firestore, 'clients', client.id);
    const { id, ...data } = client;
    await updateDoc(docRef, data as DocumentData);
  }

  async deleteClient(id: string): Promise<void> {
    const docRef = doc(this.firestore, 'clients', id);
    await deleteDoc(docRef);
  }

  async searchClients(searchTerm: string): Promise<Client[]> {
    const colRef = collection(this.firestore, 'clients');
    const snapshot = await getDocs(colRef);
    const clients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Client[];

    return clients.filter(c =>
      c.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(c.telephone).includes(searchTerm)
    );
  }

  async getClientByEmail(email: string): Promise<Client | null> {
    const colRef = collection(this.firestore, 'clients');
    const q = query(colRef, where('email', '==', email), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Client;
  }
}

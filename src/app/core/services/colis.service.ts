import { Injectable } from '@angular/core';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { Firestore } from '@angular/fire/firestore';
import { Colis, STATUT_COLIS, TYPE_COLIS } from '@/app/models/partenaire.model';

@Injectable({ providedIn: 'root' })
export class ColisService {
  private colisCollection = collection(this.firestore, 'colis');

  constructor(private firestore: Firestore) {}

  async getColis(): Promise<Colis[]> {
    const q = query(this.colisCollection, orderBy('dateCreation', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Colis[];
  }

  async addColis(colis: Omit<Colis, 'id'>): Promise<void> {
    await addDoc(this.colisCollection, {
      ...colis,
      dateCreation: new Date().toISOString(),
      statut: STATUT_COLIS.EN_ATTENTE_VERIFICATION
    });
  }

  async updateColis(colis: Colis): Promise<void> {
    if (!colis.id) throw new Error('ID du colis manquant');
    const docRef = doc(this.firestore, 'colis', colis.id);
    const { id, ...data } = colis;
    await updateDoc(docRef, data);
  }

  async deleteColis(id: string): Promise<void> {
    const docRef = doc(this.firestore, 'colis', id);
    await deleteDoc(docRef);
  }
}

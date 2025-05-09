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
  limit,
  getDoc
} from '@angular/fire/firestore';
import { Observable, from, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
import { Colis, Facture, Partenaire, Paiement, Sac, FactureStatus } from '@/app/models/partenaire.model';
import { Client } from '@/app/models/client.model';
import { Utilisateur, DemandeUtilisateur, TokenUtilisateur } from '@/app/models/utilisateur.model';

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
        return snapshot.docs.map((doc:any) => ({
          id: doc.id,
          ...doc.data()
        })) as Partenaire[];
      })
    );
  }

  async addPartenaire(partenaire: Omit<Partenaire, 'id'>): Promise<string> {
    const colRef = collection(this.firestore, 'partenaires');
    const docRef = await addDoc(colRef, {
      ...partenaire,
      factures: partenaire.factures || []
    });
    return docRef.id;
  }

  async getPartenaireByEmail(email: string): Promise<Partenaire | null> {
    if (!email) return null;
    const partenaireCollection = collection(this.firestore, 'partenaires');
    const q = query(partenaireCollection, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Partenaire;
    }
    return null;
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

  async getPartenaireById(id: string): Promise<Partenaire | null> {
    if (!id) return null;
    const docRef = doc(this.firestore, 'partenaires', id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Partenaire;
    }
    return null;
  }

  async searchPartenaires(searchTerm: string): Promise<Partenaire[]> {
    const colRef = collection(this.firestore, 'partenaires');
    const snapshot = await getDocs(colRef);
    const partenaires = snapshot.docs.map((doc:any) => ({
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
        return snapshot.docs.map((doc:any) => ({
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

  async getColisById(id: string): Promise<Colis | null> {
    if (!id) return null;
    const docRef = doc(this.firestore, 'colis', id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Colis;
    }
    return null;
  }

  async deleteColis(id: string): Promise<void> {
    const docRef = doc(this.firestore, 'colis', id);
    await deleteDoc(docRef);
  }

  // Méthode privée pour traiter une facture et convertir les IDs de colis en objets
  private async processFacture(facture: Facture): Promise<Facture> {
    const processedFacture = { ...facture };

    // Convertir les IDs de colis en objets
    if (facture.colis && facture.colis.length > 0) {
      const colisObjets: Colis[] = [];

      for (const colis of facture.colis) {
        if (typeof colis === 'string') {
          try {
            const colisObj = await this.getColisById(colis);
            if (colisObj) {
              colisObjets.push(colisObj);
            }
          } catch (error) {
            console.error(`Erreur lors du chargement du colis ${colis}:`, error);
          }
        } else {
          colisObjets.push(colis);
        }
      }

      processedFacture.colisObjets = colisObjets;
    } else {
      processedFacture.colisObjets = [];
    }

    return processedFacture;
  }

  // Méthodes pour les factures
  getFactures(): Observable<Facture[]> {
    const colRef = collection(this.firestore, 'factures');
    return from(getDocs(colRef)).pipe(
      map((snapshot: QuerySnapshot<DocumentData>) => {
        const factures = snapshot.docs.map((doc:any) => ({
          id: doc.id,
          ...doc.data()
        })) as Facture[];

        // Convertir les factures pour ajouter colisObjets
        return from(Promise.all(factures.map(facture => this.processFacture(facture))));
      }),
      switchMap(factures => factures)
    );
  }

  async createFacture(facture: Omit<Facture, 'id'> & { id?: string }): Promise<void> {
    const docRef = doc(this.firestore, 'factures', facture.id || String(Date.now()));
    await setDoc(docRef, {
      ...facture,
      paiements: facture.paiements || []
    } as DocumentData);
  }

  async createFactureFromColis(facture: Omit<Facture, 'id'>): Promise<string> {
    const factureId = String(Date.now());
    const docRef = doc(this.firestore, 'factures', factureId);
    await setDoc(docRef, {
      ...facture,
      paiements: facture.paiements || [],
      colis: facture.colis.map(colis => {
        if (typeof colis === 'string') return colis;
        return colis.id || null;
      }).filter(id => id !== null)
    } as DocumentData);
    return factureId;
  }

  async updateFacture(id: string, data: Partial<Facture>): Promise<void> {
    const docRef = doc(this.firestore, 'factures', id);
    await updateDoc(docRef, data as DocumentData);
  }

  async getFactureById(id: string): Promise<Facture | null> {
    if (!id) return null;
    const docRef = doc(this.firestore, 'factures', id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as Facture;
    }
    return null;
  }

  async updatePaiementByTransactionReference(transactionReference: string, data: Partial<Paiement>): Promise<void> {
    const colRef = collection(this.firestore, 'paiements');
    const q = query(colRef, where('transaction_reference', '==', transactionReference));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref; // Récupérer la référence du premier document trouvé
      await updateDoc(docRef, data as DocumentData); // Mettre à jour le document
    } else {
      console.error('Aucun paiement trouvé avec cette référence de transaction');
    }
  }

  // Méthodes pour les paiements
  getPaiements(): Observable<Paiement[]> {
    const colRef = collection(this.firestore, 'paiements');
    return from(getDocs(colRef)).pipe(
      map((snapshot: QuerySnapshot<DocumentData>) => {
        return snapshot.docs.map((doc:any) => ({
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

  async paiements_transactions_data(data:any){
    const colRef = collection(this.firestore, 'paiements_transactions_data');
    const docRef = await addDoc(colRef, data);
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
    console.log('Recherche des factures pour le partenaireId:', partenaireId);
    const colRef = collection(this.firestore, 'factures');
    const q = query(
      colRef,
      where('partenaireId', '==', partenaireId)
    );
    return from(getDocs(q)).pipe(
      map((snapshot: QuerySnapshot<DocumentData>) => {
        console.log('Nombre de documents trouvés:', snapshot.docs.length);
        const factures = snapshot.docs.map((doc:any) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data
          } as Facture;
        });

        // Trier les factures par date
        const sortedFactures = factures.sort((a: Facture, b: Facture): number => {
          if (!a.dateCreation && !b.dateCreation) return 0;
          if (!a.dateCreation) return 1;
          if (!b.dateCreation) return -1;

          const dateA = new Date(a.dateCreation).getTime();
          const dateB = new Date(b.dateCreation).getTime();

          return dateB - dateA;
        });

        // Convertir les factures pour ajouter colisObjets
        return from(Promise.all(sortedFactures.map(facture => this.processFacture(facture))));
      }),
      switchMap(factures => factures)
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
      map((colis:Colis[]) => colis[0] || null)
    );
  }

  // Méthodes pour les clients
  getClients(): Observable<Client[]> {
    const colRef = collection(this.firestore, 'clients');
    return from(getDocs(colRef)).pipe(
      map((snapshot: QuerySnapshot<DocumentData>) => {
        return snapshot.docs.map((doc:any) => ({
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
    const clients = snapshot.docs.map((doc:any) => ({
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

  // Méthodes pour les sacs
  getSacs(): Observable<Sac[]> {
    const colRef = collection(this.firestore, 'sacs');
    return from(getDocs(colRef)).pipe(
      map((snapshot: QuerySnapshot<DocumentData>) => {
        return snapshot.docs.map((doc:any) => ({
          id: doc.id,
          ...doc.data()
        })) as Sac[];
      })
    );
  }

  async addSac(sac: Omit<Sac, 'id'>): Promise<string> {
    const colRef = collection(this.firestore, 'sacs');
    const docRef = await addDoc(colRef, sac);
    return docRef.id;
  }

  async updateSac(id: string, data: Partial<Sac>): Promise<void> {
    const docRef = doc(this.firestore, 'sacs', id);
    await updateDoc(docRef, data as DocumentData);
  }

  async deleteSac(id: string): Promise<void> {
    const docRef = doc(this.firestore, 'sacs', id);
    await deleteDoc(docRef);
  }

  // ===== MÉTHODES UTILISATEURS =====
  getUtilisateurs(): Observable<Utilisateur[]> {
    const userCollection = collection(this.firestore, 'utilisateurs');
    return collectionData(userCollection, { idField: 'id' }) as Observable<Utilisateur[]>;
  }

  async getUtilisateurById(id: string): Promise<Utilisateur | null> {
    if (!id) return null;
    const userRef = doc(this.firestore, 'utilisateurs', id);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() } as Utilisateur;
    }
    return null;
  }

  async getUtilisateurByEmail(email: string): Promise<Utilisateur | null> {
    if (!email) return null;
    const userCollection = collection(this.firestore, 'utilisateurs');
    const q = query(userCollection, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Utilisateur;
    }
    return null;
  }

  async addUtilisateur(utilisateur: Omit<Utilisateur, 'id'>): Promise<string> {
    const userCollection = collection(this.firestore, 'utilisateurs');
    const docRef = await addDoc(userCollection, {
      ...utilisateur,
      dateCreation: new Date().toISOString(),
      estActif: true
    });
    return docRef.id;
  }

  async updateUtilisateur(id: string, data: Partial<Utilisateur>): Promise<void> {
    const userRef = doc(this.firestore, 'utilisateurs', id);
    await updateDoc(userRef, data);
  }

  async deleteUtilisateur(id: string): Promise<void> {
    const userRef = doc(this.firestore, 'utilisateurs', id);
    await deleteDoc(userRef);
  }

  // Gestion des demandes d'utilisateur
  getDemandesUtilisateurs(): Observable<DemandeUtilisateur[]> {
    const requestCollection = collection(this.firestore, 'demandesUtilisateurs');
    return collectionData(requestCollection, { idField: 'id' }) as Observable<DemandeUtilisateur[]>;
  }

  async addDemandeUtilisateur(demande: Omit<DemandeUtilisateur, 'id'>): Promise<string> {
    const requestCollection = collection(this.firestore, 'demandesUtilisateurs');
    const docRef = await addDoc(requestCollection, {
      ...demande,
      dateCreation: new Date().toISOString(),
      statut: 'en_attente'
    });
    return docRef.id;
  }

  async updateDemandeUtilisateur(id: string, data: Partial<DemandeUtilisateur>): Promise<void> {
    const requestRef = doc(this.firestore, 'demandesUtilisateurs', id);
    await updateDoc(requestRef, data);
  }

  async deleteDemandeUtilisateur(id: string): Promise<void> {
    const requestRef = doc(this.firestore, 'demandesUtilisateurs', id);
    await deleteDoc(requestRef);
  }

  // Gestion des tokens
  async addToken(token: Omit<TokenUtilisateur, 'id'>): Promise<string> {
    const tokenCollection = collection(this.firestore, 'tokens');
    const docRef = await addDoc(tokenCollection, token);
    return docRef.id;
  }

  async getTokenByValue(tokenValue: string): Promise<TokenUtilisateur | null> {
    if (!tokenValue) return null;
    const tokenCollection = collection(this.firestore, 'tokens');
    const q = query(tokenCollection, where('token', '==', tokenValue));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as TokenUtilisateur;
    }
    return null;
  }

  async updateToken(id: string, data: Partial<TokenUtilisateur>): Promise<void> {
    const tokenRef = doc(this.firestore, 'tokens', id);
    await updateDoc(tokenRef, data);
  }

  /**
   * Ajoute un paiement à une facture
   * @param factureId ID de la facture
   * @param paiement Objet de paiement à ajouter
   */
  async addPaiementToFacture(factureId: string, paiement: Paiement): Promise<void> {
    try {
      // Récupérer la référence de la facture
      const factureRef = doc(this.firestore, 'factures', factureId);
      const factureDoc = await getDoc(factureRef);

      if (!factureDoc.exists()) {
        throw new Error(`Facture avec ID ${factureId} non trouvée`);
      }

      const factureData = factureDoc.data() as Facture;

      // Ajouter le nouveau paiement à la liste des paiements
      const paiements = factureData.paiements || [];
      paiements.push(paiement);

      // Mettre à jour le montant total payé
      const montantPaye = paiements.reduce((total, p) => total + (p.montant_paye || 0), 0);

      // Déterminer le statut de la facture
      let statut = FactureStatus.EN_ATTENTE;
      if (montantPaye >= factureData.montant) {
        statut = FactureStatus.PAYEE;
      } else if (montantPaye > 0) {
        statut = FactureStatus.PARTIELLEMENT_PAYEE;
      }

      // Mettre à jour la facture
      await updateDoc(factureRef, {
        paiements: paiements,
        montantPaye: montantPaye,
        statut: statut
      });

      console.log(`Paiement ${paiement.id} ajouté à la facture ${factureId}`);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du paiement à la facture:', error);
      throw error;
    }
  }
}

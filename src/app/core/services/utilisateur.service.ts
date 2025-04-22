import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { FirebaseService } from './firebase.service';
import { Utilisateur, DemandeUtilisateur, ROLE_UTILISATEUR } from '@/app/models/utilisateur.model';
import { Router } from '@angular/router';
import { Partenaire } from '@/app/models/partenaire.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UtilisateurService {
  private utilisateurCourantSubject = new BehaviorSubject<Utilisateur | null>(null);
  utilisateurCourant$ = this.utilisateurCourantSubject.asObservable();

  constructor(
    private firebaseService: FirebaseService,
    private router: Router,
    private authService: AuthService
  ) {
    // Vérifier si un utilisateur est déjà connecté (stocké en localStorage)
    this.restaurerSessionUtilisateur();
  }

  private restaurerSessionUtilisateur(): void {
    const utilisateurStocke = localStorage.getItem('utilisateur_courant');
    if (utilisateurStocke) {
      try {
        const utilisateur = JSON.parse(utilisateurStocke) as Utilisateur;
        this.utilisateurCourantSubject.next(utilisateur);

        // Mettre à jour les informations de l'utilisateur au démarrage
        this.rafraichirInformationsUtilisateur(utilisateur.id!).subscribe();
      } catch (error) {
        console.error('Erreur lors de la restauration de la session utilisateur:', error);
        localStorage.removeItem('utilisateur_courant');
      }
    }
  }

  private rafraichirInformationsUtilisateur(userId: string): Observable<Utilisateur | null> {
    return from(this.firebaseService.getUtilisateurById(userId)).pipe(
      tap(utilisateur => {
        if (utilisateur) {
          this.utilisateurCourantSubject.next(utilisateur);
          localStorage.setItem('utilisateur_courant', JSON.stringify(utilisateur));
        } else {
          // L'utilisateur n'existe plus
          this.deconnecter();
        }
      })
    );
  }

  async connecter(email: string, password: string): Promise<Utilisateur> {
    try {
      // Dans une véritable application, vous utiliseriez Firebase Auth
      // Ici, nous simulons une authentification simple
      const utilisateur = await this.firebaseService.getUtilisateurByEmail(email);

      if (!utilisateur) {
        throw new Error('Utilisateur non trouvé');
      }

      // Vérification du mot de passe (à remplacer par une vérification sécurisée)
      // En production, utilisez Firebase Authentication ou un autre système d'authentification sécurisé
      if (utilisateur.password !== password) {
        throw new Error('Mot de passe incorrect');
      }

      if (!utilisateur.estActif) {
        throw new Error('Compte désactivé');
      }

      // Mettre à jour la dernière connexion
      await this.firebaseService.updateUtilisateur(utilisateur.id!, {
        derniereConnexion: new Date().toISOString()
      });

      // Récupérer les informations complètes de l'utilisateur
      let utilisateurComplet = await this.firebaseService.getUtilisateurById(utilisateur.id!);
      if (!utilisateurComplet) {
        throw new Error('Erreur lors de la récupération des données utilisateur');
      }

      // Si l'utilisateur est associé à un partenaire, récupérer les informations du partenaire
      if (utilisateurComplet.partenaireId) {
        const partenaire = await this.firebaseService.getPartenaireById(utilisateurComplet.partenaireId);
        if (partenaire) {
          utilisateurComplet = {
            ...utilisateurComplet,
            partenaire
          };
        }
      }

      this.utilisateurCourantSubject.next(utilisateurComplet);
      localStorage.setItem('utilisateur_courant', JSON.stringify(utilisateurComplet));

      return utilisateurComplet;
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      throw error;
    }
  }

  deconnecter(): void {
    this.utilisateurCourantSubject.next(null);
    localStorage.removeItem('utilisateur_courant');
    this.router.navigate(['/']);
  }

  estConnecte(): boolean {
    return !!this.utilisateurCourantSubject.value;
  }

  obtenirRoleUtilisateur(): ROLE_UTILISATEUR | null {
    const utilisateur = this.utilisateurCourantSubject.value;
    return utilisateur ? utilisateur.role : null;
  }

  estAdmin(): boolean {
    return this.obtenirRoleUtilisateur() === ROLE_UTILISATEUR.ADMINISTRATEUR;
  }

  estPersonnel(): boolean {
    return this.obtenirRoleUtilisateur() === ROLE_UTILISATEUR.PERSONNEL;
  }

  estWebsite(): boolean {
    return this.obtenirRoleUtilisateur() === ROLE_UTILISATEUR.WEBSITE;
  }

  getUtilisateurs(): Observable<Utilisateur[]> {
    return this.firebaseService.getUtilisateurs().pipe(
      // Enrichir les utilisateurs avec les données de partenaire si nécessaire
      switchMap(utilisateurs => {
        const partenaireIds = utilisateurs
          .filter(u => u.partenaireId)
          .map(u => u.partenaireId!);

        if (partenaireIds.length === 0) {
          return of(utilisateurs);
        }

        return this.firebaseService.getPartenaires().pipe(
          map(partenaires => {
            const partenaireMap = new Map<string, Partenaire>();
            partenaires.forEach(p => {
              if (p.id) partenaireMap.set(p.id, p);
            });

            return utilisateurs.map(u => {
              if (u.partenaireId && partenaireMap.has(u.partenaireId)) {
                return {
                  ...u,
                  partenaire: partenaireMap.get(u.partenaireId)
                };
              }
              return u;
            });
          })
        );
      })
    );
  }

  async creerUtilisateur(utilisateur: Omit<Utilisateur, 'id' | 'dateCreation' | 'estActif'>): Promise<string> {
    try {
      // Vérifier si l'e-mail existe déjà
      const utilisateurExistant = await this.firebaseService.getUtilisateurByEmail(utilisateur.email);
      if (utilisateurExistant) {
        throw new Error('Cette adresse e-mail est déjà utilisée');
      }

      // Créer le nouvel utilisateur
      const id = await this.firebaseService.addUtilisateur({
        ...utilisateur,
        dateCreation: new Date().toISOString(),
        estActif: true
      });

      return id;
    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur:', error);
      throw error;
    }
  }

  async soumettreDemandeUtilisateur(demande: Omit<DemandeUtilisateur, 'id' | 'dateCreation' | 'statut'>, password?: string): Promise<string> {
    try {
      // Vérifier si l'e-mail existe déjà
      const utilisateurExistant = await this.firebaseService.getUtilisateurByEmail(demande.email);
      if (utilisateurExistant) {
        throw new Error('Cette adresse e-mail est déjà utilisée');
      }

      // Vérifier si un partenaire existe déjà avec cet e-mail
      const partenaireExistant = await this.firebaseService.getPartenaireByEmail(demande.email);
      if (partenaireExistant) {
        throw new Error('Cette adresse e-mail est déjà utilisée par un partenaire');
      }

      // Créer la demande
      const id = await this.firebaseService.addDemandeUtilisateur({
        ...demande,
        dateCreation: new Date().toISOString(),
        statut: 'en_attente'
      });

      // Dans cette version simplifiée, nous créons aussi l'utilisateur et le partenaire immédiatement
      if (password) {
        // 1. Créer le partenaire
        const partenaireId = await this.firebaseService.addPartenaire({
          nom: demande.nom,
          prenom: demande.prenom,
          postnom: '', // Champ obligatoire, à remplir plus tard par l'utilisateur
          telephone: Number(demande.telephone) || 0,
          email: demande.email,
          adresse: '',
          factures: []
        });

        // 2. Créer l'utilisateur lié au partenaire
        await this.creerUtilisateur({
          email: demande.email,
          nom: demande.nom,
          prenom: demande.prenom,
          telephone: demande.telephone,
          role: demande.role,
          password: password,
          partenaireId: partenaireId // Lier l'utilisateur au partenaire
        });
      }

      return id;
    } catch (error) {
      console.error('Erreur lors de la soumission de la demande:', error);
      throw error;
    }
  }

  getDemandesUtilisateurs(): Observable<DemandeUtilisateur[]> {
    return this.firebaseService.getDemandesUtilisateurs();
  }

  async approuverDemande(demandeId: string): Promise<string> {
    try {
      // Récupérer la demande
      const demandes = await this.firebaseService.getDemandesUtilisateurs().pipe(
        take(1)
      ).toPromise();

      const demande = demandes?.find(d => d.id === demandeId);
      if (!demande) {
        throw new Error('Demande non trouvée');
      }

      // Mettre à jour le statut de la demande
      await this.firebaseService.updateDemandeUtilisateur(demandeId, {
        statut: 'approuvee'
      });

      // Créer l'utilisateur
      const userId = await this.creerUtilisateur({
        email: demande.email,
        nom: demande.nom,
        prenom: demande.prenom,
        telephone: demande.telephone,
        role: demande.role,
        // Générer un mot de passe temporaire
        password: Math.random().toString(36).slice(-8)
      });

      return userId;
    } catch (error) {
      console.error('Erreur lors de l\'approbation de la demande:', error);
      throw error;
    }
  }

  async rejeterDemande(demandeId: string, message?: string): Promise<void> {
    try {
      await this.firebaseService.updateDemandeUtilisateur(demandeId, {
        statut: 'rejetee',
        message
      });
    } catch (error) {
      console.error('Erreur lors du rejet de la demande:', error);
      throw error;
    }
  }

  /**
   * Met à jour simultanément les informations d'un utilisateur et du partenaire associé
   * @param utilisateurId ID de l'utilisateur à mettre à jour
   * @param partenaireId ID du partenaire à mettre à jour (optionnel)
   * @param donnees Les données à mettre à jour
   * @returns Promise résolu lorsque les mises à jour sont terminées
   */
  async mettreAJourProfilUtilisateur(
    utilisateurId: string,
    donnees: {
      nom: string;
      prenom: string;
      email: string;
      telephone: string;
      adresse?: string;
    },
    partenaireId?: string
  ): Promise<void> {
    try {
      // Mise à jour des informations de l'utilisateur
      const donneesUtilisateur = {
        nom: donnees.nom,
        prenom: donnees.prenom,
        email: donnees.email,
        telephone: donnees.telephone,
      };

      await this.firebaseService.updateUtilisateur(utilisateurId, donneesUtilisateur);

      // Si l'utilisateur est lié à un partenaire, mettre à jour celui-ci également
      if (partenaireId) {
        const partenaire = await this.firebaseService.getPartenaireById(partenaireId);
        if (partenaire) {
          const donneesPartenaire: Partenaire = {
            ...partenaire,
            nom: donnees.nom,
            prenom: donnees.prenom,
            email: donnees.email,
            telephone: Number(donnees.telephone) || 0
          };

          if (donnees.adresse !== undefined) {
            donneesPartenaire.adresse = donnees.adresse;
          }

          await this.firebaseService.updatePartenaire(donneesPartenaire);
        }
      }

      // Rafraîchir les informations de l'utilisateur courant si nécessaire
      const utilisateurCourant = this.utilisateurCourantSubject.value;
      if (utilisateurCourant && utilisateurCourant.id === utilisateurId) {
        this.rafraichirInformationsUtilisateur(utilisateurId).subscribe();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil utilisateur:', error);
      throw error;
    }
  }

  async mettreAJourUtilisateur(id: string, data: Partial<Utilisateur>): Promise<void> {
    try {
      await this.firebaseService.updateUtilisateur(id, data);

      // Si l'utilisateur courant est mis à jour, mettre à jour le sujet
      const utilisateurCourant = this.utilisateurCourantSubject.value;
      if (utilisateurCourant && utilisateurCourant.id === id) {
        this.rafraichirInformationsUtilisateur(id).subscribe();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
      throw error;
    }
  }

  async supprimerUtilisateur(id: string): Promise<void> {
    try {
      await this.firebaseService.deleteUtilisateur(id);

      // Si l'utilisateur courant est supprimé, le déconnecter
      const utilisateurCourant = this.utilisateurCourantSubject.value;
      if (utilisateurCourant && utilisateurCourant.id === id) {
        this.deconnecter();
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      throw error;
    }
  }

  /**
   * Récupère l'utilisateur actuellement connecté avec toutes ses informations
   * @returns Promesse résolvant l'utilisateur ou null si non connecté
   */
  async getCurrentUser(): Promise<any | null> {
    try {
      const user = await this.authService.getCurrentUser();

      if (!user || !user.uid) {
        return null;
      }

      // Récupérer les informations détaillées de l'utilisateur depuis Firestore
      const userDoc = await this.firebaseService.getUtilisateurById(user.uid);

      if (!userDoc) {
        throw new Error('Utilisateur connecté mais données non trouvées');
      }

      return userDoc;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur actuel:', error);
      return null;
    }
  }
}

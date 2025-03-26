import { Partenaire } from './partenaire.model';

export enum ROLE_UTILISATEUR {
  WEBSITE = 'website',
  ADMINISTRATEUR = 'administrateur',
  PERSONNEL = 'personnel'
}

export interface Utilisateur {
  id?: string;
  email: string;
  password?: string;
  nom: string;
  prenom: string;
  telephone?: string;
  role: ROLE_UTILISATEUR;
  dateCreation: string;
  derniereConnexion?: string;
  estActif: boolean;
  // Relation avec un client ou un partenaire
  partenaireId?: string;
  partenaire?: Partenaire;
  // Paramètres supplémentaires
  preferences?: {
    themeMode?: 'light' | 'dark';
    langue?: string;
    notificationsActives?: boolean;
  };
}

// Interface pour les demandes de création d'utilisateur
export interface DemandeUtilisateur {
  id?: string;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string;
  role: ROLE_UTILISATEUR;
  dateCreation: string;
  statut: 'en_attente' | 'approuvee' | 'rejetee';
  message?: string;
}

// Interface pour les tokens d'authentification et réinitialisation
export interface TokenUtilisateur {
  id?: string;
  utilisateurId: string;
  token: string;
  type: 'authentification' | 'reinitialisation';
  dateCreation: string;
  dateExpiration: string;
  estUtilise: boolean;
}

export interface Client {
  id?: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: number;
  adresse?: string;
  dateCreation?: string;
  colis?: string[]; // IDs des colis associés
}

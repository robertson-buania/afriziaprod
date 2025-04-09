export interface Partenaire{
  id?:string
  nom:string
  prenom:string,
  postnom:string
  telephone:number
  adresse?:string
  email:string
  factures:Facture[]

}

export interface Facture{
  id?:string
  montant:number
  montantPaye:number
  colis:(Colis | string)[]
  colisObjets?:Colis[]
  paiements:Paiement[]
  dateCreation?: string
  partenaireId?: string
}


export interface Colis{
  id?:string
  type:TYPE_COLIS,
  partenaireId: string
  clientNom: string
  clientPrenom: string
  clientTelephone: number
  clientEmail: string
  statut: STATUT_COLIS,
  typeExpedition: TYPE_EXPEDITION,
  description?:string,
  poids?:number
  cout?:number
  dateCreation?: string
  codeSuivi: string
  nombreUnites?: number
  codeexpedition:string,
  destinataire:string,
  destination:string,
  quantite:string,
  nature:string,
  transporteur:string
}

export interface Sac{
  id?:string,
  reference:string,
  colis:Colis[],
  dateCreation?: string
}

export interface Paiement{
  id?:string
  typepaiement:TYPE_PAIEMENT,
  montant_paye:number,
  facture_reference?:string,
  id_facture?:string,
  datepaiement:Date
}

export enum TYPE_COLIS{
  ORDINAIRE,
  AVEC_BATTERIE,
  ORDINATEUR,
  TELEPHONE
}

export enum  TYPE_PAIEMENT{

  ESPECE,
  CARTE,
  MPESA,
  ORANGE_MONEY
}

export enum STATUT_COLIS{
  EN_ATTENTE_VERIFICATION,//0
  EN_ATTENTE_FACTURATION,//1
  EN_ATTENTE_PAIEMENT,//1
  EN_ATTENTE_LIVRAISON,//3
  EN_COURS_EXPEDITION,//2
  COLIS_ARRIVE,//5
  LIVRE,//6
  ANNULE//7
}

export enum STATUT_COLIS1{

  EN_ATTENTE_PAIEMENT,//1
  EN_ATTENTE_LIVRAISON,//3
  EN_COURS_EXPEDITION,//2
  COLIS_ARRIVE,//5
  LIVRE,//6
  ANNULE//7
}

export enum TYPE_EXPEDITION{
  EXPRESS,
  STANDARD
}

// Paramétrage des tarifs de colis en fonction de l'expédition et du type de colis
export const PARAMETRAGE_COLIS: Record<TYPE_EXPEDITION, Record<TYPE_COLIS, { prixParKilo: number; prixUnitaire?: number }>> = {
  [TYPE_EXPEDITION.EXPRESS]: {
    [TYPE_COLIS.ORDINAIRE]: { prixParKilo: 18, prixUnitaire: 0 },
    [TYPE_COLIS.AVEC_BATTERIE]: { prixParKilo: 20 , prixUnitaire: 0},
    [TYPE_COLIS.ORDINATEUR]: { prixParKilo: 20, prixUnitaire: 30 },
    [TYPE_COLIS.TELEPHONE]: { prixParKilo: 20, prixUnitaire: 10 },
  },
  [TYPE_EXPEDITION.STANDARD]: {
    [TYPE_COLIS.ORDINAIRE]: { prixParKilo: 17, prixUnitaire: 0 },
    [TYPE_COLIS.AVEC_BATTERIE]: { prixParKilo: 20, prixUnitaire: 0 },
    [TYPE_COLIS.ORDINATEUR]: { prixParKilo: 20, prixUnitaire: 30 },
    [TYPE_COLIS.TELEPHONE]: { prixParKilo: 20, prixUnitaire: 10 },
  }

};

import { Partenaire, TYPE_COLIS, TYPE_PAIEMENT } from '@/app/models/partenaire.model';

export const PartenaireData: Partenaire[] = [
  {
    id: '1',
    nom: 'Mutombo',
    prenom: 'Jean',
    postnom: 'Pierre',
    telephone: 243812345678,
    email: 'jean.mutombo@email.com',
    adresse: 'Avenue du 30 Juin, Kinshasa',
    factures: [
      {
        id: 'F1',
        montant: 250,
        colis: [
          {
            id: 'C1',
            type: TYPE_COLIS.TELEPHONE,
            description: 'iPhone 13',
            poids: 0.5,
            cout: 150
          }
        ],
        paiements: [
          {
            id: 'P1',
            typepaiement: TYPE_PAIEMENT.MPESA,
            montant_paye: 150,
            datepaiement: new Date('2024-03-10')
          }
        ]
      }
    ]
  },
  {
    id: '2',
    nom: 'Kabongo',
    prenom: 'Marie',
    postnom: 'Claire',
    telephone: 243823456789,
    email: 'marie.kabongo@email.com',
    adresse: 'Boulevard Lumumba, Lubumbashi',
    factures: [
      {
        id: 'F2',
        montant: 500,
        colis: [
          {
            id: 'C2',
            type: TYPE_COLIS.ORDINATEUR,
            description: 'MacBook Pro',
            poids: 2.5,
            cout: 300
          }
        ],
        paiements: [
          {
            id: 'P2',
            typepaiement: TYPE_PAIEMENT.ORANGE_MONEY,
            montant_paye: 300,
            datepaiement: new Date('2024-03-12')
          }
        ]
      }
    ]
  },
  {
    id: '3',
    nom: 'Lukusa',
    prenom: 'David',
    postnom: 'Paul',
    telephone: 243834567890,
    email: 'david.lukusa@email.com',
    adresse: 'Avenue des Poids Lourds, Goma',
    factures: [
      {
        id: 'F3',
        montant: 180,
        colis: [
          {
            id: 'C3',
            type: TYPE_COLIS.SIMPLE,
            description: 'Documents',
            poids: 1.0,
            cout: 100
          }
        ],
        paiements: [
          {
            id: 'P3',
            typepaiement: TYPE_PAIEMENT.ESPECE,
            montant_paye: 100,
            datepaiement: new Date('2024-03-15')
          }
        ]
      }
    ]
  }
];

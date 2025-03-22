import { TYPE_COLIS, TYPE_EXPEDITION } from '@/app/models/partenaire.model';

interface PrixParType {
  prixParKilo: number;
  prixParUnite?: number;
}

interface ConfigurationPrix {
  [TYPE_EXPEDITION.STANDARD]: {
    [key: number]: PrixParType;
  };
  [TYPE_EXPEDITION.EXPRESS]: {
    [key: number]: PrixParType;
  };
}

export const CONFIGURATION_PRIX: ConfigurationPrix = {
  [TYPE_EXPEDITION.STANDARD]: {
    [TYPE_COLIS.ORDINAIRE]: {
      prixParKilo: 17,
      prixParUnite: 0
    },
    [TYPE_COLIS.AVEC_BATTERIE]: {
      prixParKilo: 20,
      prixParUnite: 0
    },
    [TYPE_COLIS.ORDINATEUR]: {
      prixParKilo: 20,
      prixParUnite: 30
    },
    [TYPE_COLIS.TELEPHONE]: {
      prixParKilo: 20,
      prixParUnite: 10
    }
  },
  [TYPE_EXPEDITION.EXPRESS]: {
    [TYPE_COLIS.ORDINAIRE]: {
      prixParKilo: 18,
      prixParUnite: 0
    },
    [TYPE_COLIS.AVEC_BATTERIE]: {
      prixParKilo: 20,
      prixParUnite: 0
    },
    [TYPE_COLIS.ORDINATEUR]: {
      prixParKilo: 20,
      prixParUnite: 30
    },
    [TYPE_COLIS.TELEPHONE]: {
      prixParKilo: 20,
      prixParUnite: 10
    }
  }
};

export function calculerPrixColis(
  typeExpedition: TYPE_EXPEDITION,
  typeColis: TYPE_COLIS,
  poids: number,
  nombreUnites?: number
): number {
  const config = CONFIGURATION_PRIX[typeExpedition][typeColis];
  const prixPoids = config.prixParKilo * poids;

  if (config.prixParUnite && nombreUnites) {
    return prixPoids + (config.prixParUnite * nombreUnites);
  }

  return prixPoids;
}

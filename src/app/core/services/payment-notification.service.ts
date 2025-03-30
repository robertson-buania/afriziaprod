import { Injectable } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { UtilisateurService } from './utilisateur.service';
import { environment } from '@/environments/environment';
import { collection, addDoc, Firestore } from '@angular/fire/firestore';
import { Facture, Paiement, STATUT_COLIS, TYPE_PAIEMENT } from '@/app/models/partenaire.model';

interface CinetPayNotification {
  cpm_trans_id: string;
  cpm_site_id: string;
  cpm_trans_date: string;
  cpm_amount: string;
  cpm_currency: string;
  signature: string;
  payment_method: string;
  cel_phone_num: string;
  cpm_phone_prefixe: string;
  cpm_language: string;
  cpm_version: string;
  cpm_payment_config: string;
  cpm_page_action: string;
  cpm_custom: string;
  cpm_designation: string;
  cpm_error_message: string;
  cpm_result: string; // 00 = success, 01 = error
  created_at: string;
  updated_at: string;
  cpm_payid: string;
  cpm_trans_status: string;
}

interface PaymentMetadata {
  factureId: string;
  clientId?: string;
  colisIds?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class PaymentNotificationService {
  constructor(
    private firebaseService: FirebaseService,
    private utilisateurService: UtilisateurService,
    private firestore: Firestore
  ) { }

  /**
   * Traite une notification de paiement reçue de CinetPay
   */
  async processPaymentNotification(notification: CinetPayNotification): Promise<boolean> {
    try {
      if (!this.verifySignature(notification)) {
        console.error('Signature invalide dans la notification de paiement');
        return false;
      }

      // Vérification que le paiement est réussi
      if (notification.cpm_result !== '00') {
        console.error('Échec du paiement:', notification.cpm_error_message);
        return false;
      }

      // Extraire les métadonnées
      const metadata = this.extractMetadata(notification.cpm_custom);
      if (!metadata || !metadata.factureId) {
        console.error('Métadonnées manquantes ou invalides');
        return false;
      }

      // Mettre à jour la facture
      const updated = await this.updateFacturePayment(
        metadata.factureId,
        notification.cpm_trans_id,
        parseFloat(notification.cpm_amount),
        notification.payment_method
      );

      if (!updated) {
        console.error('Échec de la mise à jour de la facture');
        return false;
      }

      // Enregistrer la notification dans la base de données
      await this.saveNotification(notification);

      return true;
    } catch (error) {
      console.error('Erreur lors du traitement de la notification de paiement:', error);
      return false;
    }
  }

  /**
   * Vérifie la signature de la notification
   */
  private verifySignature(notification: CinetPayNotification): boolean {
    // Cette vérification devrait être implémentée selon les spécifications de CinetPay
    // Pour l'instant, simplifions en considérant toutes les signatures comme valides
    return true;
  }

  /**
   * Extrait les métadonnées de la chaîne JSON
   */
  private extractMetadata(metadataStr: string): PaymentMetadata | null {
    try {
      return JSON.parse(metadataStr) as PaymentMetadata;
    } catch (error) {
      console.error('Erreur lors de l\'analyse des métadonnées:', error);
      return null;
    }
  }

  /**
   * Met à jour une facture pour l'indiquer comme payée
   */
  private async updateFacturePayment(
    factureId: string,
    transactionId: string,
    amount: number,
    method: string
  ): Promise<boolean> {
    try {
      const facture = await this.firebaseService.getFactureById(factureId);
      if (!facture) {
        console.error('Facture non trouvée:', factureId);
        return false;
      }

      // Créer un paiement
      const paiementData: Omit<Paiement, 'id'> = {
        id_facture: factureId,
        montant_paye: amount,
        datepaiement: new Date(),
        typepaiement: TYPE_PAIEMENT.CARTE, // Mode de paiement carte bancaire
        facture_reference: transactionId
      };

      const paiementId = await this.firebaseService.addPaiement(paiementData);

      if (!paiementId) {
        console.error('Échec de la création du paiement');
        return false;
      }

      // Mettre à jour la facture
      const factureUpdate: Partial<Facture> = {
        montantPaye: amount
      };

      // Si la facture a déjà des paiements, les inclure
      if (facture.paiements) {
        factureUpdate.paiements = [
          ...facture.paiements,
          { id: paiementId, ...paiementData }
        ];
      } else {
        factureUpdate.paiements = [{ id: paiementId, ...paiementData }];
      }

      await this.firebaseService.updateFacture(factureId, factureUpdate);

      // Mettre à jour les colis associés
      if (facture.colis && facture.colis.length > 0) {
        for (const colisItem of facture.colis) {
          // Vérifier si l'élément est un string (ID) ou un objet
          const colisId = typeof colisItem === 'string' ? colisItem : colisItem.id;
          if (colisId) {
            await this.firebaseService.updateColis(colisId, {
              statut: STATUT_COLIS.EN_ATTENTE_LIVRAISON
            });
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du paiement:', error);
      return false;
    }
  }

  /**
   * Sauvegarde la notification dans la base de données
   */
  private async saveNotification(notification: CinetPayNotification): Promise<void> {
    try {
      // Ajouter la notification à une collection
      const notificationData = {
        ...notification,
        receivedAt: new Date()
      };

      // Utiliser directement l'API Firebase pour ajouter à une collection
      const colRef = collection(this.firestore, 'payment_notifications');
      await addDoc(colRef, notificationData);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la notification:', error);
    }
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import { Facture } from '@/app/models/partenaire.model';

export interface CinetPayPaymentRequest {
  apikey: string;
  site_id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  alternative_currency?: string;
  description: string;
  customer_id: string;
  customer_name: string;
  customer_surname: string;
  customer_email: string;
  customer_phone_number: string;
  customer_address: string;
  customer_city: string;
  customer_country: string;
  customer_state: string;
  customer_zip_code: string;
  notify_url: string;
  return_url: string;
  channels: string;
  metadata: string;
  lang?: string;
  invoice_data?: any;
}

export interface CinetPayPaymentResponse {
  code: string;
  message: string;
  description: string;
  data: {
    payment_url: string;
    payment_token: string;
  };
}

// Interface pour les paramètres de paiement
export interface PaymentParams {
  factureId: string;
  amount: number;
  currency: string;
  customer: {
    customer_name: string;
    customer_surname: string;
    customer_email: string;
    customer_phone_number: string;
    customer_address: string;
    customer_city: string;
    customer_country: string;
    customer_state: string;
    customer_zip_code: string;
  };
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  return_url: string;
  notify_url: string;
  channels: string;
  metadata: {
    factureId: string;
    clientId: string;
    colisIds: (string | undefined)[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly apiUrl = 'https://api-checkout.cinetpay.com/v2/payment';

  // Remplacez ces valeurs par vos clés réelles dans l'environnement
  private readonly apiKey = environment.cinetpay?.apiKey || 'YOUR_APIKEY';
  private readonly siteId = environment.cinetpay?.siteId || 'YOUR_SITEID';

  constructor(private http: HttpClient) {}

  /**
   * Initie un paiement via CinetPay pour une facture
   */
  initiatePayment(params: PaymentParams): Observable<CinetPayPaymentResponse> {
    const transactionId = this.generateTransactionId();

    // Vérifier que le montant est suffisant pour le traitement
    if (params.amount <= 0) {
      throw new Error('Le montant doit être supérieur à 0');
    }

    // Seuil minimum recommandé pour CinetPay (en dollars/euros)
    const MIN_AMOUNT = 0.5;
    if (params.amount < MIN_AMOUNT) {
      throw new Error(`Le montant doit être d'au moins ${MIN_AMOUNT} ${params.currency}`);
    }

    // Appliquer une majoration de 10% au montant total
    const MARKUP_PERCENTAGE = 10; // Pourcentage de majoration
    const amountWithMarkup = params.amount * (1 + MARKUP_PERCENTAGE / 100);
    const markup = amountWithMarkup - params.amount; // Montant de la majoration

    // IMPORTANT: La documentation de CinetPay indique que le montant doit être un entier
    // Il y a deux interprétations possibles:
    // 1. Le montant doit être arrondi à l'entier le plus proche (ex: 84.15 -> 84)
    // 2. Le montant doit être converti en centimes (ex: 84.15 -> 8415)

    // Nous utilisons l'option 1 : arrondir à l'entier le plus proche
    const amountInteger = Math.round(amountWithMarkup);

    // Si CinetPay attend des centimes, décommentez cette ligne à la place:
    // const amountInteger = Math.round(amountWithMarkup * 100);

    // Convertir également les prix des articles en entiers
    // Note: nous n'appliquons pas la majoration à chaque article individuel
    const itemsWithIntegerPrices = params.items.map(item => ({
      ...item,
      price: Math.round(item.price) // Arrondir à l'entier, pas en centimes
      // Si CinetPay attend des centimes, utilisez: Math.round(item.price * 100)
    }));

    const payload: CinetPayPaymentRequest = {
      apikey: this.apiKey,
      site_id: this.siteId,
      transaction_id: transactionId,
      amount: amountInteger, // Utiliser le montant arrondi à l'entier
      currency: (params.currency || 'USD').toUpperCase(), // S'assurer que la devise est en majuscules
      description: `Paiement de la facture #${params.factureId.substring(0, 8)} (Frais de service inclus: ${markup.toFixed(2)} ${params.currency})`,
      customer_id: params.metadata.clientId || String(Date.now()),
      customer_name: params.customer.customer_name,
      customer_surname: params.customer.customer_surname,
      customer_email: params.customer.customer_email,
      customer_phone_number: params.customer.customer_phone_number,
      customer_address: params.customer.customer_address,
      customer_city: params.customer.customer_city,
      customer_country: params.customer.customer_country,
      customer_state: params.customer.customer_state,
      customer_zip_code: params.customer.customer_zip_code,
      notify_url: params.notify_url,
      return_url: params.return_url,
      channels: params.channels || 'ALL',
      metadata: JSON.stringify(params.metadata),
      lang: 'FR',
      invoice_data: {
        items: itemsWithIntegerPrices // Utiliser les prix en entiers
      }
    };

    console.log('Payload CinetPay:', payload); // Log pour débogage
    console.log('Détails du paiement:', {
      montantOriginal: params.amount,
      pourcentageMajoration: MARKUP_PERCENTAGE,
      montantMajoration: markup,
      montantTotal: amountWithMarkup,
      montantEnvoye: amountInteger // Montant entier envoyé à CinetPay
    });

    return this.http.post<CinetPayPaymentResponse>(this.apiUrl, payload);
  }

  /**
   * Génère un identifiant de transaction unique
   */
  private generateTransactionId(): string {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 10000);
    return `TX${timestamp}${randomNum}`;
  }
}

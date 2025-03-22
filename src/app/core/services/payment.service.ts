import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';
import { Colis } from '@/app/models/partenaire.model';

interface CinetPayPaymentRequest {
  apikey: string;
  site_id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  alternative_currency: string;
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
  lang: string;
  invoice_data: any;
}

interface CinetPayPaymentResponse {
  code: string;
  message: string;
  description: string;
  data: {
    payment_url: string;
    payment_token: string;
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
   * Initie un paiement via CinetPay pour un ou plusieurs colis
   */
  initiatePayment(colis: Colis[], customer: any, returnUrl: string): Observable<CinetPayPaymentResponse> {
    const totalAmount = this.calculateTotalAmount(colis);
    const transactionId = this.generateTransactionId();

    const payload: CinetPayPaymentRequest = {
      apikey: this.apiKey,
      site_id: this.siteId,
      transaction_id: transactionId,
      amount: totalAmount,
      currency: 'XOF',
      alternative_currency: '',
      description: `Paiement pour ${colis.length} colis`,
      customer_id: customer.id || String(Date.now()),
      customer_name: customer.nom,
      customer_surname: customer.prenom,
      customer_email: customer.email,
      customer_phone_number: String(customer.telephone),
      customer_address: customer.adresse || '',
      customer_city: '',
      customer_country: 'CD', // République Démocratique du Congo
      customer_state: 'CD',
      customer_zip_code: '',
      notify_url: `${window.location.origin}/api/payment/notify`,
      return_url: returnUrl || window.location.origin,
      channels: 'ALL',
      metadata: JSON.stringify({
        colisIds: colis.map(c => c.id || c.codeSuivi),
        clientId: customer.id
      }),
      lang: 'FR',
      invoice_data: {
        references: colis.map(c => c.codeSuivi).join(', ')
      }
    };

    return this.http.post<CinetPayPaymentResponse>(this.apiUrl, payload);
  }

  /**
   * Calcule le montant total à payer pour les colis
   */
  private calculateTotalAmount(colis: Colis[]): number {
    return colis.reduce((total, item) => {
      const cost = item.cout || 0;
      return total + cost;
    }, 0);
  }

  /**
   * Génère un ID de transaction unique
   */
  private generateTransactionId(): string {
    return `TRX${Date.now()}${Math.floor(Math.random() * 10000)}`;
  }
}

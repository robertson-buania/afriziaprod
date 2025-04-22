import { Injectable } from '@angular/core';
import { environment } from '@/environments/environment';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

declare global {
  interface Window {
    Stripe?: any;
  }
}

interface PaymentIntentRequest {
  amount: number;
  currency: string;
}

interface PaymentIntentResponse {
  clientSecret: string;
}

@Injectable({
  providedIn: 'root'
})
export class StripeService {
  private stripePromise: Promise<any> | undefined;
  private readonly apiUrl = environment.firebaseFunctionsUrl;

  constructor(private http: HttpClient) {
    this.loadStripe();
  }

  private loadStripe(): void {
    if (!this.stripePromise) {
      this.stripePromise = new Promise((resolve) => {
        if (window.Stripe) {
          resolve(window.Stripe(environment.stripe.publishableKey));
        } else {
          // Charger le script Stripe.js
          const script = document.createElement('script');
          script.src = 'https://js.stripe.com/v3/';
          script.onload = () => {
            if (window.Stripe) {
              resolve(window.Stripe(environment.stripe.publishableKey));
            }
          };
          document.body.appendChild(script);
        }
      });
    }
  }

  async getStripeInstance(): Promise<any> {
    return this.stripePromise;
  }

  /**
   * Crée une PaymentIntent avec Stripe et retourne le client_secret
   * @param amount Montant en dollars (sera converti en centimes)
   * @param currency Code de la devise (ex: 'eur', 'usd')
   */
  async createPaymentIntent(amount: number, currency: string = 'usd'): Promise<string> {
    try {
      // Conversion en centimes (Stripe attend les montants en centimes)
      const amountInCents = Math.round(amount * 100);
      console.log('Montant envoyé à Stripe (en centimes):', amountInCents);
      console.log('Montant original (en dollars):', amount);

      const response = await firstValueFrom(
        this.http.post<PaymentIntentResponse>(
          `${this.apiUrl}/createPaymentIntent`,
          { amount: amountInCents, currency }
        )
      );

      return response.clientSecret;
    } catch (error) {
      console.error('Erreur lors de la création du PaymentIntent:', error);
      throw error;
    }
  }
}

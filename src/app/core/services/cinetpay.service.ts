import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';

export interface CinetPayResponse {
  code: string;
  message: string;
  data: {
    payment_url: string;
    payment_token: string;
    transaction_id: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class CinetPayService {
  private apiUrl = 'https://api-checkout.cinetpay.com/v2';

  constructor(private http: HttpClient) {}

  initializePayment(data: {
    amount: number;
    currency: string;
    description: string;
    return_url: string;
    cancel_url: string;
    notify_url: string;
    channels: string;
    lang: string;
  }): Observable<CinetPayResponse> {
    return this.http.post<CinetPayResponse>(`${this.apiUrl}/payment/init`, {
      apikey: environment.cinetpay.apiKey,
      site_id: environment.cinetpay.siteId,
      ...data
    });
  }

  checkTransactionStatus(transactionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/payment/check`, {
      apikey: environment.cinetpay.apiKey,
      site_id: environment.cinetpay.siteId,
      transaction_id: transactionId
    });
  }
} 
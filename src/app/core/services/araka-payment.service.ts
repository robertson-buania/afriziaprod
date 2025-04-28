import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ArakaPaymentService {
  private readonly CLOUD_FUNCTION_URL =  environment.firebaseFunctionsUrl+'/processMobilePayment';

  constructor(private http: HttpClient) {}

  processPayment(data: any): Observable<any> {
    return this.http.post(this.CLOUD_FUNCTION_URL, data);
  }

  checkTransactionStatusById(transactionId: string): Observable<any> {
    return this.http.post(`${this.CLOUD_FUNCTION_URL}/checkTransactionStatusById`, { transactionId });
  }
}

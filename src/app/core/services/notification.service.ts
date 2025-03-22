import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '@/environments/environment';

interface WhatsAppResponse {
  messages: Array<{
    id: string;
    message_status: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private whatsappApiUrl = environment.whatsapp.apiUrl;
  private whatsappToken = environment.whatsapp.token;

  constructor(private http: HttpClient) {}

  /**
   * Envoie une notification WhatsApp au client pour l'informer que sa facture est prête
   * @param phoneNumber Le numéro de téléphone du client (format international)
   * @param factureId L'identifiant de la facture
   * @param montant Le montant de la facture
   * @returns Une observable contenant la réponse de l'API WhatsApp
   */
  sendFactureNotification(phoneNumber: string, factureId: string, montant: number): Observable<WhatsAppResponse> {
    // Formater le numéro de téléphone pour WhatsApp (supprimer le + si présent)
    const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.whatsappToken}`,
      'Content-Type': 'application/json'
    });

    const body = {
      messaging_product: "whatsapp",
      to: formattedNumber,
      type: "template",
      template: {
        name: "facture_notification",
        language: { code: "fr" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: factureId },
              { type: "currency", currency: { code: "XOF", amount_1000: montant * 1000 } }
            ]
          }
        ]
      }
    };

    return this.http.post<WhatsAppResponse>(this.whatsappApiUrl, body, { headers }).pipe(
      catchError(error => {
        console.error('Erreur WhatsApp API:', error);
        let errorMessage = 'Erreur lors de l\'envoi de la notification WhatsApp';

        if (error.error?.error?.code === 10) {
          errorMessage = 'Erreur d\'autorisation: Veuillez vérifier la configuration WhatsApp';
        } else if (error.error?.error?.code === 190) {
          errorMessage = 'Token d\'accès WhatsApp expiré ou invalide';
        } else if (error.error?.error?.code === 131) {
          errorMessage = 'Template de message non approuvé';
        }

        return throwError(() => new Error(errorMessage));
      })
    );
  }
}

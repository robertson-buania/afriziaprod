import { environment } from '@/environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaiementService {

  constructor(private httpClient: HttpClient) { }

  // Cette méthode utilise le proxy local pour éviter les problèmes CORS
  loginWithCredentialViaProxy(): Observable<any> {
    console.log("Login via proxy local");

    const credentials = {
      "emailAddress": "moiseeloko@gmail.com",
      "password": "GR@PK=Y62bjzKX["
    };

    // Utilise l'URL du proxy local au lieu de l'URL directe
    // Le proxy doit être configuré dans angular.json et proxy.conf.json
    return this.httpClient.post('/api/login', credentials, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }).pipe(
      map((response: any) => {
        console.log("Login via proxy successful:", response);
        return response;
      }),
      catchError((error) => {
        console.error("Login via proxy failed:", error);
        return throwError(() => new Error('Failed to log in via proxy'));
      })
    );
  }

  loginWithCredential(): Observable<any> {
    console.log("Login avec credentials", environment.ARAKA_PAYMENT_CLIENT_ID, environment.ARAKA_PAYMENT_CLIENT_SECRET);
    console.log("URL de l'API:", environment.ARAKA_PAYMENT_URL+"login");

    // Essayons les credentials exacts qui fonctionnent dans Postman
    const credentials = {
      "emailAddress": "moiseeloko@gmail.com",
      "password": "GR@PK=Y62bjzKX["
    };

    // Headers complets qui pourraient être nécessaires
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });

    // Options HTTP complètes
    const httpOptions = {
      headers: headers,
      withCredentials: false // Essayer sans credentials cookies
    };

    // Afficher exactement ce qui est envoyé
    console.log("Envoi exact:", JSON.stringify(credentials));

    return this.httpClient.post(environment.ARAKA_PAYMENT_URL + "login", credentials, httpOptions).pipe(
      map((response: any) => {
        console.log("Login response:", response);
        return response;
      }),
      catchError((error) => {
        console.error("Error logging in:", error);
        console.error("Error details:", error.error);
        if (error.error instanceof ErrorEvent) {
          console.error("Client-side error:", error.error.message);
        } else {
          console.error(`Server-side error: ${error.status} ${error.statusText}`);
          console.error("Response body:", error.error);
        }

        // Essayer une alternative si la première méthode échoue
        return this.httpClient.post(
          environment.ARAKA_PAYMENT_URL + "login",
          { emailAddress: "moiseeloko@gmail.com", password: "GR@PK=Y62bjzKX[" },
          { headers: { 'Content-Type': 'application/json' } }
        ).pipe(
          map(response => {
            console.log("Méthode alternative réussie:", response);
            return response;
          }),
          catchError(alternativeError => {
            console.error("Alternative failed:", alternativeError);
            return throwError(() => new Error('Failed to log in'));
          })
        );
      })
    );
  }

  // Configuration d'un webhook pour les notifications de paiement
  // Cette méthode devrait être appelée sur votre backend pour configurer
  // un endpoint qui recevra les notifications d'Araka Pay
  configureWebhook(token: string, webhookUrl: string): Observable<any> {
    console.log("Configuration du webhook:", webhookUrl);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    const webhookData = {
      webhookUrl: webhookUrl,
      events: ['PAYMENT_SUCCESSFUL', 'PAYMENT_FAILED']
    };

    return this.httpClient.post(
      environment.ARAKA_PAYMENT_URL + 'webhook/configure',
      webhookData,
      { headers: headers }
    ).pipe(
      map((response: any) => {
        console.log("Webhook configuré avec succès:", response);
        return response;
      }),
      catchError((error) => {
        console.error("Erreur lors de la configuration du webhook:", error);
        return throwError(() => new Error('Failed to configure webhook'));
      })
    );
  }

  // Vérifier le statut d'un paiement par ID de transaction
  verifierStatutPaiement(token: string, transactionId: string): Observable<any> {
    console.log("Vérification du statut du paiement par ID:", transactionId);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    // Selon la documentation: GET api/reporting/transactionstatus/{transactionid}
    return this.httpClient.get(
      environment.ARAKA_PAYMENT_URL + `reporting/transactionstatus/${transactionId}`,
      { headers: headers }
    ).pipe(
      map((response: any) => {
        console.log("Statut du paiement récupéré:", response);
        return response;
      }),
      catchError((error) => {
        console.error("Erreur lors de la vérification du statut du paiement:", error);
        return throwError(() => new Error('Failed to verify payment status'));
      })
    );
  }

  // Vérifier le statut d'un paiement par référence de transaction
  verifierStatutPaiementParReference(token: string, transactionReference: string): Observable<any> {
    console.log("Vérification du statut du paiement par référence:", transactionReference);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    // Selon la documentation: GET api/reporting/transactionstatusbyreference/{transactionReference}
    return this.httpClient.get(
      environment.ARAKA_PAYMENT_URL + `reporting/transactionstatusbyreference/${transactionReference}`,
      { headers: headers }
    ).pipe(
      map((response: any) => {
        console.log("Statut du paiement récupéré par référence:", response);
        return response;
      }),
      catchError((error) => {
        console.error("Erreur lors de la vérification du statut par référence:", error);
        return throwError(() => new Error('Failed to verify payment status by reference'));
      })
    );
  }

  // Créer une requête de paiement mobile avec HMAC pour le webhook
  creerPaiementMobileAvecHMAC(token: string, paymentRequest: any): Observable<any> {
    console.log("Création d'une requête de paiement avec HMAC pour callback");

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-API-CALLBACK-MODE': '2' // Activer le HMAC pour le webhook selon la documentation
    });

    return this.httpClient.post(
      environment.ARAKA_PAYMENT_URL + "pay/paymentrequest",
      paymentRequest,
      { headers: headers }
    ).pipe(
      map((response: any) => {
        console.log("Réponse de la demande de paiement avec HMAC:", response);
        return response;
      }),
      catchError((error) => {
        console.error("Erreur lors de la création du paiement avec HMAC:", error);
        return throwError(() => new Error('Failed to create payment with HMAC'));
      })
    );
  }

  // Interpréter le code de statut et la description selon la documentation
  interpreterStatutPaiement(statusCode: string, statusDescription: string): {
    statut: 'EN_ATTENTE' | 'APPROUVE' | 'REFUSE' | 'ACCEPTE',
    message: string
  } {
    if (statusCode === '202' && statusDescription === 'ACCEPTED') {
      return {
        statut: 'ACCEPTE',
        message: 'La demande de paiement a été envoyée au téléphone du client. En attente de confirmation.'
      };
    } else if (statusCode === '000' || statusDescription === 'APPROVED') {
      return {
        statut: 'APPROUVE',
        message: 'Le paiement a été approuvé avec succès.'
      };
    } else if (statusCode === '400' || statusDescription === 'DECLINED') {
      return {
        statut: 'REFUSE',
        message: 'Le paiement a été refusé.'
      };
    } else if (statusDescription === 'PENDING') {
      return {
        statut: 'EN_ATTENTE',
        message: 'Le paiement est toujours en attente de traitement.'
      };
    } else {
      return {
        statut: 'EN_ATTENTE',
        message: `Statut inconnu: ${statusCode} - ${statusDescription}`
      };
    }
  }
}

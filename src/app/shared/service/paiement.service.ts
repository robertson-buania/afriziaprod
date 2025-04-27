
import { environment } from '@/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaiementService {

  constructor(private httClient:HttpClient) { }


  loginWithCredential(): Observable<any> {
    console.log("Login avec credentials", environment.ARAKA_PAYMENT_CLIENT_ID, environment.ARAKA_PAYMENT_CLIENT_SECRET);
    console.log("URL de l'API:", environment.ARAKA_PAYMENT_URL+"login");

    return this.httClient.post(environment.ARAKA_PAYMENT_URL + "login", {
      "emailAddress": "moiseeloko@gmail.com",
      "password": "GR@PK=Y62bjzKX["
    }).pipe(
      map((response: any) => {
        console.log("Login response:", response);
        return response;
      }),
      catchError((error) => {
        console.error("Error logging in:", error);
        console.error("Error details:", error.error); // Ajout de ce log
        return throwError(() => new Error('Failed to log in'));
      })
    );
  }

  // loginWithCredential():Observable<any>{

  //   console.log("Login avec credentials",environment.ARAKA_PAYMENT_CLIENT_ID,environment.ARAKA_PAYMENT_CLIENT_SECRET);


  //   return this.httClient.post(environment.ARAKA_PAYMENT_URL+"login",{
  //     "emailAddress":environment.ARAKA_PAYMENT_CLIENT_ID,
  //      "password":environment.ARAKA_PAYMENT_CLIENT_SECRET
  //     }).pipe(
  //       map((response: any) => {
  //         console.log("Login response:", response);
  //         return response;
  //       }),
  //       catchError((error) => {
  //         console.error("Error logging in:", error);
  //         return throwError(() => new Error('Failed to log in'));
  //       })
  //     );
  // }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

interface Country {
  name: {
    common: string;
  };
  cca2: string;
  idd: {
    root: string;
    suffixes?: string[];
  };
}

export interface CountryCode {
  name: string;
  code: string;
  dialCode: string;
}

@Injectable({
  providedIn: 'root'
})
export class CountryService {
  private readonly API_URL = 'https://restcountries.com/v3.1/all';

  constructor(private http: HttpClient) {}

  getCountries(): Observable<CountryCode[]> {
    return this.http.get<Country[]>(this.API_URL).pipe(
      map(data => data
        .filter(country => country.idd.root)
        .map(country => ({
          name: country.name.common,
          code: country.cca2,
          dialCode: country.idd.root + (country.idd.suffixes ? country.idd.suffixes[0] : '')
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
      )
    );
  }

  extractCountryCode(phoneNumber: string, countries: CountryCode[]): string {
    for (const country of countries) {
      if (phoneNumber.startsWith(country.dialCode.replace('+', ''))) {
        return country.code;
      }
    }
    return 'CD'; // Code par défaut pour la RDC
  }

  extractPhoneNumber(phoneNumber: string, countries: CountryCode[]): string {
    for (const country of countries) {
      if (phoneNumber.startsWith(country.dialCode.replace('+', ''))) {
        return phoneNumber.substring(country.dialCode.length);
      }
    }
    return phoneNumber;
  }

  formatFullPhoneNumber(countryDialCode: string, phoneNumber: string): number {
    return parseInt((countryDialCode.replace('+', '')) + phoneNumber);
  }
}

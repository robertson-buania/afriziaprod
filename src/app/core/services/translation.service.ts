import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FR } from '../../../assets/i18n/fr';
import { ZH } from '../../../assets/i18n/zh';

export type Language = 'fr' | 'zh';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private translations = {
    fr: FR,
    zh: ZH
  };

  private currentLang = new BehaviorSubject<Language>('fr');
  currentLang$ = this.currentLang.asObservable();

  constructor() {
    // Récupérer la langue sauvegardée ou utiliser la langue par défaut
    const savedLang = localStorage.getItem('preferredLanguage') as Language;
    if (savedLang && this.isValidLanguage(savedLang)) {
      this.currentLang.next(savedLang);
    }
  }

  setLanguage(lang: Language): void {
    if (this.isValidLanguage(lang)) {
      this.currentLang.next(lang);
      localStorage.setItem('preferredLanguage', lang);
    }
  }

  getCurrentLang(): Language {
    return this.currentLang.value;
  }

  translate(key: string): string {
    const keys = key.split('.');
    let translation: any = this.translations[this.currentLang.value];

    for (const k of keys) {
      if (translation && translation[k]) {
        translation = translation[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    return translation;
  }

  private isValidLanguage(lang: string): lang is Language {
    return ['fr', 'zh'].includes(lang);
  }
}

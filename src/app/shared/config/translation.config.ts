import { HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { FR } from '@/assets/i18n/fr';
import { ZH } from '@/assets/i18n/zh';

type SupportedLanguages = 'fr' | 'zh';

// Custom loader for static translations
export class StaticTranslateLoader implements TranslateLoader {
  private translations: Record<SupportedLanguages, typeof FR | typeof ZH> = {
    fr: FR,
    zh: ZH
  };

  getTranslation(lang: string): Observable<any> {
    return of(this.translations[lang as SupportedLanguages] || {});
  }
}

// Translation module configuration for standalone components
export const translateModuleConfig = TranslateModule.forRoot({
  defaultLanguage: 'fr',
  loader: {
    provide: TranslateLoader,
    useClass: StaticTranslateLoader
  }
});

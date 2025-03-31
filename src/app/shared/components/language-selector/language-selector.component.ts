import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

type Language = 'fr' | 'zh';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="language-selector">
      <button
        *ngFor="let lang of languages"
        class="btn btn-link"
        [class.active]="currentLang === lang"
        (click)="switchLanguage(lang)"
      >
        {{ lang.toUpperCase() }}
      </button>
    </div>
  `,
  styles: [`
    .language-selector {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .btn-link {
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      padding: 0.25rem 0.5rem;
      font-weight: 500;
    }

    .btn-link:hover {
      color: white;
    }

    .btn-link.active {
      color: white;
      font-weight: 600;
      text-decoration: underline;
    }
  `]
})
export class LanguageSelectorComponent implements OnInit {
  languages: Language[] = ['fr', 'zh'];
  currentLang: Language = 'fr';

  constructor(private translate: TranslateService) {}

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang as Language;
    this.translate.onLangChange.subscribe(event => {
      this.currentLang = event.lang as Language;
    });
  }

  switchLanguage(lang: Language): void {
    this.translate.use(lang);
  }
}

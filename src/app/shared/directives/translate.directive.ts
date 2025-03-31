import { Directive, ElementRef, Input, OnInit, OnDestroy } from '@angular/core';
import { TranslationService } from '@/app/core/services/translation.service';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[translate]',
  standalone: true
})
export class TranslateDirective implements OnInit, OnDestroy {
  @Input('translate') key: string = '';
  private subscription: Subscription = new Subscription();

  constructor(
    private el: ElementRef,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    // Mettre à jour la traduction initiale
    this.updateTranslation();

    // S'abonner aux changements de langue
    this.subscription.add(
      this.translationService.currentLang$.subscribe(() => {
        this.updateTranslation();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private updateTranslation(): void {
    if (this.key) {
      this.el.nativeElement.textContent = this.translationService.translate(this.key);
    }
  }
}

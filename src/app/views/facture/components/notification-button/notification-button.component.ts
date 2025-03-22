import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="btn btn-sm"
      [ngClass]="{
        'btn-outline-secondary': !isSending,
        'btn-secondary position-relative': isSending
      }"
      title="{{ isSending ? 'Envoi en cours...' : 'Envoyer une notification WhatsApp' }}"
      (click)="onNotifyClick()"
      [disabled]="isDisabled || isSending"
    >
      <i *ngIf="!isSending" class="lab la-whatsapp"></i>
      <span *ngIf="isSending" class="d-flex align-items-center">
        <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
        <span class="visually-hidden">Envoi en cours...</span>
      </span>
    </button>
  `,
  styles: [`
    .btn-secondary.position-relative {
      cursor: not-allowed;
      opacity: 0.8;
    }
  `]
})
export class NotificationButtonComponent {
  @Input() factureId!: string;
  @Input() isDisabled: boolean = false;
  @Input() isSending: boolean = false;
  @Output() notify = new EventEmitter<string>();

  onNotifyClick() {
    if (!this.isSending && !this.isDisabled) {
      this.notify.emit(this.factureId);
    }
  }
}

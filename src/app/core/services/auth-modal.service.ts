import { Injectable } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject, Subject } from 'rxjs';

export enum AuthModalType {
  LOGIN = 'login',
  REGISTER = 'register',
  FORGOT_PASSWORD = 'forgot-password'
}

@Injectable({
  providedIn: 'root'
})
export class AuthModalService {
  private activeModalRef: NgbModalRef | null = null;
  private modalTypeSubject = new Subject<AuthModalType>();

  modalType$ = this.modalTypeSubject.asObservable();

  constructor(private modalService: NgbModal) {}

  /**
   * Ouvre un modal d'authentification
   * @param type Le type de modal (login, register, forgot-password)
   */
  openAuthModal(type: AuthModalType = AuthModalType.LOGIN): void {
    // Fermer tous les modals existants avant d'ouvrir un nouveau
    this.modalService.dismissAll();

    // Indique le type de modal à ouvrir
    this.modalTypeSubject.next(type);
  }

  /**
   * Ferme le modal actif
   */
  closeModal(): void {
    this.modalService.dismissAll();
  }
}

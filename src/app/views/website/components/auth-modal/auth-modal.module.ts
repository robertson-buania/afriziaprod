import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { NgbModalModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthModalComponent } from './auth-modal.component';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgbModalModule,
    NgbNavModule,
    AuthModalComponent
  ],
  exports: [
    AuthModalComponent
  ]
})
export class AuthModalModule { }

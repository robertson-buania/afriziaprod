import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacturePaiementModalComponent } from './facture-paiement-modal.component';

describe('FacturePaiementModalComponent', () => {
  let component: FacturePaiementModalComponent;
  let fixture: ComponentFixture<FacturePaiementModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacturePaiementModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacturePaiementModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

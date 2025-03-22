import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FactureDetailsModalComponent } from './facture-details-modal.component';

describe('FactureDetailsModalComponent', () => {
  let component: FactureDetailsModalComponent;
  let fixture: ComponentFixture<FactureDetailsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FactureDetailsModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FactureDetailsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

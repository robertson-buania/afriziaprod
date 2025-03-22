import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ColisListEnregistrerComponent } from './colis-list-enregistrer.component';

describe('ColisListEnregistrerComponent', () => {
  let component: ColisListEnregistrerComponent;
  let fixture: ComponentFixture<ColisListEnregistrerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColisListEnregistrerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ColisListEnregistrerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

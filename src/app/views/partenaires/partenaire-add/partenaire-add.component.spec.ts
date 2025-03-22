import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartenaireAddComponent } from './partenaire-add.component';

describe('PartenaireAddComponent', () => {
  let component: PartenaireAddComponent;
  let fixture: ComponentFixture<PartenaireAddComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartenaireAddComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PartenaireAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

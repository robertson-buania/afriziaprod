import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartenaireDetailComponent } from './partenaire-detail.component';

describe('PartenaireDetailComponent', () => {
  let component: PartenaireDetailComponent;
  let fixture: ComponentFixture<PartenaireDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartenaireDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PartenaireDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

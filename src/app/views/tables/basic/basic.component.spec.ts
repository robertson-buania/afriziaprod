import { ComponentFixture, TestBed } from '@angular/core/testing'

import { BasicComponent } from './basic.component'

describe('BasicComponent', () => {
  let component: BasicComponent
  let fixture: ComponentFixture<BasicComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BasicComponent],
    }).compileComponents()

    fixture = TestBed.createComponent(BasicComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})

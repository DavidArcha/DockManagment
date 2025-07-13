import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomCalenderComponent } from './custom-calender.component';

describe('CustomCalenderComponent', () => {
  let component: CustomCalenderComponent;
  let fixture: ComponentFixture<CustomCalenderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CustomCalenderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomCalenderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

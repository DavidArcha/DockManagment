import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GridDemoComponent } from './grid-demo.component';

describe('GridDemoComponent', () => {
  let component: GridDemoComponent;
  let fixture: ComponentFixture<GridDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GridDemoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GridDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

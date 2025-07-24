import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultilevelGridComponent } from './multilevel-grid.component';

describe('MultilevelGridComponent', () => {
  let component: MultilevelGridComponent;
  let fixture: ComponentFixture<MultilevelGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MultilevelGridComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MultilevelGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

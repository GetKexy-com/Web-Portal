import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeadMagnetFormComponent } from './lead-magnet-form.component';

describe('LeadMagnetFormComponent', () => {
  let component: LeadMagnetFormComponent;
  let fixture: ComponentFixture<LeadMagnetFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeadMagnetFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeadMagnetFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

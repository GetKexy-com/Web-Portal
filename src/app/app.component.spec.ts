import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app.component';
import { GleapService } from './services/gleap.service';

describe('AppComponent', () => {
  let gleap: jasmine.SpyObj<GleapService>;

  beforeEach(async () => {
    // Stand-in so the test never loads the real Gleap SDK over the network.
    gleap = jasmine.createSpyObj<GleapService>('GleapService', ['preload']);

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), { provide: GleapService, useValue: gleap }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it(`should have the 'KEXY - Webportal' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance.title).toEqual('KEXY - Webportal');
  });

  it('should render the router outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });

  it('should preload Gleap once on init', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(gleap.preload).toHaveBeenCalledTimes(1);
  });
});

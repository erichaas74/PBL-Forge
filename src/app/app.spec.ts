import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { SessionService } from './core/firebase/session.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: SessionService,
          useValue: {
            displayName: signal('Test student'),
            user: signal(null),
            ready: signal(true),
            isLocalTeacher: signal(false),
            isTeacher: signal(false),
            isLocal: true,
            signInWithGoogle: async () => undefined,
            signInAsLocalStudent: async () => undefined,
            signInAsLocalTeacher: async () => undefined,
            signOut: async () => undefined
          }
        }
      ]
    }).compileComponents();
  });

  it('creates the application shell', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the product name and main navigation', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand')?.textContent).toContain('Dragon Genetics');
    expect(compiled.querySelector('nav')?.textContent).toContain('Student learning path');
    expect(compiled.querySelector('nav')?.textContent).not.toContain('Teacher dashboard');
  });
});

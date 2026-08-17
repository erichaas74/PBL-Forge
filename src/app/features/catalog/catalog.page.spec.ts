import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProjectRepository } from '../../core/firebase/project.repository';
import { CatalogPage } from './catalog.page';

describe('CatalogPage dragon shortcuts', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogPage],
      providers: [
        provideRouter([]),
        {
          provide: ProjectRepository,
          useValue: {
            publishedProjects$: of([]),
            error: signal<string | null>(null),
          },
        },
      ],
    }).compileComponents();
  });

  it('places Mini Dragon Show directly after Dragon Duel', () => {
    const fixture = TestBed.createComponent(CatalogPage);
    fixture.detectChanges();

    const links = [
      ...fixture.nativeElement.querySelectorAll('.quick-links a'),
    ] as HTMLAnchorElement[];
    expect(links.map((link) => link.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Dragon test bench →',
      'Dragon duel test →',
      'Mini Dragon Show →',
      'Parts Lab Designer↗',
    ]);
    expect(links[2].getAttribute('href')).toBe('/dragon-genetics/companion-show');
    fixture.destroy();
  });

  it('opens the private Designer Parts Lab without adding it to student routes', () => {
    const fixture = TestBed.createComponent(CatalogPage);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector(
      '[data-testid="parts-lab-link"]',
    ) as HTMLAnchorElement;
    expect(link.href).toBe('http://localhost:4300/parts-lab');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener');
    fixture.destroy();
  });
});

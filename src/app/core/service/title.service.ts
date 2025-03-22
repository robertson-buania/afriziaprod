// title.service.ts
import { Injectable } from '@angular/core'
import { Title } from '@angular/platform-browser'
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router'
import { filter } from 'rxjs/operators'

@Injectable({
  providedIn: 'root',
})
export class TitleService {
  constructor(
    private titleService: Title,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  init(): void {
    // Subscribe to router events
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        const title = this.getTitle(this.activatedRoute);
        if (title) {
          this.titleService.setTitle(`${title} | Kamba`);
        }
      });
  }

  private getTitle(route: ActivatedRoute): string | undefined {
    let title: string | undefined;
    let currentRoute = route.firstChild;

    while (currentRoute) {
      if (currentRoute.snapshot.data['title']) {
        title = currentRoute.snapshot.data['title'];
      }
      currentRoute = currentRoute.firstChild;
    }

    return title;
  }
}

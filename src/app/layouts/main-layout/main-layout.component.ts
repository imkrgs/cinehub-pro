import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { filter } from 'rxjs';

import { HeaderComponent } from '@shared/components/header/header.component';
import { FooterComponent } from '@shared/components/footer/footer.component';
import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatBadgeModule
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <app-header></app-header>

      <main class="flex-1 container mx-auto">
        <router-outlet></router-outlet>
      </main>

      <app-footer></app-footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class MainLayoutComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);

  protected readonly currentUser = this.authService.currentUser;
  private readonly _currentRoute = signal('');

  readonly currentRoute = this._currentRoute.asReadonly();

  ngOnInit(): void {
    this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe((event) => {
          this._currentRoute.set(event.urlAfterRedirects || event.url);
        });
  }
}
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { filter } from 'rxjs';
import { FooterComponent } from '@shared/components/footer/footer.component';
import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';
import {NavbarComponent} from "@shared/components/navbar/navbar.component";
import {ModalComponent} from "@shared/components/modal/modal.component";

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    FooterComponent,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatBadgeModule,
    NavbarComponent,
    ModalComponent
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <app-navbar></app-navbar>

      <main class="flex-1 container mx-auto">
        <router-outlet></router-outlet>
      </main>

      <app-footer></app-footer>
      <app-modal></app-modal>
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
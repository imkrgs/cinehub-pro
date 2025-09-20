import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';

import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule
  ],
  template: `
    <mat-sidenav-container class="min-h-screen">
      <mat-sidenav #drawer mode="side" opened class="w-64">
        <mat-toolbar color="primary" class="mb-4">
          <span>🎬 Admin Panel</span>
        </mat-toolbar>

        <mat-nav-list>
          <a mat-list-item routerLink="/admin/dashboard" routerLinkActive="active">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Dashboard</span>
          </a>

          <a mat-list-item routerLink="/admin/users" routerLinkActive="active">
            <mat-icon matListItemIcon>people</mat-icon>
            <span matListItemTitle>Users</span>
          </a>

          <a mat-list-item routerLink="/admin/movies" routerLinkActive="active">
            <mat-icon matListItemIcon>movie</mat-icon>
            <span matListItemTitle>Movies</span>
          </a>

          <a mat-list-item routerLink="/admin/reviews" routerLinkActive="active">
            <mat-icon matListItemIcon>rate_review</mat-icon>
            <span matListItemTitle>Reviews</span>
          </a>

          <mat-divider class="my-4"></mat-divider>

          <a mat-list-item routerLink="/" target="_blank">
            <mat-icon matListItemIcon>launch</mat-icon>
            <span matListItemTitle>View Site</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar>
          <button mat-icon-button (click)="drawer.toggle()">
            <mat-icon>menu</mat-icon>
          </button>

          <span class="flex-1"></span>

          <button mat-icon-button [matMenuTriggerFor]="userMenu">
            <mat-icon>account_circle</mat-icon>
          </button>

          <mat-menu #userMenu="matMenu">
            <div class="px-4 py-2 border-b">
              <div class="font-medium">{{ currentUser()?.name }}</div>
              <div class="text-sm text-gray-500">{{ currentUser()?.email }}</div>
            </div>

            <button mat-menu-item (click)="toggleTheme()">
              <mat-icon>{{ themeService.isDarkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
              <span>Toggle Theme</span>
            </button>

            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Logout</span>
            </button>
          </mat-menu>
        </mat-toolbar>

        <div class="p-6">
          <router-outlet></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .active {
      background-color: rgba(0, 0, 0, 0.04);
    }

    mat-sidenav {
      border-right: 1px solid #e0e0e0;
    }
  `]
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);
  protected readonly themeService = inject(ThemeService);

  protected readonly currentUser = this.authService.currentUser;

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  logout(): void {
    this.authService.logout();
  }
}
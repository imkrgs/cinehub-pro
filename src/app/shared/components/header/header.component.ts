// src/app/shared/components/header/header.component.ts
import { Component, inject, ChangeDetectionStrategy, signal, computed, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';

import { SearchBarComponent } from '../search-bar/search-bar.component';
import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';
import { NotificationService } from '@core/services/notification.service';
import { Subscription, of } from 'rxjs';
import { map } from 'rxjs/operators';

interface User {
  name?: string;
  email?: string;
  avatar?: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    FormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatBadgeModule,
    MatInputModule,
    MatTooltipModule,
    MatDividerModule,
    MatDialogModule,
    SearchBarComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar class="header px-4 md:px-6" role="banner" aria-label="Primary navigation">
      <div class="container mx-auto flex items-center justify-between w-full">
        <!-- Left: brand + mobile menu button -->
        <div class="flex items-center gap-3">
          <!-- Mobile menu -->
          <button
              mat-icon-button
              class="md:hidden"
              [matMenuTriggerFor]="mobileMenu"
              aria-label="Open navigation menu"
              title="Open menu">
            <mat-icon>menu</mat-icon>
          </button>

          <a routerLink="/" class="brand-link" aria-label="CineHub home">
            <div class="brand-logo">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 8V24H28V8H4Z" fill="url(#paint0_linear)"/>
                <path d="M12 16L16 12L20 16L16 20L12 16Z" fill="white"/>
                <defs>
                  <linearGradient id="paint0_linear" x1="4" y1="8" x2="28" y2="24" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#6366F1"/>
                    <stop offset="1" stop-color="#8B5CF6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span class="brand-text">CineHub</span>
          </a>
        </div>

        <!-- Right: actions -->
        <div class="flex items-center gap-1">
          <!-- Search icon for small screens -->
          <button
              mat-icon-button
              class="md:hidden"
              aria-label="Open search"
              (click)="openMobileSearch()"
              title="Search">
            <mat-icon>search</mat-icon>
          </button>

          <!-- Theme toggle -->
          <button
              mat-icon-button
              (click)="toggleTheme()"
              [title]="'Switch to ' + (isDarkTheme() ? 'light' : 'dark') + ' mode'"
              aria-pressed="false"
              aria-label="Toggle theme">
            <mat-icon>{{ isDarkTheme() ? 'light_mode' : 'dark_mode' }}</mat-icon>
          </button>

          <!-- Notifications -->
          <button
              mat-icon-button
              [matMenuTriggerFor]="notifMenu"
              aria-label="Open notifications"
              matTooltip="Notifications"
              [matBadge]="unreadNotificationsCount()"
              matBadgeColor="warn"
              matBadgeSize="small">
            <mat-icon>notifications</mat-icon>
          </button>

          <!-- Movies link (hide on very small screens) -->
          <a mat-button routerLink="/movies" routerLinkActive="active" class="hidden md:inline-flex"
             [routerLinkActiveOptions]="{ exact: false }">
            Movies
          </a>

          <!-- Authentication / user area -->
          @if (isAuthenticated()) {
            <a mat-button routerLink="/dashboard" class="hidden md:inline-flex">Dashboard</a>

            <button mat-icon-button [matMenuTriggerFor]="userMenu" aria-label="Open user menu" matTooltip="Profile">
              @if (user()?.avatar) {
                <img [src]="user()?.avatar" class="avatar" alt="Profile" />
              } @else {
                <mat-icon>account_circle</mat-icon>
              }
            </button>

            <mat-menu #userMenu="matMenu" xPosition="before" yPosition="below" class="user-menu">
              <div class="user-info" role="group" aria-label="User info">
                <div class="user-name">{{ user()?.name || 'User' }}</div>
                <div class="user-email">{{ user()?.email }}</div>
              </div>
              <mat-divider></mat-divider>

              <button mat-menu-item routerLink="/dashboard">
                <mat-icon>dashboard</mat-icon>
                <span>Dashboard</span>
              </button>

              <button mat-menu-item routerLink="/profile">
                <mat-icon>person</mat-icon>
                <span>Profile</span>
              </button>

              <button mat-menu-item routerLink="/watchlist">
                <mat-icon>bookmark</mat-icon>
                <span>Watchlist</span>
              </button>

              @if (isAdmin()) {
                <mat-divider></mat-divider>
                <button mat-menu-item routerLink="/admin">
                  <mat-icon>admin_panel_settings</mat-icon>
                  <span>Admin Panel</span>
                </button>
              }

              <mat-divider></mat-divider>
              <button mat-menu-item (click)="logout()">
                <mat-icon>logout</mat-icon>
                <span>Logout</span>
              </button>
            </mat-menu>
          } @else {
            <a mat-button routerLink="/auth/login" class="hidden sm:inline-flex">Sign In</a>
            <!-- show compact icons on xs screens -->
            <a class="sm:hidden" routerLink="/auth/login" aria-label="Sign in">
              <button mat-icon-button aria-hidden="false" matTooltip="Sign In">
                <mat-icon>login</mat-icon>
              </button>
            </a>
          }
        </div>
      </div>

      <!-- Mobile navigation menu -->
      <mat-menu #mobileMenu="matMenu" class="mobile-menu">
        <button mat-menu-item routerLink="/movies">
          <mat-icon>movie</mat-icon>
          <span>Movies</span>
        </button>
        <button mat-menu-item routerLink="/trending">
          <mat-icon>whatshot</mat-icon>
          <span>Trending</span>
        </button>
        <button mat-menu-item routerLink="/genres">
          <mat-icon>category</mat-icon>
          <span>Genres</span>
        </button>
        <mat-divider></mat-divider>
        @if (isAuthenticated()) {
          <button mat-menu-item routerLink="/dashboard">
            <mat-icon>dashboard</mat-icon>
            <span>Dashboard</span>
          </button>
          <button mat-menu-item routerLink="/watchlist">
            <mat-icon>bookmark</mat-icon>
            <span>Watchlist</span>
          </button>
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Logout</span>
          </button>
        } @else {
          <button mat-menu-item routerLink="/auth/login">
            <mat-icon>login</mat-icon>
            <span>Sign In</span>
          </button>
        }
      </mat-menu>

      <!-- Notifications menu -->
      <mat-menu #notifMenu="matMenu" xPosition="before" yPosition="below" class="notif-menu">
        <div class="notif-header">
          <h3>Notifications</h3>
          <button mat-icon-button (click)="markAllAsRead()" matTooltip="Mark all as read">
            <mat-icon>done_all</mat-icon>
          </button>
        </div>
        <mat-divider></mat-divider>
        <div class="notif-content">
          @if (notifications().length > 0) {
            @for (note of notifications(); track note.id) {
              <div class="notif-item" [class.unread]="!note.read">
                <div class="notif-icon">
                  <mat-icon>{{ note.icon || 'notifications' }}</mat-icon>
                </div>
                <div class="notif-details">
                  <div class="notif-title">{{ note.title }}</div>
                  <div class="notif-body">{{ note.body }}</div>
                  <div class="notif-time">{{ note.time | date:'short' }}</div>
                </div>
                @if (!note.read) {
                  <div class="notif-status"></div>
                }
              </div>
            }
          } @else {
            <div class="no-notifications">
              <mat-icon>notifications_off</mat-icon>
              <p>No notifications</p>
            </div>
          }
        </div>
        <mat-divider></mat-divider>
        <div class="notif-footer">
          <button mat-button routerLink="/notifications">View All</button>
        </div>
      </mat-menu>
    </mat-toolbar>
  `,
  styles: [`
    .header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      transition: all 0.3s ease;
      height: 64px;
    }

    .dark .header {
      background: rgba(18, 18, 24, 0.8);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .container {
      max-width: 1200px;
      width: 100%;
    }

    .brand-link {
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: inherit;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .brand-text {
      font-size: 1.25rem;
      font-weight: 700;
      background: linear-gradient(90deg, #6366F1 0%, #8B5CF6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }

    .active {
      background: rgba(99, 102, 241, 0.1) !important;
      color: #6366F1 !important;
    }

    /* User menu styles */
    .user-menu {
      min-width: 240px;
    }

    .user-info {
      padding: 16px;
    }

    .user-name {
      font-weight: 600;
      font-size: 1rem;
    }

    .user-email {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.6);
    }

    .dark .user-email {
      color: rgba(255, 255, 255, 0.6);
    }

    /* Notifications menu */
    .notif-menu {
      min-width: 360px;
      max-width: 400px;
    }

    .notif-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
    }

    .notif-header h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .notif-content {
      max-height: 320px;
      overflow-y: auto;
    }

    .notif-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      position: relative;
      border-left: 3px solid transparent;
    }

    .notif-item.unread {
      background: rgba(99, 102, 241, 0.05);
      border-left-color: #6366F1;
    }

    .notif-item:hover {
      background: rgba(0, 0, 0, 0.04);
    }

    .dark .notif-item:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    .notif-icon {
      color: #6366F1;
      margin-top: 2px;
    }

    .notif-details {
      flex: 1;
    }

    .notif-title {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .notif-body {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.7);
      margin-bottom: 4px;
    }

    .dark .notif-body {
      color: rgba(255, 255, 255, 0.7);
    }

    .notif-time {
      font-size: 0.75rem;
      color: rgba(0, 0, 0, 0.5);
    }

    .dark .notif-time {
      color: rgba(255, 255, 255, 0.5);
    }

    .notif-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #6366F1;
      margin-top: 8px;
    }

    .no-notifications {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
      color: rgba(0, 0, 0, 0.5);
      text-align: center;
    }

    .dark .no-notifications {
      color: rgba(255, 255, 255, 0.5);
    }

    .no-notifications mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    .notif-footer {
      padding: 8px;
      display: flex;
      justify-content: center;
    }

    /* Mobile menu */
    .mobile-menu {
      min-width: 200px;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .header {
        padding-left: 12px;
        padding-right: 12px;
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .header {
        transition: none;
      }
    }
  `]
})
export class HeaderComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  private subscriptions: Subscription[] = [];

  // Signals for state management
  readonly user = signal<User | null>(null);
  readonly isAuthenticated = signal<boolean>(false);
  readonly isAdmin = signal<boolean>(false);
  readonly isDarkTheme = signal<boolean>(false);
  readonly notifications = signal<any[]>([]);
  readonly unreadNotificationsCount = computed(() =>
      this.notifications().filter(n => !n.read).length
  );

  constructor() {
    // Subscribe to theme state
    const themeSub = effect(() => {
      this.isDarkTheme.set(this.themeService.isDarkMode());
    });
  }


  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private fetchUserData(): void {
    // Example implementation - replace with actual API call
    this.user.set({
      name: 'John Doe',
      email: 'john.doe@example.com',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'
    });

    // Check if user is admin
    this.isAdmin.set(this.authService.isAdmin());
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  openMobileSearch(): void {
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
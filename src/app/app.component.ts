import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subject, takeUntil } from 'rxjs';

import { ThemeService } from '@core/services/theme.service';
import { LoadingService } from '@core/services/loading.service';
import { AuthService } from '@core/services/auth.service';
import { ErrorHandlerService } from '@core/services/error-handler.service';
import { ToastService } from '@core/services/toast.service';
import { PwaService } from '@core/services/pwa.service';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatProgressBarModule
  ],
  template: `
    <div 
      class="app-container min-h-screen flex flex-col transition-colors duration-300"
      [class.dark]="themeService.isDarkMode()"
      [attr.data-theme]="themeService.currentTheme()">

      @if (loadingService.isLoading()) {
        <mat-progress-bar 
          mode="indeterminate" 
          class="fixed top-0 left-0 w-full z-50"
          color="primary">
        </mat-progress-bar>
      }

<!--      @if (showPwaUpdate()) {-->
<!--        <div class="pwa-update-banner bg-green-600 text-white p-3 text-center">-->
<!--          <span>🚀 New version available!</span>-->
<!--          <button -->
<!--            class="ml-4 px-4 py-1 bg-white text-green-600 rounded"-->
<!--            (click)="updatePwa()">-->
<!--            Update Now-->
<!--          </button>-->
<!--        </div>-->
<!--      }-->

      @if (isOffline()) {
        <div class="offline-banner bg-red-600 text-white p-2 text-center">
          <span>📡 You're offline. Some features may be limited.</span>
        </div>
      }

      <main class="flex-1" role="main">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      background-color: var(--color-background, #ffffff);
      color: var(--color-text, #000000);
    }

    .dark .app-container {
      --color-background: #0f172a;
      --color-text: #f8fafc;
    }

    .pwa-update-banner {
      animation: slideInDown 0.3s ease-out;
    }

    @keyframes slideInDown {
      from { transform: translateY(-100%); }
      to { transform: translateY(0); }
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  protected readonly themeService = inject(ThemeService);
  protected readonly loadingService = inject(LoadingService);
  private readonly authService = inject(AuthService);
  private readonly pwaService = inject(PwaService);
  private readonly toast = inject(ToastService);

  private readonly _showPwaUpdate = signal(false);
  private readonly _isOffline = signal(false);

  readonly showPwaUpdate = this._showPwaUpdate.asReadonly();
  readonly isOffline = this._isOffline.asReadonly();

  ngOnInit(): void {
    this.initializeApp();
    this.setupEventListeners();
    this.setupPwaHandlers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeApp(): void {
    // Initialize theme
    this.themeService.preloadTheme();

    // Initialize auth
    this.authService.initializeAuth()
      .pipe(takeUntil(this.destroy$))
      .subscribe();

    // Remove loading screen
    setTimeout(() => this.removeInitialLoader(), 1000);
  }

  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this._isOffline.set(false);
      this.toast.success('Connection restored');
    });

    window.addEventListener('offline', () => {
      this._isOffline.set(true);
    });

    this._isOffline.set(!navigator.onLine);
  }

  private setupPwaHandlers(): void {
    this.pwaService.updateAvailable$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this._showPwaUpdate.set(true);
      });
  }

  private removeInitialLoader(): void {
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 500);
    }
  }

  updatePwa(): void {
    this.pwaService.updateApp();
    this._showPwaUpdate.set(false);
  }
}
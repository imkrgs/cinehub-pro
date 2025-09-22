import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of, throwError, tap, catchError, switchMap } from 'rxjs';
import { environment } from '@environments/environment';
import { User, AuthResponse, LoginRequest, RegisterRequest } from '@core/models/user.model';
import { StorageService } from './storage.service';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);
  private readonly toast = inject(ToastService);

  private readonly _currentUser = signal<User | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _authError = signal<string | null>(null);

  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);

  // Public readonly signals
  readonly isLoading = this._isLoading.asReadonly();
  readonly authError = this._authError.asReadonly();
  readonly isAuthenticated = computed(() => !!this._currentUser());
  readonly isAdmin = computed(() => {
    const user = this._currentUser();
    return user?.role === 'admin' || user?.role === 'super_admin';
  });
  readonly isModerator = computed(() => {
    const user = this._currentUser();
    return user?.role === 'moderator' || user?.role === 'admin' || user?.role === 'super_admin';
  });

  // Public observables
  readonly currentUser$ = this.currentUserSubject.asObservable();

  private readonly baseUrl = environment.api.baseUrl;
  private tokenRefreshTimer?: ReturnType<typeof setTimeout>;

  isModalOpen = signal(false);
  activeForm = signal<'signin'|'signup'|'reset'>('signin');
  currentUser = signal<User|null>(null);

  constructor() {
    this.initializeAuth();
  }

  // Initialize authentication state from storage
  initializeAuth(): Observable<User | null> {
    const token = this.getStoredToken();
    const user = this.getStoredUser();

    if (token && user) {
      this.setCurrentUser(user);
      this.scheduleTokenRefresh();
      return of(user);
    }

    return of(null);
  }

  // Login
  login(credentials: LoginRequest): Observable<AuthResponse> {
    this._isLoading.set(true);
    this._authError.set(null);

    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          this.handleAuthSuccess(response);
          this.toast.success(`Welcome back, ${response.user.name}!`);
        }),
        catchError(error => {
          this.handleAuthError(error);
          return throwError(() => error);
        }),
        tap(() => this._isLoading.set(false))
      );
  }

  // Register
  register(userData: RegisterRequest): Observable<AuthResponse> {
    this._isLoading.set(true);
    this._authError.set(null);

    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, userData)
      .pipe(
        tap(response => {
          this.handleAuthSuccess(response);
          this.toast.success(`Welcome to CineHub Pro, ${response.user.name}!`);
        }),
        catchError(error => {
          this.handleAuthError(error);
          return throwError(() => error);
        }),
        tap(() => this._isLoading.set(false))
      );
  }

  // Logout
  logout(showMessage = true): void {
    const currentUser = this._currentUser();

    // Call logout endpoint if user is authenticated
    if (currentUser) {
      this.http.post(`${this.baseUrl}/auth/logout`, {})
        .pipe(catchError(() => of(null)))
        .subscribe();
    }

    // Clear local state
    this.clearAuthState();

    if (showMessage) {
      this.toast.info('You have been logged out');
    }

    // Redirect to login
    this.router.navigate(['/auth/login']);
  }

  // Refresh Token
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getStoredRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/refresh`, {
      refresh_token: refreshToken
    }).pipe(
      tap(response => {
        this.handleAuthSuccess(response, false);
      }),
      catchError(error => {
        console.error('Token refresh failed:', error);
        this.logout(false);
        return throwError(() => error);
      })
    );
  }

  // Forgot Password
  forgotPassword(email: string): Observable<any> {
    this._isLoading.set(true);

    return this.http.post(`${this.baseUrl}/auth/forgot-password`, { email })
      .pipe(
        tap(() => {
          this.toast.success('Password reset instructions sent to your email');
        }),
        catchError(error => {
          this.handleAuthError(error);
          return throwError(() => error);
        }),
        tap(() => this._isLoading.set(false))
      );
  }

  // Reset Password
  resetPassword(token: string, newPassword: string, confirmPassword: string): Observable<any> {
    this._isLoading.set(true);

    return this.http.post(`${this.baseUrl}/auth/reset-password`, {
      token,
      new_password: newPassword,
      confirm_password: confirmPassword
    }).pipe(
      tap(() => {
        this.toast.success('Password reset successful');
        this.router.navigate(['/auth/login']);
      }),
      catchError(error => {
        this.handleAuthError(error);
        return throwError(() => error);
      }),
      tap(() => this._isLoading.set(false))
    );
  }

  // Change Password
  changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Observable<any> {
    this._isLoading.set(true);

    return this.http.post(`${this.baseUrl}/auth/change-password`, {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword
    }).pipe(
      tap(() => {
        this.toast.success('Password changed successfully');
      }),
      catchError(error => {
        this.handleAuthError(error);
        return throwError(() => error);
      }),
      tap(() => this._isLoading.set(false))
    );
  }

  // Verify Email
  verifyEmail(token: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/verify-email`, { token })
      .pipe(
        tap(() => {
          this.toast.success('Email verified successfully');
        }),
        catchError(error => {
          this.toast.error('Email verification failed');
          return throwError(() => error);
        })
      );
  }

  // Update User Profile
  updateProfile(updates: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/users/profile`, updates)
      .pipe(
        tap(updatedUser => {
          this.setCurrentUser(updatedUser);
          this.toast.success('Profile updated successfully');
        }),
        catchError(error => {
          this.toast.error('Failed to update profile');
          return throwError(() => error);
        })
      );
  }

  // Get Current User from Server
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/users/profile`)
      .pipe(
        tap(user => {
          this.setCurrentUser(user);
        }),
        catchError(error => {
          console.error('Failed to get current user:', error);
          this.logout(false);
          return throwError(() => error);
        })
      );
  }

  // Token Management
  getToken(): string | null {
    return this.getStoredToken();
  }

  private getStoredToken(): string | null {
    return this.storage.getItem(environment.auth.tokenKey);
  }

  private getStoredRefreshToken(): string | null {
    return this.storage.getItem(environment.auth.refreshTokenKey);
  }

  private getStoredUser(): User | null {
    const userData = this.storage.getItem(environment.auth.userDataKey);
    return userData ? JSON.parse(userData) : null;
  }

  private handleAuthSuccess(response: AuthResponse, showWelcome = true): void {
    // Store tokens and user data
    this.storage.setItem(environment.auth.tokenKey, response.access_token);
    this.storage.setItem(environment.auth.refreshTokenKey, response.refresh_token);
    this.storage.setItem(environment.auth.userDataKey, JSON.stringify(response.user));

    // Update current user
    this.setCurrentUser(response.user);

    // Schedule token refresh
    this.scheduleTokenRefresh();

    // Clear any auth errors
    this._authError.set(null);
  }

  private handleAuthError(error: any): void {
    let errorMessage = 'An error occurred';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.message) {
      errorMessage = error.message;
    }

    this._authError.set(errorMessage);
    this.toast.error(errorMessage);
  }

  private setCurrentUser(user: User | null): void {
    this._currentUser.set(user);
    this.currentUserSubject.next(user);

    // Update storage
    if (user) {
      this.storage.setItem(environment.auth.userDataKey, JSON.stringify(user));
    }
  }

  private clearAuthState(): void {
    // Clear signals
    this._currentUser.set(null);
    this._authError.set(null);

    // Clear subject
    this.currentUserSubject.next(null);

    // Clear storage
    this.storage.removeItem(environment.auth.tokenKey);
    this.storage.removeItem(environment.auth.refreshTokenKey);
    this.storage.removeItem(environment.auth.userDataKey);

    // Clear refresh timer
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = undefined;
    }
  }

  private scheduleTokenRefresh(): void {
    const token = this.getStoredToken();
    if (!token) return;

    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = tokenData.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const refreshAt = expiresAt - environment.auth.autoRefreshThreshold;

      if (refreshAt > now) {
        this.tokenRefreshTimer = setTimeout(() => {
          this.refreshToken().subscribe({
            next: () => console.log('Token refreshed successfully'),
            error: (error) => console.error('Token refresh failed:', error)
          });
        }, refreshAt - now);
      }
    } catch (error) {
      console.error('Failed to parse token for refresh scheduling:', error);
    }
  }

  // Utility Methods
  hasRole(role: string): boolean {
    const user = this._currentUser();
    if (!user) return false;

    const roleHierarchy = {
      'user': 0,
      'moderator': 1,
      'admin': 2,
      'super_admin': 3
    };

    const userLevel = roleHierarchy[user.role as keyof typeof roleHierarchy];
    const requiredLevel = roleHierarchy[role as keyof typeof roleHierarchy];

    return userLevel >= requiredLevel;
  }

  canAccess(resource: string, action: 'create' | 'read' | 'update' | 'delete' = 'read'): boolean {
    const user = this._currentUser();
    if (!user) return false;

    // Basic permissions logic - can be expanded
    switch (user.role) {
      case 'super_admin':
        return true;
      case 'admin':
        return resource !== 'system_settings';
      case 'moderator':
        return ['movies', 'reviews', 'users'].includes(resource) && action !== 'delete';
      default:
        return ['profile', 'movies'].includes(resource) && ['read', 'update'].includes(action);
    }
  }

  // Mock authentication for development
  mockLogin(role: 'user' | 'admin' | 'moderator' = 'user'): void {
    if (!environment.production) {
      const mockUser: User = {
        id: 'mock-user-id',
        email: 'user@example.com',
        username: 'mockuser',
        name: 'Mock User',
        role,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
        last_login: new Date(),
        email_verified: true,
        language: 'en',
        timezone: 'UTC',
        newsletter_subscribed: false,
        preferences: {
          theme: 'auto',
          language: 'en',
          region: 'US',
          adult_content: false,
          notifications: {
            email_notifications: true,
            push_notifications: false,
            in_app_notifications: true,
            marketing_emails: false,
            movie_recommendations: true,
            new_releases: true,
            price_alerts: false,
            social_activities: true,
            system_updates: true
          },
          discovery: {
            preferred_genres: [28, 12, 878],
            blocked_genres: [],
            min_rating: 6.0,
            include_adult: false,
            preferred_languages: ['en'],
            preferred_regions: ['US']
          },
          privacy: {
            profile_visibility: 'public',
            show_activity: true,
            show_ratings: true,
            show_reviews: true,
            show_lists: true,
            allow_friend_requests: true,
            allow_messages: true,
            data_sharing: false,
            analytics_tracking: true
          },
          accessibility: {
            high_contrast: false,
            large_text: false,
            reduced_motion: false,
            screen_reader: false,
            keyboard_navigation: false,
            color_blind_support: false
          }
        },
        stats: {
          movies_watched: 45,
          movies_rated: 32,
          reviews_written: 8,
          lists_created: 3,
          followers_count: 12,
          following_count: 18,
          average_rating: 7.2,
          total_watch_time: 6840,
          favorite_genres: [],
          monthly_activity: [],
          yearly_activity: []
        }
      };

      this.setCurrentUser(mockUser);
      this.toast.success(`Logged in as ${role}`);
    }
  }

  open() { this.isModalOpen.set(true); }
  close() { this.isModalOpen.set(false); }
  switch(form: 'signin'|'signup'|'reset') { this.activeForm.set(form); }

  reset(email: string) {
    return this.http.post(`${this.baseUrl}/api/auth/reset`, { email });
  }

  setUser(u: User|null) {
    this.currentUser.set(u);
    if (u) this.safeSet('cinehub_user', JSON.stringify(u));
    else this.safeRemove('cinehub_user');
  }

  private safeGet(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
  private safeSet(key: string, v: string) { try { localStorage.setItem(key, v); } catch {} }
  private safeRemove(key: string) { try { localStorage.removeItem(key); } catch {} }
}
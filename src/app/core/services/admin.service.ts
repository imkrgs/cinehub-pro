import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { User } from '@core/models/user.model';
import { ErrorHandlerService } from './error-handler.service';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalMovies: number;
  totalReviews: number;
  newUsersToday: number;
  newReviewsToday: number;
  serverUptime: string;
  systemHealth: 'good' | 'warning' | 'critical';
}

export interface UserManagement {
  users: User[];
  totalCount: number;
  page: number;
  pageSize: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly errorHandler = inject(ErrorHandlerService);

  private readonly API_BASE_URL = environment.api.baseUrl;

  getDashboardStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.API_BASE_URL}/admin/stats`).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Failed to load admin stats');
        return of({
          totalUsers: 1247,
          activeUsers: 892,
          totalMovies: 50000,
          totalReviews: 8932,
          newUsersToday: 23,
          newReviewsToday: 156,
          serverUptime: '15d 7h 23m',
          systemHealth: 'good' as const
        });
      })
    );
  }

  getUsers(page: number = 1, pageSize: number = 20, search?: string): Observable<UserManagement> {
    let params = `page=${page}&pageSize=${pageSize}`;
    if (search) {
      params += `&search=${encodeURIComponent(search)}`;
    }

    return this.http.get<UserManagement>(`${this.API_BASE_URL}/admin/users?${params}`).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Failed to load users');
        return of({
          users: this.getMockUsers(),
          totalCount: 1247,
          page: 1,
          pageSize: 20
        });
      })
    );
  }

  updateUserStatus(userId: string, status: 'active' | 'inactive' | 'suspended' | 'banned'): Observable<User> {
    return this.http.patch<User>(`${this.API_BASE_URL}/admin/users/${userId}/status`, { status }).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Failed to update user status');
        throw error;
      })
    );
  }

  updateUserRole(userId: string, role: 'user' | 'moderator' | 'admin'): Observable<User> {
    return this.http.patch<User>(`${this.API_BASE_URL}/admin/users/${userId}/role`, { role }).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Failed to update user role');
        throw error;
      })
    );
  }

  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE_URL}/admin/users/${userId}`).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Failed to delete user');
        throw error;
      })
    );
  }

  getSystemHealth(): Observable<any> {
    return this.http.get(`${this.API_BASE_URL}/admin/health`).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Failed to load system health');
        return of({
          status: 'good',
          services: {
            database: 'online',
            tmdb_api: 'online',
            redis: 'online',
            email: 'warning'
          },
          metrics: {
            cpu: 35,
            memory: 68,
            disk: 42
          }
        });
      })
    );
  }

  generateReport(type: 'users' | 'movies' | 'activity', dateRange: { start: Date, end: Date }): Observable<Blob> {
    return this.http.post(`${this.API_BASE_URL}/admin/reports/${type}`, dateRange, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Failed to generate report');
        throw error;
      })
    );
  }

  clearCache(): Observable<void> {
    return this.http.post<void>(`${this.API_BASE_URL}/admin/cache/clear`, {}).pipe(
      catchError(error => {
        this.errorHandler.handleError(error, 'Failed to clear cache');
        throw error;
      })
    );
  }

  private getMockUsers(): User[] {
    return [
      {
        id: '1',
        email: 'john.doe@email.com',
        username: 'johndoe',
        name: 'John Doe',
        role: 'user',
        status: 'active',
        created_at: new Date('2024-01-15'),
        updated_at: new Date('2024-09-10'),
        last_login: new Date('2024-09-10'),
        email_verified: true,
        language: 'en',
        timezone: 'UTC',
        newsletter_subscribed: true,
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
      }
    ];
  }
}
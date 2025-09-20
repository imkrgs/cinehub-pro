// src/app/features/admin/dashboard/admin-dashboard.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AdminService, AdminStats } from '@core/services/admin.service';
import { AuthService } from '@core/services/auth.service';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule,
        MatTabsModule,
        MatChipsModule,
        MatProgressBarModule,
        LoadingSpinnerComponent
    ],
    template: `
    <div class="space-y-8">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">Admin Dashboard</h1>
          <p class="text-gray-600 dark:text-gray-400">
            Welcome back, {{ currentUser()?.name }}
          </p>
        </div>

        <div class="flex space-x-2">
          <button mat-raised-button color="primary" (click)="refreshData()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
          
          <button mat-outlined-button routerLink="/admin/reports">
            <mat-icon>assessment</mat-icon>
            Reports
          </button>
        </div>
      </div>

      <!-- Stats Overview -->
      @if (isLoading()) {
        <app-loading-spinner message="Loading dashboard data..."></app-loading-spinner>
      } @else if (stats()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <mat-card class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-2xl font-bold text-primary-500">
                  {{ stats()!.totalUsers | number }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">Total Users</div>
                <div class="text-xs text-green-600 mt-1">
                  +{{ stats()!.newUsersToday }} today
                </div>
              </div>
              <mat-icon class="text-4xl text-primary-500">people</mat-icon>
            </div>
          </mat-card>

          <mat-card class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-2xl font-bold text-blue-500">
                  {{ stats()!.activeUsers | number }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">Active Users</div>
                <div class="text-xs text-gray-500 mt-1">
                  {{ getActiveUserPercentage() }}% of total
                </div>
              </div>
              <mat-icon class="text-4xl text-blue-500">person_check</mat-icon>
            </div>
          </mat-card>

          <mat-card class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-2xl font-bold text-purple-500">
                  {{ stats()!.totalMovies | number }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">Total Movies</div>
                <div class="text-xs text-gray-500 mt-1">
                  In database
                </div>
              </div>
              <mat-icon class="text-4xl text-purple-500">movie</mat-icon>
            </div>
          </mat-card>

          <mat-card class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-2xl font-bold text-orange-500">
                  {{ stats()!.totalReviews | number }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">User Reviews</div>
                <div class="text-xs text-green-600 mt-1">
                  +{{ stats()!.newReviewsToday }} today
                </div>
              </div>
              <mat-icon class="text-4xl text-orange-500">rate_review</mat-icon>
            </div>
          </mat-card>
        </div>

        <!-- System Health -->
        <mat-card class="p-6">
          <h2 class="text-xl font-semibold mb-4 flex items-center">
            <mat-icon class="mr-2">health_and_safety</mat-icon>
            System Health
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="text-center">
              <div class="text-3xl mb-2">
                @switch (stats()!.systemHealth) {
                  @case ('good') {
                    <span class="text-green-500">✅</span>
                  }
                  @case ('warning') {
                    <span class="text-yellow-500">⚠️</span>
                  }
                  @case ('critical') {
                    <span class="text-red-500">🚨</span>
                  }
                }
              </div>
              <div class="font-medium capitalize">{{ stats()!.systemHealth }}</div>
              <div class="text-xs text-gray-500">Overall Status</div>
            </div>

            <div class="text-center">
              <div class="text-lg font-bold">{{ stats()!.serverUptime }}</div>
              <div class="text-xs text-gray-500">Server Uptime</div>
            </div>

            <div class="text-center">
              <button mat-outlined-button (click)="clearCache()" [disabled]="isClearing()">
                @if (isClearing()) {
                  <mat-icon class="animate-spin">refresh</mat-icon>
                } @else {
                  <mat-icon>delete_sweep</mat-icon>
                }
                Clear Cache
              </button>
            </div>

            <div class="text-center">
              <button mat-outlined-button routerLink="/admin/logs">
                <mat-icon>list_alt</mat-icon>
                View Logs
              </button>
            </div>
          </div>
        </mat-card>

        <!-- Quick Actions -->
        <mat-card class="p-6">
          <h2 class="text-xl font-semibold mb-4">Quick Actions</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button mat-raised-button color="primary" routerLink="/admin/users" class="!py-3">
              <mat-icon>people</mat-icon>
              Manage Users
            </button>
            
            <button mat-raised-button routerLink="/admin/movies" class="!py-3">
              <mat-icon>movie</mat-icon>
              Manage Movies
            </button>
            
            <button mat-raised-button routerLink="/admin/reviews" class="!py-3">
              <mat-icon>rate_review</mat-icon>
              Review Moderation
            </button>
            
            <button mat-raised-button routerLink="/admin/analytics" class="!py-3">
              <mat-icon>analytics</mat-icon>
              View Analytics
            </button>
          </div>
        </mat-card>

        <!-- Recent Activity -->
        <mat-card class="p-6">
          <h2 class="text-xl font-semibold mb-4">Recent Activity</h2>
          
          <div class="space-y-4">
            <!-- Mock activity items -->
            <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div class="flex items-center space-x-3">
                <mat-icon class="text-green-500">person_add</mat-icon>
                <div>
                  <div class="font-medium">New user registered</div>
                    <div class="text-sm text-gray-500">john.doe&#64;example.com</div>
                </div>
              </div>
              <div class="text-sm text-gray-500">2 minutes ago</div>
            </div>

            <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div class="flex items-center space-x-3">
                <mat-icon class="text-blue-500">rate_review</mat-icon>
                <div>
                  <div class="font-medium">Review submitted</div>
                  <div class="text-sm text-gray-500">The Dark Knight - 5 stars</div>
                </div>
              </div>
              <div class="text-sm text-gray-500">5 minutes ago</div>
            </div>

            <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div class="flex items-center space-x-3">
                <mat-icon class="text-yellow-500">warning</mat-icon>
                <div>
                  <div class="font-medium">Review flagged</div>
                  <div class="text-sm text-gray-500">Contains inappropriate content</div>
                </div>
              </div>
              <div class="text-sm text-gray-500">10 minutes ago</div>
            </div>

            <div class="text-center pt-4">
              <button mat-outlined-button>
                View All Activity
              </button>
            </div>
          </div>
        </mat-card>
      }
    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
    private readonly adminService = inject(AdminService);
    protected readonly authService = inject(AuthService);

    protected readonly currentUser = this.authService.currentUser;
    protected readonly stats = signal<AdminStats | null>(null);
    protected readonly isLoading = signal(true);
    protected readonly isClearing = signal(false);

    ngOnInit(): void {
        this.loadDashboardData();
    }

    private loadDashboardData(): void {
        this.isLoading.set(true);

        this.adminService.getDashboardStats().subscribe({
            next: (stats) => {
                this.stats.set(stats);
                this.isLoading.set(false);
            },
            error: (error) => {
                console.error('Error loading dashboard data:', error);
                this.isLoading.set(false);
            }
        });
    }

    refreshData(): void {
        this.loadDashboardData();
    }

    clearCache(): void {
        this.isClearing.set(true);

        this.adminService.clearCache().subscribe({
            next: () => {
                this.isClearing.set(false);
                // Could show success message
            },
            error: (error) => {
                console.error('Error clearing cache:', error);
                this.isClearing.set(false);
            }
        });
    }

    getActiveUserPercentage(): number {
        const statsData = this.stats();
        if (!statsData || statsData.totalUsers === 0) return 0;

        return Math.round((statsData.activeUsers / statsData.totalUsers) * 100);
    }
}

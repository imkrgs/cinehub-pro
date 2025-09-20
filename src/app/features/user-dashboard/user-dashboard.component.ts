// src/app/features/user-dashboard/user-dashboard.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';

import { AuthService } from '@core/services/auth.service';
import { UserMovieService } from '@core/services/user-movie.service';
import { TmdbService } from '@core/services/tmdb.service';
import { MovieCardComponent } from '@shared/components/movie-card/movie-card.component';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';

@Component({
    selector: 'app-user-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatTabsModule,
        MatChipsModule,
        MovieCardComponent,
        LoadingSpinnerComponent
    ],
    template: `
    <div class="space-y-8">
      <!-- Welcome Header -->
      <div class="bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-2xl p-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold mb-2">
              Welcome back, {{ currentUser()?.name }}! 👋
            </h1>
            <p class="text-white/90">Here's what's happening with your movies</p>
          </div>
          
          <div class="text-center">
            <div class="text-2xl font-bold">{{ totalMoviesWatched() }}</div>
            <div class="text-sm text-white/80">Movies Watched</div>
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <mat-card class="p-6 text-center">
          <mat-icon class="text-4xl text-primary-500 mb-2">bookmark</mat-icon>
          <div class="text-2xl font-bold">{{ watchlistCount() }}</div>
          <div class="text-gray-600 dark:text-gray-400">In Watchlist</div>
        </mat-card>

        <mat-card class="p-6 text-center">
          <mat-icon class="text-4xl text-red-500 mb-2">favorite</mat-icon>
          <div class="text-2xl font-bold">{{ favoritesCount() }}</div>
          <div class="text-gray-600 dark:text-gray-400">Favorites</div>
        </mat-card>

        <mat-card class="p-6 text-center">
          <mat-icon class="text-4xl text-yellow-500 mb-2">star</mat-icon>
          <div class="text-2xl font-bold">{{ ratingsCount() }}</div>
          <div class="text-gray-600 dark:text-gray-400">Movies Rated</div>
        </mat-card>

        <mat-card class="p-6 text-center">
          <mat-icon class="text-4xl text-green-500 mb-2">trending_up</mat-icon>
          <div class="text-2xl font-bold">{{ averageRating() }}</div>
          <div class="text-gray-600 dark:text-gray-400">Avg Rating</div>
        </mat-card>
      </div>

      <!-- Quick Actions -->
      <mat-card class="p-6">
        <h2 class="text-xl font-semibold mb-4">Quick Actions</h2>
        <div class="flex flex-wrap gap-4">
          <button mat-raised-button color="primary" routerLink="/movies">
            <mat-icon>explore</mat-icon>
            Discover Movies
          </button>
          
          <button mat-raised-button routerLink="/search">
            <mat-icon>search</mat-icon>
            Search Movies
          </button>
          
          <button mat-outlined-button routerLink="/profile">
            <mat-icon>person</mat-icon>
            Edit Profile
          </button>
          
          <button mat-outlined-button routerLink="/lists">
            <mat-icon>list</mat-icon>
            My Lists
          </button>
        </div>
      </mat-card>

      <!-- Recent Activity -->
      <mat-card class="p-6">
        <h2 class="text-xl font-semibold mb-6">Your Movies</h2>
        
        <mat-tab-group>
          <!-- Watchlist -->
          <mat-tab label="Watchlist">
            <div class="py-6">
              @if (isLoadingWatchlist()) {
                <app-loading-spinner message="Loading watchlist..."></app-loading-spinner>
              } @else if (watchlistMovies().length > 0) {
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  @for (item of watchlistMovies().slice(0, 10); track item.movie_id) {
                    <app-movie-card [movie]="item.movie"></app-movie-card>
                  }
                </div>
                
                @if (watchlistMovies().length > 10) {
                  <div class="text-center mt-6">
                    <button mat-outlined-button routerLink="/watchlist">
                      View All {{ watchlistCount() }} Movies
                    </button>
                  </div>
                }
              } @else {
                <div class="text-center py-12">
                  <mat-icon class="text-6xl text-gray-400 mb-4">bookmark_border</mat-icon>
                  <h3 class="text-lg font-semibold mb-2">No movies in watchlist</h3>
                  <p class="text-gray-600 dark:text-gray-400 mb-4">
                    Start adding movies you want to watch later
                  </p>
                  <button mat-raised-button color="primary" routerLink="/movies">
                    Discover Movies
                  </button>
                </div>
              }
            </div>
          </mat-tab>

          <!-- Favorites -->
          <mat-tab label="Favorites">
            <div class="py-6">
              @if (isLoadingFavorites()) {
                <app-loading-spinner message="Loading favorites..."></app-loading-spinner>
              } @else if (favoriteMovies().length > 0) {
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  @for (item of favoriteMovies().slice(0, 10); track item.movie_id) {
                    <app-movie-card [movie]="item.movie"></app-movie-card>
                  }
                </div>
                
                @if (favoriteMovies().length > 10) {
                  <div class="text-center mt-6">
                    <button mat-outlined-button routerLink="/favorites">
                      View All {{ favoritesCount() }} Movies
                    </button>
                  </div>
                }
              } @else {
                <div class="text-center py-12">
                  <mat-icon class="text-6xl text-gray-400 mb-4">favorite_border</mat-icon>
                  <h3 class="text-lg font-semibold mb-2">No favorite movies</h3>
                  <p class="text-gray-600 dark:text-gray-400 mb-4">
                    Mark movies as favorites to see them here
                  </p>
                  <button mat-raised-button color="primary" routerLink="/movies">
                    Find Movies to Love
                  </button>
                </div>
              }
            </div>
          </mat-tab>

          <!-- Recently Rated -->
          <mat-tab label="Recent Ratings">
            <div class="py-6">
              @if (movieRatings().length > 0) {
                <div class="space-y-4">
                  @for (rating of movieRatings().slice(0, 5); track rating.movie_id) {
                    <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <h4 class="font-medium">Movie ID: {{ rating.movie_id }}</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                          Rated on {{ formatDate(rating.created_at) }}
                        </p>
                      </div>
                      
                      <div class="flex items-center space-x-2">
                        <div class="flex items-center space-x-1">
                          <mat-icon class="text-yellow-400">star</mat-icon>
                          <span class="font-semibold">{{ rating.rating }}/10</span>
                        </div>
                        
                        <button mat-icon-button [routerLink]="['/movie', rating.movie_id]">
                          <mat-icon>open_in_new</mat-icon>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="text-center py-12">
                  <mat-icon class="text-6xl text-gray-400 mb-4">star_border</mat-icon>
                  <h3 class="text-lg font-semibold mb-2">No ratings yet</h3>
                  <p class="text-gray-600 dark:text-gray-400 mb-4">
                    Start rating movies to track your preferences
                  </p>
                  <button mat-raised-button color="primary" routerLink="/movies">
                    Find Movies to Rate
                  </button>
                </div>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-card>

      <!-- Recommendations -->
      <mat-card class="p-6">
        <h2 class="text-xl font-semibold mb-4">Recommended for You</h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Based on your ratings and favorites
        </p>
        
        <div class="text-center py-8">
          <mat-icon class="text-6xl text-gray-400 mb-4">lightbulb_outline</mat-icon>
          <p class="text-gray-600 dark:text-gray-400">
            Recommendations will appear here once you rate more movies
          </p>
        </div>
      </mat-card>
    </div>
  `
})
export class UserDashboardComponent implements OnInit {
    protected readonly authService = inject(AuthService);
    protected readonly userMovieService = inject(UserMovieService);

    protected readonly currentUser = this.authService.currentUser;
    protected readonly watchlistMovies = this.userMovieService.watchlistItems;
    protected readonly favoriteMovies = this.userMovieService.favoriteItems;
    protected readonly movieRatings = this.userMovieService.ratings;

    protected readonly isLoadingWatchlist = signal(true);
    protected readonly isLoadingFavorites = signal(true);

    // Computed properties
    protected readonly watchlistCount = computed(() => this.watchlistMovies().length);
    protected readonly favoritesCount = computed(() => this.favoriteMovies().length);
    protected readonly ratingsCount = computed(() => this.movieRatings().length);

    protected readonly averageRating = computed(() => {
        const ratings = this.movieRatings();
        if (ratings.length === 0) return '0.0';

        const average = ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length;
        return average.toFixed(1);
    });

    protected readonly totalMoviesWatched = computed(() => {
        return this.currentUser()?.stats?.movies_watched || 0;
    });

    ngOnInit(): void {
        this.loadUserData();
    }

    private loadUserData(): void {
        // Load watchlist
        this.userMovieService.getWatchlist().subscribe({
            next: () => this.isLoadingWatchlist.set(false),
            error: () => this.isLoadingWatchlist.set(false)
        });

        // Load favorites
        this.userMovieService.getFavorites().subscribe({
            next: () => this.isLoadingFavorites.set(false),
            error: () => this.isLoadingFavorites.set(false)
        });

        // Load ratings
        this.userMovieService.getRatings().subscribe();
    }

    formatDate(date: Date): string {
        return new Date(date).toLocaleDateString();
    }
}

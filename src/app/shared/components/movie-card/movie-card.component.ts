import { Component, Input, Output, EventEmitter, inject, ChangeDetectionStrategy, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatRippleModule } from '@angular/material/core';

import { Movie } from '@core/models/movie.model';
import { TmdbService } from '@core/services/tmdb.service';
import { UserMovieService } from '@core/services/user-movie.service';
import { AuthService } from '@core/services/auth.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatRippleModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *ngIf="movie">
      <mat-card
        class="movie-card relative overflow-hidden group aspect-2-3"
        [routerLink]="['/movie', movie.id]"
        role="article"
        [attr.aria-labelledby]="'movie-title-' + movie.id"
        tabindex="0"
        matRipple
        [matRippleColor]="'rgba(255, 255, 255, 0.1)'">

        <!-- Skeleton loader -->
        <div class="skeleton-loader" *ngIf="!posterLoaded()">
          <mat-spinner diameter="40"></mat-spinner>
        </div>

        <!-- Poster with fade-in effect -->
        <ng-container *ngIf="movie.poster_path; else placeholder">
          <img
              class="poster"
              [class.loaded]="posterLoaded()"
              [src]="posterUrl()"
              [alt]="movie.title + ' poster'"
              (load)="onPosterLoad()"
              (error)="onImageError($event)"
              loading="lazy" />
        </ng-container>

        <ng-template #placeholder>
          <div class="placeholder-icon">
            <mat-icon aria-hidden="true">image_not_supported</mat-icon>
          </div>
        </ng-template>


        <!-- Top badges container -->
        <div class="absolute top-3 left-3 right-3 z-20 flex justify-between items-start">
          <!-- Rating badge -->
          <div class="rating-badge">
            <mat-icon class="text-yellow-400 !text-base" aria-hidden="true">star</mat-icon>
            <span aria-label="Rating">{{ formattedRating() }}</span>
          </div>

          <!-- Year badge -->
          <div *ngIf="releaseYear()" class="year-badge">
            {{ releaseYear() }}
          </div>
        </div>



        <!-- Bottom info overlay -->
        <div class="info-overlay">
          <div class="info-content">
            <h3 id="movie-title-{{movie.id}}" class="movie-title" [routerLink]="['/movie', movie.id]" (click)="$event.stopPropagation()">
              {{ movie.title }}
            </h3>

            <!-- Genres -->
            <div *ngIf="genreNames().length > 0" class="genres-container">
              <mat-chip-set aria-label="Genres">
                <mat-chip *ngFor="let g of genreNames().slice(0,2)" class="genre-chip" role="listitem">
                  {{ g }}
                </mat-chip>
                <mat-chip *ngIf="genreNames().length > 2" class="genre-chip-more">+{{ genreNames().length - 2 }}</mat-chip>
              </mat-chip-set>
            </div>

            <!-- Quick actions -->
            <div class="quick-actions">
              <ng-container *ngIf="isAuthenticated()">
                <button mat-icon-button
                        (click)="onToggleWatchlist($event)"
                        [color]="isInWatchlist() ? 'accent' : ''"
                        [attr.aria-pressed]="isInWatchlist()"
                        matTooltip="{{ isInWatchlist() ? 'Remove from Watchlist' : 'Add to Watchlist' }}">
                  <mat-icon>{{ isInWatchlist() ? 'bookmark' : 'bookmark_border' }}</mat-icon>
                </button>

                <button mat-icon-button
                        (click)="onToggleFavorite($event)"
                        [color]="isInFavorites() ? 'warn' : ''"
                        [attr.aria-pressed]="isInFavorites()"
                        matTooltip="{{ isInFavorites() ? 'Remove from Favorites' : 'Add to Favorites' }}">
                  <mat-icon>{{ isInFavorites() ? 'favorite' : 'favorite_border' }}</mat-icon>
                </button>
              </ng-container>
            </div>
          </div>
        </div>

      </mat-card>
    </ng-container>
  `,
  styles: [`
    /* Aspect ratio wrapper */
    .aspect-2-3 { 
      aspect-ratio: 2 / 3; 
      display: block; 
    }

    .movie-card {
      height: 100%;
      border-radius: 16px;
      overflow: hidden;
      position: relative;
      cursor: pointer;
      background: rgba(18, 18, 24, 0.8);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    /* Skeleton loader */
    .skeleton-loader {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(110deg, rgba(32, 32, 40, 0.5) 8%, rgba(45, 45, 55, 0.5) 18%, rgba(32, 32, 40, 0.5) 33%);
      background-size: 200% 100%;
      animation: 1.5s shine linear infinite;
      z-index: 10;
    }

    @keyframes shine {
      to {
        background-position-x: -200%;
      }
    }

    /* Poster styling */
    .poster {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
    }
    
    .poster.loaded {
      opacity: 1;
    }

    /* Badges */
    .rating-badge, .year-badge {
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 0.8rem;
    }

    .rating-badge {
      background: rgba(0, 0, 0, 0.6);
      color: white;
    }

    .year-badge {
      background: rgba(var(--primary-color-rgb, 99, 102, 241), 0.9);
      color: white;
    }

    .placeholder-icon {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(32, 32, 40, 0.6);
    }

    .placeholder-icon mat-icon {
      font-size: 48px;   /* control icon size */
      color: rgba(255, 255, 255, 0.6);
    }


    /* Action overlay */
    .action-overlay-container {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.6);
      opacity: 0;
      z-index: 10;
    }

    .movie-card:hover .action-overlay-container {
      opacity: 1;
    }

    .action-overlay {
      display: flex;
      background: rgba(20, 20, 28, 0.9);
      padding: 12px;
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    /* Info overlay */
    .info-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 15;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 30%, transparent);
      padding: 20px 16px 16px;
    }

    .info-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .movie-title {
      color: white;
      font-weight: 700;
      font-size: 1.1rem;
      line-height: 1.3;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .movie-title:hover {
      color: rgba(255, 255, 255, 0.9);
    }

    /* Genres */
    .genres-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .genre-chip, .genre-chip-more {
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.12) !important;
      color: white;
      font-size: 0.7rem;
      font-weight: 500;
      padding: 4px 10px;
      border-radius: 10px;
      height: auto;
    }

    /* Quick actions */
    .quick-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .quick-actions button {
      backdrop-filter: blur(12px);
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .quick-actions button:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    /* Mobile optimizations */
    @media (max-width: 640px) {
      .movie-card {
        border-radius: 12px;
      }
      
      .info-overlay {
        padding: 16px 12px 12px;
      }
      
      .movie-title {
        font-size: 1rem;
      }
      
      .action-overlay-container {
        opacity: 1;
        background: rgba(0, 0, 0, 0.4);
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .movie-card,
      .poster,
      .action-overlay-container {
        transition: none;
      }
    }
  `]
})
export class MovieCardComponent {
  private readonly tmdbService = inject(TmdbService);
  private readonly userMovieService = inject(UserMovieService);
  private readonly authService = inject(AuthService);

  @Input({ required: true }) movie!: Movie;
  @Output() watchlistToggle = new EventEmitter<Movie>();
  @Output() favoriteToggle = new EventEmitter<Movie>();

  // poster loaded signal for fade-in
  protected posterLoaded = signal(false);

  protected readonly posterUrl = computed(() =>
      this.movie ? this.tmdbService.getPosterUrl(this.movie.poster_path) : '/assets/images/placeholder-poster.jpg'
  );

  protected readonly formattedRating = computed(() =>
      this.movie ? this.tmdbService.formatRating(this.movie.vote_average) : '0.0'
  );

  protected readonly releaseYear = computed(() =>
      this.movie?.release_date ? this.tmdbService.getYearFromDate(this.movie.release_date) : null
  );

  protected readonly genreNames = computed(() =>
      this.movie ? this.tmdbService.getGenreNames(this.movie.genre_ids || []) : []
  );

  protected readonly isInWatchlist = computed(() =>
      this.movie ? this.userMovieService.isInWatchlist(this.movie.id) : false
  );

  protected readonly isInFavorites = computed(() =>
      this.movie ? this.userMovieService.isInFavorites(this.movie.id) : false
  );

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  onPosterLoad(): void {
    this.posterLoaded.set(true);
  }

  onToggleWatchlist(event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.movie) return;

    try {
      if (this.isInWatchlist()) {
        this.userMovieService.removeFromWatchlist(this.movie.id).pipe(take(1)).subscribe({
          next: () => this.watchlistToggle.emit(this.movie),
          error: () => console.error('Failed to remove from watchlist')
        });
      } else {
        this.userMovieService.addToWatchlist(this.movie).pipe(take(1)).subscribe({
          next: () => this.watchlistToggle.emit(this.movie),
          error: () => console.error('Failed to add to watchlist')
        });
      }
    } catch (e) {
      console.error('Watchlist toggle failed', e);
    }
  }

  onToggleFavorite(event?: Event): void {
    if (event) event.stopPropagation();
    if (!this.movie) return;

    try {
      if (this.isInFavorites()) {
        this.userMovieService.removeFromFavorites(this.movie.id).pipe(take(1)).subscribe({
          next: () => this.favoriteToggle.emit(this.movie),
          error: () => console.error('Failed to remove from favorites')
        });
      } else {
        this.userMovieService.addToFavorites(this.movie).pipe(take(1)).subscribe({
          next: () => this.favoriteToggle.emit(this.movie),
          error: () => console.error('Failed to add to favorites')
        });
      }
    } catch (e) {
      console.error('Favorite toggle failed', e);
    }
  }

  onImageError(event: any): void {
    this.posterLoaded.set(true);
  }
}
// src/app/features/movie-detail/movie-detail.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { Movie, CastMember, CrewMember, Video, Review } from '@core/models/movie.model';
import { TmdbService } from '@core/services/tmdb.service';
import { UserMovieService } from '@core/services/user-movie.service';
import { AuthService } from '@core/services/auth.service';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { MovieCardComponent } from '@shared/components/movie-card/movie-card.component';

@Component({
    selector: 'app-movie-detail',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatTabsModule,
        MatDialogModule,
        MatProgressBarModule,
        LoadingSpinnerComponent,
        MovieCardComponent
    ],
    template: `
    @if (isLoading()) {
      <app-loading-spinner message="Loading movie details..."></app-loading-spinner>
    } @else if (movie()) {
      <div class="space-y-8">
        <!-- Hero Section -->
        <div class="relative">
          <!-- Backdrop -->
          @if (movie()?.backdrop_path) {
            <div class="absolute inset-0 overflow-hidden rounded-2xl">
              <img 
                [src]="backdropUrl()" 
                [alt]="movie()!.title"
                class="w-full h-full object-cover opacity-20">
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
            </div>
          }
          
          <div class="relative p-8">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <!-- Poster -->
                
              <div class="lg:col-span-1">
                <div class="rounded-xl overflow-hidden shadow-2xl">
                  <img 
                    [src]="posterUrl()" 
                    [alt]="movie()!.title"
                    class="w-full h-full object-cover"
                    (error)="onImageError($event)">
                </div>
              </div>

              <!-- Movie Info -->
              <div class="lg:col-span-2 space-y-6">
                <div>
                  <h1 class="text-4xl font-bold mb-2">{{ movie()!.title }}</h1>
                  @if (movie()!.original_title !== movie()!.title) {
                    <p class="text-xl text-gray-400 mb-4">{{ movie()!.original_title }}</p>
                  }
                  
                  <div class="flex flex-wrap items-center gap-4 mb-4">
                    <!-- Rating -->
                    <div class="flex items-center space-x-2">
                      <div class="flex items-center space-x-1">
                        <mat-icon class="text-yellow-400">star</mat-icon>
                        <span class="text-lg font-semibold">{{ formattedRating() }}</span>
                      </div>
                      <span class="text-gray-400">({{ movie()!.vote_count }} votes)</span>
                    </div>

                    <!-- Runtime -->
                    @if (movie()!.runtime) {
                      <div class="flex items-center space-x-1">
                        <mat-icon class="text-gray-400">schedule</mat-icon>
                        <span>{{ formattedRuntime() }}</span>
                      </div>
                    }

                    <!-- Release Date -->
                    @if (movie()!.release_date) {
                      <div class="flex items-center space-x-1">
                        <mat-icon class="text-gray-400">calendar_today</mat-icon>
                        <span>{{ formattedReleaseDate() }}</span>
                      </div>
                    }
                  </div>

                  <!-- Genres -->
                  @if (movie()!.genres?.length) {
                    <div class="flex flex-wrap gap-2 mb-6">
                      @for (genre of movie()!.genres; track genre.id) {
                        <mat-chip>{{ genre.name }}</mat-chip>
                      }
                    </div>
                  }

                  <!-- Tagline -->
                  @if (movie()!.tagline) {
                    <p class="text-lg italic text-gray-300 mb-4">"{{ movie()!.tagline }}"</p>
                  }

                  <!-- Overview -->
                  @if (movie()!.overview) {
                    <p class="text-lg leading-relaxed mb-6">{{ movie()!.overview }}</p>
                  }
                </div>

                <!-- Action Buttons -->
                <div class="flex flex-wrap gap-4">
                  @if (trailerVideo()) {
                    <button mat-raised-button color="primary" (click)="playTrailer()">
                      <mat-icon>play_arrow</mat-icon>
                      Watch Trailer
                    </button>
                  }

                  @if (authService.isAuthenticated()) {
                    <button 
                      mat-raised-button 
                      [color]="isInWatchlist() ? 'accent' : 'basic'"
                      (click)="toggleWatchlist()">
                      <mat-icon>{{ isInWatchlist() ? 'bookmark' : 'bookmark_border' }}</mat-icon>
                      {{ isInWatchlist() ? 'Remove from Watchlist' : 'Add to Watchlist' }}
                    </button>

                    <button 
                      mat-raised-button 
                      [color]="isInFavorites() ? 'warn' : 'basic'"
                      (click)="toggleFavorite()">
                      <mat-icon>{{ isInFavorites() ? 'favorite' : 'favorite_border' }}</mat-icon>
                      {{ isInFavorites() ? 'Remove from Favorites' : 'Add to Favorites' }}
                    </button>

                    <button mat-raised-button (click)="openRatingDialog()">
                      <mat-icon>star_rate</mat-icon>
                      Rate Movie
                    </button>
                  }

                  <button mat-outlined-button (click)="shareMovie()">
                    <mat-icon>share</mat-icon>
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Additional Details -->
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6">
          <mat-tab-group>
            <!-- Cast & Crew -->
            <mat-tab label="Cast & Crew">
              <div class="py-6">
                @if (movie()!.credits?.cast?.length) {
                  <div class="mb-8">
                    <h3 class="text-xl font-semibold mb-4">Cast</h3>
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                      @for (actor of movie()!.credits!.cast.slice(0, 12); track actor.id) {
                        <div class="text-center">
                          <div class="rounded-lg overflow-hidden mb-2">
                            <img 
                              [src]="tmdbService.getProfileUrl(actor.profile_path)" 
                              [alt]="actor.name"
                              class="w-full h-full object-cover"
                              (error)="onImageError($event)">
                          </div>
                          <p class="font-medium text-sm">{{ actor.name }}</p>
                          <p class="text-xs text-gray-500">{{ actor.character }}</p>
                        </div>
                      }
                    </div>
                  </div>
                }

                @if (director()) {
                  <div>
                    <h3 class="text-xl font-semibold mb-4">Director</h3>
                    <div class="flex items-center space-x-4">
                      <div class="w-16 h-16 rounded-full overflow-hidden">
                        <img 
                          [src]="tmdbService.getProfileUrl(director()!.profile_path)" 
                          [alt]="director()!.name"
                          class="w-full h-full object-cover"
                          (error)="onImageError($event)">
                      </div>
                      <div>
                        <p class="font-medium">{{ director()!.name }}</p>
                        <p class="text-sm text-gray-500">Director</p>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </mat-tab>

            <!-- Reviews -->
            <mat-tab label="Reviews">
              <div class="py-6 space-y-6">
                @if (movie()!.reviews?.results?.length) {
                  @for (review of movie()!.reviews!.results.slice(0, 5); track review.id) {
                    <div class="border-b pb-6 last:border-b-0">
                      <div class="flex items-start justify-between mb-3">
                        <div class="flex items-center space-x-3">
                          <div class="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                            <span class="text-white font-semibold">{{ review.author[0].toUpperCase() }}</span>
                          </div>
                          <div>
                            <p class="font-medium">{{ review.author }}</p>
                            @if (review.author_details.rating) {
                              <div class="flex items-center space-x-1">
                                <mat-icon class="text-yellow-400 text-sm">star</mat-icon>
                                <span class="text-sm">{{ review.author_details.rating }}/10</span>
                              </div>
                            }
                          </div>
                        </div>
                        <span class="text-sm text-gray-500">{{ formatDate(review.created_at) }}</span>
                      </div>
                      <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {{ review.content.length > 500 ? review.content.substring(0, 500) + '...' : review.content }}
                      </p>
                    </div>
                  }
                } @else {
                  <div class="text-center py-12">
                    <mat-icon class="text-6xl text-gray-400 mb-4">rate_review</mat-icon>
                    <p class="text-gray-600 dark:text-gray-400">No reviews available</p>
                  </div>
                }
              </div>
            </mat-tab>

            <!-- Details -->
            <mat-tab label="Details">
              <div class="py-6 space-y-4">
                @if (movie()!.budget) {
                  <div class="flex justify-between">
                    <span class="font-medium">Budget:</span>
                    <span>{{ formatCurrency(movie()!.budget) }}</span>
                  </div>
                }

                @if (movie()!.revenue) {
                  <div class="flex justify-between">
                    <span class="font-medium">Revenue:</span>
                    <span>{{ formatCurrency(movie()!.revenue) }}</span>
                  </div>
                }

                @if (movie()!.production_companies?.length) {
                  <div>
                    <span class="font-medium">Production Companies:</span>
                    <div class="mt-2">
                      @for (company of movie()!.production_companies; track company.id) {
                        <span class="inline-block bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mr-2 mb-2">
                          {{ company.name }}
                        </span>
                      }
                    </div>
                  </div>
                }

                @if (movie()!.spoken_languages?.length) {
                  <div>
                    <span class="font-medium">Languages:</span>
                    <div class="mt-2">
                      @for (lang of movie()!.spoken_languages; track lang.iso_639_1) {
                        <span class="inline-block bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mr-2 mb-2">
                          {{ lang.english_name }}
                        </span>
                      }
                    </div>
                  </div>
                }

                @if (movie()!.homepage) {
                  <div class="flex justify-between">
                    <span class="font-medium">Official Website:</span>
                    <a [href]="movie()!.homepage" target="_blank" class="text-primary-500 hover:underline">
                      Visit Site
                    </a>
                  </div>
                }

                @if (movie()!.imdb_id) {
                  <div class="flex justify-between">
                    <span class="font-medium">IMDb:</span>
                    <a [href]="'https://www.imdb.com/title/' + movie()!.imdb_id" target="_blank" class="text-primary-500 hover:underline">
                      View on IMDb
                    </a>
                  </div>
                }
              </div>
            </mat-tab>
          </mat-tab-group>
        </div>

        <!-- Similar Movies -->
        @if (movie()!.similar?.results?.length) {
          <div>
            <h2 class="text-2xl font-bold mb-6">Similar Movies</h2>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              @for (similarMovie of movie()!.similar!.results.slice(0, 10); track similarMovie.id) {
                <app-movie-card [movie]="similarMovie"></app-movie-card>
              }
            </div>
          </div>
        }
      </div>
    } @else {
      <div class="text-center py-12">
        <mat-icon class="text-6xl text-gray-400 mb-4">error</mat-icon>
        <h2 class="text-2xl font-bold mb-4">Movie Not Found</h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">The movie you're looking for doesn't exist or has been removed.</p>
        <button mat-raised-button color="primary" (click)="goBack()">
          Go Back
        </button>
      </div>
    }
  `
})
export class MovieDetailComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    protected readonly tmdbService = inject(TmdbService);
    private readonly userMovieService = inject(UserMovieService);
    protected readonly authService = inject(AuthService);
    private readonly dialog = inject(MatDialog);

    protected readonly movie = signal<Movie | null>(null);
    protected readonly isLoading = signal(true);

    // Computed properties
    protected readonly posterUrl = computed(() =>
        this.movie() ? this.tmdbService.getPosterUrl(this.movie()!.poster_path) : ''
    );

    protected readonly backdropUrl = computed(() =>
        this.movie() ? this.tmdbService.getBackdropUrl(this.movie()!.backdrop_path) : ''
    );

    protected readonly formattedRating = computed(() =>
        this.movie() ? this.tmdbService.formatRating(this.movie()!.vote_average) : '0.0'
    );

    protected readonly formattedRuntime = computed(() =>
        this.movie()?.runtime != null
            ? this.tmdbService.formatRuntime(this.movie()!.runtime ?? 0)
            : ''
    );

    protected readonly formattedReleaseDate = computed(() =>
        this.movie()?.release_date ? new Date(this.movie()!.release_date).toLocaleDateString() : ''
    );

    protected readonly director = computed(() =>
        this.movie()?.credits?.crew?.find(person => person.job === 'Director')
    );

    protected readonly trailerVideo = computed(() =>
        this.movie()?.videos?.results?.find(video =>
            video.type === 'Trailer' && video.site === 'YouTube'
        )
    );

    protected readonly isInWatchlist = computed(() =>
        this.movie() ? this.userMovieService.isInWatchlist(this.movie()!.id) : false
    );

    protected readonly isInFavorites = computed(() =>
        this.movie() ? this.userMovieService.isInFavorites(this.movie()!.id) : false
    );

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            const movieId = Number(params['id']);
            if (movieId) {
                this.loadMovieDetails(movieId);
            }
        });
    }

    private loadMovieDetails(id: number): void {
        this.isLoading.set(true);

        this.tmdbService.getMovieDetails(id).subscribe({
            next: (movie) => {
                this.movie.set(movie);
                this.isLoading.set(false);
            },
            error: (error) => {
                console.error('Error loading movie details:', error);
                this.movie.set(null);
                this.isLoading.set(false);
            }
        });
    }

    toggleWatchlist(): void {
        const currentMovie = this.movie();
        if (!currentMovie) return;

        if (this.isInWatchlist()) {
            this.userMovieService.removeFromWatchlist(currentMovie.id).subscribe();
        } else {
            this.userMovieService.addToWatchlist(currentMovie).subscribe();
        }
    }

    toggleFavorite(): void {
        const currentMovie = this.movie();
        if (!currentMovie) return;

        if (this.isInFavorites()) {
            this.userMovieService.removeFromFavorites(currentMovie.id).subscribe();
        } else {
            this.userMovieService.addToFavorites(currentMovie).subscribe();
        }
    }

    playTrailer(): void {
        const trailer = this.trailerVideo();
        if (trailer) {
            window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank');
        }
    }

    openRatingDialog(): void {
        // Implementation for rating dialog
        console.log('Rating dialog would open here');
    }

    shareMovie(): void {
        const currentMovie = this.movie();
        if (!currentMovie) return;

        if (navigator.share) {
            navigator.share({
                title: currentMovie.title,
                text: currentMovie.overview,
                url: window.location.href
            });
        } else {
            // Fallback - copy to clipboard
            navigator.clipboard.writeText(window.location.href);
        }
    }

    goBack(): void {
        this.router.navigate(['/movies']);
    }

    formatRuntime(minutes?: number): string {
        if (!minutes && minutes !== 0) return 'Unknown';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

    formatCurrency(amount?: number): string {
        if (!amount) return 'Unknown';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    }


    formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString();
    }

    onImageError(event: any): void {
        event.target.src = '/assets/images/placeholder.jpg';
    }
}

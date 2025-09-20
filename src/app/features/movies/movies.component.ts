import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { Movie, MovieFilters, Genre } from '@core/models/movie.model';
import { TmdbService } from '@core/services/tmdb.service';
import { MovieCardComponent } from '@shared/components/movie-card/movie-card.component';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-movies',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatPaginatorModule,
    MovieCardComponent,
    LoadingSpinnerComponent
  ],
  template: `
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 class="text-3xl font-bold">Movies</h1>
          <p class="text-gray-600 dark:text-gray-400">Discover amazing movies from our collection</p>
        </div>

        <!-- Category Selector -->
        <mat-select [(value)]="selectedCategory" (selectionChange)="onCategoryChange()" class="min-w-48">
          <mat-option value="popular">Popular</mat-option>
          <mat-option value="top_rated">Top Rated</mat-option>
          <mat-option value="upcoming">Upcoming</mat-option>
          <mat-option value="now_playing">Now Playing</mat-option>
        </mat-select>
      </div>

      <!-- Filters -->
      <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <!-- Genre Filter -->
          <mat-select 
            [(value)]="selectedGenres" 
            (selectionChange)="onFiltersChange()"
            placeholder="All Genres" 
            multiple>
            @for (genre of genres(); track genre.id) {
              <mat-option [value]="genre.id">{{ genre.name }}</mat-option>
            }
          </mat-select>

          <!-- Year Filter -->
          <mat-select 
            [(value)]="selectedYear" 
            (selectionChange)="onFiltersChange()"
            placeholder="All Years">
            <mat-option [value]="null">All Years</mat-option>
            @for (year of years; track year) {
              <mat-option [value]="year">{{ year }}</mat-option>
            }
          </mat-select>

          <!-- Sort Filter -->
          <mat-select 
            [(value)]="selectedSort" 
            (selectionChange)="onFiltersChange()"
            placeholder="Sort By">
            <mat-option value="popularity.desc">Most Popular</mat-option>
            <mat-option value="release_date.desc">Newest First</mat-option>
            <mat-option value="release_date.asc">Oldest First</mat-option>
            <mat-option value="vote_average.desc">Highest Rated</mat-option>
            <mat-option value="vote_count.desc">Most Voted</mat-option>
          </mat-select>

          <!-- Clear Filters -->
          <button mat-stroked-button (click)="clearFilters()">
            <mat-icon>clear</mat-icon>
            Clear Filters
          </button>
        </div>

        <!-- Active Filters Display -->
        @if (hasActiveFilters()) {
          <div class="mt-4">
            <div class="flex flex-wrap gap-2">
              @for (genreId of selectedGenres; track genreId) {
                <mat-chip (removed)="removeGenreFilter(genreId)">
                  {{ getGenreName(genreId) }}
                  <mat-icon matChipRemove>cancel</mat-icon>
                </mat-chip>
              }

              @if (selectedYear) {
                <mat-chip (removed)="removeYearFilter()">
                  {{ selectedYear }}
                  <mat-icon matChipRemove>cancel</mat-icon>
                </mat-chip>
              }
            </div>
          </div>
        }
      </div>

      <!-- Movies Grid -->
      @if (isLoading()) {
        <app-loading-spinner message="Loading movies..."></app-loading-spinner>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          @for (movie of movies(); track movie.id) {
            <app-movie-card [movie]="movie"></app-movie-card>
          }
        </div>

        @if (movies().length === 0) {
          <div class="text-center py-12">
            <mat-icon class="text-6xl text-gray-400 mb-4">movie</mat-icon>
            <h3 class="text-xl font-semibold mb-2">No movies found</h3>
            <p class="text-gray-600 dark:text-gray-400">Try adjusting your filters or search criteria.</p>
            <button mat-raised-button color="primary" (click)="clearFilters()" class="mt-4">
              Clear All Filters
            </button>
          </div>
        }
      }

      <!-- Pagination -->
      @if (totalResults() > 0) {
        <div class="flex justify-center">
          <mat-paginator
            [length]="totalResults()"
            [pageSize]="pageSize"
            [pageSizeOptions]="[20, 40, 60, 100]"
            [pageIndex]="currentPage() - 1"
            (page)="onPageChange($event)"
            showFirstLastButtons>
          </mat-paginator>
        </div>
      }
    </div>
  `
})
export class MoviesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tmdbService = inject(TmdbService);

  protected readonly movies = signal<Movie[]>([]);
  protected readonly totalResults = signal(0);
  protected readonly currentPage = signal(1);
  protected readonly isLoading = signal(true);
  protected readonly genres = this.tmdbService.genres;

  protected selectedCategory: 'popular' | 'top_rated' | 'upcoming' | 'now_playing' = 'popular';
  protected selectedGenres: number[] = [];
  protected selectedYear: number | null = null;
  protected selectedSort = 'popularity.desc';
  protected pageSize = 20;

  protected readonly years = Array.from(
    { length: new Date().getFullYear() - 1900 + 2 }, 
    (_, i) => new Date().getFullYear() + 1 - i
  );

  protected readonly hasActiveFilters = computed(() => 
    this.selectedGenres.length > 0 || this.selectedYear !== null
  );

  ngOnInit(): void {
    // Load initial data based on route params
    this.route.queryParams.subscribe(params => {
      this.selectedCategory = params['category'] || 'popular';
      this.selectedGenres = params['genres'] ? params['genres'].split(',').map(Number) : [];
      this.selectedYear = params['year'] ? Number(params['year']) : null;
      this.selectedSort = params['sort'] || 'popularity.desc';
      const page = params['page'] ? Number(params['page']) : 1;
      this.currentPage.set(page);

      this.loadMovies();
    });
  }

  onCategoryChange(): void {
    this.updateRouteParams();
    this.loadMovies();
  }

  onFiltersChange(): void {
    this.currentPage.set(1);
    this.updateRouteParams();
    this.loadMovies();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage.set(event.pageIndex + 1);
    this.pageSize = event.pageSize;
    this.updateRouteParams();
    this.loadMovies();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  clearFilters(): void {
    this.selectedGenres = [];
    this.selectedYear = null;
    this.selectedSort = 'popularity.desc';
    this.currentPage.set(1);
    this.updateRouteParams();
    this.loadMovies();
  }

  removeGenreFilter(genreId: number): void {
    this.selectedGenres = this.selectedGenres.filter(id => id !== genreId);
    this.onFiltersChange();
  }

  removeYearFilter(): void {
    this.selectedYear = null;
    this.onFiltersChange();
  }

  getGenreName(genreId: number): string {
    const genre = this.genres().find(g => g.id === genreId);
    return genre?.name || 'Unknown';
  }

  private loadMovies(): void {
    this.isLoading.set(true);

    const filters: MovieFilters = {
      category: this.selectedCategory,
      genre_ids: this.selectedGenres.length > 0 ? this.selectedGenres : undefined,
      year: this.selectedYear || undefined,
      sort_by: this.selectedSort
    };

    const loadMethod = this.selectedGenres.length > 0 || this.selectedYear || this.selectedSort !== 'popularity.desc'
      ? this.tmdbService.discoverMovies(filters, this.currentPage())
      : this.tmdbService.getMovies(this.selectedCategory, this.currentPage());

    loadMethod.subscribe({
      next: (response) => {
        this.movies.set(response.results);
        this.totalResults.set(response.total_results);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading movies:', error);
        this.movies.set([]);
        this.totalResults.set(0);
        this.isLoading.set(false);
      }
    });
  }

  private updateRouteParams(): void {
    const queryParams: any = {};

    if (this.selectedCategory !== 'popular') {
      queryParams.category = this.selectedCategory;
    }

    if (this.selectedGenres.length > 0) {
      queryParams.genres = this.selectedGenres.join(',');
    }

    if (this.selectedYear) {
      queryParams.year = this.selectedYear;
    }

    if (this.selectedSort !== 'popularity.desc') {
      queryParams.sort = this.selectedSort;
    }

    if (this.currentPage() > 1) {
      queryParams.page = this.currentPage();
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'replace'
    });
  }
}
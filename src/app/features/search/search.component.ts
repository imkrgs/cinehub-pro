// src/app/features/search/search.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

import { Movie, Genre } from '@core/models/movie.model';
import { TmdbService } from '@core/services/tmdb.service';
import { MovieCardComponent } from '@shared/components/movie-card/movie-card.component';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';

@Component({
    selector: 'app-search',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatSelectModule,
        MatChipsModule,
        MatPaginatorModule,
        MovieCardComponent,
        LoadingSpinnerComponent
    ],
    template: `
    <div class="space-y-6">
      <!-- Search Header -->
      <div class="text-center">
        <h1 class="text-3xl font-bold mb-4">Search Movies</h1>
        <p class="text-gray-600 dark:text-gray-400">Find your next favorite movie</p>
      </div>

      <!-- Search Bar -->
      <div class="max-w-2xl mx-auto">
        <mat-form-field appearance="outline" class="w-full">
          <mat-icon matPrefix>search</mat-icon>
          <input 
            matInput 
            type="search"
            placeholder="Search for movies..."
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            (keyup.enter)="performSearch()">
          <button 
            mat-icon-button 
            matSuffix 
            (click)="clearSearch()"
            *ngIf="searchQuery">
            <mat-icon>clear</mat-icon>
          </button>
        </mat-form-field>
      </div>

      <!-- Advanced Filters -->
      <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <mat-select 
            [(value)]="selectedGenres" 
            (selectionChange)="onFiltersChange()"
            placeholder="Filter by genre" 
            multiple>
            @for (genre of genres(); track genre.id) {
              <mat-option [value]="genre.id">{{ genre.name }}</mat-option>
            }
          </mat-select>

          <mat-select 
            [(value)]="selectedYear" 
            (selectionChange)="onFiltersChange()"
            placeholder="Release year">
            <mat-option [value]="null">Any year</mat-option>
            @for (year of years; track year) {
              <mat-option [value]="year">{{ year }}</mat-option>
            }
          </mat-select>

          <mat-select 
            [(value)]="minRating" 
            (selectionChange)="onFiltersChange()"
            placeholder="Minimum rating">
            <mat-option [value]="0">Any rating</mat-option>
            <mat-option [value]="5">5.0+</mat-option>
            <mat-option [value]="6">6.0+</mat-option>
            <mat-option [value]="7">7.0+</mat-option>
            <mat-option [value]="8">8.0+</mat-option>
            <mat-option [value]="9">9.0+</mat-option>
          </mat-select>
        </div>

        @if (hasActiveFilters()) {
          <div class="mt-4 flex flex-wrap gap-2">
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
            
            @if (minRating > 0) {
              <mat-chip (removed)="removeRatingFilter()">
                {{ minRating }}.0+ rating
                <mat-icon matChipRemove>cancel</mat-icon>
              </mat-chip>
            }

            <button mat-stroked-button (click)="clearAllFilters()" class="ml-2">
              Clear All
            </button>
          </div>
        }
      </div>

      <!-- Search Results -->
      @if (isLoading()) {
        <app-loading-spinner message="Searching movies..."></app-loading-spinner>
      } @else if (searchQuery && movies().length === 0 && !isLoading()) {
        <div class="text-center py-12">
          <mat-icon class="text-6xl text-gray-400 mb-4">search_off</mat-icon>
          <h3 class="text-xl font-semibold mb-2">No movies found</h3>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            No results found for "<strong>{{ searchQuery }}</strong>"
          </p>
          <div class="space-x-2">
            <button mat-raised-button color="primary" (click)="clearSearch()">
              Clear Search
            </button>
            <button mat-outlined-button (click)="clearAllFilters()">
              Clear Filters
            </button>
          </div>
        </div>
      } @else if (!searchQuery && movies().length === 0) {
        <div class="text-center py-12">
          <mat-icon class="text-6xl text-gray-400 mb-4">search</mat-icon>
          <h3 class="text-xl font-semibold mb-2">Start searching</h3>
          <p class="text-gray-600 dark:text-gray-400">Enter a movie title to start searching</p>
        </div>
      } @else {
        <!-- Results Header -->
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold">Search Results</h2>
            @if (searchQuery) {
              <p class="text-gray-600 dark:text-gray-400">
                {{ totalResults() }} results for "{{ searchQuery }}"
              </p>
            }
          </div>
          
          <mat-select [(value)]="sortBy" (selectionChange)="onSortChange()" placeholder="Sort by">
            <mat-option value="popularity.desc">Most Popular</mat-option>
            <mat-option value="release_date.desc">Newest First</mat-option>
            <mat-option value="vote_average.desc">Highest Rated</mat-option>
            <mat-option value="title.asc">Title A-Z</mat-option>
          </mat-select>
        </div>

        <!-- Movies Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          @for (movie of movies(); track movie.id) {
            <app-movie-card [movie]="movie"></app-movie-card>
          }
        </div>

        <!-- Pagination -->
        @if (totalResults() > pageSize) {
          <div class="flex justify-center">
            <mat-paginator
              [length]="totalResults()"
              [pageSize]="pageSize"
              [pageSizeOptions]="[20, 40, 60]"
              [pageIndex]="currentPage() - 1"
              (page)="onPageChange($event)"
              showFirstLastButtons>
            </mat-paginator>
          </div>
        }
      }
    </div>
  `
})
export class SearchComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly tmdbService = inject(TmdbService);

    private searchSubject = new Subject<string>();

    protected readonly movies = signal<Movie[]>([]);
    protected readonly totalResults = signal(0);
    protected readonly currentPage = signal(1);
    protected readonly isLoading = signal(false);
    protected readonly genres = this.tmdbService.genres;

    protected searchQuery = '';
    protected selectedGenres: number[] = [];
    protected selectedYear: number | null = null;
    protected minRating = 0;
    protected sortBy = 'popularity.desc';
    protected pageSize = 20;

    protected readonly years = Array.from(
        { length: new Date().getFullYear() - 1900 + 2 },
        (_, i) => new Date().getFullYear() + 1 - i
    );

    protected readonly hasActiveFilters = computed(() =>
        this.selectedGenres.length > 0 || this.selectedYear !== null || this.minRating > 0
    );

    ngOnInit(): void {
        // Setup search debouncing
        this.searchSubject.pipe(
            debounceTime(500),
            distinctUntilChanged()
        ).subscribe(() => {
            this.performSearch();
        });

        // Load initial state from query params
        this.route.queryParams.subscribe(params => {
            this.searchQuery = params['q'] || '';
            this.selectedGenres = params['genres'] ? params['genres'].split(',').map(Number) : [];
            this.selectedYear = params['year'] ? Number(params['year']) : null;
            this.minRating = params['rating'] ? Number(params['rating']) : 0;
            this.sortBy = params['sort'] || 'popularity.desc';
            const page = params['page'] ? Number(params['page']) : 1;
            this.currentPage.set(page);

            if (this.searchQuery) {
                this.performSearch();
            }
        });
    }

    onSearchChange(): void {
        this.currentPage.set(1);
        this.searchSubject.next(this.searchQuery);
    }

    performSearch(): void {
        if (!this.searchQuery.trim()) {
            this.movies.set([]);
            this.totalResults.set(0);
            return;
        }

        this.isLoading.set(true);
        this.updateRouteParams();

        // Use discover API if filters are applied, otherwise use search
        const searchObservable = this.hasActiveFilters()
            ? this.tmdbService.discoverMovies({
                genre_ids: this.selectedGenres.length > 0 ? this.selectedGenres : undefined,
                year: this.selectedYear || undefined,
                min_rating: this.minRating > 0 ? this.minRating : undefined,
                sort_by: this.sortBy
            }, this.currentPage())
            : this.tmdbService.searchMovies(this.searchQuery, this.currentPage());

        searchObservable.subscribe({
            next: (response) => {
                let results = response.results;

                // Apply client-side filtering if using search API with filters
                if (!this.hasActiveFilters() || this.searchQuery) {
                    if (this.selectedGenres.length > 0) {
                        results = results.filter(movie =>
                            movie.genre_ids?.some(id => this.selectedGenres.includes(id))
                        );
                    }

                    if (this.selectedYear) {
                        results = results.filter(movie =>
                            movie.release_date && new Date(movie.release_date).getFullYear() === this.selectedYear
                        );
                    }

                    if (this.minRating > 0) {
                        results = results.filter(movie => movie.vote_average >= this.minRating);
                    }
                }

                this.movies.set(results);
                this.totalResults.set(response.total_results);
                this.isLoading.set(false);
            },
            error: (error) => {
                console.error('Search error:', error);
                this.movies.set([]);
                this.totalResults.set(0);
                this.isLoading.set(false);
            }
        });
    }

    onFiltersChange(): void {
        this.currentPage.set(1);
        this.performSearch();
    }

    onSortChange(): void {
        this.currentPage.set(1);
        this.performSearch();
    }

    onPageChange(event: PageEvent): void {
        this.currentPage.set(event.pageIndex + 1);
        this.pageSize = event.pageSize;
        this.performSearch();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    clearSearch(): void {
        this.searchQuery = '';
        this.movies.set([]);
        this.totalResults.set(0);
        this.updateRouteParams();
    }

    clearAllFilters(): void {
        this.selectedGenres = [];
        this.selectedYear = null;
        this.minRating = 0;
        this.sortBy = 'popularity.desc';
        this.currentPage.set(1);
        this.performSearch();
    }

    removeGenreFilter(genreId: number): void {
        this.selectedGenres = this.selectedGenres.filter(id => id !== genreId);
        this.onFiltersChange();
    }

    removeYearFilter(): void {
        this.selectedYear = null;
        this.onFiltersChange();
    }

    removeRatingFilter(): void {
        this.minRating = 0;
        this.onFiltersChange();
    }

    getGenreName(genreId: number): string {
        const genre = this.genres().find(g => g.id === genreId);
        return genre?.name || 'Unknown';
    }

    private updateRouteParams(): void {
        const queryParams: any = {};

        if (this.searchQuery) {
            queryParams.q = this.searchQuery;
        }

        if (this.selectedGenres.length > 0) {
            queryParams.genres = this.selectedGenres.join(',');
        }

        if (this.selectedYear) {
            queryParams.year = this.selectedYear;
        }

        if (this.minRating > 0) {
            queryParams.rating = this.minRating;
        }

        if (this.sortBy !== 'popularity.desc') {
            queryParams.sort = this.sortBy;
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

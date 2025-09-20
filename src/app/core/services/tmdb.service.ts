import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject, throwError, shareReplay, catchError, map } from 'rxjs';
import { environment } from '@environments/environment';
import {
  Movie,
  TMDBResponse,
  Genre,
  Credits,
  VideoResults,
  ReviewResults,
  MovieFilters,
  CastMember,
  CrewMember,
  TmdbItem
} from '@core/models/movie.model';
import { CacheService } from './cache.service';

@Injectable({
  providedIn: 'root'
})
export class TmdbService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(CacheService);

  private readonly _genres = signal<Genre[]>([]);
  private readonly _isLoading = signal(false);

  readonly genres = this._genres.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  private readonly baseUrl = environment.tmdb.baseUrl;
  private readonly apiKey = environment.tmdb.apiKey;
  private readonly imageBaseUrl = environment.tmdb.imageUrl;

  constructor() {
    this.loadGenres();
  }

  // Movie Discovery
  getMovies(category: 'popular' | 'top_rated' | 'upcoming' | 'now_playing' = 'popular', page = 1): Observable<TMDBResponse<Movie>> {
    const cacheKey = `movies_${category}_${page}`;
    const cached = this.cache.get<TMDBResponse<Movie>>(cacheKey);

    if (cached) {
      return of(cached);
    }

    const params = new HttpParams()
      .set('api_key', this.apiKey)
      .set('page', page.toString())
      .set('language', 'en-US');

    return this.http.get<TMDBResponse<Movie>>(`${this.baseUrl}/movie/${category}`, { params })
      .pipe(
        map(response => {
          response.results = response.results.map(movie => this.enrichMovie(movie));
          return response;
        }),
        shareReplay(1),
        catchError(error => {
          console.error('Error fetching movies:', error);
          return throwError(() => error);
        })
      );
  }

  // Search Movies
  searchMovies(query: string, page = 1): Observable<TMDBResponse<Movie>> {
    if (!query.trim()) {
      return of({ page: 1, results: [], total_pages: 0, total_results: 0 });
    }

    const params = new HttpParams()
      .set('api_key', this.apiKey)
      .set('query', query.trim())
      .set('page', page.toString())
      .set('language', 'en-US')
      .set('include_adult', environment.features.enableAdultContent ? 'true' : 'false');

    return this.http.get<TMDBResponse<Movie>>(`${this.baseUrl}/search/movie`, { params })
      .pipe(
        map(response => {
          response.results = response.results.map(movie => this.enrichMovie(movie));
          return response;
        }),
        shareReplay(1)
      );
  }

  searchMoviesForAutocomplete(query: string, page = 1): Observable<TmdbItem[]> {
    if (!query?.trim()) {
      return of([]);
    }

    const params = new HttpParams()
        .set('api_key', this.apiKey)
        .set('query', query.trim())
        .set('page', page.toString())
        .set('language', 'en-US')
        .set('include_adult', environment.features.enableAdultContent ? 'true' : 'false');

    return this.http.get<TMDBResponse<Movie>>(`${this.baseUrl}/search/movie`, { params }).pipe(
        map(resp => (resp?.results || []).map(m => ({
          id: m.id,
          title: m.title || m.original_title || undefined,
          poster_path: m.poster_path ?? null,
          media_type: 'movie'
        }) as TmdbItem)),
        catchError(err => {
          console.error('Autocomplete search error', err);
          return of([] as TmdbItem[]);
        }),
        // optional: shareReplay so repeated quick requests reuse last value (tweak as needed)
        shareReplay(1)
    );
  }

  // Discover Movies with Filters
  discoverMovies(filters: MovieFilters = {}, page = 1): Observable<TMDBResponse<Movie>> {
    let params = new HttpParams()
      .set('api_key', this.apiKey)
      .set('page', page.toString())
      .set('language', 'en-US')
      .set('sort_by', filters.sort_by || 'popularity.desc')
      .set('include_adult', filters.include_adult ? 'true' : 'false');

    if (filters.genre_ids?.length) {
      params = params.set('with_genres', filters.genre_ids.join(','));
    }

    if (filters.year) {
      params = params.set('year', filters.year.toString());
    }

    if (filters.min_rating) {
      params = params.set('vote_average.gte', filters.min_rating.toString());
    }

    if (filters.language) {
      params = params.set('with_original_language', filters.language);
    }

    return this.http.get<TMDBResponse<Movie>>(`${this.baseUrl}/discover/movie`, { params })
      .pipe(
        map(response => {
          response.results = response.results.map(movie => this.enrichMovie(movie));
          return response;
        }),
        shareReplay(1)
      );
  }

  // Get Movie Details
  getMovieDetails(id: number): Observable<Movie> {
    const cacheKey = `movie_${id}`;
    const cached = this.cache.get<Movie>(cacheKey);

    if (cached) {
      return of(cached);
    }

    const params = new HttpParams()
      .set('api_key', this.apiKey)
      .set('language', 'en-US')
      .set('append_to_response', 'credits,videos,reviews,similar,recommendations,keywords,images');

    return this.http.get<Movie>(`${this.baseUrl}/movie/${id}`, { params })
      .pipe(
        map(movie => this.enrichMovie(movie)),
        shareReplay(1),
        catchError(error => {
          console.error('Error fetching movie details:', error);
          return throwError(() => error);
        })
      );
  }

  // Get Trending Movies
  getTrendingMovies(timeWindow: 'day' | 'week' = 'day', page = 1): Observable<TMDBResponse<Movie>> {
    const params = new HttpParams()
      .set('api_key', this.apiKey)
      .set('page', page.toString())
      .set('language', 'en-US');

    return this.http.get<TMDBResponse<Movie>>(`${this.baseUrl}/trending/movie/${timeWindow}`, { params })
      .pipe(
        map(response => {
          response.results = response.results.map(movie => this.enrichMovie(movie));
          return response;
        }),
        shareReplay(1)
      );
  }

  // Get Movies by Genre
  getMoviesByGenre(genreId: number, page = 1): Observable<TMDBResponse<Movie>> {
    return this.discoverMovies({ genre_ids: [genreId] }, page);
  }

  // Get Movie Credits
  getMovieCredits(id: number): Observable<Credits> {
    const params = new HttpParams()
      .set('api_key', this.apiKey)
      .set('language', 'en-US');

    return this.http.get<Credits>(`${this.baseUrl}/movie/${id}/credits`, { params })
      .pipe(shareReplay(1));
  }

  // Get Movie Videos
  getMovieVideos(id: number): Observable<VideoResults> {
    const params = new HttpParams()
      .set('api_key', this.apiKey)
      .set('language', 'en-US');

    return this.http.get<VideoResults>(`${this.baseUrl}/movie/${id}/videos`, { params })
      .pipe(shareReplay(1));
  }

  // Get Movie Reviews
  getMovieReviews(id: number, page = 1): Observable<ReviewResults> {
    const params = new HttpParams()
      .set('api_key', this.apiKey)
      .set('page', page.toString())
      .set('language', 'en-US');

    return this.http.get<ReviewResults>(`${this.baseUrl}/movie/${id}/reviews`, { params })
      .pipe(shareReplay(1));
  }

  // Get Similar Movies
  getSimilarMovies(id: number, page = 1): Observable<TMDBResponse<Movie>> {
    const params = new HttpParams()
      .set('api_key', this.apiKey)
      .set('page', page.toString())
      .set('language', 'en-US');

    return this.http.get<TMDBResponse<Movie>>(`${this.baseUrl}/movie/${id}/similar`, { params })
      .pipe(
        map(response => {
          response.results = response.results.map(movie => this.enrichMovie(movie));
          return response;
        }),
        shareReplay(1)
      );
  }

  // Get Movie Recommendations
  getMovieRecommendations(id: number, page = 1): Observable<TMDBResponse<Movie>> {
    const params = new HttpParams()
      .set('api_key', this.apiKey)
      .set('page', page.toString())
      .set('language', 'en-US');

    return this.http.get<TMDBResponse<Movie>>(`${this.baseUrl}/movie/${id}/recommendations`, { params })
      .pipe(
        map(response => {
          response.results = response.results.map(movie => this.enrichMovie(movie));
          return response;
        }),
        shareReplay(1)
      );
  }

  // Load Genres
  private loadGenres(): void {
    const cached = this.cache.get<Genre[]>('genres');

    if (cached) {
      this._genres.set(cached);
      return;
    }

    const params = new HttpParams()
      .set('api_key', this.apiKey)
      .set('language', 'en-US');

    this.http.get<{genres: Genre[]}>(`${this.baseUrl}/genre/movie/list`, { params })
      .pipe(
        catchError(() => {
          // Fallback genres if API fails
          return of({
            genres: [
              { id: 28, name: 'Action' },
              { id: 12, name: 'Adventure' },
              { id: 16, name: 'Animation' },
              { id: 35, name: 'Comedy' },
              { id: 80, name: 'Crime' },
              { id: 99, name: 'Documentary' },
              { id: 18, name: 'Drama' },
              { id: 10751, name: 'Family' },
              { id: 14, name: 'Fantasy' },
              { id: 36, name: 'History' },
              { id: 27, name: 'Horror' },
              { id: 10402, name: 'Music' },
              { id: 9648, name: 'Mystery' },
              { id: 10749, name: 'Romance' },
              { id: 878, name: 'Science Fiction' },
              { id: 10770, name: 'TV Movie' },
              { id: 53, name: 'Thriller' },
              { id: 10752, name: 'War' },
              { id: 37, name: 'Western' }
            ]
          });
        })
      )
      .subscribe(response => {
        this._genres.set(response.genres);
        this.cache.set('genres', response.genres, environment.cache.apiCacheTtl);
      });
  }

  // Utility Methods
  getImageUrl(path: string | null, size: 'small' | 'medium' | 'large' | 'original' = 'medium'): string {
    if (!path) return '/assets/images/placeholder.jpg';

    const sizeMap = {
      small: environment.tmdb.imageUrlSmall,
      medium: environment.tmdb.imageUrl,
      large: environment.tmdb.imageUrlLarge,
      original: environment.tmdb.imageUrlOriginal
    };

    return `${sizeMap[size]}${path}`;
  }

  getBackdropUrl(path: string | null): string {
    return this.getImageUrl(path, 'large');
  }

  getPosterUrl(path: string | null): string {
    return this.getImageUrl(path, 'medium');
  }

  getProfileUrl(path: string | null): string {
    return this.getImageUrl(path, 'medium');
  }

  formatRuntime(minutes: number): string {
    if (!minutes) return 'Unknown';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  formatRating(rating: number): string {
    return rating ? rating.toFixed(1) : '0.0';
  }

  getRatingClass(rating: number): string {
    if (rating >= 7) return 'high';
    if (rating >= 5) return 'medium';
    return 'low';
  }

  getYearFromDate(date: string): string {
    return date ? new Date(date).getFullYear().toString() : 'TBA';
  }

  formatCurrency(amount: number): string {
    if (!amount) return 'Unknown';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  getGenreNames(genreIds: number[]): string[] {
    const genres = this._genres();
    return genreIds
      .map(id => genres.find(g => g.id === id)?.name)
      .filter(name => name) as string[];
  }

  private enrichMovie(movie: Movie): Movie {
    // Add computed properties for easier template use
    return {
      ...movie,
      // Add any additional computed properties here
    };
  }

  // Configuration
  getConfiguration(): Observable<any> {
    const params = new HttpParams().set('api_key', this.apiKey);
    return this.http.get(`${this.baseUrl}/configuration`, { params })
      .pipe(shareReplay(1));
  }
}
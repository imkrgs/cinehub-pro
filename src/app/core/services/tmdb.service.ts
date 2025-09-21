// src/app/core/services/tmdb.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { shareReplay, catchError, map } from 'rxjs/operators';
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
  private readonly _isLoading = signal<boolean>(false);

  readonly genres = this._genres.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  private readonly baseUrl = environment.tmdb.baseUrl;
  private readonly apiKey = environment.tmdb.apiKey;

  constructor() {
    this.loadGenres();
  }

  // -------------------------
  // Movie Discovery (helper wrapper)
  // -------------------------
  getMovies(category: 'popular' | 'top_rated' | 'upcoming' | 'now_playing' = 'popular', page = 1): Observable<TMDBResponse<Movie>> {
    const cacheKey = `movies_${category}_${page}`;
    const cached = this.cache.get<TMDBResponse<Movie>>(cacheKey);
    if (cached) return of(cached);

    const params = new HttpParams()
        .set('api_key', this.apiKey)
        .set('page', page.toString())
        .set('language', 'en-US');

    return this.http.get<TMDBResponse<Movie>>(`${this.baseUrl}/movie/${category}`, { params }).pipe(
        map(response => {
          response.results = (response.results || []).map(movie => this.enrichMovie(movie));
          this.cache.set(cacheKey, response, environment.cache.apiCacheTtl);
          return response;
        }),
        shareReplay(1),
        catchError(err => {
          console.error('Error fetching movies:', err);
          return throwError(() => err);
        })
    );
  }

  // -------------------------
  // Search
  // -------------------------
  searchMovies(query: string, page = 1): Observable<TMDBResponse<Movie>> {
    if (!query?.trim()) {
      return of({ page: 1, results: [], total_pages: 0, total_results: 0 });
    }

    const params = new HttpParams()
        .set('api_key', this.apiKey)
        .set('query', query.trim())
        .set('page', page.toString())
        .set('language', 'en-US')
        .set('include_adult', environment.features.enableAdultContent ? 'true' : 'false');

    return this.http.get<TMDBResponse<Movie>>(`${this.baseUrl}/search/movie`, { params }).pipe(
        map(response => {
          response.results = (response.results || []).map(movie => this.enrichMovie(movie));
          return response;
        }),
        shareReplay(1),
        catchError(err => {
          console.error('Search movies error', err);
          return throwError(() => err);
        })
    );
  }

  searchMoviesForAutocomplete(query: string, page = 1): Observable<TmdbItem[]> {
    if (!query?.trim()) return of([]);

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
          media_type: 'movie',
          release_date: m.release_date,
          vote_average: m.vote_average
        }) as TmdbItem)),
        catchError(err => {
          console.error('Autocomplete search error', err);
          return of([] as TmdbItem[]);
        }),
        shareReplay(1)
    );
  }

  // -------------------------
  // Discover with filters (supports custom pageSize by batching TMDB pages)
  // -------------------------
  discoverMovies(filters: MovieFilters = {}, page = 1, pageSize = 20): Observable<TMDBResponse<Movie>> {
    // TMDB fixed page size
    const TMDB_PAGE_SIZE = 20;

    const buildParams = (tmdbPage: number) => {
      let params = new HttpParams()
          .set('api_key', this.apiKey)
          .set('page', tmdbPage.toString())
          .set('language', 'en-US')
          .set('sort_by', filters.sort_by || 'popularity.desc')
          .set('include_adult', filters.include_adult ? 'true' : 'false');

      if (filters.genre_ids?.length) params = params.set('with_genres', filters.genre_ids.join(','));
      if (filters.year) params = params.set('year', filters.year.toString());
      if (filters.min_rating) params = params.set('vote_average.gte', filters.min_rating.toString());
      if (filters.language) params = params.set('with_original_language', filters.language);
      if (filters.release_date_gte) params = params.set('primary_release_date.gte', filters.release_date_gte);
      if (filters.release_date_lte) params = params.set('primary_release_date.lte', filters.release_date_lte);
      if (filters.runtime_gte) params = params.set('with_runtime.gte', String(filters.runtime_gte));
      if (filters.runtime_lte) params = params.set('with_runtime.lte', String(filters.runtime_lte));

      // add other mapping if needed
      return params;
    };

    // If requested pageSize is <= TMDB page size, fetch the exact TMDB page that contains the UI page's first item
    if (pageSize <= TMDB_PAGE_SIZE) {
      // the TMDB page that contains the start of the UI page:
      const tmdbPage = Math.floor(((page - 1) * pageSize) / TMDB_PAGE_SIZE) + 1;
      const params = buildParams(tmdbPage);

      return this.http.get<TMDBResponse<Movie>>(`${this.baseUrl}/discover/movie`, { params }).pipe(
          map(response => {
            response.results = (response.results || []).map(movie => this.enrichMovie(movie));
            return response;
          }),
          shareReplay(1),
          catchError(err => {
            console.error('Discover movies error', err);
            return throwError(() => err);
          })
      );
    }

    // For larger pageSize, fetch multiple TMDB pages and stitch results
    const offset = (page - 1) * pageSize; // 0-based index for first UI item
    const firstTmdbPage = Math.floor(offset / TMDB_PAGE_SIZE) + 1;
    const lastRequiredIndex = offset + pageSize - 1;
    const lastTmdbPage = Math.floor(lastRequiredIndex / TMDB_PAGE_SIZE) + 1;

    const tmdbPages: number[] = [];
    for (let p = firstTmdbPage; p <= lastTmdbPage; p++) tmdbPages.push(p);

    const requests = tmdbPages.map(pNum => {
      const params = buildParams(pNum);
      return this.http.get<TMDBResponse<Movie>>(`${this.baseUrl}/discover/movie`, { params }).pipe(
          catchError(err => {
            console.error(`Discover page ${pNum} error`, err);
            return of({ page: pNum, results: [], total_pages: 0, total_results: 0 } as TMDBResponse<Movie>);
          })
      );
    });

    return forkJoin(requests).pipe(
        map((responses: TMDBResponse<Movie>[]) => {
          // Merge responses in order
          const combinedResults: Movie[] = [];
          let totalResults = 0;
          let globalTotalPages = 0;

          responses.forEach(resp => {
            globalTotalPages = Math.max(globalTotalPages, resp.total_pages || 0);
            if (resp.total_results != null && resp.total_results > totalResults) totalResults = resp.total_results;
            const items = (resp.results || []).map(m => this.enrichMovie(m));
            combinedResults.push(...items);
          });

          const localStart = offset - ((firstTmdbPage - 1) * TMDB_PAGE_SIZE);
          const sliced = combinedResults.slice(localStart, localStart + pageSize);

          const uiResponse: TMDBResponse<Movie> = {
            page,
            results: sliced,
            total_pages: globalTotalPages,
            total_results: totalResults
          };

          return uiResponse;
        }),
        shareReplay(1),
        catchError(err => {
          console.error('Discover movies (batched) error', err);
          return throwError(() => err);
        })
    );
  }

  // -------------------------
  // Movie Details / Related
  // -------------------------
  getMovieDetails(id: number): Observable<Movie> {
    const cacheKey = `movie_${id}`;
    const cached = this.cache.get<Movie>(cacheKey);
    if (cached) return of(cached);

    const params = new HttpParams()
        .set('api_key', this.apiKey)
        .set('language', 'en-US')
        .set('append_to_response', 'credits,videos,reviews,similar,recommendations,keywords,images');

    return this.http.get<Movie>(`${this.baseUrl}/movie/${id}`, { params }).pipe(
        map(movie => {
          const enriched = this.enrichMovie(movie);
          this.cache.set(cacheKey, enriched, environment.cache.apiCacheTtl);
          return enriched;
        }),
        shareReplay(1),
        catchError(err => {
          console.error('Error fetching movie details:', err);
          return throwError(() => err);
        })
    );
  }

  getTrendingMovies(timeWindow: 'day' | 'week' = 'day', page = 1): Observable<TMDBResponse<Movie>> {
    const params = new HttpParams()
        .set('api_key', this.apiKey)
        .set('page', page.toString())
        .set('language', 'en-US');

    return this.http.get<TMDBResponse<Movie>>(`${this.baseUrl}/trending/movie/${timeWindow}`, { params }).pipe(
        map(response => {
          response.results = (response.results || []).map(movie => this.enrichMovie(movie));
          return response;
        }),
        shareReplay(1),
        catchError(err => {
          console.error('Trending movies error', err);
          return throwError(() => err);
        })
    );
  }

  getMoviesByGenre(genreId: number, page = 1): Observable<TMDBResponse<Movie>> {
    return this.discoverMovies({ genre_ids: [genreId] }, page);
  }

  // -------------------------
  // Credits / Videos / Reviews / Similar / Recommendations
  // -------------------------
  getMovieCredits(id: number): Observable<Credits> {
    const params = new HttpParams().set('api_key', this.apiKey).set('language', 'en-US');
    return this.http.get<Credits>(`${this.baseUrl}/movie/${id}/credits`, { params }).pipe(
        shareReplay(1),
        catchError(err => {
          console.error('Credits fetch error', err);
          return throwError(() => err);
        })
    );
  }

  getMovieVideos(id: number): Observable<VideoResults> {
    const params = new HttpParams().set('api_key', this.apiKey).set('language', 'en-US');
    return this.http.get<VideoResults>(`${this.baseUrl}/movie/${id}/videos`, { params }).pipe(
        shareReplay(1),
        catchError(err => {
          console.error('Videos fetch error', err);
          return throwError(() => err);
        })
    );
  }

  getMovieReviews(id: number, page = 1): Observable<ReviewResults> {
    const params = new HttpParams()
        .set('api_key', this.apiKey)
        .set('page', page.toString())
        .set('language', 'en-US');

    return this.http.get<ReviewResults>(`${this.baseUrl}/movie/${id}/reviews`, { params }).pipe(
        shareReplay(1),
        catchError(err => {
          console.error('Reviews fetch error', err);
          return throwError(() => err);
        })
    );
  }

  getSimilarMovies(id: number, page = 1): Observable<TMDBResponse<Movie>> {
    const params = new HttpParams()
        .set('api_key', this.apiKey)
        .set('page', page.toString())
        .set('language', 'en-US');

    return this.http.get<TMDBResponse<Movie>>(`${this.baseUrl}/movie/${id}/similar`, { params }).pipe(
        map(response => {
          response.results = (response.results || []).map(movie => this.enrichMovie(movie));
          return response;
        }),
        shareReplay(1),
        catchError(err => {
          console.error('Similar movies error', err);
          return throwError(() => err);
        })
    );
  }

  getMovieRecommendations(id: number, page = 1): Observable<TMDBResponse<Movie>> {
    const params = new HttpParams()
        .set('api_key', this.apiKey)
        .set('page', page.toString())
        .set('language', 'en-US');

    return this.http.get<TMDBResponse<Movie>>(`${this.baseUrl}/movie/${id}/recommendations`, { params }).pipe(
        map(response => {
          response.results = (response.results || []).map(movie => this.enrichMovie(movie));
          return response;
        }),
        shareReplay(1),
        catchError(err => {
          console.error('Recommendations error', err);
          return throwError(() => err);
        })
    );
  }

  getMovieCollections(keywordId: number, page = 1): Observable<TMDBResponse<Movie>> {
    if (!keywordId) return of({ page: 1, results: [], total_pages: 0, total_results: 0 });

    const params = new HttpParams()
        .set('api_key', this.apiKey)
        .set('page', page.toString())
        .set('language', 'en-US')
        .set('include_adult', 'true');

    return this.http.get<TMDBResponse<Movie>>(`${this.baseUrl}/keyword/${keywordId}/movies`, { params }).pipe(
        map(response => {
          response.results = (response.results || []).map(movie => this.enrichMovie(movie));
          return response;
        }),
        shareReplay(1),
        catchError(err => {
          console.error('Movie collections error', err);
          return throwError(() => err);
        })
    );
  }

  // -------------------------
  // Genres loader
  // -------------------------
  private loadGenres(): void {
    const cached = this.cache.get<Genre[]>('genres');
    if (cached) {
      this._genres.set(cached);
      return;
    }

    const params = new HttpParams().set('api_key', this.apiKey).set('language', 'en-US');
    this._isLoading.set(true);

    this.http.get<{ genres: Genre[] }>(`${this.baseUrl}/genre/movie/list`, { params }).pipe(
        catchError(() => {
          return of({
            genres: [
              { id: 28, name: 'Action' }, { id: 12, name: 'Adventure' }, { id: 16, name: 'Animation' },
              { id: 35, name: 'Comedy' }, { id: 80, name: 'Crime' }, { id: 99, name: 'Documentary' },
              { id: 18, name: 'Drama' }, { id: 10751, name: 'Family' }, { id: 14, name: 'Fantasy' },
              { id: 36, name: 'History' }, { id: 27, name: 'Horror' }, { id: 10402, name: 'Music' },
              { id: 9648, name: 'Mystery' }, { id: 10749, name: 'Romance' }, { id: 878, name: 'Science Fiction' },
              { id: 10770, name: 'TV Movie' }, { id: 53, name: 'Thriller' }, { id: 10752, name: 'War' },
              { id: 37, name: 'Western' }
            ]
          });
        })
    ).subscribe({
      next: resp => {
        this._genres.set(resp.genres);
        this.cache.set('genres', resp.genres, environment.cache.apiCacheTtl);
        this._isLoading.set(false);
      },
      error: err => {
        console.error('Failed to load genres', err);
        this._isLoading.set(false);
      }
    });
  }

  getGenreName(id: number): string {
    const g = this.genres().find(x => x.id === id);
    return g?.name ?? 'Unknown';
  }

  // -------------------------
  // Utilities & enrichMovie
  // -------------------------
  getImageUrl(path: string | null, size: 'small' | 'medium' | 'large' | 'original' = 'medium'): string {
    if (!path) return '/assets/images/placeholder.jpg';

    const sizeMap: Record<string, string> = {
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

  formatRuntime(minutes?: number): string {
    if (!minutes || minutes <= 0) return 'Unknown';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  formatRating(rating?: number): string {
    return rating ? rating.toFixed(1) : '0.0';
  }

  getRatingClass(rating?: number): string {
    const r = rating ?? 0;
    if (r >= 7) return 'high';
    if (r >= 5) return 'medium';
    return 'low';
  }

  getYearFromDate(date?: string): string {
    return date ? new Date(date).getFullYear().toString() : 'TBA';
  }

  formatCurrency(amount?: number): string {
    if (!amount || amount <= 0) return 'Unknown';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  getGenreNames(genreIds: number[] = []): string[] {
    const genres = this._genres();
    return (genreIds || [])
        .map(id => genres.find(g => g.id === id)?.name)
        .filter(Boolean) as string[];
  }

  private enrichMovie(movie: Movie): Movie & any {
    if (!movie) return movie as any;

    const safeVideos = (movie.videos?.results ?? []);
    const safeCast = (movie.credits?.cast ?? []);
    const safeCrew = (movie.credits?.crew ?? []);

    const youtubeTrailer = safeVideos.find(v =>
        v.site?.toLowerCase() === 'youtube' &&
        v.type?.toLowerCase() === 'trailer' &&
        (v.official || v.official === undefined)
    ) || safeVideos.find(v => v.site?.toLowerCase() === 'youtube');

    const trailerKey = youtubeTrailer?.key ?? null;
    const trailerEmbedUrl = trailerKey ? `https://www.youtube.com/embed/${trailerKey}` : null;

    const director = safeCrew.find(c => c.job?.toLowerCase() === 'director') ?? null;

    const topCast = [...safeCast]
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
        .slice(0, 5)
        .map(c => ({
          ...c,
          profile_url: this.getProfileUrl(c.profile_path ?? null)
        })) as CastMember[];

    const production_companies = (movie.production_companies ?? []).map(pc => ({
      ...pc,
      logo_url: this.getImageUrl(pc.logo_path ?? null, 'small')
    }));

    const genre_names = (movie.genres && movie.genres.length)
        ? movie.genres.map(g => g.name)
        : this.getGenreNames(movie.genre_ids ?? []);

    const budgetFormatted = this.formatCurrency(movie.budget ?? 0);
    const revenueFormatted = this.formatCurrency(movie.revenue ?? 0);
    const poster_url = this.getPosterUrl(movie.poster_path ?? null);
    const poster_small = this.getImageUrl(movie.poster_path ?? null, 'small');
    const backdrop_url = this.getBackdropUrl(movie.backdrop_path ?? null);
    const backdrop_large = this.getImageUrl(movie.backdrop_path ?? null, 'large');
    const ratingFormatted = this.formatRating(movie.vote_average ?? 0);
    const ratingClass = this.getRatingClass(movie.vote_average ?? 0);
    const runtimeFormatted = this.formatRuntime(movie.runtime ?? 0);
    const releaseYear = this.getYearFromDate(movie.release_date ?? '');

    const shallowEnrichList = (list?: TMDBResponse<Movie>) => {
      if (!list) return list;
      return {
        ...list,
        results: (list.results || []).map(m => ({
          ...m,
          poster_url: this.getPosterUrl(m.poster_path ?? null),
          rating_formatted: this.formatRating(m.vote_average ?? 0),
          release_year: this.getYearFromDate(m.release_date ?? '')
        } as Movie & any))
      } as TMDBResponse<Movie>;
    };

    return {
      ...movie,
      poster_url,
      poster_small,
      backdrop_url,
      backdrop_large,
      runtime_formatted: runtimeFormatted,
      rating_formatted: ratingFormatted,
      rating_class: ratingClass,
      release_year: releaseYear,
      budget_formatted: budgetFormatted,
      revenue_formatted: revenueFormatted,
      director: director ? { id: director.id, name: director.name } : null,
      top_cast: topCast,
      trailer_key: trailerKey,
      trailer_embed_url: trailerEmbedUrl,
      production_companies,
      genre_names,
      similar: shallowEnrichList(movie.similar as TMDBResponse<Movie>),
      recommendations: shallowEnrichList(movie.recommendations as TMDBResponse<Movie>)
    } as Movie & any;
  }

  getConfiguration(): Observable<any> {
    const cacheKey = 'tmdb_configuration';
    const cached = this.cache.get<any>(cacheKey);
    if (cached) return of(cached);

    const params = new HttpParams().set('api_key', this.apiKey);
    return this.http.get(`${this.baseUrl}/configuration`, { params }).pipe(
        map(conf => {
          this.cache.set(cacheKey, conf, environment.cache.apiCacheTtl);
          return conf;
        }),
        shareReplay(1),
        catchError(err => {
          console.error('Configuration fetch error', err);
          return throwError(() => err);
        })
    );
  }
}
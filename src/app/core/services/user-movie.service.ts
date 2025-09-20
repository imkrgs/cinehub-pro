import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject, map, tap, catchError } from 'rxjs';
import { environment } from '@environments/environment';
import { Movie, WatchlistItem, FavoriteItem, MovieRating } from '@core/models/movie.model';
import { CacheService } from './cache.service';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class UserMovieService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(CacheService);
  private readonly toast = inject(ToastService);

  private readonly _watchlistItems = signal<WatchlistItem[]>([]);
  private readonly _favoriteItems = signal<FavoriteItem[]>([]);
  private readonly _ratings = signal<MovieRating[]>([]);

  readonly watchlistItems = this._watchlistItems.asReadonly();
  readonly favoriteItems = this._favoriteItems.asReadonly();
  readonly ratings = this._ratings.asReadonly();

  private readonly baseUrl = environment.api.baseUrl;

  constructor() {
    this.loadUserData();
  }

  // Watchlist Management
  addToWatchlist(movie: Movie): Observable<WatchlistItem> {
    // Optimistically add to local state
    const newItem: WatchlistItem = {
      movie_id: movie.id,
      movie,
      added_at: new Date()
    };

    const currentItems = this._watchlistItems();
    this._watchlistItems.set([...currentItems, newItem]);

    return this.http.post<WatchlistItem>(`${this.baseUrl}/users/watchlist`, {
      movie_id: movie.id
    }).pipe(
      tap(() => {
        this.invalidateCache();
        this.toast.movieAdded();
      }),
      catchError(error => {
        // Revert optimistic update
        this._watchlistItems.set(currentItems);
        this.toast.error('Failed to add movie to watchlist');
        throw error;
      })
    );
  }

  removeFromWatchlist(movieId: number): Observable<void> {
    // Optimistically remove from local state
    const currentItems = this._watchlistItems();
    const updatedItems = currentItems.filter(item => item.movie_id !== movieId);
    this._watchlistItems.set(updatedItems);

    return this.http.delete<void>(`${this.baseUrl}/users/watchlist/${movieId}`)
      .pipe(
        tap(() => {
          this.invalidateCache();
          this.toast.movieRemoved();
        }),
        catchError(error => {
          // Revert optimistic update
          this._watchlistItems.set(currentItems);
          this.toast.error('Failed to remove movie from watchlist');
          throw error;
        })
      );
  }

  getWatchlist(): Observable<WatchlistItem[]> {
    const cached = this.cache.get<WatchlistItem[]>('user_watchlist');
    if (cached) {
      this._watchlistItems.set(cached);
      return of(cached);
    }

    return this.http.get<WatchlistItem[]>(`${this.baseUrl}/users/watchlist`)
      .pipe(
        tap(items => {
          this._watchlistItems.set(items);
          this.cache.set('user_watchlist', items, environment.cache.apiCacheTtl);
        }),
        catchError(() => {
          // Return mock data for development
          return of(this.getMockWatchlist());
        })
      );
  }

  isInWatchlist(movieId: number): boolean {
    return this._watchlistItems().some(item => item.movie_id === movieId);
  }

  getWatchlistCount(): Observable<number> {
    return of(this._watchlistItems().length);
  }

  clearWatchlist(): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/users/watchlist`)
      .pipe(
        tap(() => {
          this._watchlistItems.set([]);
          this.invalidateCache();
          this.toast.success('Watchlist cleared');
        }),
        catchError(error => {
          this.toast.error('Failed to clear watchlist');
          throw error;
        })
      );
  }

  // Favorites Management
  addToFavorites(movie: Movie): Observable<FavoriteItem> {
    const newItem: FavoriteItem = {
      movie_id: movie.id,
      movie,
      added_at: new Date()
    };

    const currentItems = this._favoriteItems();
    this._favoriteItems.set([...currentItems, newItem]);

    return this.http.post<FavoriteItem>(`${this.baseUrl}/users/favorites`, {
      movie_id: movie.id
    }).pipe(
      tap(() => {
        this.invalidateCache();
        this.toast.success('Added to favorites', undefined, { icon: '❤️' });
      }),
      catchError(error => {
        this._favoriteItems.set(currentItems);
        this.toast.error('Failed to add movie to favorites');
        throw error;
      })
    );
  }

  removeFromFavorites(movieId: number): Observable<void> {
    const currentItems = this._favoriteItems();
    const updatedItems = currentItems.filter(item => item.movie_id !== movieId);
    this._favoriteItems.set(updatedItems);

    return this.http.delete<void>(`${this.baseUrl}/users/favorites/${movieId}`)
      .pipe(
        tap(() => {
          this.invalidateCache();
          this.toast.success('Removed from favorites');
        }),
        catchError(error => {
          this._favoriteItems.set(currentItems);
          this.toast.error('Failed to remove movie from favorites');
          throw error;
        })
      );
  }

  getFavorites(): Observable<FavoriteItem[]> {
    const cached = this.cache.get<FavoriteItem[]>('user_favorites');
    if (cached) {
      this._favoriteItems.set(cached);
      return of(cached);
    }

    return this.http.get<FavoriteItem[]>(`${this.baseUrl}/users/favorites`)
      .pipe(
        tap(items => {
          this._favoriteItems.set(items);
          this.cache.set('user_favorites', items, environment.cache.apiCacheTtl);
        }),
        catchError(() => {
          return of(this.getMockFavorites());
        })
      );
  }

  isInFavorites(movieId: number): boolean {
    return this._favoriteItems().some(item => item.movie_id === movieId);
  }

  getFavoritesCount(): Observable<number> {
    return of(this._favoriteItems().length);
  }

  clearFavorites(): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/users/favorites`)
      .pipe(
        tap(() => {
          this._favoriteItems.set([]);
          this.invalidateCache();
          this.toast.success('Favorites cleared');
        }),
        catchError(error => {
          this.toast.error('Failed to clear favorites');
          throw error;
        })
      );
  }

  // Ratings Management
  rateMovie(movieId: number, rating: number): Observable<MovieRating> {
    const newRating: MovieRating = {
      movie_id: movieId,
      rating,
      created_at: new Date()
    };

    // Update or add rating
    const currentRatings = this._ratings();
    const existingIndex = currentRatings.findIndex(r => r.movie_id === movieId);

    let updatedRatings: MovieRating[];
    if (existingIndex >= 0) {
      updatedRatings = [...currentRatings];
      updatedRatings[existingIndex] = { ...currentRatings[existingIndex], rating, created_at: new Date() };
    } else {
      updatedRatings = [...currentRatings, newRating];
    }

    this._ratings.set(updatedRatings);

    return this.http.post<MovieRating>(`${this.baseUrl}/users/ratings`, {
      movie_id: movieId,
      rating
    }).pipe(
      tap(() => {
        this.invalidateCache();
        this.toast.ratingSubmitted();
      }),
      catchError(error => {
        this._ratings.set(currentRatings);
        this.toast.error('Failed to submit rating');
        throw error;
      })
    );
  }

  removeRating(movieId: number): Observable<void> {
    const currentRatings = this._ratings();
    const updatedRatings = currentRatings.filter(r => r.movie_id !== movieId);
    this._ratings.set(updatedRatings);

    return this.http.delete<void>(`${this.baseUrl}/users/ratings/${movieId}`)
      .pipe(
        tap(() => {
          this.invalidateCache();
          this.toast.success('Rating removed');
        }),
        catchError(error => {
          this._ratings.set(currentRatings);
          this.toast.error('Failed to remove rating');
          throw error;
        })
      );
  }

  getRatings(): Observable<MovieRating[]> {
    const cached = this.cache.get<MovieRating[]>('user_ratings');
    if (cached) {
      this._ratings.set(cached);
      return of(cached);
    }

    return this.http.get<MovieRating[]>(`${this.baseUrl}/users/ratings`)
      .pipe(
        tap(ratings => {
          this._ratings.set(ratings);
          this.cache.set('user_ratings', ratings, environment.cache.apiCacheTtl);
        }),
        catchError(() => {
          return of(this.getMockRatings());
        })
      );
  }

  getMovieRating(movieId: number): number | null {
    const rating = this._ratings().find(r => r.movie_id === movieId);
    return rating ? rating.rating : null;
  }

  getRatingsCount(): Observable<number> {
    return of(this._ratings().length);
  }

  getAverageRating(): Observable<number> {
    const ratings = this._ratings();
    if (ratings.length === 0) return of(0);

    const total = ratings.reduce((sum, rating) => sum + rating.rating, 0);
    return of(Number((total / ratings.length).toFixed(1)));
  }

  // Utility Methods
  getMovieInteractionStatus(movieId: number) {
    return {
      isInWatchlist: this.isInWatchlist(movieId),
      isInFavorites: this.isInFavorites(movieId),
      rating: this.getMovieRating(movieId)
    };
  }

  // Bulk operations
  addMultipleToWatchlist(movies: Movie[]): Observable<WatchlistItem[]> {
    const movieIds = movies.map(m => m.id);

    return this.http.post<WatchlistItem[]>(`${this.baseUrl}/users/watchlist/bulk`, {
      movie_ids: movieIds
    }).pipe(
      tap(items => {
        const currentItems = this._watchlistItems();
        this._watchlistItems.set([...currentItems, ...items]);
        this.invalidateCache();
        this.toast.success(`Added ${movies.length} movies to watchlist`);
      }),
      catchError(error => {
        this.toast.error('Failed to add movies to watchlist');
        throw error;
      })
    );
  }

  removeMultipleFromWatchlist(movieIds: number[]): Observable<void> {
    const currentItems = this._watchlistItems();
    const updatedItems = currentItems.filter(item => !movieIds.includes(item.movie_id));
    this._watchlistItems.set(updatedItems);

    return this.http.delete<void>(`${this.baseUrl}/users/watchlist/bulk`, {
      body: { movie_ids: movieIds }
    }).pipe(
      tap(() => {
        this.invalidateCache();
        this.toast.success(`Removed ${movieIds.length} movies from watchlist`);
      }),
      catchError(error => {
        this._watchlistItems.set(currentItems);
        this.toast.error('Failed to remove movies from watchlist');
        throw error;
      })
    );
  }

  // Private methods
  private loadUserData(): void {
    // Load initial data
    this.getWatchlist().subscribe();
    this.getFavorites().subscribe();
    this.getRatings().subscribe();
  }

  private invalidateCache(): void {
    this.cache.remove('user_watchlist');
    this.cache.remove('user_favorites');
    this.cache.remove('user_ratings');
  }

  // Mock data for development
  private getMockWatchlist(): WatchlistItem[] {
    return [];
  }

  private getMockFavorites(): FavoriteItem[] {
    return [];
  }

  private getMockRatings(): MovieRating[] {
    return [];
  }

  // Export/Import functionality
  exportUserData() {
    return {
      watchlist: this._watchlistItems(),
      favorites: this._favoriteItems(),
      ratings: this._ratings(),
      exportDate: new Date().toISOString()
    };
  }

  importUserData(data: any): Observable<void> {
    // This would be implemented with backend support
    return this.http.post<void>(`${this.baseUrl}/users/import`, data)
      .pipe(
        tap(() => {
          this.toast.success('User data imported successfully');
          this.loadUserData(); // Reload data
        }),
        catchError(error => {
          this.toast.error('Failed to import user data');
          throw error;
        })
      );
  }

  // Statistics
  getStatistics() {
    const watchlist = this._watchlistItems();
    const favorites = this._favoriteItems();
    const ratings = this._ratings();

    return {
      watchlistCount: watchlist.length,
      favoritesCount: favorites.length,
      ratingsCount: ratings.length,
      averageRating: ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
        : 0,
      highRatedCount: ratings.filter(r => r.rating >= 4).length,
      recentActivity: [
        ...watchlist.slice(-5).map(item => ({
          type: 'watchlist_add' as const,
          movie: item.movie,
          date: item.added_at
        })),
        ...favorites.slice(-5).map(item => ({
          type: 'favorite_add' as const,
          movie: item.movie,
          date: item.added_at
        })),
        ...ratings.slice(-5).map(item => ({
          type: 'rating' as const,
          movie_id: item.movie_id,
          rating: item.rating,
          date: item.created_at
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  }
}
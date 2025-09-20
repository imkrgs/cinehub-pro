import {
    Component,
    OnInit,
    inject,
    signal,
    OnDestroy,
    AfterViewInit,
    HostListener,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { animate, style, transition, trigger, state } from '@angular/animations';
import { Movie } from '@core/models/movie.model';
import { TmdbService } from '@core/services/tmdb.service';
import { MovieCardComponent } from '@shared/components/movie-card/movie-card.component';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { ThemeService } from '@core/services/theme.service';
import {Subscription, fromEvent, forkJoin, of} from 'rxjs';
import { debounceTime, catchError } from 'rxjs/operators';
import { MovieDetailsModalComponent } from '@shared/components/movie-details-modal/movie-details-modal.component';
import { TrailerPlayerComponent } from '@shared/components/trailer-player/trailer-player.component';
import { IntersectionObserverDirective } from '@shared/directives/intersection-observer.directive';
import { MovieCardSkeletonComponent } from '@shared/components/movie-card-skeleton/movie-card-skeleton.component';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        MatButtonModule,
        MatIconModule,
        MatTabsModule,
        MatCardModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatDialogModule,
        MovieCardComponent,
        LoadingSpinnerComponent,
        IntersectionObserverDirective,
        MovieCardSkeletonComponent,
    ],
    animations: [
        trigger('carouselAnimation', [
            transition('* => *', [
                animate('800ms cubic-bezier(0.35, 0, 0.25, 1)')
            ]),
        ]),
        trigger('fadeIn', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(20px)' }),
                animate('600ms 300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
            ])
        ]),
        trigger('fadeInUp', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(40px)' }),
                animate('800ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
            ])
        ])
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="home-container" [class.dark]="isDarkTheme()">
      <!-- Hero Section with 3D Carousel -->
      <section class="hero-section" #heroSection>
        @if (isLoading.featured()) {
            <div class="hero-loader">
                <app-loading-spinner message="Loading featured movies..."></app-loading-spinner>
            </div>
        } @else {
            <div class="hero-carousel-container">
            @for (movie of featuredMovies(); track movie.id; let i = $index) {
                <div 
                    class="hero-slide" 
                    [ngClass]="getSlideClass(i)"
                    [@carouselAnimation]>
                    
                    <div class="slide-background" 
                         [style.background-image]="'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url(' + getBackdropUrl(movie.backdrop_path) + ')'">
                    </div>
                    
                    <div class="hero-content">
                        <div class="container">
                            <div class="hero-text" @fadeInUp>
                                <div class="movie-badge">
                                    <span class="badge-text">Featured</span>
                                </div>
                                <h1 class="hero-title">{{ movie.title }}</h1>
                                <p class="hero-description">{{ truncateText(movie.overview, 150) }}</p>
                                
                                <div class="hero-meta">
                                    <span class="hero-rating">
                                        <mat-icon>star_rate</mat-icon>
                                        {{ movie.vote_average | number: '1.1-1' }}
                                    </span>
                                    <span class="hero-year">
                                        <mat-icon>calendar_today</mat-icon>
                                        {{ movie.release_date | date: 'yyyy' }}
                                    </span>
                                    @if(movie.runtime) {
                                        <span class="hero-duration">
                                            <mat-icon>schedule</mat-icon>
                                            {{ movie.runtime | number }} min
                                        </span>
                                    }
                                </div>
                                
                                <div class="hero-actions">
                                    <button mat-raised-button color="accent" class="hero-button" [routerLink]="['/movie', movie.id]">
                                        <mat-icon>play_circle</mat-icon>
                                        Watch Now
                                    </button>
                                    <button mat-stroked-button class="hero-button light" (click)="addToWatchlist(movie)">
                                        <mat-icon>bookmark_add</mat-icon>
                                        Watch Later
                                    </button>
                                    <button mat-icon-button class="hero-button icon-only" (click)="showMovieDetails(movie)" matTooltip="Quick View">
                                        <mat-icon>visibility</mat-icon>
                                    </button>
                                </div>
                            </div>
                            
                            @if (movie.poster_path) {
                            <div class="hero-poster" @fadeIn>
                                <div class="poster-container">
                                    <img [src]="getPosterUrl(movie.poster_path, 'w500')" [alt]="movie.title + ' poster'" class="poster-image">
                                    <div class="poster-overlay">
                                        <button mat-icon-button (click)="playTrailer(movie)" class="play-button" matTooltip="Play Trailer">
                                            <mat-icon>play_arrow</mat-icon>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            }
                        </div>
                    </div>
                </div>
            }
            </div>

            <!-- Carousel Controls -->
            <div class="carousel-controls">
                <button mat-icon-button class="control-button" (click)="previousSlide()" aria-label="Previous slide">
                    <mat-icon>chevron_left</mat-icon>
                </button>
                <div class="pagination-dots">
                    @for (movie of featuredMovies(); track movie.id; let i = $index) {
                        <button class="dot" [class.active]="i === currentSlide()" (click)="goToSlide(i)" [attr.aria-label]="'Go to slide ' + (i + 1)"></button>
                    }
                </div>
                <button mat-icon-button class="control-button" (click)="nextSlide()" aria-label="Next slide">
                    <mat-icon>chevron_right</mat-icon>
                </button>
            </div>
            
            <!-- Progress Bar -->
            <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="progressWidth()"></div>
            </div>
            <!-- Scroll Indicator -->
            <div class="scroll-indicator" @fadeIn>
                <span>Scroll Down</span>
                <mat-icon>keyboard_arrow_down</mat-icon>
            </div>
        }
      </section>

      <!-- Quick Categories -->
      <section class="quick-categories" @fadeIn>
        <div class="container">
          <h2 class="section-title"><span>Browse by</span> Category</h2>
          <div class="categories-grid">
            @for (category of categories; track category.id) {
            <a [routerLink]="['/movies']" [queryParams]="{ genre: category.id }" class="category-card">
              <div class="category-icon">
                <mat-icon>{{ category.icon }}</mat-icon>
              </div>
              <h3>{{ category.name }}</h3>
              <p>{{ getCategoryDescription(category.name) }}</p>
            </a>
            }
          </div>
        </div>
      </section>

      <!-- Movie Sections -->
      <section class="movie-sections">
        <div class="container">
          <mat-tab-group class="movie-tabs" animationDuration="500ms" [dynamicHeight]="true">
            <mat-tab label="Popular">
              <ng-template matTabContent>
                <div class="tab-content">
                  <div class="tab-header">
                      <h3>Most Popular Movies</h3>
                      <a routerLink="/movies/popular" class="view-all-link">View All <mat-icon>arrow_forward</mat-icon></a>
                  </div>
                  @if (isLoading.popular()) {
                    <div class="movies-grid">
                      @for (_ of [1,2,3,4,5,6]; track $index) {
                        <app-movie-card-skeleton></app-movie-card-skeleton>
                      }
                    </div>
                  } @else if (popularMovies().length > 0) {
                    <div class="movies-grid" @fadeIn>
                        @for (movie of popularMovies(); track movie.id) {
                            <app-movie-card [movie]="movie"></app-movie-card>
                        }
                    </div>
                  } @else {
                    <div class="empty-state">
                        <mat-icon class="empty-icon">movie_off</mat-icon>
                        <p>Could not load popular movies.</p>
                        <button mat-flat-button color="primary" (click)="loadMovies()">Try Again</button>
                    </div>
                  }
                </div>
              </ng-template>
            </mat-tab>

            <mat-tab label="Top Rated">
              <ng-template matTabContent>
                <div class="tab-content">
                    <div class="tab-header">
                        <h3>Highest Rated Movies</h3>
                        <a routerLink="/movies/top_rated" class="view-all-link">View All <mat-icon>arrow_forward</mat-icon></a>
                    </div>
                    @if (isLoading.topRated()) {
                        <div class="movies-grid">
                            @for (_ of [1,2,3,4,5,6]; track $index) {
                            <app-movie-card-skeleton></app-movie-card-skeleton>
                            }
                        </div>
                    } @else if (topRatedMovies().length > 0) {
                        <div class="movies-grid" @fadeIn>
                            @for (movie of topRatedMovies(); track movie.id) {
                                <app-movie-card [movie]="movie"></app-movie-card>
                            }
                        </div>
                    } @else {
                        <div class="empty-state">
                          <mat-icon class="empty-icon">error_outline</mat-icon>
                          <p>Could not load top rated movies.</p>
                        </div>
                    }
                </div>
              </ng-template>
            </mat-tab>

            <mat-tab label="Upcoming">
              <ng-template matTabContent>
                <div class="tab-content">
                    <div class="tab-header">
                        <h3>Coming Soon to Theaters</h3>
                        <a routerLink="/movies/upcoming" class="view-all-link">View All <mat-icon>arrow_forward</mat-icon></a>
                    </div>
                    @if (isLoading.upcoming()) {
                        <div class="movies-grid">
                          @for (_ of [1,2,3,4,5,6]; track $index) {
                            <app-movie-card-skeleton></app-movie-card-skeleton>
                          }
                        </div>
                    } @else if (upcomingMovies().length > 0) {
                        <div class="movies-grid" @fadeIn>
                            @for (movie of upcomingMovies(); track movie.id) {
                                <app-movie-card [movie]="movie"></app-movie-card>
                            }
                        </div>
                    } @else {
                      <div class="empty-state">
                        <mat-icon class="empty-icon">error_outline</mat-icon>
                        <p>Could not load upcoming movies.</p>
                      </div>
                    }
                </div>
              </ng-template>
            </mat-tab>

            <mat-tab label="Now Playing">
              <ng-template matTabContent>
                <div class="tab-content">
                    <div class="tab-header">
                        <h3>Currently in Theaters</h3>
                        <a routerLink="/movies/now_playing" class="view-all-link">View All <mat-icon>arrow_forward</mat-icon></a>
                    </div>
                    @if (isLoading.nowPlaying()) {
                        <div class="movies-grid">
                            @for (_ of [1,2,3,4,5,6]; track $index) {
                            <app-movie-card-skeleton></app-movie-card-skeleton>
                            }
                        </div>
                    } @else if (nowPlayingMovies().length > 0) {
                        <div class="movies-grid" @fadeIn>
                            @for (movie of nowPlayingMovies(); track movie.id) {
                                <app-movie-card [movie]="movie"></app-movie-card>
                            }
                        </div>
                    } @else {
                      <div class="empty-state">
                        <mat-icon class="empty-icon">error_outline</mat-icon>
                        <p>Could not load movies playing now.</p>
                      </div>
                    }
                </div>
              </ng-template>
            </mat-tab>
          </mat-tab-group>
        </div>
      </section>

      <!-- Featured Collections -->
      <section class="collections-section" @fadeIn>
        <div class="container">
          <h2 class="section-title"><span>Featured</span> Collections</h2>
          <div class="collections-grid">
            @for (collection of collections; track collection.title) {
            <div class="collection-card">
              <div class="collection-image" [style.background-image]="'url(' + collection.image + ')'"></div>
              <div class="collection-overlay">
                <h3>{{ collection.title }}</h3>
                <p>{{ collection.description }}</p>
                <button mat-stroked-button color="primary" [routerLink]="collection.route">
                  Explore Collection
                </button>
              </div>
            </div>
            }
          </div>
        </div>
      </section>

      <!-- Stats Section -->
      <section class="stats-section" (appIntersecting)="onStatsVisible($event)" @fadeIn>
        <div class="container">
          <div class="stats-grid">
            @for(stat of animatedStats(); track stat.label) {
            <div class="stat-item">
              <div class="stat-icon">
                <mat-icon>{{ stat.icon }}</mat-icon>
              </div>
              <div class="stat-number">{{ stat.value | number: '1.0-0' }}{{ stat.plus ? '+' : '' }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
            }
          </div>
        </div>
      </section>

      <!-- Call to Action -->
      <section class="cta-section" @fadeIn>
        <div class="container">
          <div class="cta-content">
            <h2>Ready for a cinematic journey?</h2>
            <p>Join now to create your personal watchlist and dive into a world of movies.</p>
            <div class="cta-actions">
              <button mat-raised-button class="cta-button primary" routerLink="/auth/register">
                <mat-icon>person_add</mat-icon>
                Get Started
              </button>
              <button mat-stroked-button class="cta-button secondary" routerLink="/movies">
                <mat-icon>explore</mat-icon>
                Browse Movies
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
    styles: [`
    :host {
      --primary-color: #6366F1;
      --accent-color: #8B5CF6;
      --warn-color: #EF4444;
      --text-color: #111827;
      --text-color-light: #6B7280;
      --bg-color: #ffffff;
      --bg-color-alt: #f9fafb;
      --border-color: #e5e7eb;
      --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      --card-shadow-hover: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
    }
    
    .dark {
      --text-color: #F9FAFB;
      --text-color-light: #9CA3AF;
      --bg-color: #111827;
      --bg-color-alt: #1F2937;
      --border-color: #374151;
    }
    .home-container { background-color: var(--bg-color); color: var(--text-color);}
    .container { width: 100%; max-width: 1280px; margin: 0 auto; }

    /* Hero Section */
    .hero-section {
      position: relative;
      border-radius: 2%;
      height: 100vh;
      min-height: 700px;
      overflow: hidden;
      perspective: 1500px;
    }
    .hero-loader {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        width: 100%;
    }
    .hero-carousel-container {
      position: relative;
      width: 100%;
      height: 100%;
      transform-style: preserve-3d;
    }
    .hero-slide {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
      transform-origin: center;
      transition: transform 0.8s cubic-bezier(0.3, 0, 0.2, 1), opacity 0.8s ease, filter 0.8s ease;
      z-index: 1;
      opacity: 0;
      filter: blur(10px);
    }
    .hero-slide.active {
      opacity: 1;
      z-index: 3;
      transform: translate3d(0, 0, 0) scale(1);
      filter: blur(0);
    }
    .hero-slide.prev {
      opacity: 0.5;
      z-index: 2;
      transform: translate3d(-35%, 0, -200px) scale(0.85) rotateY(15deg);
      filter: blur(4px);
    }
    .hero-slide.next {
      opacity: 0.5;
      z-index: 2;
      transform: translate3d(35%, 0, -200px) scale(0.85) rotateY(-15deg);
    }
    .slide-background {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      transition: transform 12s ease-in-out;
    }
    .hero-slide.active .slide-background { transform: scale(1.1); }
    .hero-content {
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      height: 100%;
    }
    .hero-content .container {
      display: flex;
      align-items: center;
      gap: 3rem;
    }
    .hero-text { flex: 1; }
    .movie-badge { margin-bottom: 1rem; }
    .badge-text {
      background: linear-gradient(90deg, var(--primary-color), var(--accent-color));
      padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: white;
    }
    .hero-title {
      font-size: clamp(2.5rem, 5vw, 4rem);
      font-weight: 800; margin-bottom: 1rem; color: white; text-shadow: 0 4px 20px rgba(0,0,0,0.5); line-height: 1.1;
    }
    .hero-description {
      font-size: 1.1rem; color: rgba(255, 255, 255, 0.85); margin-bottom: 2rem; max-width: 600px;
    }
    .hero-meta { display: flex; flex-wrap: wrap; gap: 1.5rem; margin-bottom: 2.5rem; }
    .hero-meta span { display: flex; align-items: center; gap: 0.5rem; color: white; font-weight: 500; }
    .hero-rating mat-icon { color: #FFD700; }
    .hero-actions { display: flex; gap: 1rem; }
    .hero-button { padding: 0.75rem 1.5rem; font-weight: 600; border-radius: 25px; }
    .hero-button.light { border: 1px solid rgba(255, 255, 255, 0.4); color: white; }
    .hero-poster { flex: 0 0 300px; }
    .poster-container {
      position: relative; width: 100%; border-radius: 16px; overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
      transform: perspective(1000px) rotateY(-8deg); transition: transform 0.6s ease;
    }
    .hero-slide.active .poster-container { transform: perspective(1000px) rotateY(0); }
    .poster-container:hover { transform: scale(1.05) rotateY(0) !important; }
    .poster-image { width: 100%; display: block; }
    .poster-overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex;
      align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease;
    }
    .poster-container:hover .poster-overlay { opacity: 1; }
    .play-button { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(5px); color: white; width: 70px; height: 70px; }
    .play-button mat-icon { font-size: 3rem; width: 3rem; height: 3rem; }

    /* Carousel Controls */
    .carousel-controls {
      position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%);
      display: flex; align-items: center; gap: 1rem; z-index: 20;
    }
    .control-button { background: rgba(0,0,0,0.3); color: white; }
    .control-button:hover { background: rgba(0,0,0,0.5); }
    .pagination-dots { display: flex; gap: 0.5rem; }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(255, 255, 255, 0.4); border: none; cursor: pointer; transition: all 0.4s ease; }
    .dot.active { background: white; transform: scale(1.3); }

    /* Progress & Scroll */
    .progress-bar {
      position: absolute; bottom: 0; left: 0; width: 100%; height: 3px;
      background: rgba(255, 255, 255, 0.2); z-index: 20;
    }
    .progress-fill { height: 100%; background: white; transition: width 0.1s linear; }
    .scroll-indicator {
      position: absolute; bottom: 5rem; left: 50%; transform: translateX(-50%);
      display: flex; flex-direction: column; align-items: center; color: white; font-size: 0.9rem; z-index: 20;
    }
    .scroll-indicator mat-icon { animation: bounce 2s infinite; }

    @keyframes bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-10px); } 60% { transform: translateY(-5px); } }

    /* General Section Styling */
    .section-title {
      font-size: 2.25rem; font-weight: 800; text-align: center; margin-bottom: 3rem;
    }
    .section-title span {
      display: block; font-size: 1rem; font-weight: 600; color: var(--primary-color);
      text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem;
    }

    /* Quick Categories */
    .quick-categories { padding: 5rem 0; }
    .categories-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }
    .category-card {
      display: flex; flex-direction: column; align-items: center; padding: 2rem;
      background-color: var(--bg-color); border-radius: 16px; text-decoration: none; color: inherit;
      transition: all 0.3s ease; box-shadow: var(--card-shadow); border: 1px solid var(--border-color);
    }
    .category-card:hover { transform: translateY(-10px); box-shadow: var(--card-shadow-hover); }
    .category-icon {
      width: 70px; height: 70px; border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
      display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem;
    }
    .category-icon mat-icon { color: white; font-size: 2.5rem; width: 2.5rem; height: 2.5rem; }
    .category-card h3 { font-size: 1.2rem; font-weight: 600; margin: 0 0 0.5rem; }
    .category-card p { font-size: 0.9rem; color: var(--text-color-light); text-align: center; margin: 0; }

    /* Movie Sections */
    .movie-sections { padding: 5rem 0; }
    .movie-tabs { width: 100%; }
    .tab-content { padding: 2.5rem 0.5rem; }
    .tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .tab-header h3 { font-size: 1.5rem; font-weight: 700; margin: 0; }
    .view-all-link {
        display: flex; align-items: center; gap: 0.25rem; text-decoration: none; color: var(--primary-color);
        font-weight: 600; transition: gap 0.3s ease;
    }
    .view-all-link:hover { gap: 0.5rem; }
    .movies-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 2rem 1.5rem;
    }
    .empty-state {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 4rem; text-align: center; border: 2px dashed var(--border-color); border-radius: 16px;
    }
    .empty-icon { font-size: 4rem; width: 4rem; height: 4rem; margin-bottom: 1rem; opacity: 0.3; }

    /* Collections Section */
    .collections-section { padding: 5rem 0; }
    .collections-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem; }
    .collection-card {
      border-radius: 16px; overflow: hidden; height: 300px; position: relative;
      box-shadow: var(--card-shadow); transition: all 0.4s ease;
    }
    .collection-card:hover { transform: translateY(-10px); box-shadow: var(--card-shadow-hover); }
    .collection-image {
      width: 100%; height: 100%; background-size: cover; background-position: center;
      transition: transform 0.6s ease;
    }
    .collection-card:hover .collection-image { transform: scale(1.1); }
    .collection-overlay {
      position: absolute; inset: 0; padding: 2rem; color: white;
      background: linear-gradient(to top, rgba(0,0,0,0.9) 20%, transparent 80%);
      display: flex; flex-direction: column; justify-content: flex-end;
    }
    .collection-overlay h3 { margin: 0 0 0.5rem; font-size: 1.5rem; }
    .collection-overlay p { margin: 0 0 1.5rem; opacity: 0.8; font-size: 0.9rem; }

    /* Stats Section */
    .stats-section { padding: 5rem 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 2rem; }
    .stat-item {
      text-align: center; padding: 2rem; background-color: var(--bg-color-alt);
      border-radius: 16px; border: 1px solid var(--border-color);
    }
    .stat-icon {
        width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 1.5rem;
        background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
        display: flex; align-items: center; justify-content: center;
    }
    .stat-icon mat-icon { color: white; font-size: 2rem; }
    .stat-number {
        font-size: 3rem; font-weight: 800; margin-bottom: 0.5rem;
        background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
        -webkit-background-clip: text; color: transparent; background-clip: text;
    }
    .stat-label { font-size: 1rem; color: var(--text-color-light); }

    /* CTA Section */
    .cta-section {
      padding: 5rem 0; text-align: center;
      color: white;
    }
    .cta-content h2 { font-size: 2.5rem; font-weight: 800; margin-bottom: 1rem; }
    .cta-content p { font-size: 1.2rem; margin-bottom: 2.5rem; opacity: 0.8; max-width: 600px; margin-inline: auto; }
    .cta-actions { display: flex; gap: 1rem; justify-content: center; }
    .cta-button { padding: 1rem 2rem; font-size: 1rem; font-weight: 600; border-radius: 30px; }
    .cta-button.primary { background-color: white; color: var(--primary-color); }
    .cta-button.secondary { border-color: rgba(255,255,255,0.5); color: white; }

    /* Responsive */
    @media (max-width: 1024px) {
      .hero-content .container { flex-direction: column; text-align: center; }
      .hero-poster { margin-top: 2rem; max-width: 250px; }
      .hero-actions { justify-content: center; }
    }
    @media (max-width: 768px) {
      .hero-section { min-height: 80vh; }
      .hero-slide.prev { transform: translate3d(-50%, 0, -250px) scale(0.7) rotateY(20deg); }
      .hero-slide.next { transform: translate3d(50%, 0, -250px) scale(0.7) rotateY(-20deg); }
      .movies-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
    }
  `]
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
    private readonly tmdbService = inject(TmdbService);
    private readonly themeService = inject(ThemeService);
    private readonly router = inject(Router);
    private readonly dialog = inject(MatDialog);
    private readonly cdr = inject(ChangeDetectorRef);

    private themeSubscription?: Subscription;
    private autoPlayInterval?: any;
    private progressInterval?: any;
    private resizeSubscription?: Subscription;

    // --- Signals for State Management ---
    readonly isDarkTheme = signal(this.themeService.isDarkMode());
    readonly currentSlide = signal(0);
    readonly progressWidth = signal(0);

    // Movie Data Signals
    readonly featuredMovies = signal<Movie[]>([]);
    readonly popularMovies = signal<Movie[]>([]);
    readonly topRatedMovies = signal<Movie[]>([]);
    readonly upcomingMovies = signal<Movie[]>([]);
    readonly nowPlayingMovies = signal<Movie[]>([]);

    // Loading and Error State Signals
    readonly isLoading = {
        featured: signal(true),
        popular: signal(true),
        topRated: signal(true),
        upcoming: signal(true),
        nowPlaying: signal(true)
    };
    readonly hasError = {
        featured: signal(false),
        popular: signal(false),
        topRated: signal(false),
        upcoming: signal(false),
        nowPlaying: signal(false)
    };

    // Stats Animation Signals
    private readonly statsVisible = signal(false);
    readonly animatedStats = computed(() => {
        const stats = this.statsArray;
        if (!this.statsVisible()) return stats.map(s => ({ ...s, value: 0 }));
        return stats.map(s => s);
    });

    // --- Static Data ---
    readonly categories = [
        { id: 28, name: 'Action', icon: 'local_fire_department' },
        { id: 35, name: 'Comedy', icon: 'sentiment_very_satisfied' },
        { id: 18, name: 'Drama', icon: 'theater_comedy' },
        { id: 27, name: 'Horror', icon: 'mood_bad' },
        { id: 10749, name: 'Romance', icon: 'favorite' },
        { id: 878, name: 'Sci-Fi', icon: 'rocket_launch' }
    ];

    readonly collections = [
        { title: 'Marvel Cinematic Universe', description: 'The epic superhero franchise', image: '/assets/images/collection-marvel.jpg', route: '/collection/marvel' },
        { title: 'Oscar Winners', description: 'Academy Award winning films', image: '/assets/images/collection-oscars.jpg', route: '/collection/oscars' },
        { title: 'Animated Classics', description: 'Timeless animated masterpieces', image: '/assets/images/collection-animation.jpg', route: '/collection/animation' }
    ];

    private readonly statsArray = [
        { icon: 'movie', value: 25000, plus: true, label: 'Movies' },
        { icon: 'people', value: 1000000, plus: true, label: 'Users' },
        { icon: 'rate_review', value: 5000000, plus: true, label: 'Reviews' },
        { icon: 'public', value: 180, plus: false, label: 'Countries' }
    ];

    constructor() {
        //add subscriptions
    }

    ngOnInit(): void {
        this.loadMovies();
    }

    ngAfterViewInit(): void {
        this.resizeSubscription = fromEvent(window, 'resize').pipe(debounceTime(100)).subscribe();
    }

    ngOnDestroy(): void {
        this.themeSubscription?.unsubscribe();
        this.resizeSubscription?.unsubscribe();
        this.clearTimers();
    }

    protected loadMovies(): void {
        const movieRequests = {
            featured: this.tmdbService.getMovies('popular', 1).pipe(catchError(() => of(null))),
            popular: this.tmdbService.getMovies('popular', 1).pipe(catchError(() => of(null))),
            topRated: this.tmdbService.getMovies('top_rated', 1).pipe(catchError(() => of(null))),
            upcoming: this.tmdbService.getMovies('upcoming', 1).pipe(catchError(() => of(null))),
            nowPlaying: this.tmdbService.getMovies('now_playing', 1).pipe(catchError(() => of(null)))
        };

        forkJoin(movieRequests).subscribe(results => {
            // Featured Movies
            if (results.featured) {
                this.featuredMovies.set(results.featured.results.slice(0, 5));
                this.startAutoPlay();
            } else { this.hasError.featured.set(true); }
            this.isLoading.featured.set(false);

            // Popular Movies
            if (results.popular) { this.popularMovies.set(results.popular.results.slice(0, 12)); }
            else { this.hasError.popular.set(true); }
            this.isLoading.popular.set(false);

            // Top Rated Movies
            if (results.topRated) { this.topRatedMovies.set(results.topRated.results.slice(0, 12)); }
            else { this.hasError.topRated.set(true); }
            this.isLoading.topRated.set(false);

            // Upcoming Movies
            if (results.upcoming) { this.upcomingMovies.set(results.upcoming.results.slice(0, 12)); }
            else { this.hasError.upcoming.set(true); }
            this.isLoading.upcoming.set(false);

            // Now Playing Movies
            if (results.nowPlaying) { this.nowPlayingMovies.set(results.nowPlaying.results.slice(0, 12)); }
            else { this.hasError.nowPlaying.set(true); }
            this.isLoading.nowPlaying.set(false);

            this.cdr.markForCheck();
        });
    }

    private startAutoPlay(): void {
        this.clearTimers();
        this.autoPlayInterval = setInterval(() => this.nextSlide(true), 5000);
        this.startProgressBar();
    }

    private clearTimers(): void {
        clearInterval(this.autoPlayInterval);
        clearInterval(this.progressInterval);
    }

    private resetAutoPlay(): void {
        this.clearTimers();
        this.startAutoPlay();
    }

    nextSlide(isAutoplay: boolean = false): void {
        this.currentSlide.update(slide => (slide + 1) % this.featuredMovies().length);
        if (!isAutoplay) this.resetAutoPlay(); else this.startProgressBar();
    }

    previousSlide(): void {
        this.currentSlide.update(slide => (slide === 0 ? this.featuredMovies().length - 1 : slide - 1));
        this.resetAutoPlay();
    }

    goToSlide(index: number): void {
        this.currentSlide.set(index);
        this.resetAutoPlay();
    }

    private startProgressBar(): void {
        this.progressWidth.set(0);
        clearInterval(this.progressInterval);
        this.progressInterval = setInterval(() => {
            this.progressWidth.update(w => Math.min(100, w + 100 / (5000 / 100)));
        }, 100);
    }

    getSlideClass(index: number): string {
        const current = this.currentSlide();
        const total = this.featuredMovies().length;
        if (index === current) return 'active';
        if (index === (current - 1 + total) % total) return 'prev';
        if (index === (current + 1) % total) return 'next';
        return '';
    }

    getBackdropUrl = (path: string | null): string => path ? `https://image.tmdb.org/t/p/w1920_and_h800_multi_faces${path}` : '/assets/images/placeholder-backdrop.jpg';
    getPosterUrl = (path: string | null, size: string = 'w500'): string => path ? `https://image.tmdb.org/t/p/${size}${path}` : '/assets/images/placeholder-poster.jpg';
    truncateText = (text: string, maxLength: number): string => text?.length > maxLength ? text.substring(0, maxLength) + '...' : text;

    getCategoryDescription(name: string): string {
        const descriptions: { [key: string]: string } = {
            'Action': 'High-octane, thrilling sequences', 'Comedy': 'Lighthearted fun and laughter',
            'Drama': 'Powerful, character-driven stories', 'Horror': 'Spine-chilling terror and suspense',
            'Romance': 'Heartwarming tales of love', 'Sci-Fi': 'Imaginative, futuristic worlds'
        };
        return descriptions[name] || 'Explore this genre';
    }

    addToWatchlist(movie: Movie): void {
        console.log('Added to watchlist:', movie.title); // Placeholder
        // Example: this.watchlistService.add(movie.id);
    }

    playTrailer(movie: Movie): void {
        this.dialog.open(TrailerPlayerComponent, { data: { movieId: movie.id }, panelClass: 'trailer-dialog' });
        console.log('Opening trailer for:', movie.title);
    }

    showMovieDetails(movie: Movie): void {
        this.dialog.open(MovieDetailsModalComponent, { data: { movie }, panelClass: 'details-dialog' });
        console.log('Showing quick details for:', movie.title);
    }

    onStatsVisible(isIntersecting: boolean): void {
        if (isIntersecting && !this.statsVisible()) {
            this.statsVisible.set(true);
            this.animateStats();
        }
    }

    private animateStats(): void {
        this.animatedStats().forEach(stat => {
            let current = 0;
            const target = stat.value;
            const stepTime = 20; // ms
            const totalTime = 1500; // ms
            const steps = totalTime / stepTime;
            const increment = target / steps;

            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                const statToUpdate = this.statsArray.find(s => s.label === stat.label);
                if (statToUpdate) {
                    statToUpdate.value = Math.ceil(current);
                    this.cdr.markForCheck(); // Manually trigger change detection for animation
                }
            }, stepTime);
        });
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        if (event.key === 'ArrowLeft') this.previousSlide();
        if (event.key === 'ArrowRight') this.nextSlide();
    }
}

import {
    Component,
    OnInit,
    OnDestroy,
    inject,
    signal,
    ChangeDetectionStrategy,
    ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TmdbService } from '@core/services/tmdb.service';
import { Movie } from '@core/models/movie.model';
import { MovieCardComponent } from '@shared/components/movie-card/movie-card.component';
import { MovieCardSkeletonComponent } from '@shared/components/movie-card-skeleton/movie-card-skeleton.component';
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
    selector: 'app-collection-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatProgressSpinnerModule,
        MovieCardComponent,
        MovieCardSkeletonComponent
    ],
    template: `
    <div class="collection-page container">
      <div class="header">
        <button mat-icon-button (click)="goBack()" aria-label="Back">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="title-block">
          <h1 class="title">{{ collectionTitle() }}</h1>
          <p class="subtitle" *ngIf="collectionDescription()">{{ collectionDescription() }}</p>
        </div>
      </div>
        
      <div *ngIf="isLoading()" class="movies-grid">
        <app-movie-card-skeleton *ngFor="let _ of skeletonArray"></app-movie-card-skeleton>
      </div>

      <div *ngIf="!isLoading() && hasError()" class="error-state">
        <mat-icon class="error-icon">error_outline</mat-icon>
        <p>Could not load collection movies.</p>
        <button mat-flat-button color="primary" (click)="reload()">Try again</button>
      </div>

      <div *ngIf="!isLoading() && movies().length === 0 && !hasError()" class="empty-state">
        <mat-icon class="empty-icon">movie_off</mat-icon>
        <p>No movies found in this collection.</p>
      </div>

      <div *ngIf="movies().length > 0" class="movies-grid">
        <app-movie-card *ngFor="let m of movies(); trackBy: trackByMovieId" [movie]="m"></app-movie-card>
      </div>
        
      <div class="actions" *ngIf="!isLoading() && !hasError() && currentPage() < totalPages()">
        <button mat-stroked-button color="primary" (click)="loadMore()" [disabled]="isLoadingMore()">
          <mat-icon *ngIf="!isLoadingMore()">add</mat-icon>
          <mat-icon *ngIf="isLoadingMore()">autorenew</mat-icon>
          <span *ngIf="!isLoadingMore()">Load more</span>
          <span *ngIf="isLoadingMore()">Loading...</span>
        </button>
      </div>
    </div>
  `,
    styles: [`
    .container { max-width: 1280px; margin: 0 auto; padding: 2rem; }
    .header { display:flex; align-items:center; gap:1rem; margin-bottom:1rem; }
    .title-block .title { font-size:2rem; margin:0; }
    .title-block .subtitle { margin:0.25rem 0 0; color:var(--text-color-light); }
    .controls { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; }
    .movies-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:1.25rem; margin-top:1rem; }
    .actions { display:flex; justify-content:center; margin:2rem 0; }
    .error-state, .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:3rem; border-radius:12px; border:1px dashed var(--border-color); }
    .error-icon, .empty-icon { font-size:3rem; margin-bottom:1rem; opacity:0.6; }
  `],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CollectionPageComponent implements OnInit, OnDestroy {
    private readonly tmdbService = inject(TmdbService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly cdr = inject(ChangeDetectorRef);

    // signals
    readonly movies = signal<Movie[]>([]);
    readonly isLoading = signal(true);
    readonly isLoadingMore = signal(false);
    readonly hasError = signal(false);
    readonly collectionTitle = signal<string>('Collection');
    readonly collectionDescription = signal<string>('');

    // pagination
    private currentPageSignal = signal(1);
    currentPage = () => this.currentPageSignal();
    private totalPagesSignal = signal(1);
    totalPages = () => this.totalPagesSignal();
    private totalResultsSignal = signal(0);
    totalResults = () => this.totalResultsSignal();

    // helpers
    readonly skeletonArray = Array.from({ length: 8 });

    private keywordId?: number;
    private sub?: Subscription;

    ngOnInit(): void {
        // expect route param 'keywordId' (number)
        // fallback: try route param 'id' as number
        const params = this.route.snapshot.paramMap;
        const k = params.get('keywordId') ?? params.get('id');
        if (!k) {
            console.warn('CollectionPageComponent: route param "keywordId" or "id" missing.');
            this.hasError.set(true);
            this.isLoading.set(false);
            return;
        }

        const parsed = Number(k);
        if (Number.isNaN(parsed) || parsed <= 0) {
            console.warn('CollectionPageComponent: route param is not a valid number:', k);
            this.hasError.set(true);
            this.isLoading.set(false);
            return;
        }

        this.keywordId = parsed;
        // optional: if you want to set title/description from route data or query params
        const title = this.route.snapshot.queryParamMap.get('title');
        const desc = this.route.snapshot.queryParamMap.get('desc');
        if (title) this.collectionTitle.set(title);
        if (desc) this.collectionDescription.set(desc);

        this.loadPage(1);
    }

    ngOnDestroy(): void {
        this.sub?.unsubscribe();
    }

    private loadPage(page: number, append = false): void {
        if (!this.keywordId) return;
        if (page === 1) {
            this.isLoading.set(true);
            this.hasError.set(false);
        } else {
            this.isLoadingMore.set(true);
        }

        this.sub?.unsubscribe();
        this.sub = this.tmdbService.getMovieCollections(this.keywordId, page).pipe(
            catchError(err => {
                console.error('Failed to load collection movies', err);
                this.hasError.set(true);
                this.isLoading.set(false);
                this.isLoadingMore.set(false);
                this.cdr.markForCheck();
                return of(null);
            })
        ).subscribe(resp => {
            if (!resp) return;
            const pageResults = resp.results || [];
            if (append) {
                this.movies.update(curr => [...curr, ...pageResults]);
            } else {
                this.movies.set(pageResults);
            }
            this.currentPageSignal.set(resp.page || 1);
            this.totalPagesSignal.set(resp.total_pages || 1);
            this.totalResultsSignal.set(resp.total_results || pageResults.length);
            this.isLoading.set(false);
            this.isLoadingMore.set(false);
            this.cdr.markForCheck();
        });
    }

    // public helpers used in template
    trackByMovieId(_: number, item: Movie) {
        return item?.id;
    }

    reload(): void {
        if (!this.keywordId) return;
        this.loadPage(1);
    }

    loadMore(): void {
        const next = this.currentPage() + 1;
        if (next > this.totalPages()) return;
        this.loadPage(next, true);
    }

    goBack(): void {
        this.router.navigate(['../'], { relativeTo: this.route });
    }
}

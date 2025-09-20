// src/app/shared/components/search-bar/search-bar.component.ts
import {
  Component,
  inject,
  ChangeDetectionStrategy,
  signal,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewInit,
  booleanAttribute
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, tap, map } from 'rxjs/operators';

import { TmdbService } from '@core/services/tmdb.service';
import { TmdbItem } from '@core/models/movie.model';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="search-root" [class.compact]="compact" [class.expanded]="opened()">
      <!-- compact collapsed view: just an icon (when compact=true and closed) -->
      <button
        *ngIf="compact && !opened()"
        class="compact-icon-btn"
        mat-icon-button
        aria-label="Open search"
        (click)="open()">
        <mat-icon>search</mat-icon>
      </button>

      <!-- expanding search area -->
      <div class="expander" [attr.aria-hidden]="compact && !opened() ? 'true' : 'false'">
        <mat-form-field appearance="outline" class="search-field glass-search" role="search">
          <input
            matInput
            #inputEl
            [formControl]="searchControl"
            [matAutocomplete]="auto"
            [attr.placeholder]="placeholder"
            (keydown.escape)="handleEscape()"
            (keydown.enter)="performSearch()"
            autocomplete="off"
            [attr.aria-label]="'Search movies, actors, keywords'"
            />
          
          <mat-progress-spinner
            *ngIf="loading()"
            matSuffix
            diameter="20"
            mode="indeterminate"
            aria-hidden="true"></mat-progress-spinner>

          <button mat-icon-button matSuffix *ngIf="trimmedQuery" (click)="clearSearch()" [attr.aria-label]="'Clear search'">
            <mat-icon>close</mat-icon>
          </button>

          <button mat-icon-button matSuffix (click)="performSearch()" [disabled]="!trimmedQuery" [attr.aria-label]="'Execute search'">
            <mat-icon>send</mat-icon>
          </button>

          <mat-autocomplete
            #auto="matAutocomplete"
            (optionSelected)="onOptionSelected($event.option.value)"
            [displayWith]="displayFn"
            panelClass="cinehub-autocomplete-panel">
            <mat-option *ngIf="(suggestions$ | async)?.length === 0 && !loading()" class="no-results muted">
              No results
            </mat-option>

            <mat-option *ngFor="let item of suggestions$ | async; trackBy: trackById" [value]="item" class="suggestion-row" [attr.aria-label]="(item.title||item.name)||''">
              <img *ngIf="item.poster_path" [src]="getPosterUrl(item.poster_path)" [alt]="item.title || item.name" class="thumb" />
              <div class="meta">
                <div class="title">{{ item.title || item.name }}</div>
                <div class="sub">
                  <span class="muted">{{ item.media_type || 'movie' }}</span>
                  <span *ngIf="item.release_date || item.first_air_date" class="muted"> • {{ getYear(item) }}</span>
                  <span *ngIf="item.vote_average" class="rating"> ★ {{ formatRating(item.vote_average) }}</span>
                </div>
              </div>
            </mat-option>
          </mat-autocomplete>
        </mat-form-field>

        <!-- recent searches (simple chips) -->
        <div *ngIf="recentSearches.length > 0" class="recent-chips" aria-label="Recent searches">
          <div class="recent-label muted">Recent:</div>
          <div class="chips">
            <ng-container *ngFor="let q of recentSearches; trackBy: trackByQuery">
              <button class="chip" type="button" (click)="useRecent(q)" [attr.aria-label]="'Use recent ' + q">
                <span class="chip-text">{{ q }}</span>
                <button class="chip-remove" type="button" (click)="removeRecent(q); $event.stopPropagation()" [attr.aria-label]="'Remove ' + q">
                  <mat-icon inline>close</mat-icon>
                </button>
              </button>
            </ng-container>
            <button *ngIf="recentSearches.length" mat-button class="clear-recents" (click)="clearRecents()" [attr.aria-label]="'Clear recent searches'">Clear</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display:block; }

    /* root states */
    .search-root { display: flex; align-items: center; gap: 8px; }
    .search-root.compact { align-items: center; }
    .compact-icon-btn { transition: transform .12s ease; }
    .compact-icon-btn:active { transform: scale(.98); }

    /* expander - collapsed vs open sizes */
    .expander {
      width: 100%;
      max-width: 760px;
      transition: width 280ms cubic-bezier(.2,.9,.25,1), opacity 200ms ease;
      opacity: 1;
      display: block;
    }
    /* when in compact mode and closed, hide the expander */
    .search-root.compact:not(.expanded) .expander { width: 0; opacity: 0; overflow: hidden; pointer-events: none; }

    /* search field glass styling */
    .search-field { width: 100%; margin: 0; }
    .glass-search .mat-mdc-text-field-wrapper {
      border-radius: 999px;
      padding-left: 12px;
      padding-right: 8px;
      height: 40px;
      background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
      border: 1px solid rgba(255,255,255,0.06);
      backdrop-filter: blur(8px) saturate(120%); -webkit-backdrop-filter: blur(8px) saturate(120%);
      box-shadow: 0 6px 20px rgba(2,6,23,0.12);
      transition: box-shadow .18s, transform .18s;
      display: flex; align-items: center;
    }
    .glass-search .mat-mdc-text-field-wrapper:focus-within {
      box-shadow: 0 12px 40px rgba(2,6,23,0.16);
      transform: translateY(-2px);
    }

    /* autocomplete panel styling */
    .cinehub-autocomplete-panel {
      border-radius: 10px !important;
      box-shadow: 0 18px 50px rgba(2,6,23,0.25) !important;
      background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)) !important;
      border: 1px solid rgba(255,255,255,0.06) !important;
      padding: 6px !important;
      margin-top: 6px !important;
      min-width: 280px;
      max-width: 720px;
    }

    .suggestion-row { display:flex; gap:12px; align-items:center; padding:8px; border-radius:8px; }
    .thumb { width:56px; height:84px; object-fit:cover; border-radius:6px; flex-shrink:0; }
    .meta { min-width:0; overflow:hidden; }
    .title { font-weight:600; font-size:.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .sub { font-size:.8rem; color: rgba(255,255,255,0.68); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .muted { color: rgba(255,255,255,0.6); }
    .rating { color: #fbbf24; font-weight:600; margin-left:6px; }

    .no-results { padding:8px 12px; }

    /* recent chips */
    .recent-chips { margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .recent-label { margin-right:6px; font-size:0.9rem; }
    .chips { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .chip { display:inline-flex; align-items:center; gap:6px; background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); border:1px solid rgba(255,255,255,0.04); padding:6px 8px; border-radius:999px; cursor:pointer; }
    .chip-text { font-size:0.85rem; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .chip-remove { background:transparent; border:none; display:inline-flex; padding:2px; margin-left:4px; cursor:pointer; color:inherit; }

    .clear-recents { margin-left:8px; }

    /* responsive tweaks */
    @media (max-width: 640px) {
      .expander { max-width: calc(100vw - 96px); position: relative; z-index: 1300; }
      .cinehub-autocomplete-panel { min-width: calc(100vw - 48px) !important; }
    }
  `]
})
export class SearchBarComponent implements AfterViewInit {
  private router = inject(Router);
  private tmdbService = inject(TmdbService);

  // MODE CONTROL
  /** If true the component renders compact icon and expands when opened. Default false. */
  @Input({transform: booleanAttribute}) compact = false;

  /** two-way control: parent can bind [opened] / (openedChange) or call methods open()/close(). */
  @Input() openedInitial = false;
  @Output() openedChange = new EventEmitter<boolean>();

  // internal signal for open state (so template can read quickly)
  protected readonly opened = signal<boolean>(false);

  // form & suggestions
  readonly searchControl = new FormControl('');
  suggestions$: Observable<TmdbItem[]> = of([]);
  readonly loading = signal(false);

  // recent searches
  recentSearches: string[] = this.loadRecent();
  placeholder = 'Search movies, actors, keywords...';

  @ViewChild('inputEl', { static: false }) inputRef?: ElementRef<HTMLInputElement>;

  ngAfterViewInit(): void {
    // initialize opened state from input
    this.opened.set(!!this.openedInitial);

    // wire suggestion stream
    this.suggestions$ = this.searchControl.valueChanges.pipe(
        debounceTime(240),
        distinctUntilChanged((a, b) => this.normalizeValue(a) === this.normalizeValue(b)),
        tap(() => this.loading.set(true)),
        switchMap(value => {
          const q = this.normalizeValue(value);
          if (!q) { this.loading.set(false); return of([] as TmdbItem[]); }
          return this.tmdbService.searchMoviesForAutocomplete(q).pipe(
              map(res => Array.isArray(res) ? res : []),
              tap(() => this.loading.set(false)),
              catchError(err => { console.error('Autocomplete error', err); this.loading.set(false); return of([] as TmdbItem[]); })
          );
        })
    );
  }

  // public control methods for parent
  open(focus = true): void {
    this.opened.set(true);
    this.openedChange.emit(true);
    // focus input after small delay to allow animation
    setTimeout(() => { try { if (focus) this.inputRef?.nativeElement?.focus(); } catch {} }, 60);
  }

  close(): void {
    this.opened.set(false);
    this.openedChange.emit(false);
    this.clearSearch();
  }

  handleEscape(): void {
    if (this.compact) this.close();
    else this.clearSearch();
  }

  performSearch(): void {
    const q = this.trimmedQuery;
    if (!q) return;
    this.addRecent(q);
    this.router.navigate(['/search'], { queryParams: { q } });
    if (this.compact) this.close();
  }

  onOptionSelected(item: TmdbItem): void {
    if (!item) return;
    const media = item.media_type || 'movie';
    this.router.navigate([`/${media}`, item.id]);
    const q = item.title || item.name || '';
    if (q) this.addRecent(q);
    if (this.compact) this.close();
  }

  // helpers / small utils
  private normalizeValue(v: any): string {
    if (!v) return '';
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'object') return (v.title || v.name || '').trim();
    return '';
  }

  displayFn = (item: TmdbItem | string | null) => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item.title || item.name || '';
  };

  get trimmedQuery(): string { return this.normalizeValue(this.searchControl.value); }

  clearSearch(): void { this.searchControl.setValue(''); }

  getPosterUrl(path: string | null) {
    if (!path) return '/assets/images/placeholder-poster.jpg';
    return `https://image.tmdb.org/t/p/w300${path}`;
  }

  getYear(item: TmdbItem) {
    const date = (item as any).release_date || (item as any).first_air_date || '';
    return date ? ('' + new Date(date).getFullYear()) : '';
  }

  formatRating(r: number | undefined) {
    if (r == null) return '';
    return (Math.round((r) * 10) / 10).toFixed(1);
  }

  // recent searches storage
  private loadRecent(): string[] {
    try {
      const raw = localStorage.getItem('cinehub_recent_searches');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
    } catch { return []; }
  }
  private saveRecent(list: string[]) { try { localStorage.setItem('cinehub_recent_searches', JSON.stringify(list.slice(0, 8))); } catch {} }
  private addRecent(q: string) {
    if (!q) return;
    const t = q.trim();
    let list = this.recentSearches.filter(x => x.toLowerCase() !== t.toLowerCase());
    list.unshift(t);
    if (list.length > 8) list = list.slice(0, 8);
    this.recentSearches = list;
    this.saveRecent(list);
  }
  useRecent(q: string) { this.searchControl.setValue(q); this.performSearch(); }
  removeRecent(q: string) { this.recentSearches = this.recentSearches.filter(r => r !== q); this.saveRecent(this.recentSearches); }
  clearRecents() { this.recentSearches = []; this.saveRecent([]); }

  trackById(index: number, item: TmdbItem) { return item?.id ?? index; }
  trackByQuery(index: number, q: string) { return q; }
}

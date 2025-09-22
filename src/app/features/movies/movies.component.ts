// src/app/features/movies/movies.component.ts
import {
    Component,
    OnInit,
    inject,
    signal,
    ChangeDetectionStrategy,
    OnDestroy,
    HostListener,
    ElementRef,
    ViewChild,
    AfterViewInit,
    Renderer2
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {ReactiveFormsModule, FormBuilder, FormGroup, FormControl, FormArray, FormsModule} from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// Core & Shared
import { Movie, MovieFilters } from '@core/models/movie.model';
import { TmdbService } from '@core/services/tmdb.service';
import { MovieCardComponent } from '@shared/components/movie-card/movie-card.component';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';

@Component({
    selector: 'app-movies',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MovieCardComponent,
        LoadingSpinnerComponent,
        FormsModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="movies-root" #filtersRoot>
      <!-- Modern Filter Bar -->
      <nav class="filter-bar" [class.compact]="isCompact" role="navigation" aria-label="Movie filters"
           (click)="$event.stopPropagation()">
        <div class="filter-container">

          <!-- Filter Header  -->
          <div class="filter-header">
            <!-- Mobile toggle with active count -->
            <button class="mobile-toggle" type="button" (click)="toggleMobileFilters()"
                    [attr.aria-expanded]="mobileFiltersOpen" aria-label="Toggle filters">
              <span class="svg-icon" [innerHTML]="getIcon(mobileFiltersOpen ? 'close' : 'filter')"></span>
              <span>Filters</span>
              <span *ngIf="hasActiveFilters()" class="active-count" aria-hidden="true">{{ activeChips().length }}</span>
            </button>
          </div>

          <!-- Filter Content -->
          <div class="filter-content" [class.show]="mobileFiltersOpen" [attr.aria-hidden]="!mobileFiltersOpen && isSmallScreen()">
            <!-- Main Filter Grid -->
            <div class="filter-grid">

              <!-- Search Input -->
              <div class="filter-item search-item">
                <label class="filter-label" for="searchInput">Search</label>
                <div class="search-wrapper">
                  <span class="svg-icon search-icon" [innerHTML]="getIcon('search')"></span>
                  <input
                    id="searchInput"
                    type="text"
                    class="form-control search-input"
                    placeholder="Search movies..."
                    [formControl]="queryControl"
                    autocomplete="off"
                    aria-label="Search movies"
                    (keydown.enter)="applyFilters()">
                  <button
                    type="button"
                    class="clear-search-btn"
                    *ngIf="queryControl.value"
                    (click)="clearSearch()"
                    aria-label="Clear search">
                    <span class="svg-icon" [innerHTML]="getIcon('close')"></span>
                  </button>
                </div>
              </div>

              <!-- Category Dropdown -->
              <div class="filter-item">
                <label class="filter-label">Category</label>
                <div class="custom-dropdown" [class.open]="categoryOpen" (click)="$event.stopPropagation()">
                  <button class="dropdown-toggle" type="button" (click)="toggleCategory($event)"
                          [attr.aria-expanded]="categoryOpen" [attr.aria-controls]="'category-panel'">
                    <span>{{ getCategoryLabel(categoryControl.value) }}</span>
                    <span class="svg-icon chev" [innerHTML]="getIcon('chevDown')"></span>
                  </button>
                  <ul id="category-panel" class="dropdown-list fade-in" *ngIf="categoryOpen" role="listbox" tabindex="-1">
                    <li class="dropdown-option" (click)="setCategory('')" role="option">All</li>
                    <li class="dropdown-option" (click)="setCategory('movie')" role="option">Movie</li>
                    <li class="dropdown-option" (click)="setCategory('tv')" role="option">TV Show</li>
                    <li class="dropdown-option" (click)="setCategory('person')" role="option">Person</li>
                  </ul>
                </div>
              </div>

              <!-- Genres Multi-Select -->
              <div class="filter-item">
                <label class="filter-label">Genre</label>
                <div class="custom-dropdown" [class.open]="genresOpen" (click)="$event.stopPropagation()">
                  <button class="dropdown-toggle" type="button" (click)="toggleGenres($event)"
                          [attr.aria-expanded]="genresOpen" [attr.aria-controls]="'genres-panel'">
                    <span>{{ genreSummary() }}</span>
                    <span class="svg-icon chev" [innerHTML]="getIcon('chevDown')"></span>
                  </button>

                  <div id="genres-panel" class="dropdown-panel fade-in" *ngIf="genresOpen" role="menu" tabindex="-1">
                    <div class="searchable-list">
                      <div class="checkbox-list" role="group" aria-label="Genres">
                        <label *ngFor="let g of filteredGenres; trackBy: trackByGenre" class="check-option">
                          <input
                            type="checkbox"
                            [value]="g.id"
                            (change)="onGenreCheckboxChange(g.id, $event)"
                            [checked]="isGenreSelected(g.id)"
                            [attr.aria-checked]="isGenreSelected(g.id) ? 'true' : 'false'">
                          <span>{{ g.name }}</span>
                        </label>
                      </div>
                    </div>
                    <div class="panel-actions">
                      <button type="button" class="action-btn secondary" (click)="selectAllGenres()">Select All</button>
                      <button type="button" class="action-btn secondary" (click)="clearGenres()">Clear</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Year Input -->
              <div class="filter-item">
                <label class="filter-label" for="yearInput">Year</label>
                <input
                  id="yearInput"
                  type="number"
                  class="form-control"
                  placeholder="2023"
                  min="1900"
                  [max]="currentYearPlusOne"
                  [formControl]="yearControl">
              </div>

              <!-- Sort By Dropdown -->
              <div class="filter-item">
                <label class="filter-label">Sort By</label>
                <div class="custom-dropdown" [class.open]="sortOpen" (click)="$event.stopPropagation()">
                  <button class="dropdown-toggle" type="button" (click)="toggleSort($event)"
                          [attr.aria-expanded]="sortOpen" [attr.aria-controls]="'sort-panel'">
                    <span>{{ getSortLabel(sortByControl.value) }}</span>
                    <span class="svg-icon chev" [innerHTML]="getIcon('chevDown')"></span>
                  </button>
                  <ul id="sort-panel" class="dropdown-list fade-in" *ngIf="sortOpen" role="listbox" tabindex="-1">
                    <li class="dropdown-option" (click)="setSort('popularity.desc')" role="option">Popular</li>
                    <li class="dropdown-option" (click)="setSort('primary_release_date.desc')" role="option">Newest</li>
                    <li class="dropdown-option" (click)="setSort('vote_average.desc')" role="option">Top Rated</li>
                    <li class="dropdown-option" (click)="setSort('vote_count.desc')" role="option">Most Voted</li>
                    <li class="dropdown-option" (click)="setSort('revenue.desc')" role="option">Box Office</li>
                  </ul>
                </div>
              </div>

              <!-- Min Rating Input -->
              <div class="filter-item">
                <label class="filter-label">Min Rating</label>
                <input
                  type="number"
                  class="form-control"
                  placeholder="0.0"
                  step="0.1"
                  min="0"
                  max="10"
                  [formControl]="minRatingControl">
              </div>

              <!-- Language Dropdown -->
              <div class="filter-item">
                <label class="filter-label">Language</label>
                <div class="custom-dropdown" [class.open]="languageOpen" (click)="$event.stopPropagation()">
                  <button class="dropdown-toggle" type="button" (click)="toggleLanguage($event)"
                          [attr.aria-expanded]="languageOpen" [attr.aria-controls]="'lang-panel'">
                    <span>{{ getLanguageLabel(languageControl.value) }}</span>
                    <span class="svg-icon chev" [innerHTML]="getIcon('chevDown')"></span>
                  </button>
                  <ul id="lang-panel" class="dropdown-list fade-in" *ngIf="languageOpen" role="listbox" tabindex="-1">
                    <li class="dropdown-option" (click)="setLanguage('')" role="option">All</li>
                    <li class="dropdown-option" (click)="setLanguage('en')" role="option">English</li>
                    <li class="dropdown-option" (click)="setLanguage('es')" role="option">Spanish</li>
                    <li class="dropdown-option" (click)="setLanguage('fr')" role="option">French</li>
                    <li class="dropdown-option" (click)="setLanguage('de')" role="option">German</li>
                    <li class="dropdown-option" (click)="setLanguage('hi')" role="option">Hindi</li>
                  </ul>
                </div>
              </div>

              <!-- Release Status Dropdown -->
              <div class="filter-item">
                <label class="filter-label">Release Status</label>
                <div class="custom-dropdown" [class.open]="statusOpen" (click)="$event.stopPropagation()">
                  <button class="dropdown-toggle" type="button" (click)="toggleStatus($event)"
                          [attr.aria-expanded]="statusOpen" [attr.aria-controls]="'status-panel'">
                    <span>{{ prettyStatus(releaseStatusControl.value) }}</span>
                    <span class="svg-icon chev" [innerHTML]="getIcon('chevDown')"></span>
                  </button>
                  <ul id="status-panel" class="dropdown-list fade-in" *ngIf="statusOpen" role="listbox" tabindex="-1">
                    <li class="dropdown-option" (click)="setReleaseStatus('')" role="option">Any</li>
                    <li class="dropdown-option" (click)="setReleaseStatus('released')" role="option">Released</li>
                    <li class="dropdown-option" (click)="setReleaseStatus('upcoming')" role="option">Upcoming</li>
                    <li class="dropdown-option" (click)="setReleaseStatus('in_production')" role="option">In Production</li>
                    <li class="dropdown-option" (click)="setReleaseStatus('post_production')" role="option">Post Production</li>
                    <li class="dropdown-option" (click)="setReleaseStatus('planned')" role="option">Planned</li>
                  </ul>
                </div>
              </div>

            </div>

            <!-- Secondary Row with Actions -->
            <div class="filter-actions-row">

              <!-- Include Adult Checkbox -->
              <div class="checkbox-group">
                <input
                  type="checkbox"
                  class="filter-checkbox"
                  id="includeAdult"
                  [checked]="includeAdultControl.value"
                  (change)="onToggleIncludeAdult($event)">
                <label class="checkbox-label" for="includeAdult">Include Adult</label>
              </div>

              <!-- Advanced Filters Toggle -->
              <button class="advanced-btn" type="button" (click)="toggleAdvanced($event)"
                      [attr.aria-expanded]="advancedOpen" aria-controls="advanced-panel">
                <span class="svg-icon" [innerHTML]="getIcon('settings')"></span>
                Advanced
              </button>

              <!-- Action Buttons -->
              <div class="action-buttons">
                <button class="action-btn secondary" type="button" (click)="resetFilters()" *ngIf="hasActiveFilters()">
                  <span class="svg-icon" [innerHTML]="getIcon('refresh')"></span>
                  Reset
                </button>
                <button class="action-btn primary" type="button" (click)="applyFilters()" [disabled]="isLoading()">
                  <span class="svg-icon" [innerHTML]="isLoading() ? getIcon('loading') : getIcon('search')"></span>
                  {{ isLoading() ? 'Searching...' : 'Search' }}
                </button>
              </div>

            </div>

            <!-- Advanced Filters Panel -->
            <div id="advanced-panel" class="advanced-panel" *ngIf="advancedOpen" [@slideDown]>
              <div class="advanced-grid">
                <div class="advanced-col">
                  <h4>Dates</h4>
                  <label class="advanced-label">Release from</label>
                  <input class="form-control" type="date" [formControl]="releaseFromControl">

                  <label class="advanced-label">Release to</label>
                  <input class="form-control" type="date" [formControl]="releaseToControl">

                  <label class="advanced-label">Certification</label>
                  <input class="form-control" placeholder="e.g. US:PG-13" [formControl]="certificationControl">
                </div>

                <div class="advanced-col">
                  <h4>Runtime & Rating</h4>
                  <label class="advanced-label">Runtime (min)</label>
                  <div class="two-inputs">
                    <input class="form-control" type="number" [formControl]="runtimeGteControl" placeholder="Min">
                    <input class="form-control" type="number" [formControl]="runtimeLteControl" placeholder="Max">
                  </div>

                  <label class="advanced-label">Max Rating</label>
                  <input class="form-control" type="number" step="0.1" [formControl]="maxRatingControl" placeholder="Max rating">

                  <label class="advanced-label">Minimum votes</label>
                  <input class="form-control" type="number" [formControl]="minVotesControl" placeholder="e.g. 100">
                </div>

                <div class="advanced-col">
                  <h4>People & Keywords</h4>
                  <label class="advanced-label">With Companies (IDs)</label>
                  <input class="form-control" placeholder="e.g. 2,3" [formControl]="withCompaniesControl">

                  <label class="advanced-label">With Cast</label>
                  <input class="form-control" placeholder="Comma separated" [formControl]="withCastControl">

                  <label class="advanced-label">With Keywords</label>
                  <input class="form-control" placeholder="Comma separated" [formControl]="withKeywordsControl">
                </div>
              </div>

              <div class="advanced-actions">
                <button class="action-btn secondary" type="button" (click)="clearAdvanced()">Clear Advanced</button>
                <button class="action-btn primary" type="button" (click)="applyFilters()">Apply Advanced</button>
              </div>
            </div>

          </div>
        </div>
      </nav>

      <!-- Active Filter Chips -->
      <div class="active-chips-container" *ngIf="hasActiveFilters()">
        <div class="chips-wrapper">
          <div class="chips-label">Active Filters:</div>
          <div class="chips">
            <button class="chip" *ngFor="let c of activeChips()" (click)="removeChip(c)"
                    [attr.aria-label]="'Remove ' + c.label" type="button">
              {{ c.label }}
              <span class="svg-icon chip-close" [innerHTML]="getIcon('close')"></span>
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <main class="movies-grid-container">

        <!-- Loading State: show skeletons + spinner -->
        <div *ngIf="isLoading()" class="loading-state">
          <div class="loading-content">
            <app-loading-spinner></app-loading-spinner>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="!isLoading() && movies().length === 0" class="empty-state">
          <div class="empty-content">
            <span class="svg-icon empty-icon" [innerHTML]="getIcon('movieOff')"></span>
            <h2>No Movies Found</h2>
            <p>Try adjusting your search or filter criteria to discover more movies.</p>
            <button class="action-btn secondary" type="button" (click)="resetFilters()">Reset Filters</button>
          </div>
        </div>

        <!-- Movies Grid -->
        <div class="movies-grid" *ngIf="movies().length > 0 && !isLoading()">
          <div *ngFor="let m of movies(); trackBy: trackByMovie" class="movie-tile">
            <app-movie-card [movie]="m"></app-movie-card>
          </div>
        </div>

      </main>

      <!-- Enhanced Pagination -->
      <footer class="pagination-footer" *ngIf="!isLoading() && movies().length > 0" role="navigation" aria-label="Pagination">
        <div class="pagination-info">
          <p>Showing <strong>{{ ((currentPage() - 1) * pageSize) + 1 }}</strong> to
            <strong>{{ Math.min(currentPage() * pageSize, totalResults()) }}</strong> of
            <strong>{{ totalResults() }}</strong> results</p>
        </div>

        <div class="pagination-controls">
          <button class="page-btn" type="button" [disabled]="currentPage() === 1" (click)="gotoPage(1)" aria-label="First page">
            <span class="svg-icon" [innerHTML]="getIcon('chevLeft')"></span>
            <span class="svg-icon" [innerHTML]="getIcon('chevLeft')"></span>
          </button>

          <button class="page-btn" type="button" [disabled]="currentPage() === 1" (click)="gotoPage(currentPage() - 1)" aria-label="Previous page">
            <span class="svg-icon" [innerHTML]="getIcon('chevLeft')"></span>
          </button>

          <div class="page-numbers">
            <button
              class="page-number"
              *ngFor="let page of getVisiblePages(); let i = index"
              [class.active]="page === currentPage()"
              type="button"
              (click)="onPageClick(page)"
              [disabled]="page === '...' || isLoading()"
              [attr.aria-disabled]="page === '...'"
              [attr.aria-label]="page === '...' ? 'Ellipsis' : 'Go to page ' + page"
              [attr.aria-current]="page === currentPage() ? 'page' : null">
              {{ page }}
            </button>
          </div>

          <button class="page-btn" type="button" [disabled]="currentPage() >= Math.ceil(totalResults() / pageSize)" (click)="gotoPage(currentPage() + 1)" aria-label="Next page">
            <span class="svg-icon" [innerHTML]="getIcon('chevRight')"></span>
          </button>

          <button class="page-btn" type="button" [disabled]="currentPage() >= Math.ceil(totalResults() / pageSize)" (click)="gotoPage(Math.ceil(totalResults() / pageSize))" aria-label="Last page">
            <span class="svg-icon" [innerHTML]="getIcon('chevRight')"></span>
            <span class="svg-icon" [innerHTML]="getIcon('chevRight')"></span>
          </button>
        </div>

        <div class="page-size-selector">
          <label>
            <span>Per page:</span>
            <select (change)="onPageSizeChange($event)" [value]="pageSize" aria-label="Results per page">
              <option [value]="20">20</option>
              <option [value]="40">40</option>
              <option [value]="60">60</option>
              <option [value]="100">100</option>
            </select>
          </label>
        </div>
      </footer>

    </div>
  `,
    styles: [`
  /* Root Styling */
  :host {
    display: block;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #e2e8f0;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #334155 50%, #475569 75%, #64748b 100%);
    min-height: 100vh;
  }

  .movies-root { max-width: 1400px; margin: 0 auto; padding-bottom: 40px; }

  .svg-icon { width: 18px; height: 18px; display: inline-block; vertical-align: middle; flex-shrink: 0; }

  .hero-section { padding: 80px 20px 40px; text-align: center; background: linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d); margin-bottom: 0; }
  .hero-content { max-width: 800px; margin: 0 auto; }
  .hero-title { font-size: 3.5rem; margin-bottom: 20px; text-shadow: 0 4px 20px rgba(0,0,0,0.5); font-weight: 700; background: linear-gradient(90deg,#fff,#f8fafc); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
  .hero-subtitle { font-size: 1.3rem; opacity: 0.9; max-width: 600px; margin: 0 auto; }

  /* Sticky Filter Bar */
  .filter-bar {
    position: relative; top: 0; background: rgba(15,23,42,0.95); backdrop-filter: blur(20px) saturate(180%);
    border-bottom: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 32px rgba(0,0,0,0.3); z-index: 100; padding: 20px 0; transition: all 0.3s ease;
  }
  .filter-bar.compact { padding: 12px 0; box-shadow: 0 2px 20px rgba(0,0,0,0.4); }

  .filter-container { max-width: 1400px; margin: 0 auto; padding: 0 20px; }

  .filter-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
  .brand-name { font-size:1.8rem; font-weight:800; background:linear-gradient(90deg,#a5b4fc,#f8fafc); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin:0; }

  .mobile-toggle {
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); color:white;
    padding: 10px 16px; border-radius: 10px; cursor:pointer; transition: all 0.3s ease; display:none; align-items:center; gap:8px; font-weight:500;
  }
  .mobile-toggle:hover { background: rgba(255,255,255,0.16); }

  .active-count { margin-left: 8px; background: #ef4444; color: white; padding: 2px 8px; border-radius: 999px; font-size:0.85rem; vertical-align: middle; }

  /* Filter Content */
  .filter-content { display:block; }
  .filter-content.show { display:block; }

  /* Filter Grid */
  .filter-grid { display:grid; grid-template-columns: 2fr 1fr 1.5fr 1fr 1fr 1fr 1fr 1fr; gap:20px; align-items:end; margin-bottom:20px; }
  .filter-item { position:relative; }
  .filter-label { display:block; margin-bottom:6px; color:#cbd5e1; font-size:0.85rem; font-weight:500; text-transform:uppercase; letter-spacing:0.5px; }

  .form-control {
    width:100%; padding:12px 16px; border-radius:10px; border:1.5px solid rgba(255,255,255,0.1);
    background: rgba(0,0,0,0.2); color:white; font-size:0.95rem; font-weight:500; backdrop-filter: blur(10px); transition: all 0.3s ease;
  }
  .form-control:focus { outline:none; border-color:#a5b4fc; background: rgba(165,180,252,0.08); box-shadow: 0 0 20px rgba(165,180,252,0.18); }
  .form-control::placeholder { color: rgba(255,255,255,0.5); }

  .search-wrapper { position:relative; display:flex; align-items:center; }
  .search-input { padding-left:45px; padding-right:40px; }
  .search-icon { position:absolute; left:16px; color: rgba(255,255,255,0.6); z-index:2; }
  .clear-search-btn { position:absolute; right:12px; background:none; border:none; color:rgba(255,255,255,0.6); cursor:pointer; padding:4px; border-radius:4px; transition:all 0.2s ease; z-index:2; }
  .clear-search-btn:hover { color:white; background: rgba(255,255,255,0.08); }

  .custom-dropdown { position:relative; }
  .dropdown-toggle {
    width:100%; padding:12px 16px; border-radius:10px; border:1.5px solid rgba(255,255,255,0.1);
    background: rgba(0,0,0,0.18); color:white; font-size:0.95rem; font-weight:500; cursor:pointer; transition:all 0.3s ease;
    display:flex; align-items:center; justify-content:space-between; text-align:left; backdrop-filter: blur(10px);
  }
  .dropdown-toggle:hover, .dropdown-toggle:focus { outline:none; border-color:#a5b4fc; background: rgba(165,180,252,0.06); box-shadow: 0 0 20px rgba(165,180,252,0.12); }

  .chev { transition: transform 0.3s ease; opacity:0.7; }
  .custom-dropdown.open .chev { transform: rotate(180deg); }

  .dropdown-list, .dropdown-panel {
    position:absolute; top: calc(100% + 8px); left:0; right:0; background: rgba(15,23,42,0.96); border:1px solid rgba(255,255,255,0.1);
    border-radius:12px; z-index:200; padding:8px 0; box-shadow:0 12px 32px rgba(0,0,0,0.7); max-height:300px; overflow-y:auto; backdrop-filter: blur(20px);
  }

  .dropdown-panel { padding:16px; width:320px; }
  .dropdown-option { padding:10px 16px; cursor:pointer; color:#cbd5e1; transition:all 0.2s ease; list-style:none; }
  .dropdown-option:hover, .dropdown-option:focus { background: rgba(165,180,252,0.08); color:#a5b4fc; outline:none; }

  .searchable-list { margin-bottom:12px; }
  .checkbox-list { max-height:200px; overflow-y:auto; }
  .check-option { display:flex; align-items:center; gap:8px; padding:6px 4px; color:#cbd5e1; cursor:pointer; transition: color 0.2s ease; }
  .check-option:hover { color:#a5b4fc; }
  .check-option input[type="checkbox"] { cursor:pointer; accent-color:#a5b4fc; }

  .panel-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:12px; }

  .selected-tags { margin-top:8px; display:flex; flex-wrap:wrap; gap:6px; }
  .tag { display:inline-flex; align-items:center; gap:4px; background: rgba(59,130,246,0.2); border:1px solid rgba(59,130,246,0.3); color:#93c5fd; padding:4px 8px; border-radius:16px; font-size:0.8rem; cursor:pointer; transition:all 0.2s ease; }
  .tag:hover { background: rgba(59,130,246,0.3); }

  .filter-actions-row { display:flex; align-items:center; justify-content:end; padding-top:16px; border-top:1px solid rgba(255,255,255,0.1); gap:16px; }

  .checkbox-group { display:flex; align-items:center; gap:8px; }
  .filter-checkbox { width:18px; height:18px; accent-color:#a5b4fc; cursor:pointer; }
  .checkbox-label { color:#e2e8f0; cursor:pointer; font-size:0.95rem; font-weight:500; }

  .advanced-btn {
    background: rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); color:white; padding:10px 16px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:6px; font-weight:500;
  }
  .advanced-btn:hover { background: rgba(255,255,255,0.16); }

  .action-buttons { display:flex; gap:10px; }

  .action-btn {
    padding:10px 20px; border-radius:8px; border:none; font-size:0.95rem; font-weight:600; cursor:pointer; transition:all 0.3s ease; display:flex; align-items:center; gap:6px; min-width:100px; justify-content:center;
  }
  .action-btn.primary { background: linear-gradient(135deg,#3b82f6,#1d4ed8); color:white; box-shadow:0 4px 15px rgba(59,130,246,0.4); }
  .action-btn.primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow:0 6px 25px rgba(59,130,246,0.6); }
  .action-btn.primary:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
  .action-btn.secondary { background: rgba(255,255,255,0.08); color:white; border:1px solid rgba(255,255,255,0.12); }
  .action-btn.secondary:hover { background: rgba(255,255,255,0.16); transform: translateY(-1px); }

  .advanced-panel { margin-top:20px; padding:20px; background: rgba(0,0,0,0.2); border-radius:12px; border:1px solid rgba(255,255,255,0.1); }

  .advanced-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; margin-bottom:20px; }
  .advanced-col h4 { margin:0 0 12px 0; color:#f8fafc; font-weight:600; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px; }
  .advanced-label { display:block; margin:12px 0 4px 0; color:#cbd5e1; font-size:0.85rem; font-weight:500; }
  .two-inputs { display:flex; gap:8px; }
  .advanced-actions { display:flex; gap:12px; justify-content:flex-end; }

  .active-chips-container { margin:20px 20px 0; }
  .chips-wrapper { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
  .chips-label { color:#94a3b8; font-size:0.9rem; font-weight:500; flex-shrink:0; }
  .chips { display:flex; flex-wrap:wrap; gap:8px; }
  .chip { display:inline-flex; align-items:center; gap:6px; background: rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3); color:#93c5fd; padding:6px 12px; border-radius:20px; font-size:0.85rem; cursor:pointer; transition:all 0.2s ease; }
  .chip:hover { background: rgba(59,130,246,0.25); transform: translateY(-1px); }
  .chip-close { width:14px; height:14px; }

  .movies-grid-container { min-height:50vh; padding:40px 20px; }

  .loading-state { display:flex; justify-content:center; align-items:center; min-height:400px; }
  .loading-content { text-align:center; }
  .loading-content h2 { margin:20px 0 8px 0; color:#f8fafc; }
  .loading-content p { color:#94a3b8; }

  .skeleton-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); gap:16px; margin-top:20px; }
  .skeleton-card { height: 330px; background: linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.035)); border-radius:12px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02); animation: pulse 1.2s infinite; }
  @keyframes pulse { 0% { opacity:0.9 } 50% { opacity:0.6 } 100% { opacity:0.9 } }

  .empty-state { display:flex; justify-content:center; align-items:center; min-height:400px; }
  .empty-content { text-align:center; max-width:400px; }
  .empty-icon { width:64px; height:64px; color:#64748b; margin-bottom:20px; }

  .movies-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(250px,1fr)); gap:24px; }
  .movie-tile { animation: fadeInUp 0.5s ease-out forwards; opacity:0; }
  @keyframes fadeInUp { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }

  .pagination-footer { background: rgba(15,23,42,0.8); backdrop-filter: blur(20px); border-top:1px solid rgba(255,255,255,0.1); padding:20px; margin:40px 20px 20px; border-radius:12px; display:flex; align-items:center; justify-content:space-between; gap:20px; flex-wrap:wrap; }
  .pagination-info { color:#94a3b8; font-size:0.9rem; }
  .pagination-controls { display:flex; align-items:center; gap:8px; }
  .page-btn { background: rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); color:white; padding:8px; border-radius:6px; cursor:pointer; transition:all 0.2s ease; display:flex; align-items:center; justify-content:center; }
  .page-btn:hover:not(:disabled) { background: rgba(255,255,255,0.16); }
  .page-btn:disabled { opacity:0.5; cursor:not-allowed; }

  .page-numbers { display:flex; gap:4px; margin: 0 8px; }
  .page-number { min-width:36px; height:36px; background: rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); color:white; border-radius:6px; cursor:pointer; transition:all 0.2s ease; display:flex; align-items:center; justify-content:center; font-weight:500; }
  .page-number:hover:not(:disabled) { background: rgba(255,255,255,0.16); }
  .page-number.active { background:#3b82f6; border-color:#3b82f6; box-shadow:0 0 20px rgba(59,130,246,0.5); }

  .page-size-selector label { display:flex; align-items:center; gap:8px; color:#94a3b8; font-size:0.9rem; }
  .page-size-selector select { background: rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); color:white; padding:6px 8px; border-radius:6px; }
  .page-size-selector select option { background:#1e293b; color:white; }

  .fade-in { animation: fadeIn 0.3s ease-out; }
  @keyframes fadeIn { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }

  /* Responsive */
  @media (max-width:1200px) { .filter-grid { grid-template-columns: repeat(4,1fr); gap:16px; } .filter-actions-row { flex-direction:column; align-items:stretch; gap:12px; } .action-buttons { justify-content:stretch; } .action-btn { flex:1; } }
  @media (max-width:768px) {
    .hero-title { font-size:2.5rem; }
    .filter-bar { position:relative; }
    .filter-content { display:none; }
    .filter-content.show { display:block; animation: slideDown 0.3s ease-out; }
    @keyframes slideDown { from { opacity:0; transform: translateY(-20px); } to { opacity:1; transform: translateY(0); } }
    .mobile-toggle { display:flex; }
    .filter-grid { grid-template-columns:1fr; gap:16px; }
    .advanced-grid { grid-template-columns:1fr; }
    .movies-grid { grid-template-columns: repeat(auto-fill, minmax(200px,1fr)); gap:16px; }
    .pagination-footer { flex-direction:column; gap:16px; text-align:center; }
    .chips-wrapper { flex-direction:column; align-items:flex-start; }
  }

  /* Focus styles & touch targets */
  :host button:focus, :host .dropdown-toggle:focus, :host .action-btn:focus, :host .page-number:focus, :host .chip:focus, :host .tag:focus {
    outline:none; box-shadow: 0 0 0 3px rgba(99,102,241,0.18); border-radius:8px;
  }

  .action-btn, .dropdown-toggle, .mobile-toggle, .page-btn, .page-number { min-height:44px; min-width:44px; padding:10px 14px; }

  /* Screen reader helper */
  .sr-only { position:absolute !important; width:1px !important; height:1px !important; padding:0 !important; overflow:hidden !important; clip:rect(0,0,0,0) !important; white-space:nowrap !important; border:0 !important; }
  `]
})
export class MoviesComponent implements OnInit, AfterViewInit, OnDestroy {
    // Injected services
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    protected readonly tmdb = inject(TmdbService);
    private readonly fb = inject(FormBuilder);
    private readonly elRef = inject(ElementRef);
    private readonly renderer = inject(Renderer2);
    private readonly sanitizer = inject(DomSanitizer);

    // Expose Math for template usage
    readonly Math = Math;

    // Signals & state
    readonly movies = signal<Movie[]>([]);
    readonly totalResults = signal(0);
    readonly currentPage = signal(1);
    readonly isLoading = signal(true);
    readonly genres = this.tmdb.genres;

    pageSize = 20;
    readonly currentYearPlusOne = new Date().getFullYear() + 1;
    readonly years = Array.from({ length: new Date().getFullYear() - 1900 + 2 }, (_, i) => new Date().getFullYear() + 1 - i);
    private subs: Subscription[] = [];

    // helper to cancel in-flight requests
    private currentRequestSub: Subscription | null = null;

    // Compact mode for sticky header
    isCompact = false;
    mobileFiltersOpen = false;

    // Form with FormArray for genres
    form: FormGroup;

    // FormArray getters
    get genreFormArray(): FormArray { return this.form.get('genre_ids') as FormArray; }
    get excludeGenreFormArray(): FormArray { return this.form.get('exclude_genre_ids') as FormArray; }

    // Dropdown open states
    sortOpen = false;
    categoryOpen = false;
    genresOpen = false;
    yearOpen = false;
    statusOpen = false;
    languageOpen = false;
    advancedOpen = false;

    // Genre filtering
    filteredGenres = this.genres();

    @ViewChild('filtersRoot', { read: ElementRef, static: true }) filtersRoot!: ElementRef;

    // Enhanced icons with more options
    readonly icons = {
        search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="6"/><path d="M21 21l-4.35-4.35"/></svg>`,
        close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
        filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/></svg>`,
        chevDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 9l6 6 6-6"/></svg>`,
        chevLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 18l-6-6 6-6"/></svg>`,
        chevRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18l6-6-6-6"/></svg>`,
        settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
        refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>`,
        movieOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19 4 20l1-3L17.5 4.5z"/><path d="M13.5 6.5l4 4"/><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21l-2-2 2-2 2 2z"/></svg>`,
        loading: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>`
    };

    private sanitizedIcons: { [k: string]: SafeHtml } = {};

    skeletonArray = Array.from({ length: 8 });

    constructor() {
        this.form = this.fb.group({
            query: [''],
            category: [''],
            sort_by: ['popularity.desc'],
            genre_ids: this.fb.array([]),
            exclude_genre_ids: this.fb.array([]),
            year: [null],
            release_from: [null],
            release_to: [null],
            release_status: [''],
            runtime_gte: [null],
            runtime_lte: [null],
            min_rating: [0],
            max_rating: [10],
            min_votes: [null],
            language: [''],
            certification: [''],
            include_adult: [false],
            include_video: [false],
            with_companies: [''],
            with_cast: [''],
            with_keywords: [''],
            region: ['']
        });

        // sanitize icons for safe use in innerHTML (use entries to keep typing happy)
        Object.entries(this.icons).forEach(([k, v]) => {
            this.sanitizedIcons[k] = this.sanitizer.bypassSecurityTrustHtml(v);
        });
    }

    // return SafeHtml for template usage
    getIcon(key: string): SafeHtml | null {
        return this.sanitizedIcons[key] || null;
    }

    // Form getters
    get queryControl() { return this.form.get('query') as FormControl; }
    get categoryControl() { return this.form.get('category') as FormControl; }
    get sortByControl() { return this.form.get('sort_by') as FormControl; }
    get yearControl() { return this.form.get('year') as FormControl; }
    get releaseFromControl() { return this.form.get('release_from') as FormControl; }
    get releaseToControl() { return this.form.get('release_to') as FormControl; }
    get releaseStatusControl() { return this.form.get('release_status') as FormControl; }
    get runtimeGteControl() { return this.form.get('runtime_gte') as FormControl; }
    get runtimeLteControl() { return this.form.get('runtime_lte') as FormControl; }
    get minRatingControl() { return this.form.get('min_rating') as FormControl; }
    get maxRatingControl() { return this.form.get('max_rating') as FormControl; }
    get minVotesControl() { return this.form.get('min_votes') as FormControl; }
    get languageControl() { return this.form.get('language') as FormControl; }
    get certificationControl() { return this.form.get('certification') as FormControl; }
    get includeAdultControl() { return this.form.get('include_adult') as FormControl; }
    get includeVideoControl() { return this.form.get('include_video') as FormControl; }
    get withCompaniesControl() { return this.form.get('with_companies') as FormControl; }
    get withCastControl() { return this.form.get('with_cast') as FormControl; }
    get withKeywordsControl() { return this.form.get('with_keywords') as FormControl; }
    get regionControl() { return this.form.get('region') as FormControl; }

    ngOnInit(): void {
        this.seedFiltersFromUrl();

        const filterChanges$ = this.form.valueChanges.pipe(
            debounceTime(500),
            distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
        );

        const sub = filterChanges$.subscribe(() => this.applyFilters());
        this.subs.push(sub);

        // ADD: dedicated subscription for queryControl to support search-as-you-type with debounce
        const querySub = this.queryControl.valueChanges.pipe(
            debounceTime(450),
            distinctUntilChanged()
        ).subscribe(() => {
            // reset to page 1 for new query and load
            this.currentPage.set(1);
            this.loadMovies();
        });
        this.subs.push(querySub);

        this.loadMovies();
    }

    ngAfterViewInit(): void {
        let ticking = false;
        this.renderer.listen('window', 'scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const compact = window.scrollY > 100;
                    if (compact !== this.isCompact) this.isCompact = compact;
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    ngOnDestroy(): void {
        this.subs.forEach(s => s.unsubscribe());
        if (this.currentRequestSub) {
            this.currentRequestSub.unsubscribe();
            this.currentRequestSub = null;
        }
        document.body.style.overflow = '';
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(ev: Event) {
        const path = (ev.composedPath && ev.composedPath()) || (ev as any).path || [];
        const rootEl = this.filtersRoot?.nativeElement;
        if (!rootEl) {
            this.closeAllDropdowns();
            return;
        }
        if (!path.includes(rootEl)) {
            this.closeAllDropdowns();
        }
    }

    @HostListener('document:keydown.escape', ['$event'])
    onEscapeKey(event: KeyboardEvent) {
        if (this.sortOpen || this.categoryOpen || this.genresOpen || this.languageOpen || this.statusOpen || this.advancedOpen) {
            this.closeAllDropdowns();
            event.stopPropagation();
        }
        if (this.mobileFiltersOpen) {
            this.toggleMobileFilters();
        }
    }

    private closeAllDropdowns() {
        this.sortOpen = false;
        this.categoryOpen = false;
        this.genresOpen = false;
        this.yearOpen = false;
        this.statusOpen = false;
        this.languageOpen = false;
        this.advancedOpen = false;
    }

    // Toggle functions for dropdowns
    toggleMobileFilters() {
        this.mobileFiltersOpen = !this.mobileFiltersOpen;
        if (this.mobileFiltersOpen) {
            document.body.style.overflow = 'hidden';
            setTimeout(() => this.focusFirstInDropdown('.search-input'), 50);
        } else {
            document.body.style.overflow = '';
        }
    }

    toggleSort(e?: Event) { if (e) e.stopPropagation(); this.sortOpen = !this.sortOpen; if (this.sortOpen) { this.closeOtherDropdowns('sortOpen'); setTimeout(() => this.focusFirstInDropdown('#sort-panel .dropdown-option'), 0); } }
    toggleCategory(e?: Event) { if (e) e.stopPropagation(); this.categoryOpen = !this.categoryOpen; if (this.categoryOpen) { this.closeOtherDropdowns('categoryOpen'); setTimeout(() => this.focusFirstInDropdown('#category-panel .dropdown-option'), 0); } }
    toggleGenres(e?: Event) { if (e) e.stopPropagation(); this.genresOpen = !this.genresOpen; if (this.genresOpen) { this.closeOtherDropdowns('genresOpen'); this.filteredGenres = this.genres(); setTimeout(() => this.focusFirstInDropdown('#genres-panel .search-input'), 0); } }
    toggleLanguage(e?: Event) { if (e) e.stopPropagation(); this.languageOpen = !this.languageOpen; if (this.languageOpen) { this.closeOtherDropdowns('languageOpen'); setTimeout(() => this.focusFirstInDropdown('#lang-panel .dropdown-option'), 0); } }
    toggleStatus(e?: Event) { if (e) e.stopPropagation(); this.statusOpen = !this.statusOpen; if (this.statusOpen) { this.closeOtherDropdowns('statusOpen'); setTimeout(() => this.focusFirstInDropdown('#status-panel .dropdown-option'), 0); } }
    toggleAdvanced(e?: Event) { if (e) e.stopPropagation(); this.advancedOpen = !this.advancedOpen; if (this.advancedOpen) { this.closeOtherDropdowns('advancedOpen'); setTimeout(() => this.focusFirstInDropdown('#advanced-panel .form-control'), 0); } }

    private closeOtherDropdowns(openDropdown: string) {
        const dropdowns = ['sortOpen', 'categoryOpen', 'genresOpen', 'yearOpen', 'statusOpen', 'languageOpen', 'advancedOpen'];
        dropdowns.forEach(d => { if (d !== openDropdown) (this as any)[d] = false; });
    }

    private focusFirstInDropdown(selector: string) {
        if (!this.filtersRoot) return;
        try {
            const root: HTMLElement = this.filtersRoot.nativeElement;
            const el = root.querySelector(selector) as HTMLElement | null;
            if (el) el.focus();
        } catch (e) { /* ignore */ }
    }

    isSmallScreen() {
        try { return window.innerWidth <= 768; } catch (e) { return false; }
    }

    // Label helpers
    getSortLabel(key: string) {
        switch (key) {
            case 'primary_release_date.desc': return 'Newest';
            case 'vote_average.desc': return 'Top Rated';
            case 'vote_count.desc': return 'Most Voted';
            case 'revenue.desc': return 'Box Office';
            default: return 'Popular';
        }
    }
    getCategoryLabel(key: string) {
        switch (key) {
            case 'movie': return 'Movie';
            case 'tv': return 'TV Show';
            case 'person': return 'Person';
            default: return 'All';
        }
    }
    getLanguageLabel(key: string) {
        const languages: { [key: string]: string } = { 'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German', 'hi': 'Hindi' };
        return languages[key] || 'All';
    }

    setSort(key: string) { this.sortByControl.setValue(key); this.sortOpen = false; }
    setCategory(key: string) { this.categoryControl.setValue(key); this.categoryOpen = false; }
    setLanguage(key: string) { this.languageControl.setValue(key); this.languageOpen = false; }
    setReleaseStatus(key: string) { this.releaseStatusControl.setValue(key); this.statusOpen = false; }

    filterGenreSearch(query: string) {
        const q = query.toLowerCase();
        this.filteredGenres = this.genres().filter(g => g.name.toLowerCase().includes(q));
    }

    private setGenreArray(ids: number[]) {
        const fa = this.genreFormArray;
        while (fa.length) fa.removeAt(0);
        ids.forEach(id => fa.push(new FormControl(id)));
    }
    isGenreSelected(id: number) { return (this.genreFormArray.value || []).includes(id); }
    onGenreCheckboxChange(id: number, ev: Event) {
        const target = ev && (ev.target as HTMLInputElement | null);
        const checked = (target && typeof target.checked !== 'undefined' ? target.checked : false);
        this.toggleGenreByFormArray(id, checked);
    }
    protected toggleGenreByFormArray(id: number, checked: boolean) {
        const fa = this.genreFormArray;
        const val = fa.value || [];
        if (checked) {
            if (!val.includes(id)) fa.push(new FormControl(id));
        } else {
            const index = val.indexOf(id);
            if (index > -1) fa.removeAt(index);
        }
    }
    selectAllGenres() { const all = this.genres().map(g => g.id); this.setGenreArray(all); }
    clearGenres() { this.setGenreArray([]); }
    genreSummary() { const ids = this.genreFormArray.value || []; if (!ids.length) return 'All'; if (ids.length === 1) return this.tmdb.getGenreName(ids[0]) || 'Genre'; return `${ids.length} selected`; }

    onToggleIncludeAdult(ev: Event) {
        const t = ev && (ev.target as HTMLInputElement | null);
        const checked = (t && typeof t.checked !== 'undefined' ? t.checked : false);
        this.includeAdultControl.setValue(checked);
    }

    clearSearch(): void { this.queryControl.setValue(''); }

    clearAdvanced(): void {
        this.releaseFromControl.setValue(null);
        this.releaseToControl.setValue(null);
        this.certificationControl.setValue('');
        this.runtimeGteControl.setValue(null);
        this.runtimeLteControl.setValue(null);
        this.maxRatingControl.setValue(10);
        this.minVotesControl.setValue(null);
        this.includeVideoControl.setValue(false);
        this.withCompaniesControl.setValue('');
        this.withCastControl.setValue('');
        this.withKeywordsControl.setValue('');
        this.regionControl.setValue('');
    }

    resetFilters(): void {
        this.form.reset({
            query: '',
            category: '',
            sort_by: 'popularity.desc',
            year: null,
            release_from: null,
            release_to: null,
            release_status: '',
            runtime_gte: null,
            runtime_lte: null,
            min_rating: 0,
            max_rating: 10,
            min_votes: null,
            language: '',
            certification: '',
            include_adult: false,
            include_video: false,
            with_companies: '',
            with_cast: '',
            with_keywords: '',
            region: ''
        }, { emitEvent: false });
        this.setGenreArray([]);
        this.applyFilters();
    }

    private seedFiltersFromUrl(): void {
        const qp = this.route.snapshot.queryParamMap;
        const seed: any = {};

        if (qp.has('query')) seed.query = qp.get('query');
        if (qp.has('category')) seed.category = qp.get('category');
        if (qp.has('sort')) seed.sort_by = qp.get('sort');
        if (qp.has('genres')) { const g = qp.get('genres')!.split(',').map(Number); seed.genre_ids = g; }
        if (qp.has('year')) seed.year = Number(qp.get('year'));
        if (qp.has('released_from')) seed.release_from = qp.get('released_from');
        if (qp.has('released_to')) seed.release_to = qp.get('released_to');
        if (qp.has('status')) seed.release_status = qp.get('status');
        if (qp.has('runtime_gte')) seed.runtime_gte = Number(qp.get('runtime_gte'));
        if (qp.has('runtime_lte')) seed.runtime_lte = Number(qp.get('runtime_lte'));
        if (qp.has('min_rating')) seed.min_rating = Number(qp.get('min_rating'));
        if (qp.has('max_rating')) seed.max_rating = Number(qp.get('max_rating'));
        if (qp.has('min_votes')) seed.min_votes = Number(qp.get('min_votes'));
        if (qp.has('language')) seed.language = qp.get('language');
        if (qp.has('cert')) seed.certification = qp.get('cert');
        if (qp.has('adult')) seed.include_adult = qp.get('adult') === 'true';
        if (qp.has('video')) seed.include_video = qp.get('video') === 'true';
        if (qp.has('companies')) seed.with_companies = qp.get('companies');
        if (qp.has('cast')) seed.with_cast = qp.get('cast');
        if (qp.has('keywords')) seed.with_keywords = qp.get('keywords');
        if (qp.has('region')) seed.region = qp.get('region');

        const patch: any = {};
        if (seed.query) patch.query = seed.query;
        if (seed.category) patch.category = seed.category;
        if (seed.sort_by) patch.sort_by = seed.sort_by;
        if (seed.year !== undefined) patch.year = seed.year;
        if (seed.release_from) patch.release_from = seed.release_from;
        if (seed.release_to) patch.release_to = seed.release_to;
        if (seed.release_status) patch.release_status = seed.release_status;
        if (seed.runtime_gte !== undefined) patch.runtime_gte = seed.runtime_gte;
        if (seed.runtime_lte !== undefined) patch.runtime_lte = seed.runtime_lte;
        if (seed.min_rating !== undefined) patch.min_rating = seed.min_rating;
        if (seed.max_rating !== undefined) patch.max_rating = seed.max_rating;
        if (seed.min_votes !== undefined) patch.min_votes = seed.min_votes;
        if (seed.language) patch.language = seed.language;
        if (seed.certification) patch.certification = seed.certification;
        if (seed.include_adult !== undefined) patch.include_adult = seed.include_adult;
        if (seed.include_video !== undefined) patch.include_video = seed.include_video;
        if (seed.with_companies) patch.with_companies = seed.with_companies;
        if (seed.with_cast) patch.with_cast = seed.with_cast;
        if (seed.with_keywords) patch.with_keywords = seed.with_keywords;
        if (seed.region) patch.region = seed.region;

        this.form.patchValue(patch, { emitEvent: false });

        if (seed.genre_ids) this.setGenreArray(seed.genre_ids);

        if (qp.has('page')) this.currentPage.set(Number(qp.get('page')) || 1);
        if (qp.has('pagesize')) this.pageSize = Number(qp.get('pagesize')) || 20;
    }

    private buildFilters(): MovieFilters {
        const v = this.form.getRawValue();

        // FIX: keep genre_ids as an array (FormArray produces an array) and pass it through
        // The service is responsible for converting array -> comma string when building params.
        const genreIdsArr = (v.genre_ids && v.genre_ids.length) ? (Array.isArray(v.genre_ids) ? v.genre_ids : v.genre_ids.map(Number)) : undefined;

        return {
            query: v.query?.trim() || undefined,
            category: v.category || undefined,
            sort_by: v.sort_by,
            include_adult: v.include_adult,
            include_video: v.include_video,
            genre_ids: genreIdsArr,
            year: v.year || undefined,
            primary_release_date_gte: v.release_from ? this.formatDateParam(v.release_from) : undefined,
            primary_release_date_lte: v.release_to ? this.formatDateParam(v.release_to) : undefined,
            release_status: v.release_status || undefined,
            runtime_gte: v.runtime_gte || undefined,
            runtime_lte: v.runtime_lte || undefined,
            min_rating: v.min_rating > 0 ? v.min_rating : undefined,
            max_rating: (v.max_rating != null && v.max_rating < 10) ? v.max_rating : undefined,
            min_votes: v.min_votes || undefined,
            language: v.language || undefined,
            certification: v.certification || undefined,
            with_companies: v.with_companies || undefined,
            with_cast: v.with_cast || undefined,
            with_keywords: v.with_keywords || undefined,
            region: v.region || undefined
        } as MovieFilters;
    }

    private formatDateParam(d: any): string {
        if (!d) return '';
        const date = (d instanceof Date) ? d : new Date(d);
        if (isNaN(date.getTime())) return '';
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    // --- Add this helper method inside MoviesComponent (near other helpers) ---
    /** Return true if movie matches the client-side filters (a subset of discover filters) */
    private movieMatchesFilters(movie: Movie, filters: MovieFilters): boolean {
        if (!movie) return false;

        // genre_ids: check intersection when provided
        if (filters.genre_ids && filters.genre_ids.length) {
            const movieGenreIds = (movie.genre_ids || movie.genres || []).map((g: any) => typeof g === 'number' ? g : g.id);
            const hasAny = filters.genre_ids.some(id => movieGenreIds.includes(id));
            if (!hasAny) return false;
        }

        // year: check release_date or first_air_date
        if (filters.year) {
            const dt = movie.release_date || '';
            if (!dt || (new Date(dt)).getFullYear() !== Number(filters.year)) return false;
        }

        // min_rating / max_rating -> vote_average
        if (filters.min_rating != null && filters.min_rating > 0) {
            if ((movie.vote_average || 0) < Number(filters.min_rating)) return false;
        }
        if (filters.max_rating != null) {
            if ((movie.vote_average || 0) > Number(filters.max_rating)) return false;
        }

        // language
        if (filters.language) {
            if ((movie.original_language || '').toLowerCase() !== (filters.language || '').toLowerCase()) return false;
        }

        // release_status, runtime, etc - these are often missing in search results so skip unless available
        // For runtime filters, you would need to call movie details, which is heavy - omitted here.

        return true;
    }


    // loadMovies now cancels in-flight requests and passes pageSize
    private loadMovies(): void {
        if (this.currentRequestSub) {
            this.currentRequestSub.unsubscribe();
            this.currentRequestSub = null;
        }

        this.isLoading.set(true);
        const filters = this.buildFilters();
        const page = this.currentPage();

// inside loadMovies() where you handle filters.query
        if (filters.query) {
            const TMDB_PAGE_SIZE = 20;
            const tmdbPage = Math.floor(((page - 1) * this.pageSize) / TMDB_PAGE_SIZE) + 1;
            const obs$ = this.tmdb.searchMovies(filters.query!, tmdbPage);

            this.currentRequestSub = obs$.subscribe({
                next: resp => {
                    const tmdbStartIndex = ((tmdbPage - 1) * TMDB_PAGE_SIZE);
                    const offset = (page - 1) * this.pageSize;
                    const localStart = Math.max(0, offset - tmdbStartIndex);

                    // Apply client-side filtering for discover-style filters
                    // NOTE: this will only filter the current TMDB page results. For full correctness across all pages you'd need to fetch multiple TMDB pages
                    const rawResults = (resp.results || []);
                    const filteredResults = rawResults.filter(m => this.movieMatchesFilters(m, filters));

                    // If the UI pageSize > TMDB page size we may need to fetch next tmdb page too (not handled here)
                    const sliced = filteredResults.slice(localStart, localStart + this.pageSize);

                    // Update UI
                    this.movies.set(sliced);
                    // Set totalResults to filteredResults.length for the currently fetched TMDB page
                    // (If you need absolute total across ALL matching TMDB pages, you'd need additional requests)
                    this.totalResults.set(filteredResults.length || (resp.total_results || 0));
                    this.isLoading.set(false);
                    this.updateUrl();
                    this.currentRequestSub = null;
                },
                error: () => {
                    this.movies.set([]);
                    this.totalResults.set(0);
                    this.isLoading.set(false);
                    this.updateUrl();
                    this.currentRequestSub = null;
                }
            });

            return;
        }


        // No query -> use discover (existing batched discoverMovies supports pageSize)
        const obs$ = this.tmdb.discoverMovies(filters, page, this.pageSize);

        this.currentRequestSub = obs$.subscribe({
            next: resp => {
                this.movies.set(resp.results || []);
                this.totalResults.set(resp.total_results || 0);
                this.isLoading.set(false);
                this.updateUrl();
                this.currentRequestSub = null;
            },
            error: () => {
                this.movies.set([]);
                this.totalResults.set(0);
                this.isLoading.set(false);
                this.updateUrl();
                this.currentRequestSub = null;
            }
        });
    }

    applyFilters(): void {
        // REMOVED: early return when loading -- allow user to trigger search immediately.
        this.currentPage.set(1);
        this.loadMovies();
        this.advancedOpen = false;
        this.mobileFiltersOpen = false;
        document.body.style.overflow = '';
    }

    hasActiveFilters(): boolean {
        const v = this.form.getRawValue();
        return !!(
            v.query ||
            v.category ||
            (v.genre_ids && v.genre_ids.length > 0) ||
            v.year || v.release_from || v.release_to ||
            v.release_status ||
            v.runtime_gte || v.runtime_lte ||
            (v.min_rating > 0) || (v.max_rating != null && v.max_rating < 10) ||
            v.min_votes || v.language || v.certification ||
            v.include_adult || v.include_video ||
            v.with_companies || v.with_cast || v.with_keywords || v.region
        );
    }

    activeChips() {
        const chips: Array<{ key: string; label: string }> = [];
        const v = this.form.value;
        if (v.query) chips.push({ key: 'query', label: `Search: "${v.query}"` });
        if (v.category) chips.push({ key: 'category', label: `Category: ${this.getCategoryLabel(v.category)}` });
        if (v.genre_ids?.length) v.genre_ids.forEach((id: number) => {
            const name = this.tmdb.getGenreName(id);
            chips.push({ key: `genre_${id}`, label: name || `Genre ${id}` });
        });
        if (v.year) chips.push({ key: 'year', label: `Year: ${v.year}` });
        if (v.release_status) chips.push({ key: 'status', label: `Status: ${this.prettyStatus(v.release_status)}` });
        if (v.language) chips.push({ key: 'language', label: `Lang: ${this.getLanguageLabel(v.language)}` });
        if (v.min_rating > 0) chips.push({ key: 'min_rating', label: `Min Rating: ${v.min_rating}` });
        if (v.include_adult) chips.push({ key: 'adult', label: `Include Adult` });

        return chips;
    }

    removeChip(chip: { key: string; label: string }) {
        const { key } = chip;
        if (key === 'query') this.queryControl.setValue('');
        else if (key === 'category') this.categoryControl.setValue('');
        else if (key === 'year') this.yearControl.setValue(null);
        else if (key.startsWith('genre_')) {
            const id = Number(key.split('_')[1]);
            this.toggleGenreByFormArray(id, false);
        }
        else if (key === 'status') this.releaseStatusControl.setValue('');
        else if (key === 'language') this.languageControl.setValue('');
        else if (key === 'min_rating') this.minRatingControl.setValue(0);
        else if (key === 'adult') this.includeAdultControl.setValue(false);
    }

    getVisiblePages(): (number | string)[] {
        const current = this.currentPage();
        const total = Math.max(1, Math.ceil(this.totalResults() / this.pageSize));
        const pages: (number | string)[] = [];

        if (total <= 7) {
            for (let i = 1; i <= total; i++) pages.push(i);
        } else {
            pages.push(1);
            if (current <= 4) {
                for (let i = 2; i <= 5; i++) pages.push(i);
                pages.push('...');
            } else if (current >= total - 3) {
                pages.push('...');
                for (let i = total - 4; i < total; i++) pages.push(i);
            } else {
                pages.push('...');
                for (let i = current - 1; i <= current + 1; i++) pages.push(i);
                pages.push('...');
            }
            pages.push(total);
        }
        return pages;
    }

    gotoPage(p: number) {
        const totalPages = Math.max(1, Math.ceil(this.totalResults() / this.pageSize));
        const newPage = Math.max(1, Math.min(totalPages, p));
        this.currentPage.set(newPage);
        this.loadMovies();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    onPageClick(page: number | string) {
        if (page === '...' || page == null) return;
        const p = Number(page);
        if (!Number.isNaN(p)) this.gotoPage(p);
    }

    onPageSizeChange(ev: Event) {
        const sel = ev.target as HTMLSelectElement;
        this.pageSize = Number(sel.value);
        this.currentPage.set(1);
        this.loadMovies();
    }

    trackByMovie(_: number, m: Movie) { return m.id; }
    trackByGenre(_: number, g: any) { return g.id; }

    private updateUrl() {
        const v = this.form.getRawValue();
        const queryParams: any = {};
        if (v.query) queryParams.query = v.query;
        if (v.category) queryParams.category = v.category;
        if (v.genre_ids?.length) queryParams.genres = v.genre_ids.join(',');
        if (v.year) queryParams.year = v.year;
        if (v.sort_by && v.sort_by !== 'popularity.desc') queryParams.sort = v.sort_by;
        if (v.release_from) queryParams.released_from = this.formatDateParam(v.release_from);
        if (v.release_to) queryParams.released_to = this.formatDateParam(v.release_to);
        if (v.release_status) queryParams.status = v.release_status;
        if (v.runtime_gte) queryParams.runtime_gte = v.runtime_gte;
        if (v.runtime_lte) queryParams.runtime_lte = v.runtime_lte;
        if (v.min_rating > 0) queryParams.min_rating = v.min_rating;
        if (v.max_rating != null && v.max_rating < 10) queryParams.max_rating = v.max_rating;
        if (v.min_votes) queryParams.min_votes = v.min_votes;
        if (v.language) queryParams.language = v.language;
        if (v.certification) queryParams.cert = v.certification;
        if (v.include_adult) queryParams.adult = true;
        if (v.include_video) queryParams.video = true;
        if (v.with_companies) queryParams.companies = v.with_companies;
        if (v.with_cast) queryParams.cast = v.with_cast;
        if (v.with_keywords) queryParams.keywords = v.with_keywords;
        if (v.region) queryParams.region = v.region;

        if (this.currentPage() > 1) queryParams.page = this.currentPage();
        if (this.pageSize !== 20) queryParams.pagesize = this.pageSize;

        this.router.navigate([], {
            relativeTo: this.route,
            queryParams,
            queryParamsHandling: 'merge',
            replaceUrl: true
        });
    }

    prettyStatus(v: string) {
        if (!v) return 'Any';
        return v.split('_').map(s => s[0].toUpperCase() + s.slice(1)).join(' ');
    }
}

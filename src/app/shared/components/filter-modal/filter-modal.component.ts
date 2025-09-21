// filter-modal.component.ts
import {
    Component,
    EventEmitter,
    Output,
    Input,
    OnInit,
    OnDestroy,
    HostListener,
    ElementRef,
    ViewChild,
    signal,
    ChangeDetectionStrategy, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, FormArray } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Core & Shared
import { MovieFilters } from '@core/models/movie.model';
import { TmdbService } from '@core/services/tmdb.service';

@Component({
    selector: 'app-filter-modal',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
  <div class="modal-overlay" [class.active]="isOpen()" (click)="close()">
    <div class="modal-container glass-pane" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <h2 class="modal-title">Filter Movies</h2>
        <button class="close-btn" (click)="close()" aria-label="Close filter modal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <div class="modal-content">
        <div class="filter-sections">
          <!-- Basic Filters -->
          <div class="filter-section">
            <h3>Basic Filters</h3>
            <div class="filter-grid">
              <div class="filter-group">
                <label class="filter-label">Query</label>
                <input type="text" class="filter-input" placeholder="Search keywords" [formControl]="queryControl">
              </div>
              
              <div class="filter-group">
                <label class="filter-label">Year</label>
                <input type="number" class="filter-input" placeholder="Release year" min="1900" max="2023" [formControl]="yearControl">
              </div>
              
              <div class="filter-group">
                <label class="filter-label">Min Rating</label>
                <input type="number" class="filter-input" placeholder="0.0" step="0.1" min="0" max="10" [formControl]="minRatingControl">
              </div>
              
              <div class="filter-group">
                <label class="filter-label">Max Rating</label>
                <input type="number" class="filter-input" placeholder="10.0" step="0.1" min="0" max="10" [formControl]="maxRatingControl">
              </div>
            </div>
          </div>
          
          <!-- Genre Filters -->
          <div class="filter-section">
            <h3>Genres</h3>
            <div class="genres-grid">
              <div *ngFor="let genre of genres()" class="genre-checkbox">
                <input 
                  type="checkbox" 
                  [id]="'genre-'+genre.id" 
                  [value]="genre.id" 
                  [checked]="isGenreSelected(genre.id)"
                  (change)="onGenreCheckboxChange(genre.id, $event)">
                <label [for]="'genre-'+genre.id">{{ genre.name }}</label>
              </div>
            </div>
          </div>
          
          <!-- Date Filters -->
          <div class="filter-section">
            <h3>Release Dates</h3>
            <div class="filter-grid">
              <div class="filter-group">
                <label class="filter-label">Release Date From</label>
                <input type="date" class="filter-input" [formControl]="releaseFromControl">
              </div>
              
              <div class="filter-group">
                <label class="filter-label">Release Date To</label>
                <input type="date" class="filter-input" [formControl]="releaseToControl">
              </div>
            </div>
          </div>
          
          <!-- Advanced Filters -->
          <div class="filter-section">
            <h3>Advanced Filters</h3>
            <div class="filter-grid">
              <div class="filter-group">
                <label class="filter-label">Language</label>
                <input type="text" class="filter-input" placeholder="e.g. en" [formControl]="languageControl">
              </div>
              
              <div class="filter-group">
                <label class="filter-label">Minimum Votes</label>
                <input type="number" class="filter-input" placeholder="e.g. 100" [formControl]="minVotesControl">
              </div>
              
              <div class="filter-group">
                <div class="checkbox-group">
                  <input type="checkbox" [id]="'include-adult'" [formControl]="includeAdultControl">
                  <label [for]="'include-adult'">Include Adult Content</label>
                </div>
              </div>
              
              <div class="filter-group">
                <div class="checkbox-group">
                  <input type="checkbox" [id]="'include-video'" [formControl]="includeVideoControl">
                  <label [for]="'include-video'">Include Video</label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-actions">
        <button class="action-btn reset-btn" (click)="resetFilters()">Reset Filters</button>
        <button class="action-btn apply-btn" (click)="applyFilters()">Apply Filters</button>
      </div>
    </div>
  </div>
  `,
    styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
      z-index: 1000;
      padding: 20px;
    }
    
    .modal-overlay.active {
      opacity: 1;
      visibility: visible;
    }
    
    .modal-container {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      width: 100%;
      max-width: 800px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      padding: 30px;
      transform: scale(0.9) translateY(30px);
      opacity: 0;
      transition: all 0.4s ease;
    }
    
    .modal-overlay.active .modal-container {
      transform: scale(1) translateY(0);
      opacity: 1;
    }
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .modal-title {
      font-size: 1.8rem;
      color: white;
      text-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    }
    
    .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: all 0.3s ease;
      
      svg {
        width: 24px;
        height: 24px;
      }
    }
    
    .close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    
    .modal-content {
      margin-bottom: 30px;
    }
    
    .filter-sections {
      display: flex;
      flex-direction: column;
      gap: 25px;
    }
    
    .filter-section h3 {
      color: white;
      margin-bottom: 15px;
      font-size: 1.2rem;
      font-weight: 600;
    }
    
    .filter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 20px;
    }
    
    .filter-group {
      text-align: left;
    }
    
    .filter-label {
      display: block;
      margin-bottom: 8px;
      color: white;
      font-weight: 500;
    }
    
    .filter-input {
      width: 100%;
      padding: 12px 15px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.1);
      color: white;
      font-size: 1rem;
      backdrop-filter: blur(5px);
      transition: all 0.3s ease;
    }
    
    .filter-input:focus {
      outline: none;
      border-color: rgba(255, 255, 255, 0.5);
      background: rgba(255, 255, 255, 0.15);
    }
    
    .genres-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 12px;
    }
    
    .genre-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      
      input[type="checkbox"] {
        width: 18px;
        height: 18px;
        accent-color: rgba(255, 255, 255, 0.7);
      }
      
      label {
        color: white;
        cursor: pointer;
      }
    }
    
    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 8px;
      
      input[type="checkbox"] {
        width: 18px;
        height: 18px;
        accent-color: rgba(255, 255, 255, 0.7);
      }
      
      label {
        color: white;
        cursor: pointer;
      }
    }
    
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 15px;
    }
    
    .action-btn {
      padding: 12px 25px;
      border-radius: 10px;
      border: none;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .apply-btn {
      background: rgba(255, 255, 255, 0.9);
      color: #333;
    }
    
    .apply-btn:hover {
      background: rgba(255, 255, 255, 1);
      transform: translateY(-2px);
    }
    
    .reset-btn {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }
    
    .reset-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    @media (max-width: 768px) {
      .modal-container {
        padding: 20px;
      }
      
      .filter-grid {
        grid-template-columns: 1fr;
      }
      
      .genres-grid {
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      }
    }
  `]
})
export class FilterModalComponent implements OnInit, OnDestroy {
    @Input() isOpen = signal(false);
    @Output() filtersApplied = new EventEmitter<MovieFilters>();
    @Output() modalClosed = new EventEmitter<void>();

    // Injected services
    private readonly tmdb = inject(TmdbService);
    private readonly fb = inject(FormBuilder);

    // Signals & state
    readonly genres = this.tmdb.genres;
    private subs: Subscription[] = [];

    // Form
    form: FormGroup;

    // Form getters
    get queryControl() { return this.form.get('query') as FormControl; }
    get yearControl() { return this.form.get('year') as FormControl; }
    get releaseFromControl() { return this.form.get('release_from') as FormControl; }
    get releaseToControl() { return this.form.get('release_to') as FormControl; }
    get minRatingControl() { return this.form.get('min_rating') as FormControl; }
    get maxRatingControl() { return this.form.get('max_rating') as FormControl; }
    get minVotesControl() { return this.form.get('min_votes') as FormControl; }
    get languageControl() { return this.form.get('language') as FormControl; }
    get includeAdultControl() { return this.form.get('include_adult') as FormControl; }
    get includeVideoControl() { return this.form.get('include_video') as FormControl; }
    get genreFormArray(): FormArray { return this.form.get('genre_ids') as FormArray; }

    constructor() {
        this.form = this.fb.group({
            query: [''],
            year: [null],
            release_from: [null],
            release_to: [null],
            min_rating: [0],
            max_rating: [10],
            min_votes: [null],
            language: [''],
            include_adult: [false],
            include_video: [false],
            genre_ids: this.fb.array([])
        });
    }

    ngOnInit(): void {
        // Subscribe to form changes if needed
    }

    ngOnDestroy(): void {
        this.subs.forEach(s => s.unsubscribe());
    }

    @HostListener('document:keydown.escape')
    onEscapeKey() {
        if (this.isOpen()) {
            this.close();
        }
    }

    isGenreSelected(id: number): boolean {
        return this.genreFormArray.value.includes(id);
    }

    onGenreCheckboxChange(id: number, event: Event): void {
        const isChecked = (event.target as HTMLInputElement).checked;
        const genreArray = this.genreFormArray;

        if (isChecked) {
            if (!genreArray.value.includes(id)) {
                genreArray.push(new FormControl(id));
            }
        } else {
            const index = genreArray.value.indexOf(id);
            if (index > -1) {
                genreArray.removeAt(index);
            }
        }
    }

    applyFilters(): void {
        const formValue = this.form.getRawValue();
        const filters: MovieFilters = {
            query: formValue.query?.trim() || undefined,
            year: formValue.year || undefined,
            release_date_gte: formValue.release_from ? this.formatDateParam(formValue.release_from) : undefined,
            release_date_lte: formValue.release_to ? this.formatDateParam(formValue.release_to) : undefined,
            min_rating: formValue.min_rating > 0 ? formValue.min_rating : undefined,
            max_rating: (formValue.max_rating != null && formValue.max_rating < 10) ? formValue.max_rating : undefined,
            min_votes: formValue.min_votes || undefined,
            language: formValue.language || undefined,
            include_adult: formValue.include_adult || undefined,
            include_video: formValue.include_video || undefined,
            genre_ids: (formValue.genre_ids && formValue.genre_ids.length) ? formValue.genre_ids.join(',') : undefined
        };

        this.filtersApplied.emit(filters);
        this.close();
    }

    resetFilters(): void {
        this.form.reset({
            query: '',
            year: null,
            release_from: null,
            release_to: null,
            min_rating: 0,
            max_rating: 10,
            min_votes: null,
            language: '',
            include_adult: false,
            include_video: false
        });
        this.genreFormArray.clear();
    }

    close(): void {
        this.isOpen.set(false);
        this.modalClosed.emit();
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
}
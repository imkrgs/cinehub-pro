import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { Movie } from '@core/models/movie.model';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-movie-details-modal',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatTooltipModule,
        DatePipe,
        DecimalPipe
    ],
    encapsulation: ViewEncapsulation.None,
    template: `
    <div class="movie-details-modal-container">
      <div class="modal-header">
        <h2 mat-dialog-title>{{ movie.title }}</h2>
      </div>
      
      <mat-dialog-content class="modal-content">
        <div class="content-layout">
          <div class="poster">
            <img [src]="getPosterUrl(movie.poster_path)" [alt]="movie.title">
          </div>
          <div class="details">
            <p class="overview">{{ movie.overview }}</p>
            
            <div class="meta-grid">
              <div class="meta-item">
                <mat-icon>calendar_today</mat-icon>
                <span><strong>Release Date:</strong> {{ movie.release_date | date:'longDate' }}</span>
              </div>
              <div class="meta-item">
                <mat-icon>star_rate</mat-icon>
                <span><strong>Rating:</strong> {{ movie.vote_average | number:'1.1-1' }} / 10</span>
              </div>
              <div class="meta-item">
                <mat-icon>how_to_vote</mat-icon>
                <span><strong>Votes:</strong> {{ movie.vote_count | number }}</span>
              </div>
              @if(movie.runtime) {
              <div class="meta-item">
                <mat-icon>schedule</mat-icon>
                <span><strong>Runtime:</strong> {{ movie.runtime }} minutes</span>
              </div>
              }
            </div>

            @if(movie.genres && movie.genres.length > 0) {
              <div class="genres">
                <span class="genre-label">Genres:</span>
                <mat-chip-listbox aria-label="Movie genres">
                  @for(genre of movie.genres; track genre.id) {
                    <mat-chip>{{ genre.name }}</mat-chip>
                  }
                </mat-chip-listbox>
              </div>
            }
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions class="modal-actions" align="end">
        <button mat-stroked-button color="warn" (click)="close()">Close</button>
        <button mat-flat-button color="primary" [routerLink]="['/movie', movie.id]" (click)="close()">
          <mat-icon>open_in_new</mat-icon>
          View Full Details
        </button>
      </mat-dialog-actions>
    </div>
  `,
    styles: [`
    .movie-details-modal-container {
      max-width: 800px;
      padding: 0 !important;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      background-color: transparent;
      border-bottom: 1px solid var(--border-color);
    }
    .modal-header h2 { margin: 0; font-size: 1.5rem; }
    
    .modal-content {
      padding: 1.5rem;
    }

    .content-layout {
      display: flex;
      gap: 1.5rem;
    }

    .poster {
      flex-shrink: 0;
      width: 200px;
    }
    .poster img {
      width: 100%;
      border-radius: 12px;
      box-shadow: var(--card-shadow);
    }
    .details {
      flex-grow: 1;
    }
    .overview {
      font-size: 1rem;
      line-height: 1.6;
      color: var(--text-color-light);
      margin-top: 0;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 1.5rem;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .meta-item mat-icon { color: var(--primary-color); }
    
    .genres { margin-top: 1.5rem; }
    .genre-label { font-weight: 600; margin-right: 0.5rem; }

    .modal-actions {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-color);
      background-color: var(--bg-color-alt);
    }
  `]
})
export class MovieDetailsModalComponent {
    movie: Movie;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { movie: Movie },
        private dialogRef: MatDialogRef<MovieDetailsModalComponent>
    ) {
        this.movie = data.movie;
    }

    getPosterUrl(path: string | null): string {
        return path ? `https://image.tmdb.org/t/p/w342${path}` : '/assets/images/placeholder-poster.jpg';
    }

    close() {
        this.dialogRef.close();
    }
}
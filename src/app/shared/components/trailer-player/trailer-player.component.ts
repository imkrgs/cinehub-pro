import {Component, Inject, OnInit, signal, WritableSignal} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TmdbService } from '@core/services/tmdb.service';
import { SafeUrlPipe } from '@shared/pipes/safe-url.pipe';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
    selector: 'app-trailer-player',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        SafeUrlPipe
    ],
    template: `
    <div class="trailer-player-container">
      <div class="video-container">
        @if(isLoading()){
          <div class="video-placeholder">
            <div class="play-button pulse">
              <mat-icon>play_arrow</mat-icon>
            </div>
            <p>Loading trailer...</p>
          </div>
        } @else if(trailerUrl()){
          <iframe 
            width="100%" 
            height="100%" 
            [src]="trailerUrl()" 
            frameborder="0" 
            allow="autoplay" 
            allowfullscreen>
          </iframe>
        } @else {
          <div class="video-placeholder error-state">
            <mat-icon>error_outline</mat-icon>
            <p>Trailer not available.</p>
          </div>
        }
      </div>
    </div>
  `,
    styles: [`
    .trailer-player-container {
      width: 90vw;
      max-width: 1100px;
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(15px);
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      border: 0 solid rgba(255, 255, 255, 0.1);
    }
    
    .video-container {
      position: relative;
      width: 100%;
      height: 0;
      padding-top: 56.25%; /* 16:9 Aspect Ratio */
      background: #000;
      overflow: hidden;
    }
    
    .video-container iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    
    .video-placeholder {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(125deg, #0f0c29, #302b63);
      display: flex;
      justify-content: center;
      align-items: center;
      color: white;
      font-size: 22px;
      flex-direction: column;
      gap: 15px;
    }
    
    .video-placeholder.error-state {
      background: linear-gradient(125deg, #290c0c, #632030);
    }
    

  `]
})
export class TrailerPlayerComponent implements OnInit {
    isLoading = signal(true);
    trailerUrl = signal<SafeResourceUrl | null>(null);
    isPlaying = signal(true);
    isMuted = signal(false);
    showSettings = signal(false);
    volume = signal(80);
    progress = signal(35);
    currentTime = signal(85); // in seconds
    duration = signal(630); // 10:30 in seconds
    previewTime = 85;
    playbackSpeed = signal(1);
    movieTitle = 'Interstellar';
    channelName = 'Warner Bros. Pictures';

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { movieId: number },
        private dialogRef: MatDialogRef<TrailerPlayerComponent>,
        private tmdbService: TmdbService,
        private sanitizer: DomSanitizer
    ) {}

    ngOnInit() {
        this.tmdbService.getMovieVideos(this.data.movieId).subscribe({
            next: (response) => {
                const trailer = response.results.find(
                    video => video.type === 'Trailer' && video.site === 'YouTube'
                );
                if (trailer) {
                    const url = `https://www.youtube.com/embed/${trailer.key}?autoplay=1&modestbranding=1&rel=0`;
                    this.trailerUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));

                    // Set movie title from service if available
                    this.tmdbService.getMovieDetails(this.data.movieId).subscribe(movie => {
                        this.movieTitle = movie.title;
                        // Simulate video duration (in a real app, this would come from the video metadata)
                        this.duration.set(Math.floor(Math.random() * 300) + 120);
                    });
                }
                this.isLoading.set(false);
            },
            error: () => {
                this.isLoading.set(false);
            }
        });
    }

    close() {
        this.dialogRef.close();
    }

    togglePlay() {
        this.isPlaying.set(!this.isPlaying());
        // In a real app, you would control the iframe playback here
    }

    toggleMute() {
        this.isMuted.set(!this.isMuted());
        // In a real app, you would control the iframe volume here
    }

    changeVolume(event: any) {
        this.volume.set(event.target.value);
        this.isMuted.set(this.volume() === 0);
        // In a real app, you would control the iframe volume here
    }

    toggleSettings() {
        this.showSettings.set(!this.showSettings());
    }

    togglePlaybackSpeed() {
        const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentIndex = speeds.indexOf(this.playbackSpeed());
        this.playbackSpeed.set(speeds[(currentIndex + 1) % speeds.length]);
        // In a real app, you would control the iframe playback speed here
    }

    toggleQuality() {
        // Placeholder for quality toggle functionality
        console.log('Quality toggle clicked');
    }

    rewind() {
        this.currentTime.set(Math.max(0, this.currentTime() - 10));
        this.progress.set((this.currentTime() / this.duration()) * 100);
        // In a real app, you would seek the iframe here
    }

    forward() {
        this.currentTime.set(Math.min(this.duration(), this.currentTime() + 10));
        this.progress.set((this.currentTime() / this.duration()) * 100);
        // In a real app, you would seek the iframe here
    }

    formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}
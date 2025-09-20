import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-movie-card-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-card">
      <div class="skeleton-image"></div>
      <div class="skeleton-content">
        <div class="skeleton-title"></div>
        <div class="skeleton-text"></div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      --skeleton-bg-color: #e0e0e0;
      --skeleton-highlight-color: #f5f5f5;
    }

    .dark :host {
      --skeleton-bg-color: #2c2c2c;
      --skeleton-highlight-color: #3a3a3a;
    }

    .skeleton-card {
      background-color: var(--bg-color, white);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: var(--card-shadow);
      border: 1px solid var(--border-color);
    }
    
    .skeleton-image {
      height: 300px;
      background-color: var(--skeleton-bg-color);
      animation: shimmer 1.5s infinite linear;
      background-image: linear-gradient(90deg, var(--skeleton-bg-color) 0px, var(--skeleton-highlight-color) 40px, var(--skeleton-bg-color) 80px);
      background-size: 600px;
    }

    .skeleton-content {
      padding: 1rem;
    }

    .skeleton-title, .skeleton-text {
      border-radius: 8px;
      animation: shimmer 1.5s infinite linear;
      background-image: linear-gradient(90deg, var(--skeleton-bg-color) 0px, var(--skeleton-highlight-color) 40px, var(--skeleton-bg-color) 80px);
      background-size: 600px;
    }

    .skeleton-title {
      height: 20px;
      width: 70%;
      margin-bottom: 0.75rem;
    }

    .skeleton-text {
      height: 16px;
      width: 90%;
    }

    @keyframes shimmer {
      0% {
        background-position: -300px;
      }
      100% {
        background-position: 300px;
      }
    }
  `]
})
export class MovieCardSkeletonComponent {}

// src/app/features/error/not-found/not-found.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-not-found',
    standalone: true,
    imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
    template: `
    <div class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <div class="text-9xl font-bold text-gray-300 mb-4">404</div>
        <h1 class="text-3xl font-bold mb-4">Page Not Found</h1>
        <p class="text-gray-600 mb-8">The page you're looking for doesn't exist.</p>
        <button mat-raised-button color="primary" routerLink="/">
          <mat-icon>home</mat-icon>
          Go Home
        </button>
      </div>
    </div>
  `
})
export class NotFoundComponent {}

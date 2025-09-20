import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    MatCardModule,
    MatButtonModule
  ],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-secondary-500 p-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-white mb-2">🎬 CineHub Pro</h1>
          <p class="text-white/80">Your ultimate movie discovery platform</p>
        </div>

        <mat-card class="p-6">
          <router-outlet></router-outlet>
        </mat-card>

        <div class="text-center mt-6">
          <a routerLink="/" class="text-white/80 hover:text-white transition-colors">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  `
})
export class AuthLayoutComponent {}
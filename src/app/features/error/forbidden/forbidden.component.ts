// src/app/features/error/forbidden/forbidden.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-forbidden',
    standalone: true,
    imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
    template: `
    <div class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <div class="text-9xl font-bold text-red-300 mb-4">403</div>
        <h1 class="text-3xl font-bold mb-4">Access Denied</h1>
        <p class="text-gray-600 mb-8">You don't have permission to access this resource.</p>
        <button mat-raised-button color="primary" routerLink="/">
          <mat-icon>home</mat-icon>
          Go Home
        </button>
      </div>
    </div>
  `
})
export class ForbiddenComponent {}

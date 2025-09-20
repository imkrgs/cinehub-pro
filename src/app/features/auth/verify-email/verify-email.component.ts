// src/app/features/auth/verify-email/verify-email.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core/services/auth.service';

@Component({
    selector: 'app-verify-email',
    standalone: true,
    imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule],
    template: `
    <div class="w-full max-w-md mx-auto text-center">
      <div class="mb-6">
        <mat-icon class="text-6xl text-green-500 mb-4">verified_user</mat-icon>
        <h1 class="text-2xl font-bold">Email Verified!</h1>
        <p class="text-gray-600 mt-2">Your email has been successfully verified</p>
      </div>

      <button mat-raised-button color="primary" routerLink="/auth/login" class="w-full">
        Continue to Sign In
      </button>
    </div>
  `
})
export class VerifyEmailComponent implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly route = inject(ActivatedRoute);

    ngOnInit(): void {
        const token = this.route.snapshot.queryParams['token'];
        if (token) {
            this.authService.verifyEmail(token).subscribe();
        }
    }
}

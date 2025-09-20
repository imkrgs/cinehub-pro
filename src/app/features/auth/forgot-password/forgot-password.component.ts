// src/app/features/auth/forgot-password/forgot-password.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core/services/auth.service';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [CommonModule, RouterLink, ReactiveFormsModule, MatCardModule, MatInputModule, MatButtonModule, MatIconModule],
    template: `
    <div class="w-full max-w-md mx-auto">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold">Reset Password</h1>
        <p class="text-gray-600 mt-2">Enter your email to receive reset instructions</p>
      </div>

      <form [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()" class="space-y-6">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email">
          <mat-icon matPrefix>email</mat-icon>
          @if (forgotPasswordForm.get('email')?.hasError('required') && forgotPasswordForm.get('email')?.touched) {
            <mat-error>Email is required</mat-error>
          }
          @if (forgotPasswordForm.get('email')?.hasError('email') && forgotPasswordForm.get('email')?.touched) {
            <mat-error>Please enter a valid email</mat-error>
          }
        </mat-form-field>

        <button mat-raised-button color="primary" type="submit" class="w-full" [disabled]="forgotPasswordForm.invalid || isLoading()">
          @if (isLoading()) {
            <mat-icon class="animate-spin mr-2">refresh</mat-icon>
            Sending...
          } @else {
            Send Reset Link
          }
        </button>

        <div class="text-center">
          <a routerLink="/auth/login" class="text-primary-500 hover:underline">Back to Sign In</a>
        </div>
      </form>
    </div>
  `
})
export class ForgotPasswordComponent {
    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);

    protected readonly isLoading = this.authService.isLoading;
    protected forgotPasswordForm: FormGroup = this.fb.group({
        email: ['', [Validators.required, Validators.email]]
    });

    onSubmit(): void {
        if (this.forgotPasswordForm.valid) {
            const { email } = this.forgotPasswordForm.value;
            this.authService.forgotPassword(email).subscribe();
        }
    }
}

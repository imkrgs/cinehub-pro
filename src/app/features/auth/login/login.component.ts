// src/app/features/auth/login/login.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';

import { AuthService } from '@core/services/auth.service';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        ReactiveFormsModule,
        MatCardModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatDividerModule,
        LoadingSpinnerComponent
    ],
    template: `
    <div class="w-full max-w-md mx-auto">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold">Welcome Back!</h1>
        <p class="text-gray-600 mt-2">Sign in to your CineHub Pro account</p>
      </div>

      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-6">
        <!-- Email Field -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="email">
          <mat-icon matPrefix>email</mat-icon>
          @if (loginForm.get('email')?.hasError('required') && loginForm.get('email')?.touched) {
            <mat-error>Email is required</mat-error>
          }
          @if (loginForm.get('email')?.hasError('email') && loginForm.get('email')?.touched) {
            <mat-error>Please enter a valid email</mat-error>
          }
        </mat-form-field>

        <!-- Password Field -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Password</mat-label>
          <input 
            matInput 
            [type]="hidePassword() ? 'password' : 'text'" 
            formControlName="password"
            autocomplete="current-password">
          <mat-icon matPrefix>lock</mat-icon>
          <button 
            mat-icon-button 
            matSuffix 
            type="button"
            (click)="togglePasswordVisibility()"
            [attr.aria-label]="'Hide password'"
            [attr.aria-pressed]="hidePassword()">
            <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          @if (loginForm.get('password')?.hasError('required') && loginForm.get('password')?.touched) {
            <mat-error>Password is required</mat-error>
          }
          @if (loginForm.get('password')?.hasError('minlength') && loginForm.get('password')?.touched) {
            <mat-error>Password must be at least 6 characters</mat-error>
          }
        </mat-form-field>

        <!-- Remember Me & Forgot Password -->
        <div class="flex items-center justify-between">
          <mat-checkbox formControlName="rememberMe">
            Remember me
          </mat-checkbox>
          
          <a routerLink="/auth/forgot-password" class="text-primary-500 hover:underline text-sm">
            Forgot password?
          </a>
        </div>

        <!-- Error Message -->
        @if (authError()) {
          <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {{ authError() }}
          </div>
        }

          <!-- Submit Button (fixed for content projection) -->
          <button
                  mat-raised-button
                  color="primary"
                  type="submit"
                  class="w-full !py-3"
                  [disabled]="loginForm.invalid || isLoading()">

              <!-- icon containers: only a single projectable node each -->
              <ng-container *ngIf="isLoading(); else notLoadingIcon">
                  <mat-icon class="animate-spin mr-2" aria-hidden="true">refresh</mat-icon>
              </ng-container>
              <ng-template #notLoadingIcon>
                  <mat-icon class="mr-2" aria-hidden="true">login</mat-icon>
              </ng-template>

              <!-- text separated from icon containers -->
              <span *ngIf="isLoading()">Signing in...</span>
              <span *ngIf="!isLoading()">Sign In</span>
          </button>


        <mat-divider>OR</mat-divider>

          <!-- Development Login (only in dev mode) -->
          @if (!isProduction) {
              <div class="space-y-2">
                  <p class="text-xs text-gray-500 text-center">Development Mode</p>
                  <div class="grid grid-cols-2 gap-2">
                      <button
                              mat-outlined-button
                              type="button"
                              (click)="mockLogin('user')"
                              class="!py-2">
                          <ng-container>
                              <mat-icon class="mr-1 !text-sm" aria-hidden="true">person</mat-icon>
                          </ng-container>
                          <span>User</span>
                      </button>
                      <button
                              mat-outlined-button
                              type="button"
                              (click)="mockLogin('admin')"
                              class="!py-2">
                          <ng-container>
                              <mat-icon class="mr-1 !text-sm" aria-hidden="true">admin_panel_settings</mat-icon>
                          </ng-container>
                          <span>Admin</span>
                      </button>
                  </div>
              </div>

              <mat-divider></mat-divider>
          }


        <!-- Sign Up Link -->
        <div class="text-center">
          <p class="text-gray-600">
            Don't have an account? 
            <a routerLink="/auth/register" class="text-primary-500 hover:underline font-medium">
              Sign up
            </a>
          </p>
        </div>
      </form>
    </div>
  `
})
export class LoginComponent {
    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    protected readonly isLoading = this.authService.isLoading;
    protected readonly authError = this.authService.authError;
    protected readonly hidePassword = signal(true);
    protected readonly isProduction = false; // Set based on environment

    protected loginForm: FormGroup = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        rememberMe: [false]
    });

    onSubmit(): void {
        if (this.loginForm.valid) {
            const { email, password, rememberMe } = this.loginForm.value;

            this.authService.login({
                email,
                password,
                remember_me: rememberMe
            }).subscribe({
                next: () => {
                    this.router.navigate(['/dashboard']);
                },
                error: (error) => {
                    console.error('Login failed:', error);
                }
            });
        } else {
            this.loginForm.markAllAsTouched();
        }
    }

    togglePasswordVisibility(): void {
        this.hidePassword.set(!this.hidePassword());
    }

    mockLogin(role: 'user' | 'admin'): void {
        this.authService.mockLogin(role);
        this.router.navigate([role === 'admin' ? '/admin' : '/dashboard']);
    }
}

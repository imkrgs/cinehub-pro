// src/app/features/auth/register/register.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';

import { AuthService } from '@core/services/auth.service';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';

// Custom validator for password confirmation
function passwordMatchValidator(control: AbstractControl): {[key: string]: any} | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
        return { 'passwordMismatch': true };
    }

    return null;
}

@Component({
    selector: 'app-register',
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
        MatSelectModule,
        MatDividerModule,
        LoadingSpinnerComponent
    ],
    template: `
    <div class="w-full max-w-md mx-auto">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold">Join CineHub Pro!</h1>
        <p class="text-gray-600 mt-2">Create your account to start discovering movies</p>
      </div>

      <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-6">
        <!-- Name Field -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Full Name</mat-label>
          <input matInput type="text" formControlName="name" autocomplete="name">
          <mat-icon matPrefix>person</mat-icon>
          @if (registerForm.get('name')?.hasError('required') && registerForm.get('name')?.touched) {
            <mat-error>Full name is required</mat-error>
          }
          @if (registerForm.get('name')?.hasError('minlength') && registerForm.get('name')?.touched) {
            <mat-error>Name must be at least 2 characters</mat-error>
          }
        </mat-form-field>

        <!-- Username Field -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Username</mat-label>
          <input matInput type="text" formControlName="username" autocomplete="username">
          <mat-icon matPrefix>alternate_email</mat-icon>
          @if (registerForm.get('username')?.hasError('required') && registerForm.get('username')?.touched) {
            <mat-error>Username is required</mat-error>
          }
          @if (registerForm.get('username')?.hasError('minlength') && registerForm.get('username')?.touched) {
            <mat-error>Username must be at least 3 characters</mat-error>
          }
          @if (registerForm.get('username')?.hasError('pattern') && registerForm.get('username')?.touched) {
            <mat-error>Username can only contain letters, numbers, and underscores</mat-error>
          }
        </mat-form-field>

        <!-- Email Field -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="email">
          <mat-icon matPrefix>email</mat-icon>
          @if (registerForm.get('email')?.hasError('required') && registerForm.get('email')?.touched) {
            <mat-error>Email is required</mat-error>
          }
          @if (registerForm.get('email')?.hasError('email') && registerForm.get('email')?.touched) {
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
            autocomplete="new-password">
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
          @if (registerForm.get('password')?.hasError('required') && registerForm.get('password')?.touched) {
            <mat-error>Password is required</mat-error>
          }
          @if (registerForm.get('password')?.hasError('minlength') && registerForm.get('password')?.touched) {
            <mat-error>Password must be at least 8 characters</mat-error>
          }
          @if (registerForm.get('password')?.hasError('pattern') && registerForm.get('password')?.touched) {
            <mat-error>Password must contain at least one letter and one number</mat-error>
          }
        </mat-form-field>

        <!-- Confirm Password Field -->
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Confirm Password</mat-label>
          <input 
            matInput 
            [type]="hideConfirmPassword() ? 'password' : 'text'" 
            formControlName="confirmPassword"
            autocomplete="new-password">
          <mat-icon matPrefix>lock</mat-icon>
          <button 
            mat-icon-button 
            matSuffix 
            type="button"
            (click)="toggleConfirmPasswordVisibility()"
            [attr.aria-label]="'Hide confirm password'"
            [attr.aria-pressed]="hideConfirmPassword()">
            <mat-icon>{{ hideConfirmPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          @if (registerForm.get('confirmPassword')?.hasError('required') && registerForm.get('confirmPassword')?.touched) {
            <mat-error>Please confirm your password</mat-error>
          }
          @if (registerForm.hasError('passwordMismatch') && registerForm.get('confirmPassword')?.touched) {
            <mat-error>Passwords do not match</mat-error>
          }
        </mat-form-field>

        <!-- Terms and Privacy -->
        <div class="space-y-3">
          <mat-checkbox formControlName="acceptTerms" class="w-full">
            <span class="text-sm">
              I agree to the 
              <a routerLink="/terms" class="text-primary-500 hover:underline">Terms of Service</a>
              and 
              <a routerLink="/privacy" class="text-primary-500 hover:underline">Privacy Policy</a>
            </span>
          </mat-checkbox>

          <mat-checkbox formControlName="newsletterOptIn" class="w-full">
            <span class="text-sm">
              I want to receive movie recommendations and updates via email
            </span>
          </mat-checkbox>
        </div>

        <!-- Terms Error -->
        @if (registerForm.get('acceptTerms')?.hasError('required') && registerForm.get('acceptTerms')?.touched) {
          <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            You must accept the Terms of Service to continue
          </div>
        }

        <!-- Error Message -->
        @if (authError()) {
          <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {{ authError() }}
          </div>
        }

        <!-- Password Strength Indicator -->
        @if (registerForm.get('password')?.value) {
          <div class="space-y-2">
            <div class="text-xs text-gray-600">Password strength:</div>
            <div class="flex space-x-1">
              @for (item of [1,2,3,4]; track item) {
                <div 
                  class="h-1 flex-1 rounded-full transition-colors duration-200"
                  [class]="getPasswordStrengthClass(item)">
                </div>
              }
            </div>
            <div class="text-xs" [class]="getPasswordStrengthTextClass()">
              {{ getPasswordStrengthText() }}
            </div>
          </div>
        }

          <!-- Submit Button (fixed for content projection) -->
          <button
                  mat-raised-button
                  color="primary"
                  type="submit"
                  class="w-full !py-3"
                  [disabled]="registerForm.invalid || isLoading()">

              <!-- icon containers: only a single projectable node each -->
              <ng-container *ngIf="isLoading(); else notLoadingIcon">
                  <mat-icon class="animate-spin mr-2" aria-hidden="true">refresh</mat-icon>
              </ng-container>
              <ng-template #notLoadingIcon>
                  <mat-icon class="mr-2" aria-hidden="true">person_add</mat-icon>
              </ng-template>

              <!-- text separated from icon containers -->
              <span *ngIf="isLoading()">Creating account...</span>
              <span *ngIf="!isLoading()">Create Account</span>
          </button>


        <mat-divider></mat-divider>

        <!-- Sign In Link -->
        <div class="text-center">
          <p class="text-gray-600">
            Already have an account? 
            <a routerLink="/auth/login" class="text-primary-500 hover:underline font-medium">
              Sign in
            </a>
          </p>
        </div>
      </form>
    </div>
  `
})
export class RegisterComponent {
    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    protected readonly isLoading = this.authService.isLoading;
    protected readonly authError = this.authService.authError;
    protected readonly hidePassword = signal(true);
    protected readonly hideConfirmPassword = signal(true);

    protected registerForm: FormGroup = this.fb.group({
        name: ['', [Validators.required, Validators.minLength(2)]],
        username: ['', [
            Validators.required,
            Validators.minLength(3),
            Validators.pattern(/^[a-zA-Z0-9_]+$/)
        ]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/)
        ]],
        confirmPassword: ['', [Validators.required]],
        acceptTerms: [false, [Validators.requiredTrue]],
        newsletterOptIn: [false]
    }, { validators: passwordMatchValidator });

    onSubmit(): void {
        if (this.registerForm.valid) {
            const { name, username, email, password, confirmPassword, acceptTerms, newsletterOptIn } = this.registerForm.value;

            this.authService.register({
                name,
                username,
                email,
                password,
                confirm_password: confirmPassword,
                accept_terms: acceptTerms,
                newsletter_opt_in: newsletterOptIn
            }).subscribe({
                next: () => {
                    this.router.navigate(['/dashboard']);
                },
                error: (error) => {
                    console.error('Registration failed:', error);
                }
            });
        } else {
            this.registerForm.markAllAsTouched();
        }
    }

    togglePasswordVisibility(): void {
        this.hidePassword.set(!this.hidePassword());
    }

    toggleConfirmPasswordVisibility(): void {
        this.hideConfirmPassword.set(!this.hideConfirmPassword());
    }

    getPasswordStrength(): number {
        const password = this.registerForm.get('password')?.value || '';
        let strength = 0;

        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        return strength;
    }

    getPasswordStrengthClass(index: number): string {
        const strength = this.getPasswordStrength();
        if (index <= strength) {
            switch (strength) {
                case 1: return 'bg-red-400';
                case 2: return 'bg-yellow-400';
                case 3: return 'bg-blue-400';
                case 4: return 'bg-green-400';
                default: return 'bg-gray-200';
            }
        }
        return 'bg-gray-200';
    }

    getPasswordStrengthText(): string {
        const strength = this.getPasswordStrength();
        switch (strength) {
            case 1: return 'Weak';
            case 2: return 'Fair';
            case 3: return 'Good';
            case 4: return 'Strong';
            default: return '';
        }
    }

    getPasswordStrengthTextClass(): string {
        const strength = this.getPasswordStrength();
        switch (strength) {
            case 1: return 'text-red-600';
            case 2: return 'text-yellow-600';
            case 3: return 'text-blue-600';
            case 4: return 'text-green-600';
            default: return 'text-gray-500';
        }
    }
}

// src/app/features/auth/reset-password/reset-password.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core/services/auth.service';

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [CommonModule, RouterLink, ReactiveFormsModule, MatCardModule, MatInputModule, MatButtonModule, MatIconModule],
    template: `
    <div class="w-full max-w-md mx-auto">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold">Set New Password</h1>
        <p class="text-gray-600 mt-2">Enter your new password</p>
      </div>

      <form [formGroup]="resetPasswordForm" (ngSubmit)="onSubmit()" class="space-y-6">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>New Password</mat-label>
          <input matInput [type]="hidePassword ? 'password' : 'text'" formControlName="newPassword">
          <mat-icon matPrefix>lock</mat-icon>
          <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
            <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
          </button>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Confirm Password</mat-label>
          <input matInput [type]="hideConfirmPassword ? 'password' : 'text'" formControlName="confirmPassword">
          <mat-icon matPrefix>lock</mat-icon>
          <button mat-icon-button matSuffix type="button" (click)="hideConfirmPassword = !hideConfirmPassword">
            <mat-icon>{{hideConfirmPassword ? 'visibility_off' : 'visibility'}}</mat-icon>
          </button>
        </mat-form-field>

        <button mat-raised-button color="primary" type="submit" class="w-full" [disabled]="resetPasswordForm.invalid || isLoading()">
          @if (isLoading()) {
            Reset Password
          } @else {
            <mat-icon class="animate-spin mr-2">refresh</mat-icon>
            Resetting...
          }
        </button>
      </form>
    </div>
  `
})
export class ResetPasswordComponent {
    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    protected readonly isLoading = this.authService.isLoading;
    protected hidePassword = true;
    protected hideConfirmPassword = true;
    private token = '';

    protected resetPasswordForm: FormGroup = this.fb.group({
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]]
    });

    ngOnInit(): void {
        this.token = this.route.snapshot.queryParams['token'] || '';
    }

    onSubmit(): void {
        if (this.resetPasswordForm.valid) {
            const { newPassword, confirmPassword } = this.resetPasswordForm.value;
            this.authService.resetPassword(this.token, newPassword, confirmPassword).subscribe();
        }
    }
}

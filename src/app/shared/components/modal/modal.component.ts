import { Component, inject, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { LoginRequest, RegisterRequest } from '@core/models/user.model';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div *ngIf="isOpen()" class="ch-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="ch-modal-title"
       (keydown.escape)="close()" tabindex="-1">
    <div class="ch-modal-card" role="document" (click)="$event.stopPropagation()">
      <header class="ch-modal-header">
        <h2 id="ch-modal-title" class="ch-modal-title">
          <!-- If verification screen active, show that title -->
          {{ showVerifyScreen ? 'Verify your email' : (activeForm() === 'signin' ? 'Sign In' : activeForm() === 'signup' ? 'Create Account' : 'Reset Password') }}
        </h2>
        <button class="ch-close-btn" aria-label="Close" (click)="close()">✕</button>
      </header>

      <section class="ch-modal-body">

        <!-- VERIFICATION SCREEN -->
        <div *ngIf="showVerifyScreen" class="ch-verify">
          <p class="ch-verify-text">
            Thanks for registering — a verification email was sent to
            <strong>{{ pendingVerificationEmail }}</strong>.
            Please check your inbox (and spam folder) and click the verification link to activate your account.
          </p>

          <div class="ch-verify-actions">
            <button class="ch-btn ch-btn-primary" (click)="resendVerification()" [disabled]="isLoading()">Resend verification</button>

            <button class="ch-btn ch-btn-ghost" (click)="checkIfVerified()" [disabled]="isLoading()">I've verified — refresh status</button>
          </div>

          <div class="ch-verify-small">
            <button class="ch-link" (click)="openSignin()">Back to sign in</button>
            <button class="ch-link" (click)="editEmail()">Not my email / Edit</button>
          </div>
        </div>

        <!-- SIGN IN -->
        <form *ngIf="!showVerifyScreen && activeForm() === 'signin'" [formGroup]="loginForm" (ngSubmit)="submitLogin()" class="ch-form" autocomplete="on" novalidate>
          <div class="ch-field">
            <input class="ch-input" formControlName="email" type="email" placeholder=" " autocomplete="email" />
            <label>Email</label>
          </div>
          <div *ngIf="lf.email.touched && lf.email.invalid" class="ch-error">
            <div *ngIf="lf.email.errors?.['required']">Email is required</div>
            <div *ngIf="lf.email.errors?.['email']">Enter a valid email</div>
          </div>

          <div class="ch-field">
            <input class="ch-input" formControlName="password" type="password" placeholder=" " autocomplete="current-password" />
            <label>Password</label>
          </div>
          <div *ngIf="lf.password.touched && lf.password.invalid" class="ch-error">
            <div *ngIf="lf.password.errors?.['required']">Password is required</div>
          </div>

          <button class="ch-btn ch-btn-primary" type="submit" [disabled]="loginForm.invalid || isLoading()">
            <span *ngIf="!isLoading()">Sign In</span>
            <span *ngIf="isLoading()">Signing in…</span>
          </button>

          <div class="ch-form-footer">
            <button type="button" class="ch-link" (click)="openReset()">Forgot password?</button>
            <button type="button" class="ch-link" (click)="openSignup()">Create account</button>
          </div>
        </form>

        <!-- SIGN UP -->
        <form *ngIf="!showVerifyScreen && activeForm() === 'signup'" [formGroup]="registerForm" (ngSubmit)="submitRegister()" class="ch-form" autocomplete="on" novalidate>
          <div class="ch-field"><input class="ch-input" formControlName="name" placeholder=" " /><label>Full name</label></div>
          <div class="ch-field"><input class="ch-input" formControlName="username" placeholder=" " /><label>Username</label></div>
          <div class="ch-field"><input class="ch-input" formControlName="email" type="email" placeholder=" " /><label>Email</label></div>
          <div class="ch-field"><input class="ch-input" formControlName="password" type="password" placeholder=" " /><label>Password</label></div>
          <div class="ch-field"><input class="ch-input" formControlName="confirm_password" type="password" placeholder=" " /><label>Confirm Password</label></div>
          <div *ngIf="registerForm.errors?.['passwordsMismatch']" class="ch-error">Passwords do not match</div>

          <label class="ch-checkbox">
            <input type="checkbox" formControlName="accept_terms" />
            <span>I agree to the terms and privacy policy</span>
          </label>

          <label class="ch-checkbox">
            <input type="checkbox" formControlName="newsletter_opt_in" />
            <span>Subscribe to newsletter</span>
          </label>

          <button class="ch-btn ch-btn-primary" type="submit" [disabled]="registerForm.invalid || isLoading()">
            <span *ngIf="!isLoading()">Create Account</span>
            <span *ngIf="isLoading()">Creating…</span>
          </button>

          <div class="ch-form-footer">
            Already have an account?
            <button type="button" class="ch-link" (click)="openSignin()">Sign in</button>
          </div>
        </form>

        <!-- RESET -->
        <form *ngIf="!showVerifyScreen && activeForm() === 'reset'" [formGroup]="resetForm" (ngSubmit)="submitReset()" class="ch-form" autocomplete="off" novalidate>
          <div class="ch-field">
            <input class="ch-input" formControlName="email" type="email" placeholder=" " />
            <label>Email</label>
          </div>

          <button class="ch-btn ch-btn-primary" type="submit" [disabled]="resetForm.invalid || isLoading()">
            <span *ngIf="!isLoading()">Send reset link</span>
            <span *ngIf="isLoading()">Sending…</span>
          </button>

          <div class="ch-form-footer">
            Remembered your password?
            <button type="button" class="ch-link" (click)="openSignin()">Sign in</button>
          </div>
        </form>
      </section>
    </div>
  </div>
  `,
  styles: [`
  .ch-modal-overlay {
    position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
    background: rgba(15, 15, 20, 0.7); backdrop-filter: blur(6px);
    z-index: 1000; padding: 16px;
  }
  .ch-modal-card {
    width: 100%; max-width: 520px; background: rgba(24, 24, 30, 0.65);
    backdrop-filter: blur(18px) saturate(160%); border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 20px 50px rgba(0,0,0,0.6);
    display: flex; flex-direction: column; color: #e5e7eb;
  }
  .ch-modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .ch-modal-title { margin: 0; font-size: 18px; font-weight: 600; color: #f9fafb; }
  .ch-close-btn {
    border: none; background: transparent; font-size: 18px; cursor: pointer;
    color: #9ca3af; padding: 6px; border-radius: 6px; transition: background .15s, color .15s;
  }
  .ch-close-btn:hover { background: rgba(255,255,255,0.06); color: #f3f4f6; }
  .ch-modal-body { padding: 20px; }
  .ch-form { display: flex; flex-direction: column; gap: 14px; }

  /* Modern floating input fields */
  .ch-field { position: relative; }
  .ch-input {
    width: 100%; padding: 14px 12px 8px;
    border: 1px solid rgba(255,255,255,0.18); border-radius: 12px;
    background: rgba(40,40,50,0.6); color: #f9fafb;
    font-size: 14px; outline: none;
    transition: border-color .2s, box-shadow .2s, background .2s;
  }
  .ch-input:focus {
    border-color: #60a5fa; background: rgba(35,35,45,0.8);
    box-shadow: 0 0 0 3px rgba(96,165,250,0.25);
  }
  .ch-field label {
    position: absolute; top: 50%; left: 12px; transform: translateY(-50%);
    font-size: 14px; color: #9ca3af; pointer-events: none;
    transition: all .2s ease;
  }
  .ch-input:focus + label,
  .ch-input:not(:placeholder-shown) + label {
    top: 6px; left: 10px; font-size: 11px; color: #60a5fa;
  }

  .ch-checkbox { display: flex; gap: 10px; align-items: center; font-size: 13px; color: #d1d5db; }
  .ch-checkbox input { accent-color: #3b82f6; }

  .ch-btn { display: inline-flex; align-items: center; justify-content: center;
    padding: 10px 14px; border-radius: 12px; border: none; font-weight: 600;
    cursor: pointer; transition: transform .08s, box-shadow .12s; }
  .ch-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .ch-btn-primary {
    background: linear-gradient(145deg, #2563eb, #1e40af); color: #fff;
    box-shadow: 0 6px 20px rgba(37,99,235,0.35);
  }
  .ch-btn-primary:hover:not(:disabled) {
    transform: translateY(-1px); box-shadow: 0 10px 26px rgba(37,99,235,0.5);
  }

  .ch-btn-ghost {
    background: transparent; color: #d1d5db; border: 1px solid rgba(255,255,255,0.04);
    padding: 10px 14px; border-radius: 12px;
  }

  .ch-link { background: none; border: none; color: #93c5fd; font-size: 13px; cursor: pointer; }
  .ch-link:hover { text-decoration: underline; }
  .ch-form-footer { margin-top: 8px; display: flex; justify-content: space-between; font-size: 13px; color: #a1a1aa; }
  .ch-error { font-size: 12px; color: #f87171; }

  /* Verification specific */
  .ch-verify { display: flex; flex-direction: column; gap: 12px; }
  .ch-verify-text { color: #e6eefc; line-height: 1.4; }
  .ch-verify-actions { display:flex; gap: 12px; align-items:center; margin-top:4px; }
  .ch-verify-small { display:flex; gap:12px; margin-top:8px; align-items:center; }

  @media (max-width: 520px) {
    .ch-modal-card { max-width: 100%; border-radius: 12px; }
    .ch-modal-body { padding: 16px; }
    .ch-modal-header { padding: 12px 16px; }
  }
  `]
})
export class ModalComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  public auth = inject(AuthService);
  private toast = inject(ToastService);

  // forms
  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  registerForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    username: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirm_password: ['', [Validators.required]],
    accept_terms: [false, [Validators.requiredTrue]],
    newsletter_opt_in: [false]
  }, { validators: [this.passwordsMatchValidator] });

  resetForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  // ui state (wraps service signals)
  isOpen = computed(() => this.auth.isModalOpen());
  activeForm = computed(() => this.auth.activeForm());
  isLoading = computed(() => this.auth.isLoading());

  // verification UI state
  showVerifyScreen = false;
  pendingVerificationEmail: string | null = null;

  private subs: Subscription[] = [];

  // convenience getters
  get lf() { return this.loginForm.controls; }
  get rf() { return this.registerForm.controls; }
  get rfReset() { return this.resetForm.controls; }

  // Validator for password match
  private passwordsMatchValidator(group: AbstractControl) {
    const pw = group.get('password')?.value;
    const cpw = group.get('confirm_password')?.value;
    return pw === cpw ? null : { passwordsMismatch: true };
  }

  // form switch helpers
  openSignin() {
    this.showVerifyScreen = false;
    this.auth.switch('signin');
  }
  openSignup() {
    this.showVerifyScreen = false;
    this.auth.switch('signup');
  }
  openReset() {
    this.showVerifyScreen = false;
    this.auth.switch('reset');
  }

  // LOGIN
  submitLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const email = (this.loginForm.get('email')?.value ?? '') as string;
    const password = (this.loginForm.get('password')?.value ?? '') as string;

    const payload: LoginRequest = {
      email,
      password,
      remember_me: false
    };

    this.auth.login(payload).subscribe({
      next: (resp) => {
        this.toast.success(`Welcome back, ${resp.user.name}`);
        this.auth.close();
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Login failed';
        this.toast.error(msg);
      }
    });
  }

  // REGISTER
  submitRegister() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const v = this.registerForm.value;
    const payload: RegisterRequest = {
      name: v.name ?? '',
      username: v.username ?? '',
      email: v.email ?? '',
      password: v.password ?? '',
      confirm_password: v.confirm_password ?? '',
      accept_terms: !!v.accept_terms,
      newsletter_opt_in: v.newsletter_opt_in ?? false
    };

    // call register
    this.auth.register(payload).subscribe({
      next: (resp) => {
        // Show verification screen with the email user used to register
        this.pendingVerificationEmail = payload.email;
        this.showVerifyScreen = true;

        // clear sensitive fields
        this.registerForm.get('password')?.reset();
        this.registerForm.get('confirm_password')?.reset();

        this.toast.success(`Account created — please verify your email (${this.pendingVerificationEmail})`);
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Registration failed';
        this.toast.error(msg);
      }
    });
  }

  // RESET
  submitReset() {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const email = (this.resetForm.get('email')?.value ?? '') as string;

    const call$ = typeof (this.auth as any).forgotPassword === 'function'
        ? (this.auth as any).forgotPassword(email)
        : this.auth.reset(email);

    call$.subscribe({
      next: () => {
        this.toast.success('Password reset instructions sent to your email');
        this.auth.switch('signin');
      },
      error: (err: any) => {
        const msg = err?.error?.message || err?.message || 'Reset failed';
        this.toast.error(msg);
      }
    });
  }

  // RESEND VERIFICATION (attempts to call an optional method on AuthService)
  resendVerification() {
    if (!this.pendingVerificationEmail) {
      this.toast.error('No email to resend verification for');
      return;
    }

    // If AuthService exposes a resendVerification or resendVerificationEmail method, call it
    const maybeFn = (this.auth as any).resendVerification || (this.auth as any).resendVerificationEmail || (this.auth as any).resendVerificationCode;

    if (typeof maybeFn === 'function') {
      maybeFn.call(this.auth, this.pendingVerificationEmail).subscribe({
        next: () => {
          this.toast.success(`Verification email resent to ${this.pendingVerificationEmail}`);
        },
        error: (err: any) => {
          const msg = err?.error?.message || err?.message || 'Resend failed';
          this.toast.error(msg);
        }
      });
      return;
    }

    // Fallback: if auth has an endpoint-like method 'verifyEmail' that accepts email (rare), try it safely
    const maybeVerifyEmail = (this.auth as any).verifyEmail;
    if (typeof maybeVerifyEmail === 'function') {
      // verifyEmail typically expects a token; avoid calling it if it requires token
      this.toast.info('Resend not available from client. Please check your inbox or contact support.');
      return;
    }

    // Last-resort fallback message
    this.toast.info('If you did not receive the verification email, check your spam folder or contact support to resend verification.');
  }

  // Check if user has verified their email (refresh user from server)
  checkIfVerified() {
    // call getCurrentUser, which updates auth state in the service
    if (typeof this.auth.getCurrentUser !== 'function') {
      this.toast.info('Unable to check verification status from client. Please sign in after verifying your email.');
      return;
    }

    this.auth.getCurrentUser().subscribe({
      next: (user) => {
        if (user?.email_verified) {
          this.toast.success('Email verified — you can now sign in');
          this.showVerifyScreen = false;
          // Optionally close modal or switch to sign in automatically
          this.auth.switch('signin');
        } else {
          this.toast.info('Email not verified yet. Please allow a minute and try again.');
        }
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Unable to check status';
        this.toast.error(msg);
      }
    });
  }

  // Allow editing the email (switch back to signup so user can correct)
  editEmail() {
    // prefill register email if we have stored pendingVerificationEmail
    if (this.pendingVerificationEmail) {
      this.registerForm.patchValue({ email: this.pendingVerificationEmail });
    }
    this.showVerifyScreen = false;
    this.auth.switch('signup');
  }

  close() { this.auth.close(); }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }
}

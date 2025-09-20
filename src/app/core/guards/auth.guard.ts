import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Store the attempted URL for redirecting after login
  const returnUrl = state.url;

  // Show message and redirect to login
  toast.warning('Please log in to access this page');
  router.navigate(['/auth/login'], { 
    queryParams: { returnUrl } 
  });

  return false;
};
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const currentUser = authService.currentUser();

  if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin')) {
    return true;
  }

  // Show error message and redirect
  toast.error('Access denied. Admin privileges required.');
  router.navigate(['/403']);

  return false;
};
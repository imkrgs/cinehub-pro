import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const currentUser = authService.currentUser();
  const requiredRole = route.data?.['requiredRole'];

  if (!currentUser) {
    toast.warning('Please log in to access this page');
    router.navigate(['/auth/login'], { 
      queryParams: { returnUrl: state.url } 
    });
    return false;
  }

  if (!requiredRole) {
    return true; // No role requirement
  }

  const hasRole = authService.hasRole(requiredRole);

  if (hasRole) {
    return true;
  }

  // User doesn't have required role
  toast.error(`Access denied. ${requiredRole} role required.`);
  router.navigate(['/403']);

  return false;
};
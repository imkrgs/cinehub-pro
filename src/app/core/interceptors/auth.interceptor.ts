import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@core/services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Skip auth header for certain URLs
  const skipAuth = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    'api.themoviedb.org'
  ].some(url => req.url.includes(url));

  if (skipAuth || !token) {
    return next(req);
  }

  // Clone the request and add auth header
  const authReq = req.clone({
    headers: req.headers.set('Authorization', `Bearer ${token}`)
  });

  return next(authReq);
};
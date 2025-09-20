import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '@core/services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  // Skip loading for certain URLs
  const skipLoading = [
    '/notifications',
    '/health',
    '/ping'
  ].some(url => req.url.includes(url));

  if (skipLoading) {
    return next(req);
  }

  loadingService.show();

  return next(req).pipe(
    finalize(() => loadingService.hide())
  );
};
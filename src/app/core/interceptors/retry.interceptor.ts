import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { retry, timer, switchMap, throwError } from 'rxjs';

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  return next(req).pipe(
    retry({
      count: maxRetries,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        // Don't retry for certain status codes
        if (error.status === 401 || error.status === 403 || error.status === 404) {
          return throwError(() => error);
        }

        // Don't retry for non-GET requests (except for network errors)
        if (req.method !== 'GET' && error.status !== 0) {
          return throwError(() => error);
        }

        console.log(`Retrying request (${retryCount}/${maxRetries}):`, req.url);

        // Exponential backoff
        const delay = retryDelay * Math.pow(2, retryCount - 1);
        return timer(delay);
      }
    })
  );
};
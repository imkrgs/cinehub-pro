import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorHandlerService } from '@core/services/error-handler.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorHandler = inject(ErrorHandlerService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle different types of HTTP errors
      if (error.status === 401) {
        errorHandler.handleAuthError(error);
      } else if (error.status === 0 || error.status >= 500) {
        errorHandler.handleNetworkError(error);
      } else {
        errorHandler.handleHttpError(error);
      }

      return throwError(() => error);
    })
  );
};
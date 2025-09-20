import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideServiceWorker } from '@angular/service-worker';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';

import { routes } from './app.routes';
import { authInterceptor } from '@core/interceptors/auth.interceptor';
import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { loadingInterceptor } from '@core/interceptors/loading.interceptor';
import { cacheInterceptor } from '@core/interceptors/cache.interceptor';
import { retryInterceptor } from '@core/interceptors/retry.interceptor';
import { environment } from '@environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        retryInterceptor,
        cacheInterceptor,
        loadingInterceptor,
        errorInterceptor
      ])
    ),
    provideAnimations(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.features.enableServiceWorker,
      registrationStrategy: 'registerWhenStable:30000'
    }),
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
      useValue: {
        duration: 4000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
      }
    }
  ]
};
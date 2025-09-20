import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of, tap } from 'rxjs';
import { CacheService } from '@core/services/cache.service';
import { environment } from '@environments/environment';

export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  const cache = inject(CacheService);

  // Only cache GET requests
  if (req.method !== 'GET') {
    return next(req);
  }

  // Skip caching for certain URLs
  const skipCache = [
    '/auth/',
    '/users/profile',
    '/notifications'
  ].some(url => req.url.includes(url));

  if (skipCache) {
    return next(req);
  }

  // Generate cache key
  const cacheKey = `http_${req.urlWithParams}`;

  // Check if response is cached
  const cachedResponse = cache.get<HttpResponse<any>>(cacheKey);
  if (cachedResponse) {
    return of(cachedResponse);
  }

  // Make request and cache response
  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse) {
        const ttl = req.url.includes('api.themoviedb.org') 
          ? environment.cache.apiCacheTtl 
          : environment.cache.defaultTtl;

        cache.set(cacheKey, event, ttl);
      }
    })
  );
};
import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '@environments/environment';
import { ToastService } from './toast.service';

export interface ErrorReport {
  message: string;
  stack?: string;
  url?: string;
  timestamp: Date;
  userAgent?: string;
  userId?: string;
  additionalInfo?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  private errorQueue: ErrorReport[] = [];
  private isOnline = navigator.onLine;

  constructor() {
    this.setupOnlineStatusDetection();
  }

  // Handle different types of errors
  handleError(error: any, context?: string, showToast = true): void {
    const errorReport = this.createErrorReport(error, context);

    // Log error
    this.logError(errorReport);

    // Show user-friendly message
    if (showToast) {
      this.showUserFriendlyError(error, context);
    }

    // Report error if enabled
    if (environment.features.enableErrorReporting) {
      this.reportError(errorReport);
    }
  }

  // Handle HTTP errors specifically
  handleHttpError(error: HttpErrorResponse, context?: string): void {
    const errorReport = this.createHttpErrorReport(error, context);

    this.logError(errorReport);
    this.showHttpError(error);

    if (environment.features.enableErrorReporting) {
      this.reportError(errorReport);
    }

    // Handle specific HTTP status codes
    this.handleHttpStatus(error.status);
  }

  // Handle authentication errors
  handleAuthError(error: any, context?: string): void {
    this.handleError(error, context, false);

    // Show specific auth error message
    let message = "Authentication error";

    if (error.status === 401) {
      message = "Your session has expired. Please log in again.";
      this.redirectToLogin();
    } else if (error.status === 403) {
      message = "You don't have permission to access this resource.";
    } else if (error.error?.message) {
      message = error.error.message;
    }

    this.toast.error(message);
  }

  // Handle network errors
  handleNetworkError(error: any): void {
    if (!this.isOnline) {
      this.toast.warning('You appear to be offline. Some features may be limited.');
    } else if (error.status === 0 || error.message?.includes('Network')) {
      this.toast.error('Network error. Please check your connection and try again.');
    } else {
      this.handleError(error, 'Network');
    }
  }

  // Handle validation errors
  handleValidationError(errors: Record<string, string[]>): void {
    const errorMessages = Object.entries(errors)
      .flatMap(([field, messages]) => 
        messages.map(msg => `${field}: ${msg}`)
      )
      .join(', ');

    this.toast.error(`Validation error: ${errorMessages}`);
  }

  // Create error report
  private createErrorReport(error: any, context?: string): ErrorReport {
    return {
      message: this.extractErrorMessage(error),
      stack: error?.stack,
      url: window.location.href,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      additionalInfo: {
        context,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        customData: error?.customData
      }
    };
  }

  // Create HTTP error report
  private createHttpErrorReport(error: HttpErrorResponse, context?: string): ErrorReport {
    return {
      message: `HTTP ${error.status}: ${error.statusText}`,
      stack: error.error?.stack,
      url: error.url || window.location.href,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      additionalInfo: {
        context,
        status: error.status,
        statusText: error.statusText,
        responseBody: error.error,
        headers: this.headersToObject(error.headers)
      }
    };
  }

  // Extract meaningful error message
  private extractErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error?.message) {
      return error.message;
    }

    if (error?.error?.message) {
      return error.error.message;
    }

    if (error instanceof HttpErrorResponse) {
      return `HTTP ${error.status}: ${error.statusText}`;
    }

    return 'An unexpected error occurred';
  }

  // Show user-friendly error messages
  private showUserFriendlyError(error: any, context?: string): void {
    const message = this.getUserFriendlyMessage(error, context);
    this.toast.error(message);
  }

  // Show HTTP-specific error messages
  private showHttpError(error: HttpErrorResponse): void {
    let message: string;

    switch (error.status) {
      case 0:
        message = 'Network error. Please check your connection.';
        break;
      case 400:
        message = error.error?.message || 'Bad request. Please check your input.';
        break;
      case 401:
        message = 'You need to log in to access this resource.';
        break;
      case 403:
        message = "You don't have permission to access this resource.";
        break;
      case 404:
        message = 'The requested resource was not found.';
        break;
      case 409:
        message = error.error?.message || 'Conflict with existing data.';
        break;
      case 422:
        message = error.error?.message || 'Validation error. Please check your input.';
        break;
      case 429:
        message = 'Too many requests. Please wait and try again.';
        break;
      case 500:
        message = 'Internal server error. Please try again later.';
        break;
      case 502:
      case 503:
      case 504:
        message = 'Service temporarily unavailable. Please try again later.';
        break;
      default:
        message = error.error?.message || `HTTP ${error.status}: ${error.statusText}`;
    }

    this.toast.error(message);
  }

  // Get user-friendly message
  private getUserFriendlyMessage(error: any, context?: string): string {
    const baseMessage = this.extractErrorMessage(error);

    // Common error patterns
    const patterns = [
      {
        pattern: /network|fetch/i,
        message: 'Network error. Please check your connection and try again.'
      },
      {
        pattern: /timeout/i,
        message: 'Request timed out. Please try again.'
      },
      {
        pattern: /unauthorized|401/i,
        message: 'You need to log in to access this resource.'
      },
      {
        pattern: /forbidden|403/i,
        message: "You don't have permission to access this resource."
      },
      {
        pattern: /not found|404/i,
        message: 'The requested resource was not found.'
      },
      {
        pattern: /validation|invalid/i,
        message: 'Please check your input and try again.'
      }
    ];

    for (const pattern of patterns) {
      if (pattern.pattern.test(baseMessage)) {
        return pattern.message;
      }
    }

    // Context-specific messages
    if (context) {
      switch (context.toLowerCase()) {
        case 'login':
          return 'Login failed. Please check your credentials.';
        case 'registration':
          return 'Registration failed. Please try again.';
        case 'movie_search':
          return 'Movie search failed. Please try again.';
        case 'profile_update':
          return 'Failed to update profile. Please try again.';
        default:
          return `${context} error: ${baseMessage}`;
      }
    }

    return baseMessage.length > 100 
      ? 'An error occurred. Please try again.' 
      : baseMessage;
  }

  // Handle specific HTTP status codes
  private handleHttpStatus(status: number): void {
    switch (status) {
      case 401:
        // Clear auth and redirect to login
        this.redirectToLogin();
        break;
      case 403:
        // Redirect to unauthorized page
        this.router.navigate(['/403']);
        break;
      case 404:
        // Could redirect to 404 page, but usually handled by routing
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        // Could show maintenance page
        break;
    }
  }

  // Log error
  private logError(errorReport: ErrorReport): void {
    if (environment.logging.enableConsoleLog) {
      console.group('🚨 Error Report');
      console.error('Message:', errorReport.message);
      console.error('Timestamp:', errorReport.timestamp);
      console.error('URL:', errorReport.url);
      console.error('Additional Info:', errorReport.additionalInfo);
      if (errorReport.stack) {
        console.error('Stack:', errorReport.stack);
      }
      console.groupEnd();
    }
  }

  // Report error to external service
  private reportError(errorReport: ErrorReport): void {
    if (!this.isOnline) {
      this.errorQueue.push(errorReport);
      return;
    }

    // Send to error reporting service
    if (environment.logging.remoteLogUrl) {
      fetch(environment.logging.remoteLogUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport)
      }).catch(err => {
        console.error('Failed to report error:', err);
        this.errorQueue.push(errorReport);
      });
    }
  }

  // Setup online status detection
  private setupOnlineStatusDetection(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushErrorQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Flush queued errors when coming back online
  private flushErrorQueue(): void {
    if (this.errorQueue.length > 0 && environment.logging.remoteLogUrl) {
      const errors = [...this.errorQueue];
      this.errorQueue = [];

      fetch(environment.logging.remoteLogUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errors)
      }).catch(err => {
        console.error('Failed to flush error queue:', err);
        // Re-queue errors
        this.errorQueue.unshift(...errors);
      });
    }
  }

  // Utility methods
  private headersToObject(headers: any): Record<string, string> {
    const result: Record<string, string> = {};
    if (headers?.keys) {
      for (const key of headers.keys()) {
        result[key] = headers.get(key);
      }
    }
    return result;
  }

  private redirectToLogin(): void {
    // Clear any auth state first
    localStorage.removeItem('cinehub_access_token');
    localStorage.removeItem('cinehub_refresh_token');
    localStorage.removeItem('cinehub_user_data');

    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: window.location.pathname }
    });
  }

  // Public utility methods
  retry<T>(operation: () => Promise<T>, maxAttempts: number = 3, delay: number = 1000): Promise<T> {
    return new Promise((resolve, reject) => {
      const attempt = async (attemptNumber: number) => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          if (attemptNumber < maxAttempts) {
            setTimeout(() => {
              attempt(attemptNumber + 1);
            }, delay * attemptNumber);
          } else {
            reject(error);
          }
        }
      };

      attempt(1);
    });
  }

  // Create custom error with additional context
  createError(message: string, context?: any): Error {
    const error = new Error(message);
    if (context) {
      (error as any).customData = context;
    }
    return error;
  }
}
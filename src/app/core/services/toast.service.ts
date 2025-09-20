import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarRef, MatSnackBarConfig } from '@angular/material/snack-bar';
import { ComponentType } from '@angular/cdk/portal';
import { environment } from '@environments/environment';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions extends MatSnackBarConfig {
  type?: ToastType;
  icon?: string;
  persistent?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);

  private readonly defaultConfig: MatSnackBarConfig = {
    duration: environment.ui.toastDuration,
    horizontalPosition: 'end',
    verticalPosition: 'top',
  };

  // Success toast
  success(message: string, action?: string, options?: ToastOptions): MatSnackBarRef<any> {
    return this.show(message, action, {
      ...options,
      type: 'success'
    });
  }

  // Error toast
  error(message: string, action?: string, options?: ToastOptions): MatSnackBarRef<any> {
    return this.show(message, action, {
      ...options,
      type: 'error',
      duration: options?.persistent ? 0 : (options?.duration || 8000)
    });
  }

  // Warning toast
  warning(message: string, action?: string, options?: ToastOptions): MatSnackBarRef<any> {
    return this.show(message, action, {
      ...options,
      type: 'warning',
      duration: options?.duration || 6000
    });
  }

  // Info toast
  info(message: string, action?: string, options?: ToastOptions): MatSnackBarRef<any> {
    return this.show(message, action, {
      ...options,
      type: 'info'
    });
  }

  // Generic show method
  private show(
    message: string, 
    action?: string, 
    options?: ToastOptions
  ): MatSnackBarRef<any> {
    const config = this.buildConfig(options);

    // Add icon to message if specified
    const displayMessage = options?.icon 
      ? `${options.icon} ${message}` 
      : message;

    return this.snackBar.open(displayMessage, action, config);
  }

  // Show custom component
  showComponent<T>(
    component: ComponentType<T>, 
    options?: ToastOptions
  ): MatSnackBarRef<T> {
    const config = this.buildConfig(options);
    return this.snackBar.openFromComponent(component, config);
  }

  // Show with template
  showTemplate(
    template: any, 
    options?: ToastOptions
  ): MatSnackBarRef<any> {
    const config = this.buildConfig(options);
    return this.snackBar.openFromTemplate(template, config);
  }

  // Dismiss all toasts
  dismiss(): void {
    this.snackBar.dismiss();
  }

  // Quick success methods for common actions
  showSaved(item = 'Item'): void {
    this.success(`${item} saved successfully`, undefined, { icon: '✅' });
  }

  showDeleted(item = 'Item'): void {
    this.success(`${item} deleted successfully`, undefined, { icon: '🗑️' });
  }

  showUpdated(item = 'Item'): void {
    this.success(`${item} updated successfully`, undefined, { icon: '✏️' });
  }

  showCreated(item = 'Item'): void {
    this.success(`${item} created successfully`, undefined, { icon: '➕' });
  }

  // Quick error methods
  showNetworkError(): void {
    this.error('Network error. Please check your connection.', 'Retry', { 
      icon: '🌐',
      persistent: true 
    });
  }

  showUnauthorized(): void {
    this.error('You are not authorized to perform this action.', undefined, { 
      icon: '🔒' 
    });
  }

  showNotFound(item = 'Item'): void {
    this.error(`${item} not found.`, undefined, { icon: '🔍' });
  }

  showValidationError(message?: string): void {
    this.error(message || 'Please check your input and try again.', undefined, { 
      icon: '⚠️' 
    });
  }

  // Loading toast with progress
  showLoading(message = 'Loading...', persistent = true): MatSnackBarRef<any> {
    return this.info(message, undefined, { 
      icon: '⏳',
      persistent 
    });
  }

  // Confirmation toast with action
  showConfirmation(
    message: string, 
    confirmAction: string = 'Confirm',
    callback?: () => void
  ): MatSnackBarRef<any> {
    const snackBarRef = this.warning(message, confirmAction, { 
      persistent: true,
      icon: '❓'
    });

    if (callback) {
      snackBarRef.onAction().subscribe(callback);
    }

    return snackBarRef;
  }

  // Undo toast
  showUndo(
    message: string,
    undoCallback: () => void,
    duration = 5000
  ): MatSnackBarRef<any> {
    const snackBarRef = this.info(message, 'Undo', { 
      duration,
      icon: '↶'
    });

    snackBarRef.onAction().subscribe(undoCallback);
    return snackBarRef;
  }

  // Progress toast
  showProgress(message: string, progress: number): MatSnackBarRef<any> {
    const progressBar = '█'.repeat(Math.floor(progress / 10)) + 
                       '░'.repeat(10 - Math.floor(progress / 10));

    return this.info(`${message} ${progressBar} ${progress}%`, undefined, { 
      persistent: true 
    });
  }

  // Multi-line toast
  showMultiLine(messages: string[], type: ToastType = 'info'): MatSnackBarRef<any> {
    const multiLineMessage = messages.join('\n');
    return this.show(multiLineMessage, undefined, { type });
  }

  // Toast with custom action handler
  showWithAction(
    message: string,
    actionText: string,
    actionHandler: () => void,
    type: ToastType = 'info'
  ): MatSnackBarRef<any> {
    const snackBarRef = this.show(message, actionText, { type });
    snackBarRef.onAction().subscribe(actionHandler);
    return snackBarRef;
  }

  // Build configuration
  private buildConfig(options?: ToastOptions): MatSnackBarConfig {
    const config: MatSnackBarConfig = {
      ...this.defaultConfig,
      ...options
    };

    // Add CSS classes based on type
    if (options?.type) {
      const typeClass = `toast-${options.type}`;
      config.panelClass = config.panelClass 
        ? Array.isArray(config.panelClass) 
          ? [...config.panelClass, 'custom-snackbar', typeClass]
          : [config.panelClass, 'custom-snackbar', typeClass]
        : ['custom-snackbar', typeClass];
    }

    return config;
  }

  // Utility methods for development
  showDev(message: string, data?: any): void {
    if (!environment.production) {
      if (data) {
        console.log('Toast Dev Data:', data);
      }
      this.info(`[DEV] ${message}`, undefined, { icon: '🔧' });
    }
  }

  // Batch operations
  showBatch(messages: { message: string; type: ToastType }[], delay = 500): void {
    messages.forEach((toast, index) => {
      setTimeout(() => {
        this.show(toast.message, undefined, { type: toast.type });
      }, index * delay);
    });
  }

  // Feature-specific toasts
  movieAdded(): void {
    this.success('Movie added to your list', undefined, { icon: '🎬' });
  }

  movieRemoved(): void {
    this.success('Movie removed from your list', undefined, { icon: '➖' });
  }

  ratingSubmitted(): void {
    this.success('Rating submitted', undefined, { icon: '⭐' });
  }

  reviewPosted(): void {
    this.success('Review posted successfully', undefined, { icon: '📝' });
  }

  watchlistUpdated(): void {
    this.success('Watchlist updated', undefined, { icon: '📋' });
  }

  profileUpdated(): void {
    this.success('Profile updated successfully', undefined, { icon: '👤' });
  }

  passwordChanged(): void {
    this.success('Password changed successfully', undefined, { icon: '🔐' });
  }

  emailVerified(): void {
    this.success('Email verified successfully', undefined, { icon: '✉️' });
  }

  loginSuccess(name?: string): void {
    const message = name ? `Welcome back, ${name}!` : 'Login successful';
    this.success(message, undefined, { icon: '👋' });
  }

  logoutSuccess(): void {
    this.info('You have been logged out', undefined, { icon: '👋' });
  }

  // Error-specific toasts
  loginFailed(): void {
    this.error('Login failed. Please check your credentials.', undefined, { 
      icon: '🔑' 
    });
  }

  sessionExpired(): void {
    this.warning('Your session has expired. Please log in again.', undefined, { 
      icon: '⏰' 
    });
  }

  permissionDenied(): void {
    this.error('Permission denied. You cannot perform this action.', undefined, { 
      icon: '🚫' 
    });
  }

  maintenanceMode(): void {
    this.warning('System is under maintenance. Some features may be limited.', undefined, { 
      icon: '🔧',
      persistent: true 
    });
  }
}
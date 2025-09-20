import { Injectable, signal } from '@angular/core';
import { Observable, finalize } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private readonly _isLoading = signal(false);
  private readonly _loadingCount = signal(0);
  private readonly _loadingMessage = signal<string>('Loading...');

  // Public readonly signals
  readonly isLoading = this._isLoading.asReadonly();
  readonly loadingCount = this._loadingCount.asReadonly();
  readonly loadingMessage = this._loadingMessage.asReadonly();

  // Show loading indicator
  show(message: string = 'Loading...'): void {
    this._loadingMessage.set(message);
    const newCount = this._loadingCount() + 1;
    this._loadingCount.set(newCount);
    this._isLoading.set(true);
  }

  // Hide loading indicator
  hide(): void {
    const newCount = Math.max(0, this._loadingCount() - 1);
    this._loadingCount.set(newCount);
    this._isLoading.set(newCount > 0);

    if (newCount === 0) {
      this._loadingMessage.set('Loading...');
    }
  }

  // Force hide all loading indicators
  forceHide(): void {
    this._loadingCount.set(0);
    this._isLoading.set(false);
    this._loadingMessage.set('Loading...');
  }

  // Wrap an observable with loading indicator
  wrap<T>(observable: Observable<T>, message?: string): Observable<T> {
    if (message) {
      this.show(message);
    } else {
      this.show();
    }

    return observable.pipe(
      finalize(() => this.hide())
    );
  }

  // Execute async function with loading indicator
  async execute<T>(
    asyncFn: () => Promise<T>, 
    message: string = 'Processing...'
  ): Promise<T> {
    this.show(message);
    try {
      return await asyncFn();
    } finally {
      this.hide();
    }
  }

  // Set loading message without changing state
  setMessage(message: string): void {
    this._loadingMessage.set(message);
  }
}
import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { BehaviorSubject, fromEvent, merge, of, Observable } from 'rxjs';
import { map, filter, switchMap } from 'rxjs/operators';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private readonly swUpdate = inject(SwUpdate);

  private installPromptEvent: any = null;
  private readonly _updateAvailable = new BehaviorSubject<boolean>(false);
  private readonly _installPrompt = new BehaviorSubject<boolean>(false);

  readonly updateAvailable$ = this._updateAvailable.asObservable();
  readonly installPrompt$ = this._installPrompt.asObservable();
  readonly isOnline$ = merge(
    of(navigator.onLine),
    fromEvent(window, 'online').pipe(map(() => true)),
    fromEvent(window, 'offline').pipe(map(() => false))
  );

  constructor() {
    if (environment.features.enableServiceWorker) {
      this.initializeServiceWorker();
      this.setupInstallPrompt();
    }
  }

  private initializeServiceWorker(): void {
    if (this.swUpdate.isEnabled) {
      // Check for updates
      this.swUpdate.versionUpdates.pipe(
        filter((evt: VersionEvent) => evt.type === 'VERSION_DETECTED')
      ).subscribe(() => {
        console.log('New version available');
        this._updateAvailable.next(true);
      });

      // Check for updates every 6 hours
      setInterval(() => {
        this.checkForUpdates();
      }, 6 * 60 * 60 * 1000);

      // Initial update check
      this.checkForUpdates();
    }
  }

  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      event.preventDefault();

      // Stash the event so it can be triggered later
      this.installPromptEvent = event;
      this._installPrompt.next(true);

      console.log('Install prompt available');
    });

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.installPromptEvent = null;
      this._installPrompt.next(false);
    });
  }

  checkForUpdates(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.checkForUpdate().then(() => {
        console.log('Checking for updates...');
      });
    }
  }

  updateApp(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.activateUpdate().then(() => {
        console.log('App updated, reloading...');
        window.location.reload();
      });
    }
  }

  installApp(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.installPromptEvent) {
        this.installPromptEvent.prompt();

        this.installPromptEvent.userChoice.then((choiceResult: any) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
            this._installPrompt.next(false);
            resolve();
          } else {
            console.log('User dismissed the install prompt');
            reject(new Error('User dismissed install prompt'));
          }

          this.installPromptEvent = null;
        });
      } else {
        reject(new Error('Install prompt not available'));
      }
    });
  }

  canInstall(): boolean {
    return this.installPromptEvent !== null;
  }

  isInstalled(): boolean {
    return window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  }

  getInstallationStatus(): {
    isInstalled: boolean;
    canInstall: boolean;
    isStandalone: boolean;
    isIOS: boolean;
  } {
    const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    return {
      isInstalled: this.isInstalled(),
      canInstall: this.canInstall(),
      isStandalone,
      isIOS
    };
  }

  // Push notifications
  requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return Promise.reject('This browser does not support notifications');
    }

    return Notification.requestPermission();
  }

  showNotification(title: string, options?: NotificationOptions): void {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/assets/icons/android-icon-192x192.png',
        badge: '/assets/icons/android-icon-96x96.png',
        ...options
      });
    }
  }

  // Share API
  canShare(): boolean {
    return 'share' in navigator;
  }

  async share(shareData: ShareData): Promise<void> {
    if (this.canShare()) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Error sharing:', error);
        throw error;
      }
    } else {
      throw new Error('Share API not supported');
    }
  }

  shareMovie(movie: { title: string; overview: string; id: number }): void {
    const shareData: ShareData = {
      title: movie.title,
      text: movie.overview,
      url: `${window.location.origin}/movie/${movie.id}`
    };

    if (this.canShare()) {
      this.share(shareData).catch(() => {
        // Fallback to copying URL to clipboard
        this.copyToClipboard(shareData.url!);
      });
    } else {
      // Fallback to copying URL to clipboard
      this.copyToClipboard(shareData.url!);
    }
  }

  private copyToClipboard(text: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        console.log('URL copied to clipboard');
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  // Background sync (when implemented)
  registerBackgroundSync(tag: string): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
          .then((registration) => {
            const anyReg = registration as any;
            if (anyReg?.sync?.register) {
              return anyReg.sync.register(tag);
            }
            return undefined;
          })
          .catch((error) => {
            console.error('Background sync registration failed:', error);
          });
    }
  }


  // Get SW registration
  getRegistration(): Promise<ServiceWorkerRegistration | undefined> {
    if ('serviceWorker' in navigator) {
      return navigator.serviceWorker.getRegistration();
    }
    return Promise.resolve(undefined);
  }

  // Clear app cache
  clearCache(): Promise<void> {
    if ('caches' in window) {
      return caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('All caches cleared');
      });
    }
    return Promise.resolve();
  }

  // Get cache info
  getCacheInfo(): Promise<{ name: string; size: number }[]> {
    if ('caches' in window) {
      return caches.keys().then(async (cacheNames) => {
        const cacheInfo = [];

        for (const name of cacheNames) {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          cacheInfo.push({
            name,
            size: keys.length
          });
        }

        return cacheInfo;
      });
    }
    return Promise.resolve([]);
  }
}
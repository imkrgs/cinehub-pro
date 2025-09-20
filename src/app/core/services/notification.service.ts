import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {Observable, BehaviorSubject, timer, of, tap} from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { environment } from '@environments/environment';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: Date;
  action_url?: string;
  action_text?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly http = inject(HttpClient);

  private readonly _notifications = signal<Notification[]>([]);
  private readonly _unreadCount = signal(0);
  private readonly _isLoading = signal(false);

  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  private readonly baseUrl = environment.api.baseUrl;
  private pollingSubscription?: any;

  constructor() {
    this.startPolling();
  }

  // Get notifications from server
  getNotifications(): Observable<Notification[]> {
    this._isLoading.set(true);

    return this.http.get<Notification[]>(`${this.baseUrl}/notifications`)
        .pipe(
            catchError(() => {
              // Return mock notifications for development
              return of(this.getMockNotifications());
            }),
            tap(notifications => {
              this._notifications.set(notifications);
              this._unreadCount.set(notifications.filter(n => !n.read).length);
              this._isLoading.set(false);
            })
        );
  }

  // Mark notification as read
  markAsRead(notificationId: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/notifications/${notificationId}/read`, {})
      .pipe(
        catchError(error => {
          console.error('Failed to mark notification as read:', error);
          return of(void 0);
        })
      );
  }

  // Mark all notifications as read
  markAllAsRead(): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/notifications/read-all`, {})
      .pipe(
        catchError(error => {
          console.error('Failed to mark all notifications as read:', error);
          return of(void 0);
        })
      );
  }

  // Delete notification
  deleteNotification(notificationId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/notifications/${notificationId}`)
      .pipe(
        catchError(error => {
          console.error('Failed to delete notification:', error);
          return of(void 0);
        })
      );
  }

  // Clear all notifications
  clearAll(): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/notifications`)
      .pipe(
        catchError(error => {
          console.error('Failed to clear notifications:', error);
          return of(void 0);
        })
      );
  }

  // Add local notification (for immediate feedback)
  addLocal(notification: Omit<Notification, 'id' | 'created_at'>): void {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      created_at: new Date()
    };

    const current = this._notifications();
    this._notifications.set([newNotification, ...current]);

    if (!newNotification.read) {
      this._unreadCount.set(this._unreadCount() + 1);
    }

    // Auto-remove after delay for non-persistent notifications
    if (notification.type !== 'error') {
      setTimeout(() => {
        this.removeLocal(newNotification.id);
      }, 5000);
    }
  }

  // Remove local notification
  removeLocal(notificationId: string): void {
    const current = this._notifications();
    const notification = current.find(n => n.id === notificationId);

    if (notification && !notification.read) {
      this._unreadCount.set(Math.max(0, this._unreadCount() - 1));
    }

    this._notifications.set(current.filter(n => n.id !== notificationId));
  }

  // Start polling for new notifications
  private startPolling(): void {
    if (environment.features.enablePushNotifications) {
      // Poll every 30 seconds
      this.pollingSubscription = timer(0, 30000)
        .pipe(
          switchMap(() => this.getNotifications())
        )
        .subscribe();
    }
  }

  // Stop polling
  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  // Request push notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported');
    }

    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      console.log('Notification permission granted');
    } else {
      console.warn('Notification permission denied');
    }

    return permission;
  }

  // Show browser notification
  showBrowserNotification(notification: Notification): void {
    if (Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/assets/icons/android-icon-192x192.png',
        badge: '/assets/icons/android-icon-96x96.png',
        tag: notification.id,
        data: notification.data,
        requireInteraction: notification.priority === 'urgent'
      });

      browserNotification.onclick = () => {
        window.focus();
        if (notification.action_url) {
          window.location.href = notification.action_url;
        }
        browserNotification.close();
      };

      // Auto-close after 5 seconds for non-urgent notifications
      if (notification.priority !== 'urgent') {
        setTimeout(() => {
          browserNotification.close();
        }, 5000);
      }
    }
  }

  // Subscribe to push notifications
  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(environment.pwa.vapidPublicKey || '')
      });

      // Send subscription to server
      await this.http.post(`${this.baseUrl}/notifications/subscribe`, {
        subscription: subscription.toJSON()
      }).toPromise();

      console.log('Push notification subscription successful');
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribeFromPush(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Notify server
        await this.http.post(`${this.baseUrl}/notifications/unsubscribe`, {
          subscription: subscription.toJSON()
        }).toPromise();

        console.log('Push notification unsubscribed');
      }
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
    }
  }

  // Utility methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Mock data for development
  private getMockNotifications(): Notification[] {
    return [
      {
        id: '1',
        title: 'Welcome to CineHub Pro!',
        message: 'Discover amazing movies and create your personal watchlist.',
        type: 'info',
        read: false,
        created_at: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        priority: 'normal'
      },
      {
        id: '2',
        title: 'New Movies Added',
        message: '25 new movies have been added to our database this week.',
        type: 'success',
        read: true,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        priority: 'low'
      }
    ];
  }

  // Quick notification methods
  notifyMovieAdded(movieTitle: string): void {
    this.addLocal({
      title: 'Movie Added',
      message: `"${movieTitle}" has been added to your watchlist.`,
      type: 'success',
      read: false,
      priority: 'normal'
    });
  }

  notifyRatingSubmitted(movieTitle: string, rating: number): void {
    this.addLocal({
      title: 'Rating Submitted',
      message: `You rated "${movieTitle}" ${rating}/10.`,
      type: 'success',
      read: false,
      priority: 'normal'
    });
  }

  notifyNewRecommendations(count: number): void {
    this.addLocal({
      title: 'New Recommendations',
      message: `We have ${count} new movie recommendations for you!`,
      type: 'info',
      read: false,
      priority: 'normal',
      action_url: '/recommendations',
      action_text: 'View Recommendations'
    });
  }

  notifySystemUpdate(): void {
    this.addLocal({
      title: 'System Update',
      message: 'CineHub Pro has been updated with new features!',
      type: 'info',
      read: false,
      priority: 'high'
    });
  }

  // Error notifications
  notifyError(message: string): void {
    this.addLocal({
      title: 'Error',
      message,
      type: 'error',
      read: false,
      priority: 'high'
    });
  }

  // Cleanup on destroy
  ngOnDestroy(): void {
    this.stopPolling();
  }
}
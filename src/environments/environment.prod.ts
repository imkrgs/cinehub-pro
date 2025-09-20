export const environment = {
  production: true,
  name: 'production',
  version: '2.0.0',

  tmdb: {
    apiKey: '771da65ab04f1369dddd0cb01ad76800',
    baseUrl: 'https://api.themoviedb.org/3',
    imageUrl: 'https://image.tmdb.org/t/p/w500',
    imageUrlOriginal: 'https://image.tmdb.org/t/p/original',
    imageUrlSmall: 'https://image.tmdb.org/t/p/w200',
    imageUrlLarge: 'https://image.tmdb.org/t/p/w780',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 2000
  },

  api: {
    baseUrl: 'https://api.cinehub-pro.com/v1',
    timeout: 8000,
    retries: 2,
    retryDelay: 2000
  },

  features: {
    enableOfflineMode: true,
    enablePushNotifications: true,
    enableAnalytics: true,
    enableServiceWorker: true,
    enableErrorReporting: true,
    enableSocialSharing: true,
    enableAdvancedSearch: true,
    enableUserReviews: true,
    enableMovieLists: true,
    enableAdminDashboard: true,
    enableDarkMode: true,
    enableAnimations: true,
    enableAdultContent: false
  },

  cache: {
    defaultTtl: 1000 * 60 * 60 * 6,
    apiCacheTtl: 1000 * 60 * 60,
    imageCacheTtl: 1000 * 60 * 60 * 24 * 7,
    maxItems: 500
  },

  auth: {
    tokenKey: 'cinehub_access_token',
    refreshTokenKey: 'cinehub_refresh_token',
    userDataKey: 'cinehub_user_data',
    tokenExpiration: 1000 * 60 * 60 * 12,
    refreshTokenExpiration: 1000 * 60 * 60 * 24 * 30,
    autoRefreshThreshold: 1000 * 60 * 10
  },

  ui: {
    defaultPageSize: 24,
    maxPageSize: 100,
    animationDuration: 250,
    debounceTime: 300,
    toastDuration: 3000,
    loadingDelay: 100
  },

  logging: {
    level: 'error',
    enableConsoleLog: false,
    enableRemoteLogging: true,
    remoteLogUrl: 'https://logs.cinehub-pro.com/api/logs'
  },

  pwa: {
    vapidPublicKey: 'YOUR_VAPID_PUBLIC_KEY_HERE'
  }
};
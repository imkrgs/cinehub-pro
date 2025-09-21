export const environment = {
  production: false,
  name: 'development',
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
    retryDelay: 1000
  },

  api: {
    baseUrl: 'http://localhost:3000/api',
    timeout: 5000,
    retries: 3,
    retryDelay: 1000
  },

  features: {
    enableOfflineMode: true,
    enablePushNotifications: false,
    enableAnalytics: false,
    enableServiceWorker: false,
    enableErrorReporting: false,
    enableSocialSharing: true,
    enableAdvancedSearch: true,
    enableUserReviews: true,
    enableMovieLists: true,
    enableAdminDashboard: true,
    enableDarkMode: true,
    enableAnimations: true,
    enableAdultContent: true
  },

  cache: {
    defaultTtl: 1000 * 60 * 60,
    apiCacheTtl: 1000 * 60 * 30,
    imageCacheTtl: 1000 * 60 * 60 * 24,
    maxItems: 100
  },

  auth: {
    tokenKey: 'cinehub_access_token',
    refreshTokenKey: 'cinehub_refresh_token',
    userDataKey: 'cinehub_user_data',
    tokenExpiration: 1000 * 60 * 60 * 24,
    refreshTokenExpiration: 1000 * 60 * 60 * 24 * 7,
    autoRefreshThreshold: 1000 * 60 * 5
  },

  ui: {
    defaultPageSize: 20,
    maxPageSize: 100,
    animationDuration: 300,
    debounceTime: 500,
    toastDuration: 4000,
    loadingDelay: 200
  },

  logging: {
    level: 'debug',
    enableConsoleLog: true,
    enableRemoteLogging: false,
    remoteLogUrl: ''
  },

  pwa: {
    vapidPublicKey: ''
  }
};
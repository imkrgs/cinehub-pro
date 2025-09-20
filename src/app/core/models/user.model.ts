export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  preferences: UserPreferences;
  stats: UserStats;
  created_at: Date;
  updated_at: Date;
  last_login: Date;
  email_verified: boolean;
  language: string;
  timezone: string;
  newsletter_subscribed: boolean;
}

export type UserRole = 'user' | 'moderator' | 'admin' | 'super_admin';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'banned';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  region: string;
  adult_content: boolean;
  notifications: NotificationSettings;
  discovery: DiscoverySettings;
  privacy: PrivacySettings;
  accessibility: AccessibilitySettings;
}

export interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  in_app_notifications: boolean;
  marketing_emails: boolean;
  movie_recommendations: boolean;
  new_releases: boolean;
  price_alerts: boolean;
  social_activities: boolean;
  system_updates: boolean;
}

export interface DiscoverySettings {
  preferred_genres: number[];
  blocked_genres: number[];
  min_rating: number;
  include_adult: boolean;
  preferred_languages: string[];
  preferred_regions: string[];
}

export interface PrivacySettings {
  profile_visibility: 'public' | 'friends' | 'private';
  show_activity: boolean;
  show_ratings: boolean;
  show_reviews: boolean;
  show_lists: boolean;
  allow_friend_requests: boolean;
  allow_messages: boolean;
  data_sharing: boolean;
  analytics_tracking: boolean;
}

export interface AccessibilitySettings {
  high_contrast: boolean;
  large_text: boolean;
  reduced_motion: boolean;
  screen_reader: boolean;
  keyboard_navigation: boolean;
  color_blind_support: boolean;
}

export interface UserStats {
  movies_watched: number;
  movies_rated: number;
  reviews_written: number;
  lists_created: number;
  followers_count: number;
  following_count: number;
  average_rating: number;
  total_watch_time: number;
  favorite_genres: GenreStats[];
  monthly_activity: MonthlyStats[];
  yearly_activity: YearlyStats[];
}

export interface GenreStats {
  genre_id: number;
  genre_name: string;
  count: number;
  percentage: number;
  average_rating: number;
}

export interface MonthlyStats {
  month: string;
  year: number;
  movies_watched: number;
  movies_rated: number;
  reviews_written: number;
  total_time: number;
}

export interface YearlyStats {
  year: number;
  movies_watched: number;
  movies_rated: number;
  reviews_written: number;
  total_time: number;
  top_genres: GenreStats[];
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterRequest {
  name: string;
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  accept_terms: boolean;
  newsletter_opt_in?: boolean;
}
import { Injectable, signal, computed, effect } from '@angular/core';
import { StorageService } from './storage.service';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly storage = new StorageService();

  private readonly _currentTheme = signal<Theme>('auto');
  private readonly _systemTheme = signal<'light' | 'dark'>('light');

  // Public readonly signals
  readonly currentTheme = this._currentTheme.asReadonly();
  readonly systemTheme = this._systemTheme.asReadonly();

  // Computed theme based on current selection and system preference
  readonly effectiveTheme = computed(() => {
    const current = this._currentTheme();
    return current === 'auto' ? this._systemTheme() : current;
  });

  readonly isDarkMode = computed(() => this.effectiveTheme() === 'dark');
  readonly isLightMode = computed(() => this.effectiveTheme() === 'light');

  constructor() {
    this.initializeTheme();
    this.setupSystemThemeDetection();
    this.setupThemeEffect();
  }

  private initializeTheme(): void {
    // Get stored theme preference
    const storedTheme = this.storage.getItem('cinehub_theme') as Theme;

    if (storedTheme && ['light', 'dark', 'auto'].includes(storedTheme)) {
      this._currentTheme.set(storedTheme);
    }

    // Detect system theme
    this.detectSystemTheme();
  }

  private setupSystemThemeDetection(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      // Initial detection
      this._systemTheme.set(mediaQuery.matches ? 'dark' : 'light');

      // Listen for changes
      const handler = (e: MediaQueryListEvent) => {
        this._systemTheme.set(e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handler);

      // Cleanup is handled automatically by Angular's effect system
    }
  }

  private detectSystemTheme(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this._systemTheme.set(isDark ? 'dark' : 'light');
    }
  }

  private setupThemeEffect(): void {
    // Apply theme changes to DOM
    effect(() => {
      const theme = this.effectiveTheme();
      this.applyThemeToDOM(theme);
    });

    // Persist theme changes
    effect(() => {
      const theme = this._currentTheme();
      this.storage.setItem('cinehub_theme', theme);
    });
  }

  private applyThemeToDOM(theme: 'light' | 'dark'): void {
    if (typeof document !== 'undefined') {
      const htmlElement = document.documentElement;
      const bodyElement = document.body;

      // Remove existing theme classes
      htmlElement.classList.remove('light', 'dark');
      bodyElement.classList.remove('light', 'dark');

      // Add current theme class
      htmlElement.classList.add(theme);
      bodyElement.classList.add(theme);

      // Set color-scheme for native elements
      htmlElement.style.colorScheme = theme;

      // Set meta theme-color
      this.updateMetaThemeColor(theme);

      // Dispatch theme change event
      window.dispatchEvent(new CustomEvent('theme-changed', {
        detail: { theme, previousTheme: theme === 'dark' ? 'light' : 'dark' }
      }));
    }
  }

  private updateMetaThemeColor(theme: 'light' | 'dark'): void {
    if (typeof document !== 'undefined') {
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');

      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
      }

      // Set appropriate theme color
      const color = theme === 'dark' ? '#0f172a' : '#ffffff';
      metaThemeColor.setAttribute('content', color);
    }
  }

  // Public methods
  setTheme(theme: Theme): void {
    if (['light', 'dark', 'auto'].includes(theme)) {
      this._currentTheme.set(theme);
    }
  }

  toggleTheme(): void {
    const current = this._currentTheme();

    switch (current) {
      case 'light':
        this.setTheme('dark');
        break;
      case 'dark':
        this.setTheme('auto');
        break;
      case 'auto':
        this.setTheme('light');
        break;
    }
  }

  toggleDarkMode(): void {
    const current = this._currentTheme();

    if (current === 'auto') {
      // If auto, switch to opposite of system theme
      const systemTheme = this._systemTheme();
      this.setTheme(systemTheme === 'dark' ? 'light' : 'dark');
    } else {
      // If manual, toggle between light and dark
      this.setTheme(current === 'light' ? 'dark' : 'light');
    }
  }

  // Utility methods
  getThemeIcon(theme?: Theme): string {
    const targetTheme = theme || this._currentTheme();

    switch (targetTheme) {
      case 'light':
        return '☀️';
      case 'dark':
        return '🌙';
      case 'auto':
        return '🌓';
      default:
        return '🌓';
    }
  }

  getThemeLabel(theme?: Theme): string {
    const targetTheme = theme || this._currentTheme();

    switch (targetTheme) {
      case 'light':
        return 'Light Mode';
      case 'dark':
        return 'Dark Mode';
      case 'auto':
        return 'System Default';
      default:
        return 'System Default';
    }
  }

  // Get CSS custom properties for current theme
  getCSSVariables(): Record<string, string> {
    const theme = this.effectiveTheme();

    return {
      '--theme-name': theme,
      '--is-dark': theme === 'dark' ? '1' : '0',
      '--is-light': theme === 'light' ? '1' : '0'
    };
  }

  // Method to reset theme to system default
  resetToSystem(): void {
    this.setTheme('auto');
  }

  // Method to get all available themes
  getAvailableThemes(): { value: Theme; label: string; icon: string }[] {
    return [
      { value: 'light', label: 'Light Mode', icon: '☀️' },
      { value: 'dark', label: 'Dark Mode', icon: '🌙' },
      { value: 'auto', label: 'System Default', icon: '🌓' }
    ];
  }

  // Method to check if system supports dark mode detection
  supportsSystemThemeDetection(): boolean {
    return typeof window !== 'undefined' && 
           window.matchMedia && 
           typeof window.matchMedia('(prefers-color-scheme: dark)').matches === 'boolean';
  }

  // Method for preloading theme
  preloadTheme(): void {
    // This can be called early in app initialization
    this.detectSystemTheme();
    const theme = this.effectiveTheme();
    this.applyThemeToDOM(theme);
  }
}
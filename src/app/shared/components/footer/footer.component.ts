import {Component, inject, signal, OnDestroy, ChangeDetectionStrategy, effect} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '@core/services/theme.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="footer" [class.dark]="isDarkTheme()">
      <div class="container">
        <div class="footer-content">
          <!-- Brand section -->
          <div class="brand-section">
            <div class="brand">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 10V30H35V10H5Z" fill="url(#paint0_linear)"/>
                <path d="M15 20L20 15L25 20L20 25L15 20Z" fill="white"/>
                <defs>
                  <linearGradient id="paint0_linear" x1="5" y1="10" x2="35" y2="30" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#6366F1"/>
                    <stop offset="1" stop-color="#8B5CF6"/>
                  </linearGradient>
                </defs>
              </svg>
              <div class="brand-text">
                <span class="brand-name">CineHub</span>
                <span class="brand-tagline">Your Ultimate Movie Experience</span>
              </div>
            </div>
            <p class="brand-description">
              Discover, rate, and organize your favorite movies. Join our community of film enthusiasts.
            </p>
            <div class="social-links">
              <a href="https://twitter.com" class="social-link" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <mat-icon svgIcon="twitter" class="social-icon">twitter</mat-icon>
              </a>
              <a href="https://facebook.com" class="social-link" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <mat-icon svgIcon="facebook" class="social-icon">facebook</mat-icon>
              </a>
              <a href="https://instagram.com" class="social-link" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <mat-icon svgIcon="instagram" class="social-icon">instagram</mat-icon>
              </a>
              <a href="https://youtube.com" class="social-link" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <mat-icon svgIcon="youtube" class="social-icon">play_circle</mat-icon>
              </a>
            </div>
          </div>

          <!-- Quick Links -->
          <div class="footer-section">
            <h3 class="section-title">Explore</h3>
            <ul class="footer-links">
              <li><a routerLink="/movies" class="footer-link">Browse Movies</a></li>
              <li><a routerLink="/trending" class="footer-link">Trending</a></li>
              <li><a routerLink="/upcoming" class="footer-link">Upcoming</a></li>
              <li><a routerLink="/genres" class="footer-link">Genres</a></li>
              <li><a routerLink="/search" class="footer-link">Advanced Search</a></li>
            </ul>
          </div>

          <!-- Community -->
          <div class="footer-section">
            <h3 class="section-title">Community</h3>
            <ul class="footer-links">
              <li><a routerLink="/discussions" class="footer-link">Discussions</a></li>
              <li><a routerLink="/reviews" class="footer-link">Reviews</a></li>
              <li><a routerLink="/leaderboards" class="footer-link">Leaderboards</a></li>
              <li><a routerLink="/events" class="footer-link">Events</a></li>
              <li><a routerLink="/groups" class="footer-link">Groups</a></li>
            </ul>
          </div>

          <!-- Support -->
          <div class="footer-section">
            <h3 class="section-title">Support</h3>
            <ul class="footer-links">
              <li><a routerLink="/help" class="footer-link">Help Center</a></li>
              <li><a routerLink="/contact" class="footer-link">Contact Us</a></li>
              <li><a routerLink="/faq" class="footer-link">FAQ</a></li>
              <li><a routerLink="/feedback" class="footer-link">Feedback</a></li>
              <li><a routerLink="/status" class="footer-link">System Status</a></li>
            </ul>
          </div>

          <!-- Newsletter -->
          <div class="footer-section">
            <h3 class="section-title">Stay Updated</h3>
            <p class="newsletter-description">Get the latest movie news and updates delivered to your inbox.</p>
            <form class="newsletter-form" (ngSubmit)="onNewsletterSubmit()" #newsletterForm="ngForm">
              <mat-form-field appearance="outline" class="newsletter-input">
                <input 
                  matInput 
                  type="email" 
                  placeholder="Your email address" 
                  name="email" 
                  [(ngModel)]="newsletterEmail"
                  required
                  email
                  #email="ngModel">
                <mat-icon matSuffix>email</mat-icon>
                <mat-error *ngIf="email.invalid && email.touched">
                  Please enter a valid email address
                </mat-error>
              </mat-form-field>
              <button 
                mat-raised-button 
                color="accent" 
                type="submit" 
                class="newsletter-button"
                [disabled]="newsletterForm.invalid || newsletterSubmitting()">
                {{ newsletterSubmitting() ? 'Submitting...' : 'Subscribe' }}
              </button>
            </form>
            <div class="newsletter-message" *ngIf="newsletterMessage()">
              {{ newsletterMessage() }}
            </div>
          </div>
        </div>

        <div class="footer-divider"></div>

        <div class="footer-bottom">
          <div class="footer-bottom-content">
            <div class="copyright">
              <p>© {{ currentYear }} CineHub. All rights reserved.</p>
              <div class="legal-links">
                <a routerLink="/privacy" class="legal-link">Privacy Policy</a>
                <span class="separator">•</span>
                <a routerLink="/terms" class="legal-link">Terms of Service</a>
                <span class="separator">•</span>
                <a routerLink="/cookies" class="legal-link">Cookie Policy</a>
              </div>
            </div>
            
            <div class="attribution">
              <p>Movie data provided by <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" class="attribution-link">TMDb</a></p>
            </div>

            <button 
              class="back-to-top" 
              (click)="scrollToTop()"
              aria-label="Back to top"
              mat-mini-fab
              color="primary">
              <mat-icon>arrow_upward</mat-icon>
            </button>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      backdrop-filter: blur(12px);
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      padding: 48px 0 24px;
      margin-top: auto;
    }

    .footer.dark {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.9);
    }

    .container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 16px;
    }

    .footer-content {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 32px;
      margin-bottom: 32px;
    }

    .brand-section {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    @media (min-width: 768px) {
      .brand-section {
        grid-column: span 2;
      }
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-name {
      font-size: 1.5rem;
      font-weight: 700;
      background: linear-gradient(90deg, #6366F1 0%, #8B5CF6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .dark .brand-name {
      background: linear-gradient(90deg, #818CF8 0%, #A78BFA 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .brand-tagline {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.6);
    }

    .dark .brand-tagline {
      color: rgba(255, 255, 255, 0.6);
    }

    .brand-description {
      max-width: 400px;
      color: rgba(0, 0, 0, 0.7);
      line-height: 1.6;
    }

    .dark .brand-description {
      color: rgba(255, 255, 255, 0.7);
    }

    .social-links {
      display: flex;
      gap: 16px;
    }

    .social-link {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.05);
      color: rgba(0, 0, 0, 0.7);
      transition: all 0.3s ease;
    }

    .dark .social-link {
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.7);
    }

    .social-link:hover {
      background: #6366F1;
      color: white;
      transform: translateY(-2px);
    }

    .footer-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0;
      color: rgba(0, 0, 0, 0.9);
    }

    .dark .section-title {
      color: rgba(255, 255, 255, 0.9);
    }

    .footer-links {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .footer-link {
      color: rgba(0, 0, 0, 0.7);
      text-decoration: none;
      transition: color 0.3s ease;
      font-size: 0.95rem;
    }

    .dark .footer-link {
      color: rgba(255, 255, 255, 0.7);
    }

    .footer-link:hover {
      color: #6366F1;
    }

    .newsletter-description {
      color: rgba(0, 0, 0, 0.7);
      margin: 0 0 16px;
      line-height: 1.5;
    }

    .dark .newsletter-description {
      color: rgba(255, 255, 255, 0.7);
    }

    .newsletter-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .newsletter-input {
      width: 100%;
    }

    .newsletter-button {
      align-self: flex-start;
    }

    .newsletter-message {
      margin-top: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 0.875rem;
    }

    .newsletter-message.success {
      background: rgba(76, 175, 80, 0.1);
      color: #4CAF50;
    }

    .newsletter-message.error {
      background: rgba(244, 67, 54, 0.1);
      color: #F44336;
    }

    .footer-divider {
      height: 1px;
      background: rgba(0, 0, 0, 0.1);
      margin: 24px 0;
    }

    .dark .footer-divider {
      background: rgba(255, 255, 255, 0.1);
    }

    .footer-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .footer-bottom-content {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .copyright {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .copyright p {
      margin: 0;
      color: rgba(0, 0, 0, 0.7);
      font-size: 0.875rem;
    }

    .dark .copyright p {
      color: rgba(255, 255, 255, 0.7);
    }

    .legal-links {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .legal-link {
      color: rgba(0, 0, 0, 0.7);
      text-decoration: none;
      font-size: 0.875rem;
      transition: color 0.3s ease;
    }

    .dark .legal-link {
      color: rgba(255, 255, 255, 0.7);
    }

    .legal-link:hover {
      color: #6366F1;
    }
    
    .dark .separator {
      color: rgba(255, 255, 255, 0.3);
    }

    .attribution {
      display: flex;
      align-items: center;
    }

    .attribution p {
      margin: 0;
      font-size: 0.75rem;
    }

    .dark .attribution p {
      color: rgba(255, 255, 255, 0.6);
    }

    .attribution-link {
      color: #6366F1;
      text-decoration: none;
    }

    .attribution-link:hover {
      text-decoration: underline;
    }

    .back-to-top {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 100;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s ease;
    }

    .back-to-top.visible {
      opacity: 1;
      transform: translateY(0);
    }

    @media (max-width: 768px) {
      .footer-content {
        grid-template-columns: 1fr;
        gap: 24px;
      }

      .footer-bottom-content {
        flex-direction: column;
        align-items: flex-start;
      }

      .back-to-top {
        position: static;
        opacity: 1;
        transform: none;
        margin-top: 16px;
        align-self: center;
      }
    }
  `]
})
export class FooterComponent implements OnDestroy {
  private themeService = inject(ThemeService);
  private themeSubscription!: Subscription;

  // Signals for state management
  isDarkTheme = signal<boolean>(true);
  newsletterEmail = signal<string>('');
  newsletterSubmitting = signal<boolean>(false);
  newsletterMessage = signal<string>('');

  currentYear = new Date().getFullYear();

  constructor() {
    // Subscribe to theme changes
    const themeSub = effect(() => {
      this.isDarkTheme.set(this.themeService.isDarkMode());
    });

    // Listen for scroll events to show/hide back to top button
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', this.onScroll);
    }
  }

  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.onScroll);
    }
  }

  onScroll = (): void => {
    const backToTopButton = document.querySelector('.back-to-top');
    if (backToTopButton) {
      if (window.scrollY > 300) {
        backToTopButton.classList.add('visible');
      } else {
        backToTopButton.classList.remove('visible');
      }
    }
  };

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onNewsletterSubmit(): void {
    this.newsletterSubmitting.set(true);

    // Simulate API call
    setTimeout(() => {
      this.newsletterSubmitting.set(false);
      this.newsletterMessage.set('Thank you for subscribing to our newsletter!');
      this.newsletterEmail.set('');

      // Clear message after 5 seconds
      setTimeout(() => {
        this.newsletterMessage.set('');
      }, 5000);
    }, 1500);
  }
}
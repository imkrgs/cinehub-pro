import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-center p-8 min-h-[120px]" [ngClass]="containerClass" role="status" aria-live="polite">
      <div class="glass glass-md text-center inline-flex flex-col items-center px-6 py-4">
        <mat-spinner [diameter]="size" [color]="color"></mat-spinner>

        <p *ngIf="message" class="mt-4 text-sm text-gray-700 dark:text-gray-300">
          {{ message }}
        </p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .glass {
      /* fallback if global glass styles are missing */
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(10px) saturate(120%);
      -webkit-backdrop-filter: blur(10px) saturate(120%);
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow: 0 8px 24px rgba(2,6,23,0.25);
      transition: all 0.25s ease-in-out;
    }
  `]
})
export class LoadingSpinnerComponent {
  @Input() size: number = 50;
  @Input() color: 'primary' | 'accent' | 'warn' = 'primary';
  @Input() message: string = 'Loading...';
  @Input() containerClass: string = '';
}

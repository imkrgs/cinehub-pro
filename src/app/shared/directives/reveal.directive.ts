import { Directive, ElementRef, OnDestroy, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appReveal]',
  standalone: true
})
export class RevealDirective implements OnInit, OnDestroy {
  private observer?: IntersectionObserver;

  constructor(private el: ElementRef, private rd: Renderer2) {
    this.rd.addClass(this.el.nativeElement, 'opacity-0');
    this.rd.addClass(this.el.nativeElement, 'translate-y-5');
    this.rd.addClass(this.el.nativeElement, 'transition');
    this.rd.addClass(this.el.nativeElement, 'duration-700');
  }

  ngOnInit() {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      // SSR or unsupported: reveal immediately
      this.rd.removeClass(this.el.nativeElement, 'opacity-0');
      this.rd.removeClass(this.el.nativeElement, 'translate-y-5');
      return;
    }
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.rd.removeClass(this.el.nativeElement, 'opacity-0');
          this.rd.removeClass(this.el.nativeElement, 'translate-y-5');
          this.observer?.unobserve(this.el.nativeElement);
        }
      });
    }, { threshold: 0.1 });
    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}

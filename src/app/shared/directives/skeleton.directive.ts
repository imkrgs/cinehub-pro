import { Directive, ElementRef, OnDestroy, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appSkeleton]',
  standalone: true
})
export class SkeletonDirective implements OnInit, OnDestroy {
  private cleanup: Array<() => void> = [];

  constructor(private el: ElementRef, private rd: Renderer2) {}

  ngOnInit() {
    const host = this.el.nativeElement as HTMLElement;
    const placeholder = this.rd.createElement('div');
    this.rd.addClass(placeholder, 'skeleton');
    this.rd.addClass(placeholder, 'w-full');
    this.rd.addClass(placeholder, 'h-full');
    this.rd.addClass(placeholder, 'rounded-lg');
    this.rd.appendChild(host, placeholder);
    this.cleanup.push(() => this.rd.removeChild(host, placeholder));
  }

  ngOnDestroy() {
    this.cleanup.forEach(fn => fn());
  }
}

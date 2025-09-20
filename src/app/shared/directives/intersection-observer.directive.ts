import { Directive, ElementRef, EventEmitter, OnDestroy, OnInit, Output, Input } from '@angular/core';

@Directive({
    selector: '[appIntersecting]',
    standalone: true,
})
export class IntersectionObserverDirective implements OnInit, OnDestroy {
    @Input() intersectionThreshold: number | number[] = 0.1;
    @Input() once: boolean = true;

    @Output() appIntersecting = new EventEmitter<boolean>();

    private observer: IntersectionObserver | null = null;

    constructor(private element: ElementRef) {}

    ngOnInit() {
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.appIntersecting.emit(true);
                        if (this.once && this.observer) {
                            this.observer.unobserve(this.element.nativeElement);
                        }
                    } else {
                        this.appIntersecting.emit(false);
                    }
                });
            },
            { threshold: this.intersectionThreshold }
        );
        this.observer.observe(this.element.nativeElement);
    }

    ngOnDestroy() {
        if (this.observer) {
            this.observer.unobserve(this.element.nativeElement);
            this.observer.disconnect();
        }
    }
}

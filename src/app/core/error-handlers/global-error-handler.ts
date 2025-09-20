// src/app/core/error-handlers/global-error-handler.ts
import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ErrorHandlerService } from '@core/services/error-handler.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    private readonly errorHandlerService = inject(ErrorHandlerService);

    handleError(error: any): void {
        console.error('Global error caught:', error);
        this.errorHandlerService.handleError(error, 'Global Error Handler');
    }
}

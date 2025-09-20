import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { environment } from '@environments/environment';
import { ToastService } from '@core/services/toast.service';

export const featureGuard: CanActivateFn = (route, state) => {
  const toast = inject(ToastService);
  const requiredFeature = route.data?.['requiredFeature'];

  if (!requiredFeature) {
    return true; // No feature requirement
  }

  const isFeatureEnabled = environment.features[requiredFeature as keyof typeof environment.features];

  if (isFeatureEnabled) {
    return true;
  }

  // Feature is disabled
  toast.warning('This feature is currently unavailable');
  return false;
};
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { enableProdMode } from '@angular/core';
import { environment } from '@environments/environment';
import { register } from 'swiper/element/bundle';


// register Swiper custom elements
register();

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    console.log('CineHub Pro application started successfully');
  })
  .catch(err => {
    console.error('Error starting application:', err);
  });
import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { adminGuard } from '@core/guards/admin.guard';
import { noAuthGuard } from '@core/guards/no-auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('@layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('@features/home/home.component').then(m => m.HomeComponent),
        title: 'CineHub Pro - Discover Amazing Movies'
      },
      {
        path: 'movies',
        loadComponent: () => import('@features/movies/movies.component').then(m => m.MoviesComponent),
        title: 'Movies - CineHub Pro'
      },
      {
        path: 'movie/:id',
        loadComponent: () => import('@features/movie-detail/movie-detail.component').then(m => m.MovieDetailComponent),
        title: 'Movie Details - CineHub Pro'
      },
      {
        path: 'search',
        loadComponent: () => import('@features/search/search.component').then(m => m.SearchComponent),
        title: 'Search Movies - CineHub Pro'
      },
      {
        path: 'collection/:keywordId',
        loadComponent: () => import('@features/collection-page/collection-page.component').then(m => m.CollectionPageComponent),
        title: 'Collection - CineHub Pro'
      },
      {
        path: 'dashboard',
        canActivate: [authGuard],
        loadComponent: () => import('@features/user-dashboard/user-dashboard.component').then(m => m.UserDashboardComponent),
        title: 'Dashboard - CineHub Pro'
      },
      { path: 'about',
        loadComponent: () => import('./features/about/about.component').then(m => m.AboutComponent),
        title: 'About CineHub Pro'
      },
      { path: 'contact',
        loadComponent: () => import('./features/contact/contact.component').then(m => m.ContactComponent) ,
        title: 'Contact Us - CineHub Pro'
      },
    ]
  },
  {
    path: 'auth',
    canActivate: [noAuthGuard],
    loadComponent: () => import('@layouts/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [
      {
        path: 'login',
        loadComponent: () => import('@features/auth/login/login.component').then(m => m.LoginComponent),
        title: 'Sign In - CineHub Pro'
      },
      {
        path: 'register',
        loadComponent: () => import('@features/auth/register/register.component').then(m => m.RegisterComponent),
        title: 'Create Account - CineHub Pro'
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('@layouts/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('@features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
        title: 'Admin Dashboard - CineHub Pro'
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
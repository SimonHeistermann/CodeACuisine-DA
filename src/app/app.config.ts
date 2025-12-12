import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { firebaseConfig } from '../environments/firebase.config';

import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

/**
 * Global application configuration for the Angular bootstrap process.
 *
 * This configuration defines all root-level providers that are available
 * throughout the application lifecycle.
 *
 * Responsibilities:
 * - Configure Angular change detection behavior
 * - Register the application router and route definitions
 * - Enable HTTP communication via `HttpClient`
 * - Initialize Firebase using the environment-specific configuration
 * - Provide a Firestore instance for data persistence
 */
export const appConfig: ApplicationConfig = {
  providers: [
    /**
     * Enables optimized zone change detection.
     *
     * `eventCoalescing` reduces the number of change detection cycles
     * triggered by DOM events, improving performance.
     */
    provideZoneChangeDetection({ eventCoalescing: true }),

    /**
     * Registers the application routes.
     *
     * Routes are defined in `app.routes` and control navigation
     * across all views of the application.
     */
    provideRouter(routes),

    /**
     * Enables Angular's `HttpClient` for making HTTP requests.
     */
    provideHttpClient(),

    /**
     * Initializes the Firebase application using the provided configuration.
     *
     * The configuration is environment-specific and typically differs
     * between development and production builds.
     */
    provideFirebaseApp(() => initializeApp(firebaseConfig)),

    /**
     * Provides a Firestore instance for database operations.
     *
     * This makes Firestore injectable throughout the application.
     */
    provideFirestore(() => getFirestore()),
  ],
};
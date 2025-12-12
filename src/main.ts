import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

/**
 * Application entry point.
 *
 * Bootstraps the Angular application using the standalone API.
 *
 * Responsibilities:
 * - Initialize the root `AppComponent`
 * - Apply global application configuration (`appConfig`)
 * - Catch and log bootstrap errors to aid debugging
 */
bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastOverlayComponent } from './shared/toast-overlay/toast-overlay.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastOverlayComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
/**
 * Root component of the application.
 *
 * Responsibilities:
 * - Acts as the application shell
 * - Hosts the Angular router outlet
 * - Provides a global toast overlay for user feedback
 *
 * All feature-specific logic is delegated to routed components and services.
 */
export class AppComponent {
  /** Application title (used for identification or debugging purposes). */
  title = 'code-a-cuisine';
}
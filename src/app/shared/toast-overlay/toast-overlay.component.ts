import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ToastService, ToastConfig } from '../../core/services/toast-service/toast.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-toast-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-overlay.component.html',
  styleUrl: './toast-overlay.component.scss',
})
/**
 * Overlay component responsible for rendering toast notifications.
 *
 * Responsibilities:
 * - Subscribe to the global toast stream and render the active toast
 * - Provide backdrop interaction to dismiss the toast
 * - Prevent accidental dismissal when interacting with the toast card itself
 *
 * This component is purely presentational and delegates all state management
 * to the `ToastService`.
 */
export class ToastOverlayComponent {
  /**
   * Creates the toast overlay component.
   *
   * @param toastService Central toast service providing the toast stream
   * and hide/show controls.
   */
  constructor(private readonly toastService: ToastService) {}

  /**
   * Observable stream of the current toast configuration.
   *
   * Emits:
   * - `ToastConfig` when a toast should be displayed
   * - `null` when no toast is active
   */
  get toast$(): Observable<ToastConfig | null> {
    return this.toastService.toast$;
  }

  /**
   * Handles clicks on the overlay backdrop.
   *
   * Clicking outside the toast card dismisses the toast.
   */
  onBackdropClick(): void {
    this.toastService.hide();
  }

  /**
   * Handles clicks on the close button inside the toast card.
   *
   * Stops event propagation to avoid triggering backdrop dismissal twice.
   *
   * @param event Mouse click event.
   */
  onCloseClick(event: MouseEvent): void {
    event.stopPropagation();
    this.toastService.hide();
  }

  /**
   * Handles clicks on the toast card itself.
   *
   * Stops propagation so interactions inside the card do not
   * close the toast unintentionally.
   *
   * @param event Mouse click event.
   */
  onCardClick(event: MouseEvent): void {
    event.stopPropagation();
  }
}
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Configuration object describing a toast notification.
 */
export interface ToastConfig {
  /** Short headline shown in the toast. */
  title: string;
  /** Main message body of the toast. */
  message: string;
  /** Optional duration in milliseconds before the toast auto-hides. */
  durationMs?: number;
}

@Injectable({
  providedIn: 'root',
})
/**
 * Service responsible for managing toast notifications.
 *
 * This service exposes a reactive stream (`toast$`) that emits the currently
 * active toast configuration or `null` when no toast should be displayed.
 *
 * Key responsibilities:
 * - Emit toast notifications in a centralized way
 * - Automatically hide toasts after a configurable duration
 * - Ensure only one auto-hide timer is active at a time
 */
export class ToastService {
  /**
   * Internal subject holding the current toast state.
   *
   * `null` represents the absence of a visible toast.
   */
  private readonly toastSubject = new BehaviorSubject<ToastConfig | null>(null);

  /**
   * Reference to the currently scheduled auto-hide timeout, if any.
   */
  private hideTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /**
   * Observable stream of toast state changes.
   *
   * Components can subscribe to this observable to reactively display or hide
   * toast notifications.
   */
  get toast$(): Observable<ToastConfig | null> {
    return this.toastSubject.asObservable();
  }

  /**
   * Shows a toast notification.
   *
   * Behavior:
   * - Clears any existing auto-hide timeout
   * - Emits the new toast configuration
   * - Automatically hides the toast after the resolved duration (if > 0)
   *
   * @param config Toast configuration to display.
   */
  show(config: ToastConfig): void {
    this.clearHideTimeout();
    this.emitToast(config);

    const duration = this.resolveDuration(config);
    if (duration > 0) {
      this.scheduleAutoHide(duration);
    }
  }

  /**
   * Immediately hides the currently visible toast, if any.
   *
   * Also clears any pending auto-hide timeout.
   */
  hide(): void {
    this.clearHideTimeout();
    this.emitToast(null);
  }

  /**
   * Resolves the display duration for a toast.
   *
   * Falls back to a default duration when none is provided.
   *
   * @param config Toast configuration.
   * @returns Duration in milliseconds.
   */
  private resolveDuration(config: ToastConfig): number {
    return config.durationMs ?? 4000;
  }

  /**
   * Clears the currently scheduled auto-hide timeout, if one exists.
   */
  private clearHideTimeout(): void {
    if (!this.hideTimeoutId) return;

    clearTimeout(this.hideTimeoutId);
    this.hideTimeoutId = null;
  }

  /**
   * Emits a toast configuration (or `null`) to all subscribers.
   *
   * @param config Toast configuration to emit, or `null` to hide the toast.
   */
  private emitToast(config: ToastConfig | null): void {
    this.toastSubject.next(config);
  }

  /**
   * Schedules automatic hiding of the toast after the given duration.
   *
   * @param durationMs Time in milliseconds after which the toast is hidden.
   */
  private scheduleAutoHide(durationMs: number): void {
    this.hideTimeoutId = setTimeout(() => {
      this.emitToast(null);
      this.hideTimeoutId = null;
    }, durationMs);
  }

  /**
   * Creates the toast service.
   *
   * Note: This service has no external dependencies and manages its state
   * entirely in memory.
   */
  constructor() {}
}
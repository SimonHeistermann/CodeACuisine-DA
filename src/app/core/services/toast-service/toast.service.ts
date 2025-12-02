import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ToastConfig {
  title: string;
  message: string;
  durationMs?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly toastSubject = new BehaviorSubject<ToastConfig | null>(null);
  private hideTimeoutId: ReturnType<typeof setTimeout> | null = null;

  get toast$(): Observable<ToastConfig | null> {
    return this.toastSubject.asObservable();
  }

  show(config: ToastConfig): void {
    this.clearHideTimeout();
    this.emitToast(config);

    const duration = this.resolveDuration(config);
    if (duration > 0) {
      this.scheduleAutoHide(duration);
    }
  }

  hide(): void {
    this.clearHideTimeout();
    this.emitToast(null);
  }

  private resolveDuration(config: ToastConfig): number {
    return config.durationMs ?? 4000;
  }

  private clearHideTimeout(): void {
    if (!this.hideTimeoutId) return;

    clearTimeout(this.hideTimeoutId);
    this.hideTimeoutId = null;
  }

  private emitToast(config: ToastConfig | null): void {
    this.toastSubject.next(config);
  }

  private scheduleAutoHide(durationMs: number): void {
    this.hideTimeoutId = setTimeout(() => {
      this.emitToast(null);
      this.hideTimeoutId = null;
    }, durationMs);
  }
}
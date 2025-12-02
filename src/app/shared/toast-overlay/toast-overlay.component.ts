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
export class ToastOverlayComponent {

  constructor(private readonly toastService: ToastService) {}

  get toast$(): Observable<ToastConfig | null> {
    return this.toastService.toast$;
  }

  onBackdropClick(): void {
    this.toastService.hide();
  }

  onCloseClick(event: MouseEvent): void {
    event.stopPropagation();
    this.toastService.hide();
  }

  onCardClick(event: MouseEvent): void {
    event.stopPropagation();
  }
}
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastOverlayComponent } from './shared/toast-overlay/toast-overlay.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastOverlayComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'code-a-cuisine';
}

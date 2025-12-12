import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-generating-screen',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './generating-screen.component.html',
  styleUrl: './generating-screen.component.scss',
})
/**
 * Screen component displayed while recipes are being generated.
 *
 * Responsibilities:
 * - Provide visual feedback that a generation process is in progress
 * - Prevent premature user interaction while awaiting results
 * - Optionally offer navigation or cancellation actions via the template
 *
 * This component is intentionally presentational and contains no business logic.
 */
export class GeneratingScreenComponent {
  /**
   * Creates the generating screen component.
   *
   * Note: This component does not manage state or inject dependencies.
   * All behavior is defined in the template and routing configuration.
   */
  constructor() {}
}
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
})
/**
 * Hero section component displayed on the landing page.
 *
 * Responsibilities:
 * - Acts as the visual and conceptual entry point of the application
 * - Presents the main value proposition and call-to-action
 * - Provides navigation entry points (via router links) to core flows
 *
 * This component is intentionally lightweight and purely presentational.
 * All logic is handled via template bindings and routing.
 */
export class HeroComponent {
  /**
   * Creates the hero component.
   *
   * Note: This component does not manage any state or inject dependencies.
   * Its behavior is fully driven by the template and router configuration.
   */
  constructor() {}
}
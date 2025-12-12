import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-imprint',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './imprint.component.html',
  styleUrl: './imprint.component.scss',
})
/**
 * Displays the legal imprint / legal notice page of the application.
 *
 * Responsibilities:
 * - Render static legal information
 * - Display a human-readable "last updated" timestamp
 * - Provide basic navigation links via the router
 *
 * This component contains no business logic and is fully self-contained.
 */
export class ImprintComponent {
  /** Human-readable date indicating when the imprint was last updated. */
  readonly lastUpdated: string;

  /**
   * Creates the imprint component.
   *
   * Initializes the `lastUpdated` field using the current date,
   * formatted in English (month + year).
   */
  constructor() {
    const now = new Date();
    this.lastUpdated = now.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }
}
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

export class ImprintComponent {
  readonly lastUpdated: string;

  constructor() {
    const now = new Date();
    this.lastUpdated = now.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }
}
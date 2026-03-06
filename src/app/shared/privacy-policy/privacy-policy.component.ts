import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.scss',
})
export class PrivacyPolicyComponent {
  readonly lastUpdated: string;

  constructor() {
    const now = new Date();
    this.lastUpdated = now.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }
}

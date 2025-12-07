import { TitleCasePipe, NgClass } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { GeneratingScreenComponent } from '../generating-screen/generating-screen.component';
import { GenerateRecipeService } from '../../../core/services/generate-recipe-service/generate-recipe.service';
import { ToastService } from './../../../core/services/toast-service/toast.service';
import { StateService } from '../../../core/services/state-service/state.service';
import { RecipeRequirements } from '../../../core/models/recipe.model';

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [RouterModule, TitleCasePipe, GeneratingScreenComponent, NgClass],
  templateUrl: './preferences.component.html',
  styleUrl: './preferences.component.scss',
})
export class PreferencesComponent {
  readonly MAX_PORTIONS = 999;
  readonly MIN_COUNT = 1;
  readonly MAX_COOKS = 6;

  isLoading = false;

  constructor(
    private readonly generateRecipeService: GenerateRecipeService,
    private readonly state: StateService,
    private readonly router: Router,
    private readonly toastService: ToastService,
  ) {}

  /** Optionen kommen zentral aus dem StateService */
  get preferences() {
    return this.state.preferencesOptions;
  }

  /** Kurz-Getter, damit das Template lesbar bleibt */
  get recipeRequirements(): RecipeRequirements {
    return this.state.recipeRequirements;
  }

  get canGenerateRecipe(): boolean {
    return this.hasAllPreferences();
  }

  onGenerateRecipe(): void {
    if (this.hasNoIngredients()) {
      this.navigateToIngredientsWithToast();
      return;
    }
    if (!this.hasAllPreferences()) return;
    this.startRecipeGeneration();
  }

  increaseAmount(key: 'portionsAmount' | 'cooksAmount'): void {
    const current = this.recipeRequirements[key];
    const limit = key === 'cooksAmount' ? this.MAX_COOKS : this.MAX_PORTIONS;

    if (current < limit) {
      this.recipeRequirements[key] = current + 1;
    }
  }

  decreaseAmount(key: 'portionsAmount' | 'cooksAmount'): void {
    const current = this.recipeRequirements[key];
    if (current > this.MIN_COUNT) {
      this.recipeRequirements[key] = current - 1;
    }
  }

  selectPreference(
    key: 'cookingTime' | 'cuisine' | 'dietPreferences',
    value: string,
  ): void {
    this.recipeRequirements[key] = value;
  }

  private hasNoIngredients(): boolean {
    return this.recipeRequirements.ingredients.length === 0;
  }

  private hasAllPreferences(): boolean {
    const req = this.recipeRequirements;
    return !!(req.cookingTime && req.cuisine && req.dietPreferences);
  }

  private startRecipeGeneration(): void {
    this.isLoading = true;

    this.generateRecipeService.generateRecipe().subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/recipe-results']);
      },
      error: (error) => {
        this.handleGenerationError(error);
      },
    });
  }

  private handleGenerationError(error: unknown): void {
    console.error('Error generating recipe:', error);
    this.isLoading = false;

    this.router.navigate(['/generate-recipe']).then(() => {
      this.toastService.show({
        title: 'Something went wrong',
        message:
          'We couldn’t generate your recipes right now. Please try again in a moment.',
        durationMs: 5000,
      });
    });
  }

  private navigateToIngredientsWithToast(): void {
    this.router.navigate(['/generate-recipe']).then(() => {
      this.showMissingIngredientsToast();
    });
  }

  private showMissingIngredientsToast(): void {
    this.toastService.show({
      title: 'Ups! Not quite enough…',
      message:
        'Please add at least one ingredient before generating your recipes.',
      durationMs: 4000,
    });
  }
}
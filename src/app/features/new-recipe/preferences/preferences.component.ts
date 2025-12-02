import { TitleCasePipe, NgClass } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { GeneratingScreenComponent } from '../generating-screen/generating-screen.component';
import { GenerateRecipeService } from '../../../core/services/generate-recipe-service/generate-recipe.service';
import { ToastService } from './../../../core/services/toast-service/toast.service';

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [RouterModule, TitleCasePipe, GeneratingScreenComponent, NgClass],
  templateUrl: './preferences.component.html',
  styleUrl: './preferences.component.scss',
})
export class PreferencesComponent {
  readonly MAX_COUNT = 999;
  readonly MIN_COUNT = 1;

  isLoading = false;

  preferences = {
    times: [
      { value: 'quick', label: 'Quick', description: 'up to 20min' },
      { value: 'medium', label: 'Medium', description: '25–40min' },
      { value: 'complex', label: 'Complex', description: 'over 45min' },
    ],
    cuisine: ['german', 'italian', 'indian', 'japanese', 'gourmet', 'fusion'],
    dietPreferences: ['vegetarian', 'vegan', 'keto', 'no preferences'],
  };

  constructor(
    public generateRecipeService: GenerateRecipeService,
    private router: Router,
    private toastService: ToastService,
  ) {}

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
    const current = this.generateRecipeService.recipeRequirements[key];
    if (current < this.MAX_COUNT) {
      this.generateRecipeService.recipeRequirements[key] = current + 1;
    }
  }

  decreaseAmount(key: 'portionsAmount' | 'cooksAmount'): void {
    const current = this.generateRecipeService.recipeRequirements[key];
    if (current > this.MIN_COUNT) {
      this.generateRecipeService.recipeRequirements[key] = current - 1;
    }
  }

  selectPreference(
    key: 'cookingTime' | 'cuisine' | 'dietPreferences',
    value: string,
  ): void {
    this.generateRecipeService.recipeRequirements[key] = value;
  }

  private hasNoIngredients(): boolean {
    return (
      this.generateRecipeService.recipeRequirements.ingredients.length === 0
    );
  }

  private hasAllPreferences(): boolean {
    const req = this.generateRecipeService.recipeRequirements;
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
import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';

import { GeneratedRecipe } from '../../core/models/recipe.model';
import { StateService } from '../../core/services/state-service/state.service';
import { FirestoreRecipeService } from '../../core/services/firebase-recipe-service/firebase-recipe.service';

@Component({
  selector: 'app-cookbook',
  standalone: true,
  imports: [CommonModule, RouterModule, TitleCasePipe],
  templateUrl: './cookbook.component.html',
  styleUrl: './cookbook.component.scss',
})
export class CookbookComponent implements OnInit {
  topLikedRecipes: GeneratedRecipe[] = [];
  isLoadingTopRecipes = false;
  private readonly NUMBER_OF_TOP_RECIPES = 3;

  constructor(
    private readonly state: StateService,
    private readonly firestoreRecipeService: FirestoreRecipeService,
    private readonly router: Router,
  ) {}  

  get cuisines() {
    return this.state.preferencesOptions.cuisine;
  }

  get hasTopLikedRecipes(): boolean {
    return this.topLikedRecipes.length > 0;
  }

  ngOnInit(): void {
    this.loadTopLikedRecipes();
  }

  onTopRecipeClick(recipe: GeneratedRecipe): void {
    if (!recipe.id) return;
    this.router.navigate(['/cookbook', recipe.id]);
  }  

  onCuisineClick(cuisineName: string): void {
    this.router.navigate(['/cookbook/cuisine', cuisineName]);
  }  

  getLikes(recipe: GeneratedRecipe): number {
    return recipe.likes ?? 0;
  }

  private loadTopLikedRecipes(): void {
    this.isLoadingTopRecipes = true;

    this.firestoreRecipeService.loadCookbook().subscribe({
      next: (recipes) => {
        this.topLikedRecipes = this.pickTopLiked(recipes);
        this.isLoadingTopRecipes = false;
      },
      error: (error) => {
        console.error('Error loading cookbook for top liked recipes:', error);
        this.isLoadingTopRecipes = false;
      },
    });
  }

  private pickTopLiked(recipes: GeneratedRecipe[]): GeneratedRecipe[] {
    const sorted = [...recipes].sort(
      (a, b) => (b.likes ?? 0) - (a.likes ?? 0),
    );
    return sorted.slice(0, this.NUMBER_OF_TOP_RECIPES);
  }
}
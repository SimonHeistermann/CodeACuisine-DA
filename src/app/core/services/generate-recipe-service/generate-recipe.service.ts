import { Injectable } from '@angular/core';
import { RecipeRequirements } from './../../models/recipe.model';

@Injectable({
  providedIn: 'root',
})
export class GenerateRecipeService {
  recipeRequirements: RecipeRequirements = {
    ingredients: [],
    portionsAmount: 2,
    cooksAmount: 1,
    cookingTime: 'quick',
    cuisine: '',
    dietPreferences: '',
  };
}
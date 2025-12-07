import { Injectable } from '@angular/core';
import {
  GeneratedRecipe,
  RecipeRequirements,
} from '../../models/recipe.model';

@Injectable({
  providedIn: 'root',
})
export class StateService {
  /** Anforderungen, die du aus Ingredients + Preferences aufbaust */
  recipeRequirements: RecipeRequirements = {
    ingredients: [],
    portionsAmount: 2,
    cooksAmount: 1,
    cookingTime: 'quick',
    cuisine: '',
    dietPreferences: '',
  };

  /** Ergebnisse der letzten AI-Generierung */
  generatedRecipes: GeneratedRecipe[] = [];

  /** Alle Rezepte, die im Cookbook liegen (Firebase) */
  allRecipes: GeneratedRecipe[] = [];

  /** Zentrale Optionen für deine UI (optional, wenn du sie teilen willst) */
  preferencesOptions = {
    times: [
      { value: 'quick', label: 'Quick', description: 'up to 20min' },
      { value: 'medium', label: 'Medium', description: '25–40min' },
      { value: 'complex', label: 'Complex', description: 'over 45min' },
    ],
    cuisine: ['german', 'italian', 'indian', 'japanese', 'gourmet', 'fusion'],
    dietPreferences: ['vegetarian', 'vegan', 'keto', 'no preferences'],
  };
}
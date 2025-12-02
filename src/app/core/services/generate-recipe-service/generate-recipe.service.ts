import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  RecipeRequirements,
  GeneratedRecipe,
} from './../../models/recipe.model';
import { environment } from './../../../../environments/environment';

const webhookUrl = environment.webhookUrl;

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

  generatedRecipes: GeneratedRecipe[] = [];

  constructor(private http: HttpClient) {}

  generateRecipe(): Observable<GeneratedRecipe[]> {
    console.log('Sending to n8n:', this.recipeRequirements);
    return this.http
      .post<GeneratedRecipe[]>(webhookUrl, this.recipeRequirements)
      .pipe(
        tap((recipes) => {
          this.generatedRecipes = recipes;
        })
      );
  }
}
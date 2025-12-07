import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import {
  RecipeRequirements,
  GeneratedRecipe,
} from '../../models/recipe.model';
import { environment } from '../../../../environments/environment';
import { StateService } from '../state-service/state.service';

const webhookUrl = environment.webhookUrl;

@Injectable({
  providedIn: 'root',
})
export class GenerateRecipeService {
  // Nur noch Referenzen auf den State, kein eigener Zustand mehr
  get recipeRequirements(): RecipeRequirements {
    return this.state.recipeRequirements;
  }

  get generatedRecipes(): GeneratedRecipe[] {
    return this.state.generatedRecipes;
  }

  constructor(
    private http: HttpClient,
    private state: StateService,
  ) {}

  generateRecipe(): Observable<GeneratedRecipe[]> {
    console.log('Sending to n8n:', this.state.recipeRequirements);

    return this.http
      .post<GeneratedRecipe[]>(webhookUrl, this.state.recipeRequirements)
      .pipe(
        tap((recipes) => {
          this.state.generatedRecipes = recipes;
        }),
      );
  }
}
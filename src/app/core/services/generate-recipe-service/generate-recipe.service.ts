import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

import {
  RecipeRequirements,
  GeneratedRecipe,
} from '../../models/recipe.model';
import { environment } from '../../../../environments/environment';
import { StateService } from '../state-service/state.service';
import { FirestoreRecipeService } from '../firebase-recipe-service/firebase-recipe.service';

const webhookUrl = environment.webhookUrl;

@Injectable({
  providedIn: 'root',
})
export class GenerateRecipeService {
  get recipeRequirements(): RecipeRequirements {
    return this.state.recipeRequirements;
  }

  get generatedRecipes(): GeneratedRecipe[] {
    return this.state.generatedRecipes;
  }

  constructor(
    private http: HttpClient,
    private state: StateService,
    private firestoreRecipes: FirestoreRecipeService,
  ) {}

  generateRecipe(): Observable<GeneratedRecipe[]> {
    const payload = this.state.recipeRequirements;

    return this.http.post<GeneratedRecipe[]>(webhookUrl, payload).pipe(
      switchMap((recipes) =>
        from(this.firestoreRecipes.syncGeneratedRecipes(recipes)),
      ),
      tap((syncedRecipes) => {
        this.state.generatedRecipes = syncedRecipes;
      }),
    );
  }
}
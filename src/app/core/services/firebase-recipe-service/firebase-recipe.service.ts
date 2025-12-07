import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap, Observable, forkJoin, of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { GeneratedRecipe } from '../../models/recipe.model';
import { StateService } from '../state-service/state.service';

@Injectable({
  providedIn: 'root',
})
export class FirebaseRecipeService {
  /** z.B. 'https://dein-project-id-default-rtdb.europe-west1.firebasedatabase.app/' */
  private readonly baseUrl = environment.databaseUrl;

  constructor(
    private readonly http: HttpClient,
    private readonly state: StateService,
  ) {}

  /**
   * Speichert alle aktuell generierten Rezepte im Cookbook.
   */
  saveCurrentResultsToCookbook(): Observable<unknown[]> {
    const recipes = this.state.generatedRecipes ?? [];

    // Wenn es nichts zu speichern gibt, trotzdem ein gültiges Observable liefern
    if (!recipes.length) {
      return of([]);
    }

    // Alle POST-Requests zusammenfassen
    return forkJoin(
      recipes.map((recipe) =>
        this.http.post<unknown>(`${this.baseUrl}recipes.json`, recipe),
      ),
    );
  }

  /**
   * Lädt alle Rezepte aus Firebase und schreibt sie in den State.
   */
  loadCookbook(): Observable<GeneratedRecipe[]> {
    return this.http
      .get<Record<string, GeneratedRecipe> | null>(
        `${this.baseUrl}recipes.json`,
      )
      .pipe(
        map((response) => {
          if (!response) return [];
          return Object.values(response);
        }),
        tap((recipes) => {
          this.state.allRecipes = recipes;
        }),
      );
  }

  /** Optionaler Helper, wenn du Cookbook-Daten überall brauchst */
  get allRecipes(): GeneratedRecipe[] {
    return this.state.allRecipes;
  }
}
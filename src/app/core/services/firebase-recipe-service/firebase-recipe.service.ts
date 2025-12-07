import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  query,
  where,
  Timestamp,
  getDocs,
  doc,
  updateDoc,
  increment,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  GeneratedRecipe,
  RecipeIngredient,
} from '../../models/recipe.model';
import { StateService } from '../state-service/state.service';

@Injectable({ providedIn: 'root' })
export class FirestoreRecipeService {
  /** Name der Collection in Firestore */
  private readonly collectionName = 'recipes';

  constructor(
    private readonly firestore: Firestore,
    private readonly state: StateService,
  ) {}

  /** Referenz auf die "recipes"-Collection */
  private recipesCollection() {
    return collection(this.firestore, this.collectionName);
  }

  // =====================================================
  // Signatur-Logik (Duplikate erkennen)
  // =====================================================

  /** Öffentliche Helper-Funktion: Signatur holen oder erzeugen */
  getOrCreateSignature(recipe: GeneratedRecipe): string {
    if (recipe.recipeSignature) {
      return recipe.recipeSignature;
    }

    const signature = this.buildRecipeSignature(recipe);
    recipe.recipeSignature = signature;
    return signature;
  }

  /** Erzeugt einen deterministischen Key für alle Zutaten */
  private buildIngredientsKey(recipe: GeneratedRecipe): string {
    const allIngredients: RecipeIngredient[] = [
      ...recipe.ingredients.yourIngredients,
      ...recipe.ingredients.extraIngredients,
    ];

    return allIngredients
      .map((ingredient) => this.normalizeIngredient(ingredient))
      .sort()
      .join(';');
  }

  private normalizeIngredient(ingredient: RecipeIngredient): string {
    const name = ingredient.ingredient.trim().toLowerCase();
    const size = ingredient.servingSize ?? 0;
    const unit =
      ingredient.unit?.abbreviation ||
      ingredient.unit?.name ||
      '';

    return `${name}|${size}|${unit}`;
  }

  private buildRecipeSignature(recipe: GeneratedRecipe): string {
    const title = recipe.title.trim().toLowerCase();
    const prefs = recipe.preferences ?? {};
    const cuisine = (prefs.cuisine ?? '').toLowerCase();
    const time = (prefs.cookingTime ?? '').toLowerCase();
    const diet = (prefs.dietPreferences ?? '').toLowerCase();
    const cooks = String(recipe.cooksAmount ?? 0);

    const ingredientsKey = this.buildIngredientsKey(recipe);

    return [title, cuisine, time, diet, cooks, ingredientsKey].join(
      '||',
    );
  }

  private async findBySignature(
    signature: string,
  ): Promise<(GeneratedRecipe & { id: string }) | null> {
    const colRef = this.recipesCollection();
    const qRef = query(colRef, where('recipeSignature', '==', signature));
    const snap = await getDocs(qRef);

    if (snap.empty) {
      return null;
    }

    const docSnap = snap.docs[0];
    return {
      id: docSnap.id,
      ...(docSnap.data() as GeneratedRecipe),
    };
  }

  private async createRecipeDoc(
    recipe: GeneratedRecipe,
    signature: string,
    likes: number,
    options?: { isSeed?: boolean },
  ): Promise<void> {
    const payload: any = {
      ...recipe,
      recipeSignature: signature,
      likes,
      isSeedRecipe: options?.isSeed ?? false,
      createdAt: Timestamp.now(),
    };

    await addDoc(this.recipesCollection(), payload);
  }

  // =====================================================
  // Auto-Save nach Generierung
  // =====================================================

  /**
   * Nimmt die frisch generierten Rezepte,
   * sorgt für Eintrag in Firestore
   * und gibt sie mit korrektem likes-Wert zurück.
   */
  async syncGeneratedRecipes(
    recipes: GeneratedRecipe[],
  ): Promise<GeneratedRecipe[]> {
    const updated: GeneratedRecipe[] = [];

    for (const recipe of recipes) {
      const synced = await this.ensureRecipeInCookbook(recipe, {
        isSeed: false,
      });
      updated.push(synced);
    }

    return updated;
  }

  /**
   * Sorgt dafür, dass das Rezept in Firestore existiert.
   * Falls schon vorhanden → likes aus DB übernehmen.
   * Falls neu → anlegen mit likes (Default 0).
   */
  async ensureRecipeInCookbook(
    recipe: GeneratedRecipe,
    options?: { isSeed?: boolean },
  ): Promise<GeneratedRecipe> {
    const signature = this.getOrCreateSignature(recipe);
    const existing = await this.findBySignature(signature);

    if (existing) {
      const likes = existing.likes ?? 0;
      return {
        ...recipe,
        id: existing.id,
        recipeSignature: signature,
        likes,
      };
    }

    const likes = recipe.likes ?? 0;

    await this.createRecipeDoc(recipe, signature, likes, options);

    return {
      ...recipe,
      recipeSignature: signature,
      likes,
    };
  }

  // =====================================================
  // Likes / Favorites
  // =====================================================

  /**
   * Aktualisiert den Like-Status eines Rezepts.
   * isFavorite = true  → likes +1
   * isFavorite = false → likes -1 (mind. 0)
   *
   * Gibt den neuen likes-Wert zurück.
   */
  async updateLikesForRecipe(
    recipe: GeneratedRecipe,
    isFavorite: boolean,
  ): Promise<number> {
    const signature = this.getOrCreateSignature(recipe);
    const existing = await this.findBySignature(signature);
    const delta = isFavorite ? 1 : -1;

    if (!existing) {
      const likes = isFavorite ? 1 : 0;
      await this.createRecipeDoc(recipe, signature, likes, {
        isSeed: false,
      });
      return likes;
    }

    const docRef = doc(
      this.firestore,
      this.collectionName,
      existing.id,
    );

    const currentLikes = existing.likes ?? 0;
    const newLikes = Math.max(currentLikes + delta, 0);

    await updateDoc(docRef, { likes: increment(delta) });

    return newLikes;
  }

  // =====================================================
  // Cookbook lesen (z.B. Cookbooks-Seite)
  // =====================================================

  /**
   * Lädt alle Cookbook-Rezepte aus Firestore
   * und schreibt sie in den State.
   * Optional: nach Cuisine filtern.
   */
  loadCookbook(cuisine?: string): Observable<GeneratedRecipe[]> {
    const colRef = this.recipesCollection();

    const qRef = cuisine
      ? query(colRef, where('preferences.cuisine', '==', cuisine))
      : colRef;

    return collectionData(qRef, { idField: 'id' }).pipe(
      map((docs) => docs as GeneratedRecipe[]),
      map((recipes) => {
        this.state.allRecipes = recipes;
        return recipes;
      }),
    );
  }

  /**
   * Lädt nur Seed-Rezepte – z.B. für initial vorgefülltes Cookbook.
   */
  loadSeedRecipes(): Observable<GeneratedRecipe[]> {
    const colRef = this.recipesCollection();
    const qRef = query(colRef, where('isSeedRecipe', '==', true));

    return collectionData(qRef, { idField: 'id' }).pipe(
      map((docs) => docs as GeneratedRecipe[]),
    );
  }
}
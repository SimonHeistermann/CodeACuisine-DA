import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  query,
  where,
  Timestamp,
  getDocs,
  doc,
  updateDoc,
  increment,
  getDoc,
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
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

  /**
   * Legt ein neues Rezept-Dokument an und gibt die Firestore-ID zurück.
   */
  private async createRecipeDoc(
    recipe: GeneratedRecipe,
    signature: string,
    likes: number,
    options?: { isSeed?: boolean },
  ): Promise<string> {
    const payload: any = this.buildRecipePayload(
      recipe,
      signature,
      likes,
      options,
    );

    const docRef = await addDoc(this.recipesCollection(), payload);
    return docRef.id;
  }

  private buildRecipePayload(
    recipe: GeneratedRecipe,
    signature: string,
    likes: number,
    options?: { isSeed?: boolean },
  ): any {
    return {
      ...recipe,
      recipeSignature: signature,
      likes,
      isSeedRecipe: options?.isSeed ?? false,
      createdAt: Timestamp.now(),
    };
  }

  // =====================================================
  // Auto-Save nach Generierung
  // =====================================================

  /**
   * Nimmt die frisch generierten Rezepte,
   * sorgt für Eintrag in Firestore
   * und gibt sie mit korrektem likes-Wert & Firestore-ID zurück.
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
   * Falls schon vorhanden → likes & id aus DB übernehmen.
   * Falls neu → anlegen mit likes (Default 0) und Firestore-ID zurückgeben.
   */
  async ensureRecipeInCookbook(
    recipe: GeneratedRecipe,
    options?: { isSeed?: boolean },
  ): Promise<GeneratedRecipe> {
    const signature = this.getOrCreateSignature(recipe);
    const existing = await this.findBySignature(signature);

    if (existing) {
      return this.mergeExistingRecipe(recipe, existing, signature);
    }

    const likes = recipe.likes ?? 0;
    const docId = await this.createRecipeDoc(
      recipe,
      signature,
      likes,
      options,
    );

    return {
      ...recipe,
      id: docId,
      recipeSignature: signature,
      likes,
    };
  }

  private mergeExistingRecipe(
    recipe: GeneratedRecipe,
    existing: GeneratedRecipe & { id: string },
    signature: string,
  ): GeneratedRecipe {
    const likes = existing.likes ?? 0;

    return {
      ...recipe,
      id: existing.id,
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
    const delta = this.getLikesDelta(isFavorite);

    if (!existing) {
      return this.handleNewLikedRecipe(recipe, signature, isFavorite);
    }

    const docRef = this.buildDocRef(existing.id);
    const currentLikes = existing.likes ?? 0;
    const newLikes = this.computeNewLikes(currentLikes, delta);

    await updateDoc(docRef, { likes: increment(delta) });

    return newLikes;
  }

  private getLikesDelta(isFavorite: boolean): number {
    return isFavorite ? 1 : -1;
  }

  private computeNewLikes(
    currentLikes: number,
    delta: number,
  ): number {
    return Math.max(currentLikes + delta, 0);
  }

  private buildDocRef(id: string) {
    return doc(this.firestore, this.collectionName, id);
  }

  private async handleNewLikedRecipe(
    recipe: GeneratedRecipe,
    signature: string,
    isFavorite: boolean,
  ): Promise<number> {
    const likes = isFavorite ? 1 : 0;

    const docId = await this.createRecipeDoc(
      recipe,
      signature,
      likes,
      {
        isSeed: false,
      },
    );

    // sicherheitshalber id im übergebenen Objekt setzen, falls du es weiter nutzt
    recipe.id = docId;

    return likes;
  }

  // =====================================================
  // Einzelnes Rezept laden
  // =====================================================

  async getRecipeById(id: string): Promise<GeneratedRecipe | null> {
    const docRef = this.buildDocRef(id);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return null;
    }

    return {
      id: snap.id,
      ...(snap.data() as GeneratedRecipe),
    };
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
    const ref = cuisine
      ? query(colRef, where('preferences.cuisine', '==', cuisine))
      : colRef;

    return from(getDocs(ref)).pipe(
      map((snap) =>
        snap.docs.map(
          (docSnap) =>
            ({
              id: docSnap.id,
              ...(docSnap.data() as GeneratedRecipe),
            }) as GeneratedRecipe,
        ),
      ),
      map((recipes) => this.updateStateWithRecipes(recipes)),
    );
  }

  private updateStateWithRecipes(
    recipes: GeneratedRecipe[],
  ): GeneratedRecipe[] {
    this.state.allRecipes = recipes;
    return recipes;
  }

  /**
   * Lädt nur Seed-Rezepte – z.B. für initial vorgefülltes Cookbook.
   */
  loadSeedRecipes(): Observable<GeneratedRecipe[]> {
    const colRef = this.recipesCollection();
    const qRef = query(colRef, where('isSeedRecipe', '==', true));

    return from(getDocs(qRef)).pipe(
      map((snap) =>
        snap.docs.map(
          (docSnap) =>
            ({
              id: docSnap.id,
              ...(docSnap.data() as GeneratedRecipe),
            }) as GeneratedRecipe,
        ),
      ),
    );
  }
}
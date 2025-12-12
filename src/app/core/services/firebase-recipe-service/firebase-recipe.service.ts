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

import { GeneratedRecipe, RecipeIngredient } from '../../models/recipe.model';
import { StateService } from '../state-service/state.service';

@Injectable({ providedIn: 'root' })
/**
 * Service responsible for persisting and retrieving `GeneratedRecipe` entities in Firestore.
 *
 * Key responsibilities:
 * - Ensure generated recipes exist in the cookbook collection (create if missing, reuse if present).
 * - Maintain a deterministic `recipeSignature` to identify "same recipe" across sessions.
 * - Update and compute likes using atomic Firestore increments.
 * - Load cookbook recipes (optionally filtered by cuisine) and seed recipes.
 * - Synchronize loaded recipes into application state via `StateService`.
 */
export class FirestoreRecipeService {
  /** Firestore collection name used for storing recipes. */
  private readonly collectionName = 'recipes';

  /**
   * Creates the service.
   *
   * @param firestore Firestore instance used for all database operations.
   * @param state State service used to cache and expose loaded recipes.
   */
  constructor(
    private readonly firestore: Firestore,
    private readonly state: StateService,
  ) {}

  /**
   * Returns the Firestore collection reference for recipe documents.
   *
   * @returns A `CollectionReference` for the configured recipes collection.
   */
  private recipesCollection() {
    return collection(this.firestore, this.collectionName);
  }

  /**
   * Returns an existing `recipeSignature` if present; otherwise computes one, assigns it to the
   * recipe object, and returns it.
   *
   * This method mutates `recipe.recipeSignature` when it is missing to avoid recomputation.
   *
   * @param recipe The recipe to read or enrich with a signature.
   * @returns A deterministic signature string for the recipe.
   */
  getOrCreateSignature(recipe: GeneratedRecipe): string {
    if (recipe.recipeSignature) {
      return recipe.recipeSignature;
    }
    const signature = this.buildRecipeSignature(recipe);
    recipe.recipeSignature = signature;
    return signature;
  }

  /**
   * Builds a stable, comparable key from all ingredients.
   *
   * The key is created by:
   * - combining user-provided and extra ingredients
   * - normalizing each ingredient (name, size, unit)
   * - sorting the normalized entries
   * - joining them into a single string
   *
   * @param recipe Recipe whose ingredients are used to build the key.
   * @returns A deterministic string representing the recipe's ingredient set.
   */
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

  /**
   * Normalizes a single ingredient into a stable string representation.
   *
   * Normalization rules:
   * - name is trimmed and lowercased
   * - serving size defaults to 0 if missing
   * - unit prefers abbreviation, then name, otherwise empty string
   *
   * @param ingredient The ingredient to normalize.
   * @returns A normalized string in the form `{name}|{size}|{unit}`.
   */
  private normalizeIngredient(ingredient: RecipeIngredient): string {
    const name = ingredient.ingredient.trim().toLowerCase();
    const size = ingredient.servingSize ?? 0;
    const unit = ingredient.unit?.abbreviation || ingredient.unit?.name || '';
    return `${name}|${size}|${unit}`;
  }

  /**
   * Converts an unknown value into a trimmed, lowercased string in a defensive way.
   *
   * Behavior:
   * - arrays: uses the first element
   * - null/undefined: returns an empty string
   * - everything else: stringifies, trims and lowercases
   *
   * @param value Any value that should be treated as a string.
   * @returns A normalized lowercased string (or empty string).
   */
  private safeLower(value: unknown): string {
    if (Array.isArray(value)) return String(value[0] ?? '').trim().toLowerCase();
    if (value == null) return '';
    return String(value).trim().toLowerCase();
  }

  /**
   * Builds a deterministic signature that identifies a recipe across generations/sessions.
   *
   * The signature is based on:
   * - title
   * - preference fields (cuisine, cooking time, diet preferences)
   * - cooks amount
   * - normalized ingredient key
   *
   * @param recipe Recipe to compute the signature for.
   * @returns A stable signature string used for Firestore lookups.
   */
  private buildRecipeSignature(recipe: GeneratedRecipe): string {
    const title = this.safeLower(recipe.title);
    const prefs = recipe.preferences ?? {};
    const cuisine = this.safeLower((prefs as any).cuisine);
    const time = this.safeLower((prefs as any).cookingTime);
    const diet = this.safeLower((prefs as any).dietPreferences);
    const cooks = String(recipe.cooksAmount ?? 0);
    const ingredientsKey = this.buildIngredientsKey(recipe);
    return [title, cuisine, time, diet, cooks, ingredientsKey].join('||');
  }

  /**
   * Finds a recipe document by its signature.
   *
   * @param signature Deterministic signature used to identify a recipe.
   * @returns The first matching recipe including its Firestore document id, or `null` if none exists.
   */
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
   * Creates a new recipe document in Firestore.
   *
   * @param recipe The recipe to persist.
   * @param signature The recipe signature to store with the document.
   * @param likes Initial likes value to persist.
   * @param options Optional flags (e.g. whether this is a seed recipe).
   * @returns The newly created Firestore document id.
   */
  private async createRecipeDoc(
    recipe: GeneratedRecipe,
    signature: string,
    likes: number,
    options?: { isSeed?: boolean },
  ): Promise<string> {
    const payload: any = this.buildRecipePayload(recipe, signature, likes, options);
    const docRef = await addDoc(this.recipesCollection(), payload);
    return docRef.id;
  }

  /**
   * Builds the payload stored in Firestore for a recipe.
   *
   * Adds/overrides:
   * - `recipeSignature`
   * - `likes`
   * - `isSeedRecipe`
   * - `createdAt`
   *
   * @param recipe The source recipe data.
   * @param signature Deterministic recipe signature.
   * @param likes Likes value to store.
   * @param options Optional flags (e.g. seed recipe marker).
   * @returns A Firestore-ready payload object.
   */
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

  /**
   * Ensures each given recipe is present in Firestore and returns the updated list.
   *
   * Intended use: after generating recipes, you can sync them so each one has a stable document id
   * and signature information.
   *
   * @param recipes List of generated recipes to sync.
   * @returns A list of recipes enriched with persisted ids/signatures/likes.
   */
  async syncGeneratedRecipes(recipes: GeneratedRecipe[]): Promise<GeneratedRecipe[]> {
    const updated: GeneratedRecipe[] = [];

    for (const recipe of recipes) {
      const synced = await this.ensureRecipeInCookbook(recipe, { isSeed: false });
      updated.push(synced);
    }

    return updated;
  }

  /**
   * Ensures a single recipe exists in the cookbook collection.
   *
   * If a recipe with the same signature already exists, it returns a merged representation using
   * the existing document id and likes. Otherwise it creates a new document.
   *
   * @param recipe The recipe to ensure/persist.
   * @param options Optional flags such as whether the created document should be marked as seed.
   * @returns The recipe enriched with `id`, `recipeSignature` and `likes`.
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
    const docId = await this.createRecipeDoc(recipe, signature, likes, options);

    return {
      ...recipe,
      id: docId,
      recipeSignature: signature,
      likes,
    };
  }

  /**
   * Merges a local recipe with an existing Firestore recipe document.
   *
   * The merge prioritizes the incoming recipe fields but ensures:
   * - persisted document id is used
   * - deterministic signature is present
   * - likes are taken from Firestore (fallback 0)
   *
   * @param recipe The local recipe representation.
   * @param existing The Firestore-backed recipe including its document id.
   * @param signature Deterministic recipe signature to apply.
   * @returns A recipe object aligned with the persisted Firestore document.
   */
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

  /**
   * Updates the likes count for a recipe based on the favorite toggle state.
   *
   * Behavior:
   * - Resolves the recipe document via signature (create new doc if missing).
   * - Applies an atomic increment (+1 or -1) to the `likes` field.
   * - Returns the computed new likes count (clamped at 0).
   *
   * @param recipe Recipe whose likes should be updated.
   * @param isFavorite Whether the user marked it as favorite (true => +1, false => -1).
   * @returns The updated likes count.
   */
  async updateLikesForRecipe(recipe: GeneratedRecipe, isFavorite: boolean): Promise<number> {
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

  /**
   * Calculates the increment delta used for likes updates.
   *
   * @param isFavorite If true, like is added; if false, like is removed.
   * @returns `+1` when favorited, otherwise `-1`.
   */
  private getLikesDelta(isFavorite: boolean): number {
    return isFavorite ? 1 : -1;
  }

  /**
   * Computes the new likes count and prevents it from going below 0.
   *
   * @param currentLikes Current likes count.
   * @param delta Increment/decrement value to apply.
   * @returns The resulting likes count, clamped to a minimum of 0.
   */
  private computeNewLikes(currentLikes: number, delta: number): number {
    return Math.max(currentLikes + delta, 0);
  }

  /**
   * Builds a Firestore document reference for the recipes collection.
   *
   * @param id Firestore document id.
   * @returns A `DocumentReference` for the given recipe id.
   */
  private buildDocRef(id: string) {
    return doc(this.firestore, this.collectionName, id);
  }

  /**
   * Handles likes updates for a recipe that does not yet exist in Firestore.
   *
   * Creates a new document with an initial likes value of 1 (if favorited) or 0.
   * Also mutates the passed-in recipe by setting its `id`.
   *
   * @param recipe The local recipe to persist.
   * @param signature Deterministic recipe signature.
   * @param isFavorite Whether the recipe is being favorited.
   * @returns The initial likes value stored for the newly created recipe.
   */
  private async handleNewLikedRecipe(
    recipe: GeneratedRecipe,
    signature: string,
    isFavorite: boolean,
  ): Promise<number> {
    const likes = isFavorite ? 1 : 0;

    const docId = await this.createRecipeDoc(recipe, signature, likes, { isSeed: false });
    recipe.id = docId;
    return likes;
  }

  /**
   * Fetches a recipe by its Firestore document id.
   *
   * @param id Firestore document id.
   * @returns The recipe including its `id`, or `null` if the document does not exist.
   */
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

  /**
   * Loads cookbook recipes from Firestore.
   *
   * If `cuisine` is provided, it filters by `preferences.cuisine`.
   * The resulting list is also written into `StateService.allRecipes`.
   *
   * @param cuisine Optional cuisine filter.
   * @returns Observable that emits the loaded recipes array.
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

  /**
   * Writes the given recipes to the shared application state and returns them unchanged.
   *
   * @param recipes Recipes to store in `StateService.allRecipes`.
   * @returns The same recipe list that was provided.
   */
  private updateStateWithRecipes(recipes: GeneratedRecipe[]): GeneratedRecipe[] {
    this.state.allRecipes = recipes;
    return recipes;
  }

  /**
   * Loads all seed recipes from Firestore.
   *
   * Seed recipes are identified by `isSeedRecipe === true`.
   *
   * @returns Observable that emits the loaded seed recipes array.
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
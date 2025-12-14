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
  CookingTimeCategory,
  Cuisine,
  DietPreference,
  RecipePreferences,
} from '../../models/recipe.model';
import { StateService } from '../state-service/state.service';

@Injectable({ providedIn: 'root' })
/**
 * Firestore persistence layer for recipes.
 *
 * Responsibilities:
 * - Persist generated recipes into a Firestore collection (create or reuse by signature)
 * - Compute a deterministic `recipeSignature` to identify "equivalent" recipes across sessions
 * - Maintain likes using atomic increments
 * - Load cookbook and seed recipes and normalize preference values for UI consistency
 *
 * Notes:
 * - Preferences are canonicalized against UI option sets to keep stored data stable.
 * - Signature generation must remain consistent with what is stored in Firestore.
 */
export class FirestoreRecipeService {
  /** Firestore collection name used for recipe documents. */
  private readonly collectionName = 'recipes';

  /**
   * Creates the service.
   *
   * @param firestore AngularFire Firestore instance.
   * @param state Central application state (used for allowed preference values and caching recipes).
   */
  constructor(
    private readonly firestore: Firestore,
    private readonly state: StateService,
  ) {}

  /**
   * Returns the Firestore collection reference for recipes.
   */
  private recipesCollection() {
    return collection(this.firestore, this.collectionName);
  }

  /**
   * Normalizes an unknown input into a lowercase, trimmed string.
   *
   * - Arrays are treated as "first element"
   * - null/undefined becomes empty string
   */
  private lower(v: unknown): string {
    if (Array.isArray(v)) return String(v[0] ?? '').trim().toLowerCase();
    if (v == null) return '';
    return String(v).trim().toLowerCase();
  }

  /**
   * Helper requested for consistent "safe fallback" behavior.
   *
   * @param value Input value that may be null/undefined/invalid.
   * @param fallback Value returned when `value` is null/undefined.
   */
  private noticeNodeHelper<T>(value: T | null | undefined, fallback: T): T {
    return value ?? fallback;
  }

  /**
   * Returns allowed cuisine values derived from current UI options (lowercased).
   */
  private get allowedCuisines(): Set<string> {
    const items = this.state.preferencesOptions.cuisine.map((c) => this.lower(c.name));
    return new Set(items);
  }

  /**
   * Returns allowed diet preference values derived from current UI options (lowercased).
   */
  private get allowedDietPreferences(): Set<string> {
    const items = (this.state.preferencesOptions.dietPreferences ?? []).map((d) => this.lower(d));
    return new Set(items);
  }

  /**
   * Returns allowed cooking time values derived from current UI options (lowercased).
   */
  private get allowedCookingTimes(): Set<string> {
    const items = this.state.preferencesOptions.times.map((t) => this.lower(t.value));
    return new Set(items);
  }

  /**
   * Resolves a default cuisine that is guaranteed to be within the allowed cuisine set.
   */
  private defaultCuisine(): Cuisine {
    if (this.allowedCuisines.has('fusion')) return 'fusion';
    const first = this.lower(this.state.preferencesOptions.cuisine[0]?.name);
    return (first as Cuisine) || 'fusion';
  }

  /**
   * Resolves a default diet preference that is guaranteed to be within the allowed set.
   */
  private defaultDietPreference(): DietPreference {
    if (this.allowedDietPreferences.has('no preferences')) return 'no preferences';
    const first = this.lower(this.state.preferencesOptions.dietPreferences[0]);
    return (first as DietPreference) || 'no preferences';
  }

  /**
   * Resolves a default cooking time that is guaranteed to be within the allowed set.
   */
  private defaultCookingTime(): CookingTimeCategory {
    if (this.allowedCookingTimes.has('quick')) return 'quick';
    const first = this.lower(this.state.preferencesOptions.times[0]?.value);
    return (first as CookingTimeCategory) || 'quick';
  }

  /**
   * Canonicalizes preferences to stable, allowed values.
   *
   * - Values are lowercased
   * - Values not present in the allowed sets are replaced by defaults
   *
   * @param input Partial preferences from any source (generated recipes, Firestore, etc.).
   */
  private canonicalPreferences(input?: Partial<RecipePreferences>): RecipePreferences {
    const cuisine = this.lower(input?.cuisine);
    const cookingTime = this.lower(input?.cookingTime);
    const diet = this.lower(input?.dietPreferences);

    return {
      cuisine: (this.allowedCuisines.has(cuisine) ? cuisine : this.defaultCuisine()) as Cuisine,
      cookingTime: (this.allowedCookingTimes.has(cookingTime) ? cookingTime : this.defaultCookingTime()) as CookingTimeCategory,
      dietPreferences: (this.allowedDietPreferences.has(diet) ? diet : this.defaultDietPreference()) as DietPreference,
    };
  }

  /**
   * Returns an existing signature on the recipe or computes and stores a new one.
   *
   * @param recipe Recipe object to ensure has a signature.
   */
  getOrCreateSignature(recipe: GeneratedRecipe): string {
    if (recipe.recipeSignature) return recipe.recipeSignature;
    const signature = this.buildRecipeSignature(recipe);
    recipe.recipeSignature = signature;
    return signature;
  }

  /**
   * Normalizes an ingredient into a stable signature fragment.
   */
  private normalizeIngredient(ingredient: RecipeIngredient): string {
    const name = this.lower(ingredient.ingredient);
    const size = ingredient.servingSize ?? 0;
    const unit = this.lower(ingredient.unit?.abbreviation || ingredient.unit?.name || '');
    return `${name}|${size}|${unit}`;
  }

  /**
   * Builds a deterministic ingredient key from both user and extra ingredients.
   */
  private buildIngredientsKey(recipe: GeneratedRecipe): string {
    const yours = recipe.ingredients?.yourIngredients ?? [];
    const extras = recipe.ingredients?.extraIngredients ?? [];
    return [...yours, ...extras].map((i) => this.normalizeIngredient(i)).sort().join(';');
  }

  /**
   * Builds the deterministic recipe signature used for de-duplication.
   *
   * Signature parts:
   * - normalized title
   * - canonicalized preferences (cuisine, cookingTime, dietPreferences)
   * - cooksAmount
   * - normalized ingredient key
   */
  private buildRecipeSignature(recipe: GeneratedRecipe): string {
    const prefs = this.canonicalPreferences(recipe.preferences ?? {});
    const title = this.lower(recipe.title);
    const cooks = String(recipe.cooksAmount ?? 0);
    const ingredientsKey = this.buildIngredientsKey(recipe);
    return [title, prefs.cuisine, prefs.cookingTime, prefs.dietPreferences, cooks, ingredientsKey].join('||');
  }

  /**
   * Finds the first Firestore recipe document with the given signature.
   *
   * @param signature Deterministic recipe signature.
   * @returns Recipe with `id` if found, otherwise `null`.
   */
  private async findBySignature(signature: string): Promise<(GeneratedRecipe & { id: string }) | null> {
    const qRef = query(this.recipesCollection(), where('recipeSignature', '==', signature));
    const snap = await getDocs(qRef);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return { id: docSnap.id, ...(docSnap.data() as GeneratedRecipe) };
  }

  /**
   * Builds the payload shape stored in Firestore.
   *
   * Preferences are canonicalized before persisting.
   */
  private buildRecipePayload(
    recipe: GeneratedRecipe,
    signature: string,
    likes: number,
    options?: { isSeed?: boolean },
  ): any {
    const prefs = this.canonicalPreferences(recipe.preferences ?? {});
    return {
      title: recipe.title,
      cookingTimeText: recipe.cookingTimeText ?? '',
      cookingTimeMinutes: recipe.cookingTimeMinutes ?? null,
      cooksAmount: recipe.cooksAmount,
      nutritionalInformation: recipe.nutritionalInformation,
      preferences: prefs,
      ingredients: recipe.ingredients,
      directions: recipe.directions,
      recipeSignature: signature,
      likes,
      isSeedRecipe: options?.isSeed ?? false,
      createdAt: Timestamp.now(),
    };
  }

  /**
   * Creates a new recipe document in Firestore.
   *
   * @returns The created document id.
   */
  private async createRecipeDoc(
    recipe: GeneratedRecipe,
    signature: string,
    likes: number,
    options?: { isSeed?: boolean },
  ): Promise<string> {
    const payload = this.buildRecipePayload(recipe, signature, likes, options);
    const docRef = await addDoc(this.recipesCollection(), payload);
    return docRef.id;
  }

  /**
   * Ensures all provided recipes exist in the cookbook, returning updated recipe objects.
   *
   * @param recipes Generated recipes to sync into Firestore.
   */
  async syncGeneratedRecipes(recipes: GeneratedRecipe[]): Promise<GeneratedRecipe[]> {
    const list = recipes ?? [];
    const out: GeneratedRecipe[] = [];
    for (const recipe of list) out.push(await this.ensureRecipeInCookbook(recipe, { isSeed: false }));
    return out;
  }

  /**
   * Ensures a single recipe exists in Firestore, reusing an existing document if present.
   *
   * @param recipe Recipe to ensure exists.
   * @param options Optional flags (e.g. seed recipe).
   */
  async ensureRecipeInCookbook(recipe: GeneratedRecipe, options?: { isSeed?: boolean }): Promise<GeneratedRecipe> {
    const signature = this.getOrCreateSignature(recipe);
    const existing = await this.findBySignature(signature);
    if (existing) return this.mergeExistingRecipe(recipe, existing, signature);

    const likes = recipe.likes ?? 0;
    const id = await this.createRecipeDoc(recipe, signature, likes, options);
    return { ...recipe, id, recipeSignature: signature, likes };
  }

  /**
   * Merges an existing Firestore recipe identity (id/likes/signature) into a local recipe object.
   */
  private mergeExistingRecipe(
    recipe: GeneratedRecipe,
    existing: GeneratedRecipe & { id: string },
    signature: string,
  ): GeneratedRecipe {
    const likes = existing.likes ?? 0;
    return { ...recipe, id: existing.id, recipeSignature: signature, likes };
  }

  /**
   * Builds a document reference for a recipe id.
   */
  private buildDocRef(id: string) {
    return doc(this.firestore, this.collectionName, id);
  }

  /**
   * Computes the likes delta for a favorite toggle.
   */
  private likesDelta(isFavorite: boolean): number {
    return isFavorite ? 1 : -1;
  }

  /**
   * Creates a recipe document when a like toggle occurs on a recipe not yet stored.
   */
  private async createLikedRecipe(recipe: GeneratedRecipe, signature: string, isFavorite: boolean): Promise<number> {
    const likes = isFavorite ? 1 : 0;
    const id = await this.createRecipeDoc(recipe, signature, likes, { isSeed: false });
    recipe.id = id;
    return likes;
  }

  /**
   * Updates likes for an existing recipe document and returns the new likes count.
   */
  private async updateExistingLikes(existingId: string, currentLikes: number, delta: number): Promise<number> {
    const next = Math.max(currentLikes + delta, 0);
    await updateDoc(this.buildDocRef(existingId), { likes: increment(delta) });
    return next;
  }

  /**
   * Updates Firestore likes for a recipe when the user toggles favorite.
   *
   * - If the recipe does not exist yet: creates it with likes 1 or 0
   * - If it exists: increments/decrements likes atomically
   *
   * @param recipe Recipe to like/unlike.
   * @param isFavorite Whether the recipe is being favorited (true) or unfavorited (false).
   * @returns The computed new likes count.
   */
  async updateLikesForRecipe(recipe: GeneratedRecipe, isFavorite: boolean): Promise<number> {
    const signature = this.getOrCreateSignature(recipe);
    const existing = await this.findBySignature(signature);
    const delta = this.likesDelta(isFavorite);

    if (!existing) return this.createLikedRecipe(recipe, signature, isFavorite);

    const currentLikes = this.noticeNodeHelper(existing.likes, 0);
    return this.updateExistingLikes(existing.id, currentLikes, delta);
  }

  /**
   * Loads a single recipe by Firestore document id.
   *
   * @param id Firestore document id.
   * @returns The recipe or `null` if the document does not exist.
   */
  async getRecipeById(id: string): Promise<GeneratedRecipe | null> {
    const snap = await getDoc(this.buildDocRef(id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as GeneratedRecipe) };
  }

  /**
   * Canonicalizes preferences for a list of recipes and writes them into state.
   */
  private canonicalizeAndStore(recipes: GeneratedRecipe[]): GeneratedRecipe[] {
    const cleaned = (recipes ?? []).map((r) => ({
      ...r,
      preferences: this.canonicalPreferences(r.preferences ?? {}),
    }));
    this.state.allRecipes = cleaned;
    return cleaned;
  }

  /**
   * Loads cookbook recipes, optionally filtered by cuisine.
   *
   * @param cuisine Optional cuisine filter.
   * @returns Observable emitting the loaded recipes (with canonicalized preferences).
   */
  loadCookbook(cuisine?: string): Observable<GeneratedRecipe[]> {
    const cuisineKey = cuisine ? this.lower(cuisine) : '';
    const base = this.recipesCollection();
    const ref = cuisineKey ? query(base, where('preferences.cuisine', '==', cuisineKey)) : base;

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
      map((recipes) => this.canonicalizeAndStore(recipes)),
    );
  }

  /**
   * Canonicalizes preferences for a list of recipes without touching global state.
   */
  private canonicalizeOnly(recipes: GeneratedRecipe[]): GeneratedRecipe[] {
    return (recipes ?? []).map((r) => ({
      ...r,
      preferences: this.canonicalPreferences(r.preferences ?? {}),
    }));
  }

  /**
   * Loads seed recipes from Firestore.
   *
   * @returns Observable emitting seed recipes (with canonicalized preferences).
   */
  loadSeedRecipes(): Observable<GeneratedRecipe[]> {
    const qRef = query(this.recipesCollection(), where('isSeedRecipe', '==', true));
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
      map((recipes) => this.canonicalizeOnly(recipes)),
    );
  }
}
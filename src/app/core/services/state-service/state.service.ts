import { Injectable } from '@angular/core';
import { GeneratedRecipe, RecipeRequirements, QuotaInfo } from '../../models/recipe.model';

@Injectable({
  providedIn: 'root',
})
/**
 * Central in-memory application state for the recipe generator.
 *
 * This service acts as a lightweight store to share data between components/services without
 * additional state management libraries.
 *
 * Stored state includes:
 * - Current recipe requirements (user inputs / preferences)
 * - Recently generated recipes (current session results)
 * - All recipes loaded from persistence (cookbook)
 * - UI option metadata for selectable preferences (time, cuisine, diet)
 * - Current quota information (if provided by backend)
 *
 * Note: This is ephemeral state. It resets on page reload unless persisted elsewhere.
 */
export class StateService {
  /**
   * Current requirements used when requesting recipe generation.
   *
   * Defaults represent the initial UI state.
   */
  recipeRequirements: RecipeRequirements = {
    /** Selected ingredients used to generate a recipe. */
    ingredients: [],
    /** Number of portions the recipe should yield. */
    portionsAmount: 2,
    /** Number of cooks (used for scaling or instructions, depending on backend logic). */
    cooksAmount: 1,
    /** Desired cooking time category. */
    cookingTime: 'quick',
    /** Desired cuisine (empty string means "not selected"). */
    cuisine: '',
    /** Dietary preference (empty string means "not selected"). */
    dietPreferences: '',
  };

  /**
   * Recipes returned by the most recent generation request.
   *
   * Typically set after calling the generation webhook and syncing results.
   */
  generatedRecipes: GeneratedRecipe[] = [];

  /**
   * Full recipe list loaded from persistence (e.g. Firestore cookbook).
   *
   * This is usually updated when the cookbook page is opened or refreshed.
   */
  allRecipes: GeneratedRecipe[] = [];

  /**
   * Options used to render preference selection UI.
   *
   * Includes:
   * - time presets with labels and descriptions
   * - cuisine presets with image assets and emojis
   * - diet preferences as a simple list
   */
  preferencesOptions = {
    /** Cooking time selection options. */
    times: [
      { value: 'quick', label: 'Quick', description: 'up to 20min' },
      { value: 'medium', label: 'Medium', description: '25–40min' },
      { value: 'complex', label: 'Complex', description: 'over 45min' },
    ],
    /** Cuisine selection options (used for UI rendering). */
    cuisine: [
      {
        name: 'german',
        thumbnail_img: 'img/german.png',
        header_img: 'img/german_header.png',
        emoji: '🥨',
      },
      {
        name: 'italian',
        thumbnail_img: 'img/italian.png',
        header_img: 'img/italian_header.png',
        emoji: '🤌',
      },
      {
        name: 'indian',
        thumbnail_img: 'img/indian.png',
        header_img: 'img/indian_header.png',
        emoji: '🍛',
      },
      {
        name: 'japanese',
        thumbnail_img: 'img/japanese.png',
        header_img: 'img/japanese_header.png',
        emoji: '🥢',
      },
      {
        name: 'gourmet',
        thumbnail_img: 'img/gourmet.png',
        header_img: 'img/gourmet_header.png',
        emoji: '✨',
      },
      {
        name: 'fusion',
        thumbnail_img: 'img/fusion.png',
        header_img: 'img/fusion_header.png',
        emoji: '🍢',
      },
    ],
    /** Dietary preference options. */
    dietPreferences: ['vegetarian', 'vegan', 'keto', 'no preferences'],
  };

  /**
   * Current quota information, if provided by the backend.
   *
   * `null` indicates quota has not been loaded yet or is not applicable.
   */
  quota: QuotaInfo | null = null;

  /**
   * Creates the state service.
   *
   * Note: This service currently stores only in-memory state and therefore
   * does not require any injected dependencies.
   */
  constructor() {}
}
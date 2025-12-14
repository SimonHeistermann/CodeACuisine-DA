import { Injectable } from '@angular/core';
import {
  GeneratedRecipe,
  RecipeRequirements,
  QuotaInfo,
} from '../../models/recipe.model';

/**
 * Snapshot type representing the minimal set of recipe requirements
 * needed for displaying tags and metadata in the results UI.
 *
 * This intentionally excludes ingredients so UI tags remain stable
 * even after inputs are reset.
 */
type RecipeRequirementsSnapshot = Pick<
  RecipeRequirements,
  'cookingTime' | 'cuisine' | 'dietPreferences' | 'portionsAmount' | 'cooksAmount'
>;

@Injectable({ providedIn: 'root' })
/**
 * Central in-memory state service for the recipe application.
 *
 * This service acts as a lightweight, shared store between components
 * and services without introducing a full state management library.
 *
 * Responsibilities:
 * - Hold the current recipe input requirements
 * - Store generated recipes from the latest generation run
 * - Cache all cookbook recipes loaded from Firestore
 * - Preserve a snapshot of the last successful generation inputs
 * - Store quota information returned by the backend
 *
 * Note:
 * - All state stored here is ephemeral and will reset on page reload.
 */
export class StateService {
  /**
   * Current recipe requirements used as input for generation.
   *
   * These values are directly mutated by UI components.
   */
  recipeRequirements: RecipeRequirements = {
    ingredients: [],
    portionsAmount: 2,
    cooksAmount: 1,
    cookingTime: 'quick',
    cuisine: '',
    dietPreferences: '',
  };

  /**
   * Recipes returned by the most recent successful generation.
   */
  generatedRecipes: GeneratedRecipe[] = [];

  /**
   * All recipes loaded from Firestore (cookbook view).
   */
  allRecipes: GeneratedRecipe[] = [];

  /**
   * Snapshot of the requirements used for the last successful generation.
   *
   * This snapshot is primarily used for rendering result UI tags,
   * ensuring they remain visible even after input fields are reset.
   */
  lastGeneratedRequirements: RecipeRequirementsSnapshot | null = null;

  /**
   * Static configuration used to render preference selection UI.
   *
   * Includes:
   * - Cooking time options
   * - Cuisine metadata (images + emojis)
   * - Diet preference options
   */
  preferencesOptions = {
    times: [
      { value: 'quick', label: 'Quick', description: 'up to 20min' },
      { value: 'medium', label: 'Medium', description: '25–40min' },
      { value: 'complex', label: 'Complex', description: 'over 45min' },
    ],
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
    dietPreferences: ['vegetarian', 'vegan', 'keto', 'no preferences'],
  };

  /**
   * Current quota information returned by the backend.
   *
   * `null` indicates that no quota data has been loaded yet.
   */
  quota: QuotaInfo | null = null;

  /**
   * Creates a snapshot of the currently selected recipe requirements.
   *
   * Intended usage:
   * - Call immediately after a fully successful generation + Firestore sync
   * - Store the result in `lastGeneratedRequirements`
   * - Reset inputs afterwards without affecting result UI tags
   *
   * @returns A snapshot containing only the relevant requirement fields.
   */
  snapshotCurrentRequirements(): RecipeRequirementsSnapshot {
    const r = this.recipeRequirements;
    return {
      cookingTime: r.cookingTime,
      cuisine: r.cuisine,
      dietPreferences: r.dietPreferences,
      portionsAmount: r.portionsAmount,
      cooksAmount: r.cooksAmount,
    };
  }

  /**
   * Resets recipe input requirements to their default values.
   *
   * IMPORTANT:
   * - Call this ONLY after a fully successful generation and persistence step.
   * - Do not call before storing `lastGeneratedRequirements`,
   *   otherwise result UI tags will be lost.
   */
  resetRecipeRequirements(): void {
    this.recipeRequirements = {
      ingredients: [],
      portionsAmount: 2,
      cooksAmount: 1,
      cookingTime: 'quick',
      cuisine: '',
      dietPreferences: '',
    };
  }

  /**
   * Creates the state service.
   *
   * Note: This service has no dependencies and stores state purely in memory.
   */
  constructor() {}
}
import { Routes } from '@angular/router';
import { HeroComponent } from './features/hero/hero.component';
import { GenerateRecipeComponent } from './features/new-recipe/generate-recipe/generate-recipe.component';
import { PreferencesComponent } from './features/new-recipe/preferences/preferences.component';
import { GeneratingScreenComponent } from './features/new-recipe/generating-screen/generating-screen.component';
import { RecipeResultsComponent } from './features/new-recipe/recipe-results/recipe-results.component';
import { RecipeDetailComponent } from './features/recipe-detail/recipe-detail.component';
import { CookbookComponent } from './features/cookbook/cookbook.component';
import { RecipesListComponent } from './features/recipes-list/recipes-list.component';
import { ImprintComponent } from './shared/imprint/imprint.component';

/**
 * Application route configuration.
 *
 * Defines all navigable routes of the application and maps them
 * to their corresponding standalone components.
 *
 * Route structure overview:
 * - Landing & generation flow
 * - Cookbook browsing & recipe details
 * - Static legal pages
 * - Fallback redirect for unknown routes
 */
export const routes: Routes = [
  /**
   * Landing page (hero section).
   */
  { path: '', component: HeroComponent },

  /**
   * Step 1: Ingredient input for a new recipe.
   */
  { path: 'generate-recipe', component: GenerateRecipeComponent },

  /**
   * Step 2: Preference selection before generation.
   */
  { path: 'preferences', component: PreferencesComponent },

  /**
   * Intermediate loading screen shown while recipes are being generated.
   */
  { path: 'generating', component: GeneratingScreenComponent },

  /**
   * Displays the list of generated recipes for the current session.
   */
  { path: 'recipe-results', component: RecipeResultsComponent },

  /**
   * Displays the details of a generated recipe.
   *
   * @param id Firestore document id of the recipe.
   */
  { path: 'recipe-results/:id', component: RecipeDetailComponent },

  /**
   * Cookbook overview page.
   */
  { path: 'cookbook', component: CookbookComponent },

  /**
   * Paginated list of cookbook recipes filtered by cuisine.
   *
   * @param cuisineName Cuisine identifier.
   */
  { path: 'cookbook/cuisine/:cuisineName', component: RecipesListComponent },

  /**
   * Displays the details of a cookbook recipe.
   *
   * @param id Firestore document id of the recipe.
   */
  { path: 'cookbook/:id', component: RecipeDetailComponent },

  /**
   * Legal imprint / legal notice page.
   */
  { path: 'imprint', component: ImprintComponent },

  /**
   * Wildcard route.
   *
   * Redirects all unknown paths back to the landing page.
   */
  { path: '**', redirectTo: '' },
];
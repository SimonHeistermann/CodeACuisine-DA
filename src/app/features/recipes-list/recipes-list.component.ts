import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { take } from 'rxjs';

import { GeneratedRecipe } from '../../core/models/recipe.model';
import { StateService } from '../../core/services/state-service/state.service';
import { FirestoreRecipeService } from '../../core/services/firebase-recipe-service/firebase-recipe.service';

/**
 * Union type used by the pagination control.
 *
 * - `number` represents a concrete page number.
 * - `'ellipsis'` represents a non-clickable placeholder between page ranges.
 */
type PageItem = number | 'ellipsis';

@Component({
  selector: 'app-recipes-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TitleCasePipe],
  templateUrl: './recipes-list.component.html',
  styleUrl: './recipes-list.component.scss',
})
/**
 * Displays a paginated list of cookbook recipes for a specific cuisine.
 *
 * Responsibilities:
 * - Read `cuisineName` from the route
 * - Load and sort recipes for that cuisine from Firestore
 * - Provide pagination (page size, page navigation and page-item rendering)
 * - Provide cuisine meta (display name and header image) via `StateService` options
 * - Navigate to recipe detail when a recipe is selected
 */
export class RecipesListComponent implements OnInit {
  /** Cuisine name taken from the route parameter (required). */
  cuisineName!: string;

  /** Display name used in the UI (derived from cuisine meta, fallback to route value). */
  cuisineDisplayName = '';

  /** Optional cuisine header image path derived from cuisine meta. */
  cuisineHeaderImg?: string;

  /**
   * Internal full recipe list for the selected cuisine.
   * This is the source for pagination slicing.
   */
  private allRecipes: GeneratedRecipe[] = [];

  /** Recipes displayed on the current page. */
  paginatedRecipes: GeneratedRecipe[] = [];

  /** Indicates whether the cuisine recipes are currently being loaded. */
  isLoading = false;

  /** Number of recipes per page. */
  readonly pageSize = 15;

  /** Current pagination page (1-based). */
  currentPage = 1;

  /** Total number of pages derived from `allRecipes.length` and `pageSize`. */
  totalPages = 1;

  /**
   * Creates the recipes list component.
   *
   * @param route Activated route used to read the cuisine route parameter.
   * @param router Angular router used for navigation.
   * @param firestoreRecipes Service used to load cookbook recipes from Firestore.
   * @param state Central state service containing cuisine meta configuration.
   */
  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly firestoreRecipes: FirestoreRecipeService,
    private readonly state: StateService,
  ) {}

  /**
   * Angular lifecycle hook.
   *
   * Subscribes to route parameter changes so navigating between cuisines
   * re-initializes the component state and reloads the recipes.
   */
  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const name = params.get('cuisineName');
      if (!name) {
        this.router.navigate(['/cookbook']);
        return;
      }

      this.cuisineName = name;
      this.currentPage = 1;
      this.initCuisineMeta(name);
      this.loadRecipesForCuisine(name);
    });
  }

  /**
   * Initializes display metadata for the selected cuisine.
   *
   * @param name Cuisine name (route param).
   */
  private initCuisineMeta(name: string): void {
    const meta = this.state.preferencesOptions.cuisine.find((c) => c.name === name);

    this.cuisineDisplayName = meta?.name ?? name;
    this.cuisineHeaderImg = meta?.header_img;
  }

  /**
   * Loads cookbook recipes filtered by cuisine and prepares pagination.
   *
   * Recipes are sorted descending by likes before pagination is applied.
   *
   * @param name Cuisine name used to load recipes.
   */
  private loadRecipesForCuisine(name: string): void {
    this.isLoading = true;

    this.firestoreRecipes
      .loadCookbook(name)
      .pipe(take(1))
      .subscribe({
        next: (recipes) => {
          this.allRecipes = [...recipes].sort(
            (a, b) => (b.likes ?? 0) - (a.likes ?? 0),
          );

          this.totalPages =
            this.allRecipes.length > 0
              ? Math.ceil(this.allRecipes.length / this.pageSize)
              : 1;

          this.applyPagination();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading recipes for cuisine', name, error);
          this.allRecipes = [];
          this.paginatedRecipes = [];
          this.totalPages = 1;
          this.isLoading = false;
        },
      });
  }

  /**
   * Returns the number of items before the first element on the current page.
   *
   * Useful for computing list indices like `#16` on page 2 with page size 15.
   */
  get indexOffset(): number {
    return (this.currentPage - 1) * this.pageSize;
  }

  /**
   * Applies pagination by slicing `allRecipes` into `paginatedRecipes`
   * based on the current page and page size.
   */
  private applyPagination(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedRecipes = this.allRecipes.slice(startIndex, startIndex + this.pageSize);
  }

  /**
   * Navigates to the detail view for the selected recipe.
   *
   * @param recipe Recipe to open.
   */
  openRecipe(recipe: GeneratedRecipe): void {
    if (!recipe.id) return;
    this.router.navigate(['/cookbook', recipe.id]);
  }

  /**
   * Builds the pagination items used for rendering the paginator.
   *
   * The output contains page numbers and optionally ellipses to keep the paginator compact.
   */
  get pageItems(): PageItem[] {
    if (this.totalPages <= 5) {
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    if (this.currentPage <= 3) {
      return [1, 2, 3, 'ellipsis', this.totalPages];
    }

    if (this.currentPage >= this.totalPages - 2) {
      return [1, 'ellipsis', this.totalPages - 2, this.totalPages - 1, this.totalPages];
    }

    return [
      1,
      'ellipsis',
      this.currentPage - 1,
      this.currentPage,
      this.currentPage + 1,
      'ellipsis',
      this.totalPages,
    ];
  }

  /**
   * Navigates to a specific page when a page item is clicked.
   *
   * Clicking an ellipsis has no effect.
   *
   * @param page Selected page item.
   */
  goToPage(page: PageItem): void {
    if (page === 'ellipsis') {
      return;
    }
    const pageNumber = page as number;
    if (
      pageNumber < 1 ||
      pageNumber > this.totalPages ||
      pageNumber === this.currentPage
    ) {
      return;
    }
    this.currentPage = pageNumber;
    this.applyPagination();
  }

  /**
   * Navigates to the previous page (if possible) and reapplies pagination.
   */
  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.applyPagination();
    }
  }

  /**
   * Navigates to the next page (if possible) and reapplies pagination.
   */
  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.applyPagination();
    }
  }

  /**
   * TrackBy function for recipe list rendering.
   *
   * Prefers stable identifiers in the following order:
   * - Firestore document id
   * - deterministic recipe signature
   * - list index fallback
   *
   * @param index List index.
   * @param recipe Recipe item.
   * @returns A stable string identifier for Angular change detection.
   */
  trackByRecipe(index: number, recipe: GeneratedRecipe): string {
    return recipe.id ?? recipe.recipeSignature ?? String(index);
  }

  /**
   * Indicates whether a recipe has a meaningful diet preference.
   *
   * `'no preferences'` is treated as "no diet preference".
   *
   * @param recipe Recipe to check.
   * @returns True if the recipe has a diet preference that should be displayed.
   */
  hasDietPreference(recipe: GeneratedRecipe): boolean {
    const pref = recipe.preferences?.dietPreferences;
    return !!pref && pref !== 'no preferences';
  }
}
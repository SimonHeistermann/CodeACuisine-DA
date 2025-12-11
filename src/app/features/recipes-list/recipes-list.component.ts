import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { take } from 'rxjs';

import { GeneratedRecipe } from '../../core/models/recipe.model';
import { StateService } from '../../core/services/state-service/state.service';
import { FirestoreRecipeService } from '../../core/services/firebase-recipe-service/firebase-recipe.service';

type PageItem = number | 'ellipsis';

@Component({
  selector: 'app-recipes-list',
  standalone: true,
  imports: [CommonModule, RouterModule, TitleCasePipe],
  templateUrl: './recipes-list.component.html',
  styleUrl: './recipes-list.component.scss',
})
export class RecipesListComponent implements OnInit {
  cuisineName!: string;
  cuisineDisplayName = '';
  cuisineHeaderImg?: string;

  private allRecipes: GeneratedRecipe[] = [];
  paginatedRecipes: GeneratedRecipe[] = [];

  isLoading = false;

  readonly pageSize = 15;
  currentPage = 1;
  totalPages = 1;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly firestoreRecipes: FirestoreRecipeService,
    private readonly state: StateService,
  ) {}

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

  private initCuisineMeta(name: string): void {
    const meta = this.state.preferencesOptions.cuisine.find(
      (c) => c.name === name,
    );

    this.cuisineDisplayName = meta?.name ?? name;
    this.cuisineHeaderImg = meta?.header_img;
  }

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

  get indexOffset(): number {
    return (this.currentPage - 1) * this.pageSize;
  }

  private applyPagination(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedRecipes = this.allRecipes.slice(
      startIndex,
      startIndex + this.pageSize,
    );
  }

  openRecipe(recipe: GeneratedRecipe): void {
    if (!recipe.id) return;
    this.router.navigate(['/cookbook', recipe.id]);
  }

  // ========= Pagination-Logik =========

  get pageItems(): PageItem[] {
    if (this.totalPages <= 5) {
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    if (this.currentPage <= 3) {
      return [1, 2, 3, 'ellipsis', this.totalPages];
    }

    if (this.currentPage >= this.totalPages - 2) {
      return [
        1,
        'ellipsis',
        this.totalPages - 2,
        this.totalPages - 1,
        this.totalPages,
      ];
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

  // nimmt jetzt PageItem und sortiert selbst aus
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

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.applyPagination();
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.applyPagination();
    }
  }

  trackByRecipe(index: number, recipe: GeneratedRecipe): string {
    return recipe.id ?? recipe.recipeSignature ?? String(index);
  }

  hasDietPreference(recipe: GeneratedRecipe): boolean {
    const pref = recipe.preferences?.dietPreferences;
    return !!pref && pref !== 'no preferences';
  }
}
import { Component, ElementRef, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';

import {
  UiIngredient,
  UnitOfMeasurement,
  RecipeRequirements,
} from '../../../core/models/recipe.model';
import { ToastOverlayComponent } from '../../../shared/toast-overlay/toast-overlay.component';
import { StateService } from '../../../core/services/state-service/state.service';
import { IngredientAutocompleteService } from '../../../core/services/ingredient-autocomplete-service/ingredient-autocomplete.service';

@Component({
  selector: 'app-generate-recipe',
  standalone: true,
  imports: [RouterModule, FormsModule, ToastOverlayComponent],
  templateUrl: './generate-recipe.component.html',
  styleUrl: './generate-recipe.component.scss',
})
export class GenerateRecipeComponent {
  readonly unitsOfMeasurement: UnitOfMeasurement[] = [
    { name: 'gram', abbreviation: 'g' },
    { name: 'ml', abbreviation: 'ml' },
    { name: 'piece', abbreviation: '' },
  ];

  readonly defaultServingSize = 100;

  isDropdownOpen = false;
  selectedUnit: UnitOfMeasurement = this.unitsOfMeasurement[0];
  servingSize = this.defaultServingSize;

  ingredientName = '';
  ingredientSuggestions: string[] = [];
  inlineSuggestion = '';

  constructor(
    private readonly state: StateService,
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly ingredientAutocomplete: IngredientAutocompleteService,
  ) {}

  get recipeRequirements(): RecipeRequirements {
    return this.state.recipeRequirements;
  }

  private get ingredients(): UiIngredient[] {
    return this.state.recipeRequirements.ingredients;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isClickInsideComponent(event)) {
      this.closeAllDropdowns();
      this.ingredientSuggestions = [];
      this.inlineSuggestion = '';
    }
  }

  toggleDropdown(event: MouseEvent): void {
    this.isDropdownOpen = !this.isDropdownOpen;
    event.stopPropagation();
  }

  selectUnit(unit: UnitOfMeasurement, event: MouseEvent): void {
    this.selectedUnit = unit;
    this.closeMainDropdown(event);
  }

  onIngredientInputChange(): void {
    const query = this.ingredientName;
    if (!query) {
      this.ingredientSuggestions = [];
      this.inlineSuggestion = '';
      return;
    }
    this.ingredientSuggestions = this.ingredientAutocomplete.search(query, 3);
    this.inlineSuggestion = this.buildInlineSuggestion(query);
  }

  private buildInlineSuggestion(query: string): string {
    const first = this.ingredientSuggestions[0];
    if (!first) return '';
    const normalizedQuery = query.toLowerCase();
    const normalizedFirst = first.toLowerCase();
    if (!normalizedFirst.startsWith(normalizedQuery)) {
      return '';
    }
    const completion = first.slice(query.length);
    if (!completion) return '';
    return query + completion;
  }
  

  applySuggestion(suggestion: string): void {
    this.ingredientName = suggestion;
    this.ingredientSuggestions = [];
    this.inlineSuggestion = '';
  }

  onSubmit(form: NgForm): void {
    const ingredient = this.buildIngredientFromForm();
    if (!ingredient) return;

    this.prependIngredient(ingredient);
    this.resetForm(form);
  }

  toggleEditModeForIngredient(ingredient: UiIngredient): void {
    if (!ingredient.isEditMode) {
      ingredient.isEditMode = true;
      return;
    }
    this.commitIngredientEdit(ingredient);
  }

  onEditEnter(ingredient: UiIngredient, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (ingredient.isEditMode) {
      this.toggleEditModeForIngredient(ingredient);
    }
  }

  toggleIngredientUnitDropdown(
    ingredient: UiIngredient,
    event: MouseEvent,
  ): void {
    ingredient.isUnitDropdownOpen = !ingredient.isUnitDropdownOpen;
    event.stopPropagation();
  }

  selectUnitForIngredient(
    ingredient: UiIngredient,
    unit: UnitOfMeasurement,
    event: MouseEvent,
  ): void {
    ingredient.unit = unit;
    ingredient.isUnitDropdownOpen = false;
    event.stopPropagation();
  }

  deleteIngredient(ingredient: UiIngredient): void {
    const index = this.ingredients.indexOf(ingredient);
    if (index > -1) {
      this.ingredients.splice(index, 1);
    }
  }

  private isClickInsideComponent(event: MouseEvent): boolean {
    const target = event.target as Node | null;
    if (!target) return false;

    return this.elementRef.nativeElement.contains(target);
  }

  private closeAllDropdowns(): void {
    this.isDropdownOpen = false;
    this.closeIngredientDropdowns();
  }

  private closeIngredientDropdowns(): void {
    this.ingredients.forEach(
      (ingredient) => (ingredient.isUnitDropdownOpen = false),
    );
  }

  private closeMainDropdown(event: MouseEvent): void {
    this.isDropdownOpen = false;
    event.stopPropagation();
  }

  private buildIngredientFromForm(): UiIngredient | null {
    const name = this.ingredientName.trim();
    const size = Number(this.servingSize);
    if (this.isInvalidIngredient(name, size)) return null;

    return {
      ingredient: name,
      servingSize: size,
      unit: this.selectedUnit,
      isEditMode: false,
      isUnitDropdownOpen: false,
    };
  }

  private prependIngredient(ingredient: UiIngredient): void {
    this.state.recipeRequirements.ingredients = [
      ingredient,
      ...this.ingredients,
    ];
  }

  private resetForm(form: NgForm): void {
    this.ingredientName = '';
    this.servingSize = this.defaultServingSize;
    this.selectedUnit = this.unitsOfMeasurement[0];
    this.ingredientSuggestions = [];
    this.inlineSuggestion = '';
    form.resetForm({
      servingSize: this.servingSize,
    });
  }

  private commitIngredientEdit(ingredient: UiIngredient): void {
    const name = ingredient.ingredient.trim();
    const size = Number(ingredient.servingSize);
    if (this.isInvalidIngredient(name, size)) {
      this.deleteIngredient(ingredient);
      return;
    }
    ingredient.servingSize = size;
    ingredient.isUnitDropdownOpen = false;
    ingredient.isEditMode = false;
  }

  private isInvalidIngredient(name: string, size: number): boolean {
    return !name || !size || Number.isNaN(size) || size <= 0;
    }
}
import { Component, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';

import {
  UiIngredient,
  UnitOfMeasurement,
  RecipeRequirements,
} from '../../../core/models/recipe.model';
import { StateService } from '../../../core/services/state-service/state.service';
import { IngredientAutocompleteService } from '../../../core/services/ingredient-autocomplete-service/ingredient-autocomplete.service';

@Component({
  selector: 'app-generate-recipe',
  standalone: true,
  imports: [RouterModule, FormsModule],
  templateUrl: './generate-recipe.component.html',
  styleUrl: './generate-recipe.component.scss',
})
/**
 * Component responsible for building recipe input data.
 *
 * Responsibilities:
 * - Manage ingredient input (name, unit, serving size)
 * - Provide autocomplete suggestions while typing ingredients
 * - Handle dropdown interactions and inline suggestions
 * - Synchronize user input with the central `StateService`
 *
 * This component focuses purely on UI interaction and state mutation.
 * Recipe generation itself is handled by dedicated services.
 */
export class GenerateRecipeComponent {
  /**
   * Supported units of measurement for ingredient quantities.
   */
  readonly unitsOfMeasurement: UnitOfMeasurement[] = [
    { name: 'gram', abbreviation: 'g' },
    { name: 'ml', abbreviation: 'ml' },
    { name: 'piece', abbreviation: '' },
  ];

  /** Indicates whether the main unit dropdown is open. */
  isDropdownOpen = false;

  /** Currently selected unit for the ingredient being entered. */
  selectedUnit: UnitOfMeasurement = this.unitsOfMeasurement[0];

  /**
   * Current serving size input value.
   *
   * Kept as `null` by default so the UI shows only the placeholder
   * until the user enters a value.
   */
  servingSize: number | null = null;

  /** Current ingredient name input value. */
  ingredientName = '';

  /** List of autocomplete suggestions for the ingredient input. */
  ingredientSuggestions: string[] = [];

  /** Inline (ghost text) suggestion appended to the current input. */
  inlineSuggestion = '';

  /**
   * Creates the generate-recipe component.
   *
   * @param state Central application state service.
   * @param ingredientAutocomplete Service providing ingredient autocomplete suggestions.
   */
  constructor(
    private readonly state: StateService,
    private readonly ingredientAutocomplete: IngredientAutocompleteService,
  ) {}

  /**
   * Exposes the current recipe requirements from application state.
   */
  get recipeRequirements(): RecipeRequirements {
    return this.state.recipeRequirements;
  }

  /**
   * Returns the ingredient list currently stored in the recipe requirements.
   */
  private get ingredients(): UiIngredient[] {
    return this.state.recipeRequirements.ingredients;
  }

  /**
   * Global document click listener.
   *
   * Closes dropdowns and suggestions when the user clicks outside
   * of dropdowns / ingredient input areas.
   *
   * @param event Mouse click event.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (this.isClickInsideAnyUnitDropdown(target)) return;
    if (this.isClickInsideIngredientAutocomplete(target)) return;
    this.closeAllDropdowns();
    this.ingredientSuggestions = [];
    this.inlineSuggestion = '';
  }

  /**
   * Checks whether the click target is inside a unit dropdown element.
   *
   * @param target Click target element.
   * @returns True if click happened inside a unit dropdown.
   */
  private isClickInsideAnyUnitDropdown(target: HTMLElement): boolean {
    return Boolean(target.closest('.generate__pill-dropdown'));
  }

  /**
   * Checks whether the click target is inside the ingredient autocomplete area.
   *
   * @param target Click target element.
   * @returns True if click happened inside the ingredient input wrapper.
   */
  private isClickInsideIngredientAutocomplete(target: HTMLElement): boolean {
    return Boolean(target.closest('.generate__ingredient-input-wrapper'));
  }

  /**
   * Toggles the main unit selection dropdown.
   *
   * @param event Mouse click event.
   */
  toggleDropdown(event: MouseEvent): void {
    this.isDropdownOpen = !this.isDropdownOpen;
    event.stopPropagation();
  }

  /**
   * Selects a unit of measurement for the ingredient input.
   *
   * @param unit Selected unit.
   * @param event Mouse click event.
   */
  selectUnit(unit: UnitOfMeasurement, event: MouseEvent): void {
    this.selectedUnit = unit;
    this.closeMainDropdown(event);
  }

  /**
   * Handles changes to the ingredient name input.
   *
   * Updates autocomplete suggestions and inline completion text.
   */
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

  /**
   * Builds an inline suggestion string that completes the current query
   * using the first autocomplete suggestion.
   *
   * @param query Current ingredient input.
   * @returns Inline completion string or an empty string if not applicable.
   */
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

  /**
   * Applies a selected autocomplete suggestion to the input field.
   *
   * @param suggestion Selected ingredient suggestion.
   */
  applySuggestion(suggestion: string): void {
    this.ingredientName = suggestion;
    this.ingredientSuggestions = [];
    this.inlineSuggestion = '';
  }

  /**
   * Handles form submission for adding a new ingredient.
   *
   * @param form Template-driven Angular form reference.
   */
  onSubmit(form: NgForm): void {
    const ingredient = this.buildIngredientFromForm();
    if (!ingredient) return;

    this.prependIngredient(ingredient);
    this.resetForm(form);
  }

  /**
   * Toggles edit mode for an existing ingredient.
   *
   * If edit mode is active, changes are validated and committed.
   *
   * @param ingredient Ingredient being edited.
   */
  toggleEditModeForIngredient(ingredient: UiIngredient): void {
    if (!ingredient.isEditMode) {
      ingredient.isEditMode = true;
      return;
    }
    this.commitIngredientEdit(ingredient);
  }

  /**
   * Handles Enter key presses while editing an ingredient.
   *
   * @param ingredient Ingredient being edited.
   * @param event Keyboard event.
   */
  onEditEnter(ingredient: UiIngredient, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (ingredient.isEditMode) {
      this.toggleEditModeForIngredient(ingredient);
    }
  }

  /**
   * Toggles the unit dropdown for a specific ingredient.
   *
   * @param ingredient Target ingredient.
   * @param event Mouse click event.
   */
  toggleIngredientUnitDropdown(
    ingredient: UiIngredient,
    event: MouseEvent,
  ): void {
    ingredient.isUnitDropdownOpen = !ingredient.isUnitDropdownOpen;
    event.stopPropagation();
  }

  /**
   * Selects a unit for a specific ingredient.
   *
   * @param ingredient Target ingredient.
   * @param unit Selected unit.
   * @param event Mouse click event.
   */
  selectUnitForIngredient(
    ingredient: UiIngredient,
    unit: UnitOfMeasurement,
    event: MouseEvent,
  ): void {
    ingredient.unit = unit;
    ingredient.isUnitDropdownOpen = false;
    event.stopPropagation();
  }

  /**
   * Removes an ingredient from the recipe requirements.
   *
   * @param ingredient Ingredient to remove.
   */
  deleteIngredient(ingredient: UiIngredient): void {
    const index = this.ingredients.indexOf(ingredient);
    if (index > -1) {
      this.ingredients.splice(index, 1);
    }
  }

  /**
   * Closes all open dropdowns in the component.
   */
  private closeAllDropdowns(): void {
    this.isDropdownOpen = false;
    this.closeIngredientDropdowns();
  }

  /**
   * Closes all ingredient-specific unit dropdowns.
   */
  private closeIngredientDropdowns(): void {
    this.ingredients.forEach(
      (ingredient) => (ingredient.isUnitDropdownOpen = false),
    );
  }

  /**
   * Closes the main unit dropdown and stops event propagation.
   *
   * @param event Mouse click event.
   */
  private closeMainDropdown(event: MouseEvent): void {
    this.isDropdownOpen = false;
    event.stopPropagation();
  }

  /**
   * Builds a `UiIngredient` object from the current form state.
   *
   * @returns A valid `UiIngredient` or `null` if validation fails.
   */
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

  /**
   * Prepends a new ingredient to the recipe requirements.
   *
   * @param ingredient Ingredient to add.
   */
  private prependIngredient(ingredient: UiIngredient): void {
    this.state.recipeRequirements.ingredients = [
      ingredient,
      ...this.ingredients,
    ];
  }

  /**
   * Resets the ingredient form to its default state.
   *
   * Leaves `servingSize` as `null` so the placeholder is visible
   * instead of an actual value.
   *
   * @param form Template-driven Angular form reference.
   */
  private resetForm(form: NgForm): void {
    this.ingredientName = '';
    this.servingSize = null;
    this.selectedUnit = this.unitsOfMeasurement[0];
    this.ingredientSuggestions = [];
    this.inlineSuggestion = '';
    form.resetForm({
      servingSize: this.servingSize,
    });
  }

  /**
   * Commits changes made while editing an ingredient.
   *
   * Invalid edits result in the ingredient being removed.
   *
   * @param ingredient Ingredient being edited.
   */
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

  /**
   * Validates ingredient input.
   *
   * @param name Ingredient name.
   * @param size Serving size.
   * @returns True if the ingredient input is invalid.
   */
  private isInvalidIngredient(name: string, size: number): boolean {
    return !name || !size || Number.isNaN(size) || size <= 0;
  }
}
import { Component, ElementRef, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GenerateRecipeService } from '../../../core/services/generate-recipe-service/generate-recipe.service';
import { FormsModule, NgForm } from '@angular/forms';
import { Ingredient, UnitOfMeasurement } from '../../../core/models/recipe.model';

@Component({
  selector: 'app-generate-recipe',
  standalone: true,
  imports: [RouterModule, FormsModule, CommonModule],
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

  private readonly allIngredientSuggestions: readonly string[] = [
    'Pasta',
    'Baby spinach',
    'Cherry tomatoes',
    'Egg',
    'Mushrooms',
    'Onions',
  ];

  constructor(
    public generateRecipeService: GenerateRecipeService,
    private elementRef: ElementRef<HTMLElement>
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isClickInsideComponent(event)) {
      this.closeAllDropdowns();
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
    const query = this.ingredientName.trim().toLowerCase();
    this.ingredientSuggestions = query
      ? this.filterIngredientSuggestions(query)
      : [];
  }

  applySuggestion(suggestion: string): void {
    this.ingredientName = suggestion;
    this.ingredientSuggestions = [];
  }

  onSubmit(form: NgForm): void {
    const ingredient = this.buildIngredientFromForm();
    if (!ingredient) {
      return;
    }
    this.prependIngredient(ingredient);
    this.resetForm(form);
  }

  toggleEditModeForIngredient(ingredient: Ingredient): void {
    if (!ingredient.isEditMode) {
      ingredient.isEditMode = true;
      return;
    }
    this.commitIngredientEdit(ingredient);
  }

  onEditEnter(ingredient: Ingredient, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (ingredient.isEditMode) {
      this.toggleEditModeForIngredient(ingredient);
    }
  }

  toggleIngredientUnitDropdown(
    ingredient: Ingredient,
    event: MouseEvent
  ): void {
    ingredient.isUnitDropdownOpen = !ingredient.isUnitDropdownOpen;
    event.stopPropagation();
  }

  selectUnitForIngredient(
    ingredient: Ingredient,
    unit: UnitOfMeasurement,
    event: MouseEvent
  ): void {
    ingredient.unit = unit;
    ingredient.isUnitDropdownOpen = false;
    event.stopPropagation();
  }

  deleteIngredient(ingredient: Ingredient): void {
    const index = this.ingredients.indexOf(ingredient);
    if (index > -1) {
      this.ingredients.splice(index, 1);
    }
  }

  private get ingredients(): Ingredient[] {
    return this.generateRecipeService.recipeRequirements.ingredients;
  }

  private isClickInsideComponent(event: MouseEvent): boolean {
    const target = event.target as Node | null;
    if (!target) {
      return false;
    }
    return this.elementRef.nativeElement.contains(target);
  }

  private closeAllDropdowns(): void {
    this.isDropdownOpen = false;
    this.closeIngredientDropdowns();
  }

  private closeIngredientDropdowns(): void {
    this.ingredients.forEach(
      (ingredient) => (ingredient.isUnitDropdownOpen = false)
    );
  }

  private closeMainDropdown(event: MouseEvent): void {
    this.isDropdownOpen = false;
    event.stopPropagation();
  }

  private filterIngredientSuggestions(query: string): string[] {
    return this.allIngredientSuggestions.filter((item) =>
      item.toLowerCase().startsWith(query)
    );
  }

  private buildIngredientFromForm(): Ingredient | null {
    const name = this.ingredientName.trim();
    const size = Number(this.servingSize);
    if (this.isInvalidIngredient(name, size)) {
      return null;
    }
    return {
      ingredient: name,
      servingSize: size,
      unit: this.selectedUnit,
      isEditMode: false,
      isUnitDropdownOpen: false,
    };
  }

  private prependIngredient(ingredient: Ingredient): void {
    this.generateRecipeService.recipeRequirements.ingredients = [
      ingredient,
      ...this.ingredients,
    ];
  }

  private resetForm(form: NgForm): void {
    this.ingredientName = '';
    this.servingSize = this.defaultServingSize;
    this.selectedUnit = this.unitsOfMeasurement[0];
    this.ingredientSuggestions = [];
    form.resetForm({
      servingSize: this.servingSize,
    });
  }

  private commitIngredientEdit(ingredient: Ingredient): void {
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
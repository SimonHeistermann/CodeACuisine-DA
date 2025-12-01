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
  unitsOfMeasurement: UnitOfMeasurement[] = [
    { name: 'gram', abbreviation: 'g' },
    { name: 'ml', abbreviation: 'ml' },
    { name: 'piece', abbreviation: '' },
  ];  

  isDropdownOpen = false;
  selectedUnit: UnitOfMeasurement = this.unitsOfMeasurement[0];
  servingSize = 100;

  ingredientName = '';
  ingredientSuggestions: string[] = [];
  private allIngredientSuggestions: string[] = [
    'Pasta',
    'Baby spinach',
    'Cherry tomatoes',
    'Egg',
    'Mushrooms',
    'Onions',
  ];

  constructor(
    public generateRecipeService: GenerateRecipeService,
    private elementRef: ElementRef
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false;

      this.generateRecipeService.recipeRequirements.ingredients.forEach(
        (ingredient) => (ingredient.isUnitDropdownOpen = false)
      );
    }
  }

  toggleDropdown(event: MouseEvent) {
    this.isDropdownOpen = !this.isDropdownOpen;
    event.stopPropagation();
  }

  selectUnit(unit: UnitOfMeasurement, event: MouseEvent) {
    this.selectedUnit = unit;
    this.isDropdownOpen = false;
    event.stopPropagation();
  }

  onIngredientInputChange() {
    const query = this.ingredientName.trim().toLowerCase();
    if (!query) {
      this.ingredientSuggestions = [];
      return;
    }

    this.ingredientSuggestions = this.allIngredientSuggestions.filter((item) =>
      item.toLowerCase().startsWith(query)
    );
  }

  applySuggestion(suggestion: string) {
    this.ingredientName = suggestion;
    this.ingredientSuggestions = [];
  }

  onSubmit(form: NgForm) {
    const name = this.ingredientName.trim();
    const size = Number(this.servingSize);
  
    if (!name || !size || Number.isNaN(size) || size <= 0) {
      return; 
    }
  
    const newIngredient: Ingredient = {
      ingredient: name,
      servingSize: size,
      unit: this.selectedUnit,
      isEditMode: false,
      isUnitDropdownOpen: false,
    };
  
    this.generateRecipeService.recipeRequirements.ingredients = [
      newIngredient,
      ...this.generateRecipeService.recipeRequirements.ingredients,
    ];
  
    this.ingredientName = '';
    this.servingSize = 100;
    this.selectedUnit = this.unitsOfMeasurement[0];
    this.ingredientSuggestions = [];
  
    form.resetForm({
      servingSize: this.servingSize,
    });
  }  

  toggleEditModeForIngredient(ingredient: Ingredient) {
    if (ingredient.isEditMode) {
      const name = ingredient.ingredient.trim();
      const size = Number(ingredient.servingSize);
  
      if (!name || !size || Number.isNaN(size) || size <= 0) {
        this.deleteIngredient(ingredient);
        return;
      }
  
      ingredient.servingSize = size;
      ingredient.isUnitDropdownOpen = false;
      ingredient.isEditMode = false;
      return;
    }
  
    ingredient.isEditMode = true;
  }

  onEditEnter(ingredient: Ingredient, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (ingredient.isEditMode) {
      this.toggleEditModeForIngredient(ingredient);
    }
  }
  

  toggleIngredientUnitDropdown(ingredient: Ingredient, event: MouseEvent) {
    ingredient.isUnitDropdownOpen = !ingredient.isUnitDropdownOpen;
    event.stopPropagation();
  }

  selectUnitForIngredient(
    ingredient: Ingredient,
    unit: UnitOfMeasurement,
    event: MouseEvent
  ) {
    ingredient.unit = unit;
    ingredient.isUnitDropdownOpen = false;
    event.stopPropagation();
  }

  deleteIngredient(ingredient: Ingredient) {
    const index =
      this.generateRecipeService.recipeRequirements.ingredients.indexOf(
        ingredient
      );
    if (index > -1) {
      this.generateRecipeService.recipeRequirements.ingredients.splice(
        index,
        1
      );
    }
  }
}
export interface UnitOfMeasurement {
    name: string;
    abbreviation: string;
}

export interface Ingredient {
    servingSize: number;
    unit: UnitOfMeasurement;
    ingredient: string;
    isEditMode?: boolean;
    isUnitDropdownOpen?: boolean;
}
  
export interface RecipeRequirements {
    ingredients: Ingredient[];
    portionsAmount: number;
    cooksAmount: number;
    cookingTime: string;
    cuisine: string;
    dietPreferences: string;
}

  
export interface NutritionalInformation {
    calories: number;
    proteins: number;
    fats: number;
    carbs: number;
}
  
export interface RecipePreferences {
    cookingTime?: string;
    cuisine?: string;
    dietPreferences?: string;
}
  
export interface RecipeStep {
    order: number;
    title: string;
    description: string;
    cook: number;
}
  
export interface GeneratedRecipe {
    title: string;
    cookingTime: string;
    nutritionalInformation: NutritionalInformation;
    preferences: RecipePreferences;
    cooksAmount: number;
    ingredients: {
      yourIngredients: Ingredient[];
      extraIngredients: Ingredient[];
    };
    directions: RecipeStep[];
}  
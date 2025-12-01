export interface UnitOfMeasurement {
    name: string;      
    abbreviation: string;
}
  
export interface Ingredient {
    servingSize: number;
    unit: UnitOfMeasurement;
    ingredient: string;
    isEditMode: boolean;
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
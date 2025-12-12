export interface UnitOfMeasurement {
    name: string;
    abbreviation: string;
}
  
export interface RecipeIngredient {
    servingSize: number;
    unit: UnitOfMeasurement;
    ingredient: string;
}
  
export interface UiIngredient extends RecipeIngredient {
    isEditMode?: boolean;
    isUnitDropdownOpen?: boolean;
}
  
export interface RecipeRequirements {
    ingredients: UiIngredient[];
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
    id?: string;
  
    title: string;
    cookingTime: string;
    nutritionalInformation: NutritionalInformation;
    preferences: RecipePreferences;
    cooksAmount: number;
    ingredients: {
      yourIngredients: RecipeIngredient[];
      extraIngredients: RecipeIngredient[];
    };
    directions: RecipeStep[];
    likes?: number;
    recipeSignature?: string;
}

export interface QuotaInfo {
    ip: {
      limit: number;
      used: number;
      remaining: number;
    };
    system: {
      limit: number;
      used: number;
      remaining: number;
    };
}
  
export interface GenerateRecipeResponse {
    recipes: GeneratedRecipe[];
    quota: QuotaInfo;
}
  
export interface QuotaErrorResponse {
    error: string;
    message: string;
    quota?: QuotaInfo;
}  
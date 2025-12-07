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
    /** Firestore-Dokument-ID, falls vorhanden */
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
  
    /** Globale Anzahl an Likes über alle User */
    likes?: number;
  
    /** Deterministische Signatur zur Duplikats-Erkennung */
    recipeSignature?: string;
}  
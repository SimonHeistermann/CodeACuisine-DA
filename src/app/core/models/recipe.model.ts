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
  
export interface RecipeStep {
    order: number;
    title: string;
    description: string;
    cook: number;
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

export type CookingTimeCategory = 'quick' | 'medium' | 'complex';
export type Cuisine = 'german' | 'italian' | 'indian' | 'japanese' | 'gourmet' | 'fusion';
export type DietPreference = 'vegetarian' | 'vegan' | 'keto' | 'no preferences';

export interface RecipePreferences {
  cookingTime: CookingTimeCategory;
  cuisine: Cuisine;
  dietPreferences: DietPreference;
}

export interface GeneratedRecipe {
  id?: string;
  title: string;
  cookingTimeText: string;
  cookingTimeMinutes?: number;
  nutritionalInformation: NutritionalInformation;
  preferences: RecipePreferences;
  cooksAmount: number;
  ingredients: {
    yourIngredients: RecipeIngredient[];
    extraIngredients: RecipeIngredient[];
  };
  directions: RecipeStep[];
  likes: number;
  recipeSignature: string;
  createdAt: any; 
  isSeedRecipe: boolean;
}

export type RecipeRequirementsSnapshot = Pick<
  RecipeRequirements,
  'cookingTime' | 'cuisine' | 'dietPreferences' | 'portionsAmount' | 'cooksAmount'
>;
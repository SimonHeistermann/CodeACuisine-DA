import { Injectable } from '@angular/core';
import {
  GeneratedRecipe,
  RecipeRequirements,
  QuotaInfo,
} from '../../models/recipe.model';

@Injectable({
  providedIn: 'root',
})
export class StateService {
  recipeRequirements: RecipeRequirements = {
    ingredients: [],
    portionsAmount: 2,
    cooksAmount: 1,
    cookingTime: 'quick',
    cuisine: '',
    dietPreferences: '',
  };

  generatedRecipes: GeneratedRecipe[] = [];

  allRecipes: GeneratedRecipe[] = [];

  preferencesOptions = {
    times: [
      { value: 'quick', label: 'Quick', description: 'up to 20min' },
      { value: 'medium', label: 'Medium', description: '25–40min' },
      { value: 'complex', label: 'Complex', description: 'over 45min' },
    ],
    cuisine: [
      {
        name: 'german',
        thumbnail_img: 'img/german.png',
        header_img: 'img/german_header.png',
        emoji: '🥨',
      },
      {
        name: 'italian',
        thumbnail_img: 'img/italian.png',
        header_img: 'img/italian_header.png',
        emoji: '🤌',
      },
      {
        name: 'indian',
        thumbnail_img: 'img/indian.png',
        header_img: 'img/indian_header.png',
        emoji: '🍛',
      },
      {
        name: 'japanese',
        thumbnail_img: 'img/japanese.png',
        header_img: 'img/japanese_header.png',
        emoji: '🥢',
      },
      {
        name: 'gourmet',
        thumbnail_img: 'img/gourmet.png',
        header_img: 'img/gourmet_header.png',
        emoji: '✨',
      },
      {
        name: 'fusion',
        thumbnail_img: 'img/fusion.png',
        header_img: 'img/fusion_header.png',
        emoji: '🍢',
      },
    ],
    dietPreferences: ['vegetarian', 'vegan', 'keto', 'no preferences'],
  };

  quota: QuotaInfo | null = null;

  constructor() {}
}
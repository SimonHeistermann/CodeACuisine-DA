import { Routes } from '@angular/router';
import { HeroComponent } from './features/hero/hero.component';
import { GenerateRecipeComponent } from './features/new-recipe/generate-recipe/generate-recipe.component';
import { PreferencesComponent } from './features/new-recipe/preferences/preferences.component';
import { GeneratingScreenComponent } from './features/new-recipe/generating-screen/generating-screen.component';

export const routes: Routes = [
  { path: '', component: HeroComponent },
  { path: 'generate-recipe', component: GenerateRecipeComponent },
  { path: 'preferences', component: PreferencesComponent },
  { path: 'generating', component: GeneratingScreenComponent },
  { path: '**', redirectTo: '' }
];
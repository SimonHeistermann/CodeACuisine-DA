import { Routes } from '@angular/router';
import { HeroComponent } from './features/hero/hero.component';

export const routes: Routes = [
  { path: '', component: HeroComponent },
  { path: '**', redirectTo: '' },
];
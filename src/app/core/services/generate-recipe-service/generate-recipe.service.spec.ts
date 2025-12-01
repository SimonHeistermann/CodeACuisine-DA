import { TestBed } from '@angular/core/testing';

import { GenerateRecipeService } from './generate-recipe.service';

describe('GenerateRecipe', () => {
  let service: GenerateRecipeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GenerateRecipeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
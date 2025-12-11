import { TestBed } from '@angular/core/testing';

import { IngredientAutocompleteService } from './ingredient-autocomplete.service';

describe('IngredientAutocompleteService', () => {
  let service: IngredientAutocompleteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IngredientAutocompleteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

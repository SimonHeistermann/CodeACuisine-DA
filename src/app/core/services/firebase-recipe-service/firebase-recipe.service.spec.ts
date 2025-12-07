import { TestBed } from '@angular/core/testing';

import { FirebaseRecipeService } from './firebase-recipe.service';

describe('FirebaseRecipeService', () => {
  let service: FirebaseRecipeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FirebaseRecipeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

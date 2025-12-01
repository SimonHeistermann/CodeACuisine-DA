import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneratingScreenComponent } from './generating-screen.component';

describe('LoadingComponent', () => {
  let component: GeneratingScreenComponent;
  let fixture: ComponentFixture<GeneratingScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneratingScreenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneratingScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

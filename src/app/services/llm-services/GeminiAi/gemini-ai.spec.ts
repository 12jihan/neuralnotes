import { TestBed } from '@angular/core/testing';

import { GeminiAi } from './gemini-ai';

describe('GeminiAi', () => {
  let service: GeminiAi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeminiAi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

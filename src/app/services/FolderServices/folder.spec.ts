import { TestBed } from '@angular/core/testing';

import { Folder } from './folder';

describe('Folder', () => {
  let service: Folder;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Folder);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

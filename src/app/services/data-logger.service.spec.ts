import { TestBed } from '@angular/core/testing';

import { DataLoggerService } from './data-logger.service';

describe('DataLoggerService', () => {
  let service: DataLoggerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataLoggerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

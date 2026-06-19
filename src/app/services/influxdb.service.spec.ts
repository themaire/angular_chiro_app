import { TestBed } from '@angular/core/testing';

import { InfluxdbService } from './influxdb.service';

describe('InfluxdbService', () => {
  let service: InfluxdbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InfluxdbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { InfluxdbConfigService } from './influxdb-config.service';

describe('InfluxdbConfigService', () => {
  let service: InfluxdbConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InfluxdbConfigService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

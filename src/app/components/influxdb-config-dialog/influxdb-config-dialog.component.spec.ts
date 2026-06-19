import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfluxdbConfigDialogComponent } from './influxdb-config-dialog.component';

describe('InfluxdbConfigDialogComponent', () => {
  let component: InfluxdbConfigDialogComponent;
  let fixture: ComponentFixture<InfluxdbConfigDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [InfluxdbConfigDialogComponent]
    });
    fixture = TestBed.createComponent(InfluxdbConfigDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

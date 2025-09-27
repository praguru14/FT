import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionsTestComponent } from './transactions-test.component';

describe('TransactionsTestComponent', () => {
  let component: TransactionsTestComponent;
  let fixture: ComponentFixture<TransactionsTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionsTestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransactionsTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

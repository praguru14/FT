import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TransactionsTestComponent } from './transactions-test/transactions-test.component';
import { ChartsComponent } from './charts/charts.component';
import { DashboardComponent } from './dashboard/dashboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TransactionsTestComponent, ChartsComponent, RouterOutlet,DashboardComponent],
  template: `<app-dashboard></app-dashboard>`,
})
export class AppComponent {}


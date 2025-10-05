import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TransactionsTestComponent } from './transactions-test/transactions-test.component';
import { ChartsComponent } from './charts/charts.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { TopPayeesComponent } from './top-payees/top-payees.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    TransactionsTestComponent,
    ChartsComponent,
    RouterOutlet,
    DashboardComponent,
    TopPayeesComponent,
  ],
  template: `
    <router-outlet></router-outlet>
  `,
})
export class AppComponent {}


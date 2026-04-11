import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TransactionsTestComponent } from './transactions-test/transactions-test.component';
import { ChartsComponent } from './charts/charts.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { TopPayeesComponent } from './top-payees/top-payees.component';
import { ChatComponent } from './chat/chat.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    TransactionsTestComponent,
    ChartsComponent,
    RouterOutlet,
    DashboardComponent,
    TopPayeesComponent,
ChatComponent
  ],
  template: `
    <router-outlet></router-outlet>
  <app-chat></app-chat>
  `,
})
export class AppComponent {}


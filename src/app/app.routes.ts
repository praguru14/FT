import { Routes } from '@angular/router';
import { ChartsComponent } from './charts/charts.component';
import { TopPayeesComponent } from './top-payees/top-payees.component';
import { DashboardComponent } from './dashboard/dashboard.component';
// import other components as needed

export const routes: Routes = [
  { path: '', component:DashboardComponent }, // default
  { path: 'top-payees', component: TopPayeesComponent },
  { path: 'charts', component: ChartsComponent },
];

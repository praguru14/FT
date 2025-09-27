import { Routes } from '@angular/router';
import { ChartsComponent } from './charts/charts.component';
// import other components as needed

export const routes: Routes = [
  { path: '', redirectTo: 'charts', pathMatch: 'full' }, // default
  { path: 'charts', component: ChartsComponent },
];

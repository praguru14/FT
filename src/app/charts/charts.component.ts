import { Component, OnInit } from '@angular/core';
import { NgChartsModule } from 'ng2-charts';
import { ChartData, ChartType, ChartOptions } from 'chart.js';
import { TransactionService } from '../service/transaction.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [NgChartsModule, CommonModule, FormsModule],
  template: `
    <h2 class="text-center mb-4">Monthly Transactions</h2>

    <!-- Month Picker -->
    <div class="text-center mb-4">
      <label>
        Select Month:
        <input type="month" [(ngModel)]="selectedMonth" />
      </label>
      <button (click)="fetchMonthData()" class="ml-2">Load Data</button>
    </div>

    <!-- Summary -->
    <div class="text-center mb-6">
      <p>
        Total Transactions: <strong>{{ totalTransactions }}</strong>
      </p>
      <p>
        Total Amount:
        <strong>{{
          totalAmount | currency : 'INR' : 'symbol' : '1.0-0'
        }}</strong>
      </p>
    </div>

    <!-- Pie Chart: Expenses by Payee/Category -->
    <div style="width:400px; margin:auto;" class="mb-8">
      <canvas
        baseChart
        [data]="pieChartData"
        [type]="pieChartType"
        [options]="pieChartOptions"
      ></canvas>
    </div>

    <!-- Line Chart: Daily Totals -->
    <div style="width:600px; margin:auto;">
      <canvas
        baseChart
        [data]="lineChartData"
        [type]="lineChartType"
        [options]="lineChartOptions"
      ></canvas>
    </div>
  `,
})
export class ChartsComponent implements OnInit {
  selectedMonth: string = ''; // format: yyyy-MM

  totalTransactions: number = 0;
  totalAmount: number = 0;

  // Pie Chart
  pieChartType: ChartType = 'pie';
  pieChartData: ChartData<'pie'> = { labels: [], datasets: [{ data: [] }] };
  pieChartOptions: ChartOptions = { responsive: true };

  // Line Chart
  lineChartType: ChartType = 'line';
  lineChartData: ChartData<'line'> = {
    labels: [],
    datasets: [{ data: [], label: 'Daily Total' }],
  };
  lineChartOptions: ChartOptions = { responsive: true };

  constructor(private transactionService: TransactionService) {}

  ngOnInit(): void {
    // Default to current month
    const now = new Date();
    this.selectedMonth = `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;

    this.fetchMonthData();
  }

  fetchMonthData() {
    if (!this.selectedMonth) return;

    const [year, month] = this.selectedMonth.split('-').map(Number);
    const fromDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate(); // correct last day
    const toDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;

    this.transactionService
      .getTransactions({ fromDate, toDate, page: 0, size: 1000 })
      .subscribe({
        next: (res) => {
          const transactions = res.content || [];

          // ----- Summary -----
          this.totalTransactions = transactions.length;
          this.totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

          // ----- Pie Chart -----
          const categoryMap = new Map<string, number>();
          transactions.forEach((t) => {
            const category = t.payeeName || t.toUpi || 'Other';
            categoryMap.set(
              category,
              (categoryMap.get(category) || 0) + t.amount
            );
          });
          this.pieChartData = {
            labels: Array.from(categoryMap.keys()),
            datasets: [{ data: Array.from(categoryMap.values()) }],
          };

          // ----- Line Chart -----
          const dailyMap = new Map<string, number>();
          transactions.forEach((t) => {
            const day = t.date; // yyyy-MM-dd
            dailyMap.set(day, (dailyMap.get(day) || 0) + t.amount);
          });

          const sortedDays = Array.from(dailyMap.keys()).sort();
          this.lineChartData = {
            labels: sortedDays,
            datasets: [
              {
                data: sortedDays.map((d) => dailyMap.get(d)!),
                label: 'Daily Total',
              },
            ],
          };
        },
        error: (err) => console.error('Error fetching transactions:', err),
      });
  }
}

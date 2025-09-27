import { Component, OnInit } from '@angular/core';
import { ChartData, ChartOptions } from 'chart.js';
import {
  TransactionService,
  Transaction,
} from '../service/transaction.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgChartsModule, CommonModule, FormsModule],
  template: `
    <h2 class="text-center mb-4">Daily Spending Dashboard</h2>

    <!-- Month Picker -->
    <div class="text-center mb-4">
      <label>
        Select Month:
        <input
          type="month"
          [(ngModel)]="selectedMonth"
          (ngModelChange)="loadMonthData()"
        />
      </label>
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

    <!-- Line Chart -->
    <div class="chart-box" *ngIf="lineDailyData?.labels?.length">
      <h4>Daily Spending</h4>
      <canvas
        baseChart
        [data]="lineDailyData"
        [type]="lineChartType"
        [options]="lineChartOptions"
        (chartHover)="onChartHover($event)"
      ></canvas>
    </div>

    <!-- Hovered Day Transactions -->
    <div
      class="hover-table-container"
      *ngIf="hoveredTransactions.length"
      [class.sticky]="tableSticky"
      (click)="toggleTableSticky()"
    >
      <h5>Transactions for {{ hoveredDate }} (DEBIT only)</h5>
      <table class="table table-hover table-striped mx-auto">
        <thead class="table-primary">
          <tr>
            <th style="width: 35%;">Payee</th>
            <th style="width: 20%;">Amount (₹)</th>
            <th style="width: 25%;">UPI</th>
            <th style="width: 20%;">Time</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let t of hoveredTransactions">
            <td>{{ t.payeeName }}</td>
            <td class="text-end">
              {{ t.amount | currency : 'INR' : 'symbol' : '1.0-0' }}
            </td>
            <td>{{ t.toUpi }}</td>
            <td>{{ t.emailReceivedDate | date : 'HH:mm:ss' }}</td>
          </tr>
        </tbody>
      </table>
      <small class="text-muted">Click to toggle “stay open”</small>
    </div>
  `,
  styles: [
    `
      .chart-box {
        width: 600px;
        margin: auto;
      }

      .hover-table-container {
        width: 700px;
        margin: 20px auto;
        padding: 12px;
        border: 1px solid #ccc;
        border-radius: 8px;
        background-color: #f9f9f9;
        box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
        cursor: pointer;
        transition: all 0.2s ease-in-out;
      }

      .hover-table-container.sticky {
        border-color: #007bff;
        background-color: #e6f0ff;
        box-shadow: 0px 6px 12px rgba(0, 123, 255, 0.2);
      }

      .hover-table-container h5 {
        margin-bottom: 10px;
        font-size: 16px;
      }

      .hover-table-container table {
        margin-bottom: 5px;
        width: 100%;
        border-collapse: separate;
        border-spacing: 0 4px;
      }

      .hover-table-container th,
      .hover-table-container td {
        padding: 6px 8px;
        vertical-align: middle;
      }

      .hover-table-container th {
        text-align: left;
      }

      .hover-table-container small {
        display: block;
        text-align: right;
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  selectedMonth: string = '';
  totalTransactions = 0;
  totalAmount = 0;
  lineChartType: 'line' = 'line';
  lineDailyData: ChartData<'line'> = {
    labels: [],
    datasets: [{ data: [], label: 'Daily Total' }],
  };
  lineChartOptions: ChartOptions = {
    responsive: true,
    plugins: { tooltip: { enabled: true } },
  };

  hoveredDate: string = '';
  hoveredTransactions: Transaction[] = [];
  tableSticky = false;

  constructor(private transactionService: TransactionService) {}

  ngOnInit(): void {
    const now = new Date();
    this.selectedMonth = `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
    this.loadMonthData();
  }

  loadMonthData() {
    if (!this.selectedMonth) return;

    const [year, month] = this.selectedMonth.split('-').map(Number);
    const fromDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const toDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;

    this.transactionService
      .getTransactions({ fromDate, toDate, page: 0, size: 1000 })
      .subscribe((res) => {
        const transactions = res?.content || [];
        this.updateDailyChart(transactions);
      });
  }

  private updateDailyChart(transactions: Transaction[]) {
    const debitTransactions = transactions.filter((t) => t.type === 'DEBIT');
    this.totalTransactions = debitTransactions.length;
    this.totalAmount = debitTransactions.reduce(
      (sum, t) => sum + (t.amount ?? 0),
      0
    );

    const dailyMap = new Map<string, number>();
    debitTransactions.forEach((t) => {
      dailyMap.set(t.date, (dailyMap.get(t.date) ?? 0) + (t.amount ?? 0));
    });

    const sortedDays = Array.from(dailyMap.keys()).sort();
    this.lineDailyData = {
      labels: sortedDays,
      datasets: [
        {
          data: sortedDays.map((d) => dailyMap.get(d) ?? 0),
          label: 'Daily Total (DEBIT)',
        },
      ],
    };
  }

  onChartHover(event: any) {
    if (this.tableSticky) return;

    const activePoints = event.active;
    if (activePoints?.length) {
      const chart = activePoints[0].element.$context.chart;
      const index = activePoints[0].index;
      const date = chart.data.labels[index] as string;

      this.hoveredDate = date;
      this.transactionService.getTransactionsForDay(date).subscribe((res) => {
        this.hoveredTransactions = res.filter((t) => t.type === 'DEBIT');
      });
    } else {
      this.hoveredTransactions = [];
    }
  }

  toggleTableSticky() {
    this.tableSticky = !this.tableSticky;
  }
}

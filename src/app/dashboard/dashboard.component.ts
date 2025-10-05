import { Component, OnInit, OnDestroy } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { ChartData, ChartOptions } from 'chart.js';
import {
  TransactionService,
  Transaction,
} from '../service/transaction.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { TopPayeesComponent } from '../top-payees/top-payees.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgChartsModule, CommonModule, FormsModule,TopPayeesComponent,RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  isTablePinned = false;
  isTableVisible = false;
  selectedMonth: string = '';
  totalTransactions = 0;
  totalAmount = 0;
  avgDailySpend = 0;
  highestSpendDay: { amount: number; date: string } | null = null;
  topPayees: {
    payeeName: string;
    totalAmount: number;
    transactionCount: number;
  }[] = [];

  private refreshSubscription?: Subscription;

  autoHitCount = 0;
  lastRefreshedAt: Date | null = null;

  lineChartType: 'line' = 'line';
  lineDailyData: ChartData<'line'> = {
    labels: [],
    datasets: [{ data: [], label: 'Daily Total' }],
  };
  lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: { enabled: true, mode: 'index', intersect: false },
      legend: { display: true },
    },
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { display: true, title: { display: true, text: 'Date' } },
      y: { display: true, title: { display: true, text: 'Amount (₹)' } },
    },
  };

  hoveredDate: string = '';
  hoveredTransactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  searchText: string = '';

  constructor(private transactionService: TransactionService) {}

  ngOnInit(): void {
    const now = new Date();
    this.selectedMonth = `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
    this.loadMonthData();
    this.loadTopPayees();

    this.refreshSubscription = interval(540000).subscribe(() => {
      console.log('🔄 Auto-refresh triggered (every 9 minutes)');
      this.loadMonthData();
      this.autoHitCount++;
      this.lastRefreshedAt = new Date();
    });
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
  }

  changeMonth(offset: number) {
    if (!this.selectedMonth) return;
    const [year, month] = this.selectedMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + offset, 1);
    this.selectedMonth = `${newDate.getFullYear()}-${(newDate.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
    this.loadMonthData();
  }
  loadTopPayees() {
    this.transactionService
      .getTransactions({ page: 0, size: 100000 }) // large size to get all
      .subscribe((res) => {
        if (!res?.content?.length) {
          console.warn('No transactions found');
          this.topPayees = [];
          return;
        }

        // Use case-insensitive check for type
        const debitTransactions = res.content.filter(
          (t) => t.type?.toUpperCase() === 'DEBIT'
        );

        const payeeMap = new Map<
          string,
          { totalAmount: number; count: number }
        >();

        debitTransactions.forEach((t) => {
          const name = t.payeeName?.trim() || t.toUpi?.trim() || 'Unknown';
          if (payeeMap.has(name)) {
            const prev = payeeMap.get(name)!;
            payeeMap.set(name, {
              totalAmount: prev.totalAmount + (t.amount || 0),
              count: prev.count + 1,
            });
          } else {
            payeeMap.set(name, { totalAmount: t.amount || 0, count: 1 });
          }
        });

        // Convert to array and sort descending by totalAmount
        this.topPayees = Array.from(payeeMap.entries())
          .map(([payeeName, { totalAmount, count }]) => ({
            payeeName,
            totalAmount,
            transactionCount: count,
          }))
          .sort((a, b) => b.totalAmount - a.totalAmount)
          .slice(0, 10); // top 10

        console.log('Top Payees:', this.topPayees);
      });
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
        this.updateLineChart(transactions);
        this.lastRefreshedAt = new Date();
      });
  }

  private updateLineChart(transactions: Transaction[]) {
    const debitTransactions = transactions.filter((t) => t.type === 'DEBIT');
    this.totalTransactions = debitTransactions.length;
    this.totalAmount = debitTransactions.reduce(
      (sum, t) => sum + (t.amount ?? 0),
      0
    );
    this.avgDailySpend = Math.round(
      this.totalAmount / (debitTransactions.length || 1)
    );

    const dailyMap = new Map<string, number>();
    debitTransactions.forEach((t) =>
      dailyMap.set(t.date, (dailyMap.get(t.date) ?? 0) + (t.amount ?? 0))
    );

    const sortedDays = Array.from(dailyMap.keys()).sort();
    this.lineDailyData = {
      labels: sortedDays,
      datasets: [
        {
          data: sortedDays.map((d) => dailyMap.get(d) ?? 0),
          label: 'Daily Total (DEBIT)',
          fill: false,
          borderColor: '#007bff',
          tension: 0.3,
        },
      ],
    };

    let maxAmount = 0;
    let maxDate = '';
    dailyMap.forEach((amount, date) => {
      if (amount > maxAmount) {
        maxAmount = amount;
        maxDate = date;
      }
    });
    this.highestSpendDay =
      maxAmount > 0 ? { amount: maxAmount, date: maxDate } : null;
  }

  onLineHover(event: any) {
    const activePoints = event.active;
    if (activePoints?.length && !this.isTablePinned) {
      const index = activePoints[0].index;
      const chart = activePoints[0].element.$context.chart;
      const date = chart.data.labels[index] as string;
      this.hoveredDate = date;
      this.isTableVisible = true;

      this.transactionService.getTransactionsForDay(date).subscribe((res) => {
        this.hoveredTransactions = res.filter((t) => t.type === 'DEBIT');
        this.filteredTransactions = [...this.hoveredTransactions];
      });
    } else if (!this.isTablePinned) {
      this.isTableVisible = false;
      this.hoveredTransactions = [];
      this.filteredTransactions = [];
    }
  }

  filterTransactions() {
    const text = this.searchText.toLowerCase();
    this.filteredTransactions = this.hoveredTransactions.filter(
      (t) =>
        t.payeeName.toLowerCase().includes(text) ||
        t.toUpi.toLowerCase().includes(text)
    );
  }

  toggleTablePin() {
    this.isTablePinned = !this.isTablePinned;
    if (!this.isTablePinned) {
      this.isTableVisible = false;
    }
  }

  exportCSV() {
    console.log('Export CSV clicked for', this.hoveredDate);
  }
}

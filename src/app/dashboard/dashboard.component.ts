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
    imports: [
      NgChartsModule,
      CommonModule,
      FormsModule,
      RouterModule,
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css'],
  })
  export class DashboardComponent implements OnInit, OnDestroy {
  showBalance = false;
  previousDayBalance: number | null = null;
  loadingBalance = false;
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
  topMerchant: { name: string; amount: number; count: number } | null = null;
    private refreshSubscription?: Subscription;
  projectedMonthlySpend = 0;
  daysLeftInMonth = 0;

    hiddenTransactionIds = new Set<number>();
    private readonly HIDDEN_KEY = 'hiddenTxns';

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
  animatedBalance = 0;
  estimatedRemaining: number = 0;
    constructor(private transactionService: TransactionService) {}
calculateRemaining() {
  if (this.previousDayBalance !== null) {
    const todaySpend = this.getTodaySpend();
    this.estimatedRemaining = this.previousDayBalance - todaySpend;
  }
}
getTodaySpend(): number {
  const today = new Date().toISOString().split('T')[0];

  return this.monthTransactions
    .filter(
      (t) =>
        t.type === 'DEBIT' &&
        t.date === today &&
        !this.hiddenTransactionIds.has(t.id)
    )
    .reduce((sum, t) => sum + (t.amount ?? 0), 0);
}
  toggleBalance() {

    // If already loaded → do nothing (or you can allow refresh)
    if (this.previousDayBalance !== null) {
      return;
    }

    this.loadingBalance = true;

    const today = new Date().toISOString().split('T')[0];

    this.transactionService.getPreviousDayBalance(today)
      .subscribe({
        next: (res: number) => {
          console.log("API RESPONSE:", res);

          this.previousDayBalance = res;
          this.loadingBalance = false;

          if (res !== null && res !== undefined) {
            this.animateBalance(res);
          }
this.calculateRemaining();
        },
        error: () => {
          this.previousDayBalance = null;
          this.loadingBalance = false;
        }
      });
  }
  refreshBalanceSilently() {
    const today = new Date().toISOString().split('T')[0];

    this.transactionService.getPreviousDayBalance(today)
      .subscribe({
        next: (res: number) => {
          console.log("AUTO REFRESH BAL:", res);

          if (res !== null && res !== undefined) {

            // animate only if changed
            if (res !== this.previousDayBalance) {
              this.animateBalance(res);
            }

            this.previousDayBalance = res;

this.calculateRemaining();
          }
        },
        error: () => {
          this.previousDayBalance = null;
        }
      });
  }
  animateBalance(target: number) {

    const duration = 800;
    const frameRate = 30;

    const steps = duration / frameRate;
    const increment = target / steps;

    this.animatedBalance = 0;

    const interval = setInterval(() => {

      this.animatedBalance += increment;

      if (this.animatedBalance >= target) {
        this.animatedBalance = target;
        clearInterval(interval);
      }

    }, frameRate);
  }
    ngOnInit(): void {
      this.loadHiddenFromSession();

      const now = new Date();
      this.selectedMonth = `${now.getFullYear()}-${(now.getMonth() + 1)
        .toString()
        .padStart(2, '0')}`;
      this.loadMonthData();
      this.loadTopPayees();

      this.refreshSubscription = interval(540000).subscribe(() => {
        this.refreshBalanceSilently();
        this.loadMonthData();
        this.loadTopPayees();
        this.autoHitCount++;
        this.lastRefreshedAt = new Date();
      });
  const today = new Date().toISOString().split('T')[0];
  this.loadTransactionsForDate(today);
    }

  categoryTotals: { [key: string]: number } = {};
  monthTransactions: Transaction[] = [];
    ngOnDestroy(): void {
      this.refreshSubscription?.unsubscribe();
    }

    /* -------------------- sessionStorage helpers -------------------- */
    private loadHiddenFromSession() {
      try {
        const raw = sessionStorage.getItem(this.HIDDEN_KEY);
        if (raw) {
          const arr = JSON.parse(raw) as number[];
          this.hiddenTransactionIds = new Set(arr);
        }
      } catch (e) {
        console.warn('Unable to load hidden txn ids from sessionStorage', e);
        this.hiddenTransactionIds = new Set();
      }
    }

    private saveHiddenToSession() {
      try {
        sessionStorage.setItem(
          this.HIDDEN_KEY,
          JSON.stringify(Array.from(this.hiddenTransactionIds))
        );
      } catch (e) {
        console.warn('Unable to save hidden txn ids to sessionStorage', e);
      }
    }

    /* -------------------- month / navigation -------------------- */
    changeMonth(offset: number) {
      if (!this.selectedMonth) return;
      const [year, month] = this.selectedMonth.split('-').map(Number);
      const newDate = new Date(year, month - 1 + offset, 1);
      this.selectedMonth = `${newDate.getFullYear()}-${(newDate.getMonth() + 1)
        .toString()
        .padStart(2, '0')}`;
      this.loadMonthData();
      this.loadTopPayees();
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

          // Use case-insensitive check for type and exclude hidden ids
          const debitTransactions = res.content.filter(
            (t) =>
              t.type?.toUpperCase() === 'DEBIT' &&
              !this.hiddenTransactionIds.has(t.id)
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
  this.monthTransactions = transactions;
  this.updateLineChart(transactions);
          this.lastRefreshedAt = new Date();
        });

    }

  updateCategory(t: Transaction, event: any) {

    const newCategory = event.target.value;

    // update locally so UI changes instantly
    t.categorySwipe = newCategory;

    // call backend API
    this.transactionService
      .updateCategorySwipe(t.id, newCategory)
      .subscribe(() => {

        // reload data so charts + totals update
        this.loadMonthData();

      });
  }

    /* -------------------- main chart / totals update -------------------- */
    private updateLineChart(transactions: Transaction[]) {
      // Exclude hidden transactions from chart and totals
      const debitTransactions = transactions.filter(
        (t) => t.type === 'DEBIT' && !this.hiddenTransactionIds.has(t.id)
      );

      this.totalTransactions = debitTransactions.length;
      this.totalAmount = debitTransactions.reduce(
        (sum, t) => sum + (t.amount ?? 0),
        0
      );
  this.animateTotalAmount(this.totalAmount);
this.calculateRemaining();
    const [year, month] = this.selectedMonth.split('-').map(Number);
    const now = new Date();

    let daysToConsider: number;

    if (year === now.getFullYear() && month === now.getMonth() + 1) {
      daysToConsider = now.getDate();
    } else {
      daysToConsider = new Date(year, month, 0).getDate();
    }

    this.avgDailySpend = Math.round(this.totalAmount / (daysToConsider || 1));
  const [year1, month1] = this.selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(year1, month1, 0).getDate();

  this.projectedMonthlySpend = this.avgDailySpend * daysInMonth;

  const today = new Date();
  const daysPassed = today.getDate();

  this.daysLeftInMonth = daysInMonth - daysPassed;

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
  this.categoryTotals = {};

  debitTransactions.forEach(t => {
    const category = this.getCategory(t);

    if (!this.categoryTotals[category]) {
      this.categoryTotals[category] = 0;
    }

    this.categoryTotals[category] += t.amount ?? 0;
  });

  const merchantMap = new Map<string, { amount: number; count: number }>();

  debitTransactions.forEach((t) => {
    const name = t.payeeName || t.toUpi || 'Unknown';

    if (!merchantMap.has(name)) {
      merchantMap.set(name, { amount: 0, count: 0 });
    }

    const m = merchantMap.get(name)!;
    m.amount += t.amount ?? 0;
    m.count += 1;
  });

  let topName = '';
  let topAmount = 0;
  let topCount = 0;

  merchantMap.forEach((v, k) => {
    if (v.amount > topAmount) {
      topName = k;
      topAmount = v.amount;
      topCount = v.count;
    }
  });

  this.topMerchant = {
    name: topName,
    amount: topAmount,
    count: topCount,
  };

    }
  animatedTotalAmount = 0;
  animateTotalAmount(target: number) {

    const duration = 800; // animation time ms
    const frameRate = 30;

    const steps = duration / frameRate;
    const increment = target / steps;

    this.animatedTotalAmount = 0;

    const interval = setInterval(() => {

      this.animatedTotalAmount += increment;

      if (this.animatedTotalAmount >= target) {
        this.animatedTotalAmount = target;
        clearInterval(interval);
      }

    }, frameRate);
  }

    /* -------------------- hover & table handling -------------------- */
    // onLineHover(event: any) {
    //   const activePoints = event.active;
    //   if (activePoints?.length && !this.isTablePinned) {
    //     const index = activePoints[0].index;
    //     const chart = activePoints[0].element.$context.chart;
    //     const date = chart.data.labels[index] as string;
    //     this.hoveredDate = date;
    //     this.isTableVisible = true;

    //     this.transactionService.getTransactionsForDay(date).subscribe((res) => {
    //       // filter to DEBIT and exclude hidden transactions
    //       this.hoveredTransactions = res
    //         .filter((t) => t.type === 'DEBIT')
    //         .filter((t) => !this.hiddenTransactionIds.has(t.id));
    //       this.filteredTransactions = [...this.hoveredTransactions];
    //     });
    //   } else if (!this.isTablePinned) {
    //     this.isTableVisible = false;
    //     this.hoveredTransactions = [];
    //     this.filteredTransactions = [];
    //   }
    // }

    filterTransactions() {
      const text = this.searchText.toLowerCase().trim();
      this.filteredTransactions = this.hoveredTransactions.filter(
        (t) =>
          (t.payeeName?.toLowerCase().includes(text) ||
            t.toUpi?.toLowerCase().includes(text)) &&
          !this.hiddenTransactionIds.has(t.id)
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

    /* -------------------- hide / restore (session-only) -------------------- */
    hideTransaction(txn: Transaction, event?: Event) {
      if (event) event.stopPropagation();
      if (!txn?.id) return;
      this.hiddenTransactionIds.add(txn.id);
      this.saveHiddenToSession();

      // Remove it immediately from the visible lists & update UI
      this.filteredTransactions = this.filteredTransactions.filter(
        (t) => t.id !== txn.id
      );
      this.hoveredTransactions = this.hoveredTransactions.filter(
        (t) => t.id !== txn.id
      );

      // Rebuild chart/totals by reloading the month data (or you can update incrementally)
      // calling loadMonthData will re-fetch from backend; to avoid re-fetch, you could
      // instead call updateLineChart with the previous set minus hidden — for simplicity, call loadMonthData
      this.loadMonthData();
      this.loadTopPayees();
    }

    clearHiddenTransactions() {
      this.hiddenTransactionIds.clear();
      this.saveHiddenToSession();
      // Refresh data to reflect restored transactions
      this.loadMonthData();
      this.loadTopPayees();

      // if table is visible, re-fetch hovered day
      if (this.hoveredDate) {
        this.transactionService
          .getTransactionsForDay(this.hoveredDate)
          .subscribe((res) => {
            this.hoveredTransactions = res.filter((t) => t.type === 'DEBIT');
            this.filterTransactions();
          });
      }
    }

    refresh(){
      this.transactionService.refresh().subscribe(()=>{
        this.loadMonthData();
        this.loadTopPayees();
      });
    }

    private lastHoveredDate: string | null = null;
    private hoverTimeout: any;
    onChartLeave() {
      if (!this.isTablePinned) {
        clearTimeout(this.hoverTimeout);
        this.hoverTimeout = setTimeout(() => {
          this.isTableVisible = false;
          this.lastHoveredDate = null;
        }, 300);
      }
    }
  isCategoryModalOpen = false;
  selectedCategory = '';
  categoryTransactions: Transaction[] = [];
  openCategoryModal(category: string) {

    this.selectedCategory = category;

    this.categoryTransactions = this.monthTransactions
      .filter(
        (t) =>
          t.type === 'DEBIT' &&
          this.getCategory(t) === category &&
          !this.hiddenTransactionIds.has(t.id)
      )
      .sort((a, b) => b.amount - a.amount);

    // Build merchant pie chart
    const merchantMap: any = {};

    this.categoryTransactions.forEach(t => {

      const name = t.payeeName || 'Unknown';

      if (!merchantMap[name]) {
        merchantMap[name] = 0;
      }

      merchantMap[name] += t.amount ?? 0;

    });

    this.pieChartData = {
      labels: Object.keys(merchantMap),
      datasets: [
        {
          data: Object.values(merchantMap)
        }
      ]
    };

    this.isCategoryModalOpen = true;
  }
  // openCategoryModal(category: string) {

  //   this.selectedCategory = category;

  //   this.categoryTransactions = this.monthTransactions.filter(
  //     (t) =>
  //       t.type === 'DEBIT' &&
  //       this.getCategory(t) === category &&
  //       !this.hiddenTransactionIds.has(t.id)
  //   );

  //   this.isCategoryModalOpen = true;
  // }
  closeCategoryModal() {
    this.isCategoryModalOpen = false;
  }

    onLineHover(event: any) {
      const activePoints = event.active;

      // No active point — hide table (if not pinned)
      if (!activePoints?.length) {
        if (!this.isTablePinned) {
          clearTimeout(this.hoverTimeout);
          this.hoverTimeout = setTimeout(() => {
            this.isTableVisible = false;
          }, 250); // small delay prevents flicker
        }
        return;
      }

      // Get hovered date
      const index = activePoints[0].index;
      const chart = activePoints[0].element.$context.chart;
      const date = chart.data.labels[index] as string;

      // Prevent redundant reloads if same date hovered
      if (this.lastHoveredDate === date) return;

      this.lastHoveredDate = date;
      this.hoveredDate = date;
      this.isTableVisible = true;

      // Debounce API call for smoother feel
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = setTimeout(() => {
        this.transactionService.getTransactionsForDay(date).subscribe((res) => {
          this.hoveredTransactions = res.filter((t) => t.type === 'DEBIT');
          this.filteredTransactions = this.hoveredTransactions.filter(
            (t) => !this.hiddenTransactionIds.has(t.id)
          );
        });
      }, 150);
    }
    // --- New Methods for Day Navigation ---
    changeDay(offset: number) {
      if (!this.hoveredDate) return;

      const currentDate = new Date(this.hoveredDate);
      currentDate.setDate(currentDate.getDate() + offset);
      const newDate = currentDate.toISOString().split('T')[0]; // format YYYY-MM-DD

      this.loadTransactionsForDate(newDate);
    }

    // --- New method for manual date entry ---
    onDateInputChange(event: any) {
      const newDate = event.target.value;
      if (newDate) this.loadTransactionsForDate(newDate);
    }

    // --- Centralized function for daily data ---
    loadTransactionsForDate(date: string) {
      this.hoveredDate = date;
      this.lastHoveredDate = date;
      this.isTableVisible = true;

      this.transactionService.getTransactionsForDay(date).subscribe((res) => {
        this.hoveredTransactions = res.filter((t) => t.type === 'DEBIT');
        this.filteredTransactions = this.hoveredTransactions.filter(
          (t) => !this.hiddenTransactionIds.has(t.id)
        );
      });
    }
  getCategory(t: Transaction): string {

    if (t.categorySwipe) {
      return t.categorySwipe;
    }
    const text = (t.payeeName + ' ' + t.toUpi).toLowerCase();

    // 👨‍👩‍👧 Family transfers
    if (
      text.includes('ishika') ||
      text.includes('geeta') ||
      text.includes('prafull')
    ) return 'Family';

    // 🚆 Travel (Train / Metro / Tickets)
    // if (

    // ) return 'Travel';

    // 🏢 Office Spend (Cafeteria/Snacks)
    if (
      text.includes('hungerbox') ||
      text.includes('grubox') ||
      text.includes('foodies health and snacks co ora')
    ) return 'Office Spend';

    // 🍔 Food
    if (
      text.includes('swiggy') ||
      text.includes('zomato')||
      text.includes('zepto')||text.includes('blinkit')
    ) return 'Food';

    // 🚕 Transport
    if (
      text.includes('uber') ||
      text.includes('ola')||text.includes('rapido')||
      text.includes('metro')||text.includes('irctc') ||
      text.includes('utc')||text.includes('travel')||text.includes('transport')
    ) return 'Transport';

    // 🛒 Shopping
    if (
      text.includes('amazon') ||
      text.includes('flipkart')
    ) return 'Shopping';

    // 📱 Bills
    if (
      text.includes('recharge') ||
      text.includes('airtel') ||
      text.includes('jio')||
      text.includes('cred')||text.includes('upcl')||
      text.includes('mutual')
    ) return 'Bills';
    if (
      text.includes('medi')
    ) return 'Medicine';
    return 'Other';
  }

  pieChartData: any = {
    labels: [],
    datasets: [
      {
        data: []
      }
    ]
  };
  }


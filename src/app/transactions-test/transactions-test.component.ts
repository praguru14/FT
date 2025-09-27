import { CommonModule } from '@angular/common'; // for *ngIf, *ngFor
import { TransactionService } from '../service/transaction.service';
import { Component } from '@angular/core';

@Component({
  selector: 'app-transactions-test',
  standalone: true,
  imports: [CommonModule], // ✅ needed for *ngIf and *ngFor
  template: `
    <h2>Transactions Test</h2>
    <div *ngIf="loading">Loading transactions...</div>
    <ul *ngIf="!loading">
      <li *ngFor="let t of transactions">
        {{ t.date }} - {{ t.payeeName }} - ₹{{ t.amount }}
      </li>
    </ul>
  `,
})
export class TransactionsTestComponent {
  transactions: any[] = [];
  loading = true;

  constructor(private transactionService: TransactionService) {}

  ngOnInit() {
    this.transactionService.getTransactions({ page: 0, size: 10 }).subscribe({
      next: (res) => {
        this.transactions = res.content || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}

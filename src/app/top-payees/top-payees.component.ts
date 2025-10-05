import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../service/transaction.service';

interface TopPayee {
  payeeName: string;
  totalAmount: number;
  transactionCount: number;
  transactions: { date: string; amount: number }[];
  showTransactions?: boolean;
  keepOpen?: boolean;
}

@Component({
  selector: 'app-top-payees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './top-payees.component.html',
  styleUrls: ['./top-payees.component.css'],
})
export class TopPayeesComponent implements OnInit {
  topPayees: TopPayee[] = [];
  filteredPayees: TopPayee[] = [];
  searchText: string = '';

  constructor(private transactionService: TransactionService) {}

  ngOnInit(): void {
    this.loadTopPayees();
  }

  loadTopPayees() {
    this.transactionService
      .getTransactions({ page: 0, size: 100000 })
      .subscribe((res) => {
        if (!res?.content?.length) {
          this.topPayees = [];
          this.filteredPayees = [];
          return;
        }

        const debitTransactions = res.content.filter(
          (t) => t.type?.toUpperCase() === 'DEBIT'
        );

        const payeeMap = new Map<
          string,
          {
            totalAmount: number;
            count: number;
            transactions: { date: string; amount: number }[];
          }
        >();

        debitTransactions.forEach((t) => {
          const name = t.payeeName?.trim() || t.toUpi?.trim() || 'Unknown';
          const txn = { date: t.date, amount: t.amount || 0 };

          if (payeeMap.has(name)) {
            const prev = payeeMap.get(name)!;
            prev.totalAmount += txn.amount;
            prev.count += 1;
            prev.transactions.push(txn);
          } else {
            payeeMap.set(name, {
              totalAmount: txn.amount,
              count: 1,
              transactions: [txn],
            });
          }
        });

        this.topPayees = Array.from(payeeMap.entries())
          .map(([payeeName, { totalAmount, count, transactions }]) => ({
            payeeName,
            totalAmount,
            transactionCount: count,
            transactions,
            showTransactions: false,
            keepOpen: false,
          }))
          .sort((a, b) => b.totalAmount - a.totalAmount);

        this.filteredPayees = [...this.topPayees];
      });
  }

  filterPayees() {
    const text = this.searchText.toLowerCase();
    this.filteredPayees = this.topPayees.filter((p) =>
      p.payeeName.toLowerCase().includes(text)
    );
  }

  toggleTransactions(payee: any) {
    console.log("Toggleing transactions for:", payee);
    // Close all other payees (optional)
    this.filteredPayees.forEach((p) => {
      if (p !== payee) p.showTransactions = false;
    });

    // Toggle current one
    payee.showTransactions = !payee.showTransactions;
  }
}

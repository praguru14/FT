import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Transaction {
  date: string; // ISO date string
  amount: number;
  type: string;
  toUpi: string;
  payeeName: string;
  bankName: string;
  emailReceivedDate?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private baseUrl = 'http://localhost:8090/transactions';

  constructor(private http: HttpClient) {}

  // --- Get transactions with filters / pagination ---
  getTransactions(params?: any): Observable<{ content: Transaction[] }> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    console.log('Fetching transactions with params:', httpParams.toString());
    return this.http.get<{ content: Transaction[] }>(this.baseUrl, {
      params: httpParams,
    });
  }

  // --- Get total spent in a specific month ---
  getTotalSpentInMonth(year: number, month: number): Observable<number> {
    const params = new HttpParams()
      .set('year', year.toString())
      .set('month', month.toString());
    return this.http.get<number>(`${this.baseUrl}/total/month`, { params });
  }

  // --- Get total spent on multiple dates (comma-separated yyyy-MM-dd) ---
  getTotalByDates(dates: string): Observable<{ [date: string]: number }> {
    const params = new HttpParams().set('dates', dates);
    return this.http.get<{ [date: string]: number }>(
      `${this.baseUrl}/total/by-dates`,
      { params }
    );
  }

  // --- Get total spent on arbitrary dates (legacy single/multi-date support) ---
  getTotalSpentOnDates(dates: string): Observable<number> {
    const params = new HttpParams().set('dates', dates);
    return this.http.get<number>(`${this.baseUrl}/total/dates`, { params });
  }
  getTransactionsForDay(date: string) {
    const params = new HttpParams().set('date', date);
    return this.http.get<any[]>(`${this.baseUrl}/day`, { params });
  }
}

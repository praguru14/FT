import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { baseUrl } from '../../baseUrl';

@Component({
  selector: 'app-sql-query',
  imports: [FormsModule, NgFor, NgIf],
  templateUrl: './sql-query.component.html',
  styleUrl: './sql-query.component.css',
})
export class SqlQueryComponent {
  sqlQuery: string = '';
  results: any[] = [];
  errorMessage: string = '';
  private apiUrl = baseUrl.apiUrl;

  constructor(private http: HttpClient) {}

  runQuery() {
    this.errorMessage = '';
    this.results = [];

    this.http
      .post<any[]>(`${this.apiUrl}/transactions/run`, { query: this.sqlQuery })
      .subscribe({
        next: (res) => {
          this.results = res;
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Error executing query';
        },
      });
  }

  getColumns() {
    return this.results.length ? Object.keys(this.results[0]) : [];
  }
}

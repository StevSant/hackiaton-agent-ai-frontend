import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { firstValueFrom } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-risk',
  templateUrl: './risk.html',
  styleUrls: ['./risk.css'],
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiskPage {
  private readonly http = inject(HttpClient);
  private readonly base = environment.baseUrl;

  inputText = '';
  resultText: any = null;
  resultPdf: any = null;
  loading = false;
  error: string | null = null;

  async analyzeText() {
    if (!this.inputText.trim()) return;
    this.loading = true;
    this.error = null;
    try {
  this.resultText = await firstValueFrom(this.http.post(`${this.base}/risk/analysis/text`, { text: this.inputText }));
    } catch (e: any) {
      this.error = e?.message || 'Error en análisis';
    } finally {
      this.loading = false;
    }
  }

  async analyzePdf(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
  const file = input.files[0];
    const form = new FormData();
    form.append('file', file);
    this.loading = true;
    this.error = null;
    try {
      this.resultPdf = await firstValueFrom(this.http.post(`${this.base}/risk/analysis/pdf`, form));
    } catch (e: any) {
      this.error = e?.message || 'Error analizando PDF';
    } finally {
      this.loading = false;
      input.value = '';
    }
  }
}

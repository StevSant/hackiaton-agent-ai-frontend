import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
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
  private readonly baseUrl = environment.baseUrl;

  readonly inputText = signal('');
  readonly resultText = signal<any>(null);
  readonly resultPdf = signal<any>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async analyzeText() {
    if (!this.inputText().trim()) return;
    
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(
        this.http.post(`${this.baseUrl}/risk/analysis/text`, { 
          text: this.inputText() 
        })
      );
      this.resultText.set(result);
    } catch (e: any) {
      this.error.set(e?.message || 'Error en análisis');
    } finally {
      this.loading.set(false);
    }
  }

  async analyzePdf(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    
    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(
        this.http.post(`${this.baseUrl}/risk/analysis/pdf`, formData)
      );
      this.resultPdf.set(result);
    } catch (e: any) {
      this.error.set(e?.message || 'Error analizando PDF');
    } finally {
      this.loading.set(false);
      input.value = '';
    }
  }
}

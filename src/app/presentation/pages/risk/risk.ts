import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RiskFacade } from '@app/application/risk/risk.facade';

@Component({
  standalone: true,
  selector: 'app-risk',
  templateUrl: './risk.html',
  styleUrls: ['./risk.css'],
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiskPage {
  private readonly facade = inject(RiskFacade);

  readonly inputText = this.facade.inputText;
  readonly resultText = this.facade.resultText;
  readonly resultPdf = this.facade.resultPdf;
  readonly loading = this.facade.loading;
  readonly error = this.facade.error;

  async analyzeText() {
    await this.facade.analyzeText();
  }

  async analyzePdf(event: Event) {
    const input = event.target as HTMLInputElement;
    await this.facade.analyzePdf(input);
  }
}

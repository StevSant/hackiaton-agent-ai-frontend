import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-me-text',
  imports: [],
  templateUrl: './me-text.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeText {
  message = input.required<string>();
  label = input.required<string>();
  timestamp = input.required<string>();
}

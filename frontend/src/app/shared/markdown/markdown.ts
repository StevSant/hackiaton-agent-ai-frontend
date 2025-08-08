import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Minimal markdown renderer placeholder.
 * Matches the <markdown [data]="..."> API used in templates.
 * Currently renders as preformatted text to ensure safety and simplicity.
 */
@Component({
  selector: 'markdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    <pre class="whitespace-pre-wrap break-words">{{ data() }}</pre>
  `,
})
export class MarkdownComponent {
  data = input<string>('');
}

import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilesFacade } from '@app/application/files/files.facade';

@Component({
  standalone: true,
  selector: 'app-files',
  templateUrl: './files.html',
  styleUrls: ['./files.css'],
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilesPage implements OnInit {
  private readonly facade = inject(FilesFacade);
  
  readonly items = this.facade.items;
  readonly loading = this.facade.loading;
  readonly error = this.facade.error;
  readonly type = this.facade.type;
  readonly page = this.facade.page;
  readonly limit = this.facade.limit;
  readonly total = this.facade.total;

  ngOnInit() {
    this.load();
  }

  async load() {
    await this.facade.load();
  }

  async onUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    await this.facade.upload(input);
  }

  onTypeChange(value: string) {
    this.type.set(value as any);
    this.load();
  }

  async copyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      // fallback: nothing
    }
  }

  async prevPage() { await this.facade.prevPage(); }
  async nextPage() { await this.facade.nextPage(); }
}

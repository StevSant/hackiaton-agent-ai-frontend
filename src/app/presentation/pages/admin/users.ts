import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminUsersService, AdminUserItem } from '@infrastructure/services/admin-users.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './users.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersPage {
  private readonly api = inject(AdminUsersService);
  private readonly fb = inject(FormBuilder);

  readonly creating = signal(false);
  readonly error = signal<string | null>(null);
  users = signal<AdminUserItem[]>([]);
  page = signal(1);
  limit = signal(10);
  total = signal(0);
  search = signal<string>('');
  readonly start = computed(() => (this.page() - 1) * this.limit() + 1);
  readonly end = computed(() => Math.min(this.page() * this.limit(), this.total()));
  sortBy = signal<'email' | 'username' | 'created_at' | ''>('');
  sortOrder = signal<'asc' | 'desc'>('asc');

  editingId = signal<string | null>(null);
  editForm = this.fb.group({ username: [''], email: [''], role: ['user' as 'admin' | 'user'], password: [''] });

  form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['user' as 'admin' | 'user']
  });

  async ngOnInit() { await this.refresh(); }

  async refresh() {
  const res = await this.api.list({ page: this.page(), limit: this.limit(), email: this.search() || undefined });
    this.users.set(res.items || []);
    this.total.set(res.total || 0);
  }

  async nextPage() {
    if (this.page() * this.limit() >= this.total()) return;
    this.page.update(p => p + 1);
    await this.refresh();
  }

  async prevPage() {
    if (this.page() <= 1) return;
    this.page.update(p => p - 1);
    await this.refresh();
  }

  async applySearch(value: string) {
    this.search.set(value.trim());
    this.page.set(1);
    await this.refresh();
  }

  async create() {
    if (this.form.invalid || this.creating()) return;
    this.creating.set(true); this.error.set(null);
    try {
      const { username, email, password, role } = this.form.value;
      await this.api.create({ username: username!, email: email!, password: password!, role: role! });
      this.form.reset({ role: 'user' });
      await this.refresh();
    } catch (e: any) {
      this.error.set(e?.error?.detail || e?.message || 'Error creando usuario');
    } finally {
      this.creating.set(false);
    }
  }

  startEdit(u: AdminUserItem) {
    this.editingId.set(u.user_id);
    this.editForm.setValue({ username: u.username || '', email: u.email || '', role: (u.role as any) || 'user', password: '' });
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editForm.reset({ role: 'user' });
  }

  async saveEdit() {
    const id = this.editingId();
    if (!id) return;
    const payload = this.editForm.value as any;
    await this.api.update(id, payload);
    this.cancelEdit();
    await this.refresh();
  }

  async confirmDelete(u: AdminUserItem) {
    if (confirm(`Eliminar usuario ${u.email}?`)) {
      await this.api.delete(u.user_id);
      await this.refresh();
    }
  }
}

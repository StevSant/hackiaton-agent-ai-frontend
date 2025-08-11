import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { AdminUserItem } from '@core/ports';
import { AdminUsersFacade } from '@app/application/admin/admin-users.facade';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, TranslateModule],
  templateUrl: './users.html',
  styleUrls: ['./users.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersPage {
  private readonly facade = inject(AdminUsersFacade);
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject(TranslateService);

  readonly creating = this.facade.creating;
  readonly error = this.facade.error;
  users = this.facade.users;
  page = this.facade.page;
  limit = this.facade.limit;
  total = this.facade.total;
  search = this.facade.search;
  readonly start = this.facade.start;
  readonly end = this.facade.end;
  sortBy = this.facade.sortBy;
  sortOrder = this.facade.sortOrder;

  editingId = signal<string | null>(null);
  editForm = this.fb.group({
    username: [''],
    email: [''],
    role: ['user' as 'admin' | 'user'],
    password: [''],
  });

  form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['user' as 'admin' | 'user'],
  });

  async ngOnInit() {
    await this.refresh();
  }

  async refresh() {
    await this.facade.refresh();
  }

  async nextPage() {
    await this.facade.nextPage();
  }

  async prevPage() {
    await this.facade.prevPage();
  }

  async applySearch(value: string) {
    await this.facade.applySearch(value);
  }

  setSort(field: 'email' | 'username' | 'created_at') {
    this.facade.setSort(field);
  }

  async create() {
    if (this.form.invalid || this.creating()) return;
    const { username, email, password, role } = this.form.value;
    await this.facade.create({
      username: username!,
      email: email!,
      password: password!,
      role: role!,
    });
    this.form.reset({ role: 'user' });
  }

  startEdit(u: AdminUserItem) {
    this.editingId.set(u.user_id);
    this.editForm.setValue({
      username: u.username || '',
      email: u.email || '',
      role: (u.role as any) || 'user',
      password: '',
    });
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editForm.reset({ role: 'user' });
  }

  async saveEdit() {
    const id = this.editingId();
    if (!id) return;
    const payload = this.editForm.value as any;
    await this.facade.update(id, payload);
    this.cancelEdit();
  }

  async confirmDelete(u: AdminUserItem) {
    const msg = this.i18n.instant('ADMIN.USERS.CONFIRM_DELETE', {
      email: u.email,
    });
    if (confirm(msg)) {
      await this.facade.delete(u.user_id);
    }
  }
}

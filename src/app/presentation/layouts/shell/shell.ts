import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  ElementRef,
  ViewChild,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { MatIconModule } from '@angular/material/icon';
import { SessionsEventsService } from '@infrastructure/services/sessions-events.service';
import { TranslateModule } from '@ngx-translate/core';
import type { SessionEntry } from '@core/models';
import { ChatFacade } from '@app/application/chat/chat.facade';
import { BackgroundService } from '@infrastructure/services/background.service';
import { Router, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterOutlet,
    SidebarComponent,
    MatIconModule,
    TranslateModule,
  ],
  templateUrl: './shell.html',
  styleUrls: ['./shell.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellLayout implements OnInit {
  // Mobile sidebar state
  isSidebarOpen = false;
  private readonly router = inject(Router);
  private readonly sessionsEvents = inject(SessionsEventsService);
  private readonly chatFacade = inject(ChatFacade);
  private readonly bg = inject(BackgroundService);
  private lastFocused: HTMLElement | null = null;
  // Current session id propagated by chat page via route; optional
  selectedSessionId: string | null = null;

  // Global delete modal state
  pendingDelete?: SessionEntry;
  @ViewChild('deleteDialog') deleteDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('cancelBtn') cancelBtn?: ElementRef<HTMLButtonElement>;
  @ViewChild('confirmBtn') confirmBtn?: ElementRef<HTMLButtonElement>;

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    // Persist preference (desktop)
    this.persistSidebarState();
  }

  closeSidebar() {
    this.isSidebarOpen = false;
    // Do not persist on mobile close via overlay; but safe to persist anyway
    this.persistSidebarState();
  }

  ngOnInit() {
    // Open by default on desktop, closed on mobile
    try {
      const isDesktop =
        typeof window !== 'undefined' &&
        window.matchMedia('(min-width: 768px)').matches;
      if (isDesktop) {
        const saved = this.getSavedSidebarState();
        this.isSidebarOpen = saved ?? true;
      } else {
        this.isSidebarOpen = false;
      }
    } catch {}
    // Initialize background defaults early
    queueMicrotask(() => this.bg.init());
    // Ensure sessions list tries to load at app start (helps after F5 on deep links)
    queueMicrotask(() => this.sessionsEvents.triggerRefresh());

    // Close overlay on navigation when on mobile
    this.router.events.subscribe((ev) => {
      if (ev instanceof NavigationEnd) {
        if (!this.isDesktop()) this.isSidebarOpen = false;
      }
    });
  }

  // Handle confirm at layout level to ensure modal is centered globally
  confirmDeleteFromShell() {
    const s = this.pendingDelete;
    if (!s) return;
    this.chatFacade.deleteSession(s.session_id).subscribe({
      next: () => {
        // refresh sessions list globally
        this.sessionsEvents.triggerRefresh();
      },
      complete: () => {
        this.closeDeleteModal();
      },
      error: () => {
        this.closeDeleteModal();
      },
    });
  }

  openDeleteModal(session: SessionEntry) {
    this.pendingDelete = session;
    // remember the element that opened the modal to restore focus on close
    try {
      this.lastFocused = (document.activeElement as HTMLElement) ?? null;
    } catch {
      this.lastFocused = null;
    }
    // queue focus to cancel button for accessibility
    queueMicrotask(() => this.cancelBtn?.nativeElement?.focus());
  }

  closeDeleteModal() {
    this.pendingDelete = undefined;
    // restore focus to the trigger element
    queueMicrotask(() => {
      try {
        this.lastFocused?.focus?.();
      } catch {}
      this.lastFocused = null;
    });
  }

  onDialogKeydown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    const cancel = this.cancelBtn?.nativeElement;
    const confirm = this.confirmBtn?.nativeElement;
    if (!cancel || !confirm) return;
    const active = document.activeElement as HTMLElement | null;
    const shift = e.shiftKey;
    if (!shift && active === confirm) {
      e.preventDefault();
      cancel.focus();
    } else if (shift && active === cancel) {
      e.preventDefault();
      confirm.focus();
    }
  }

  // Header button: open files modal via event bus
  openSessionFilesFromShell() {
    this.sessionsEvents.openFilesModal(this.selectedSessionId);
  }

  // Header button: open companies analysis modal via event bus
  openSessionCompaniesFromShell() {
    this.sessionsEvents.openCompaniesModal(this.selectedSessionId);
  }

  private isDesktop(): boolean {
    try {
      return (
        typeof window !== 'undefined' &&
        window.matchMedia('(min-width: 768px)').matches
      );
    } catch {
      return true;
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (this.isDesktop()) {
      const saved = this.getSavedSidebarState();
      this.isSidebarOpen = saved ?? true;
    } else {
      this.isSidebarOpen = false;
    }
  }

  private getSavedSidebarState(): boolean | null {
    try {
      const v =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('chatSidebarOpen')
          : null;
      if (v == null) return null;
      return v === '1';
    } catch {
      return null;
    }
  }

  private persistSidebarState() {
    try {
      typeof window !== 'undefined' &&
        window.localStorage.setItem(
          'chatSidebarOpen',
          this.isSidebarOpen ? '1' : '0',
        );
    } catch {
      /* ignore */
    }
  }
}

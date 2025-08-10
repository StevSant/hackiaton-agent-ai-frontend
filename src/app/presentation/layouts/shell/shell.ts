import { Component, ChangeDetectionStrategy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { MatIconModule } from '@angular/material/icon';
import { SessionsEventsService } from '@infrastructure/services/sessions-events.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, MatIconModule, TranslateModule],
  templateUrl: './shell.html',
  styleUrls: ['./shell.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellLayout implements OnInit {
  // Mobile sidebar state
  isSidebarOpen = false;
  private readonly sessionsEvents = inject(SessionsEventsService);

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }

  ngOnInit() {
    // Open by default on desktop, closed on mobile
    try {
      const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
      this.isSidebarOpen = !!isDesktop;
    } catch {}
  // Ensure sessions list tries to load at app start (helps after F5 on deep links)
  queueMicrotask(() => this.sessionsEvents.triggerRefresh());
  }
}

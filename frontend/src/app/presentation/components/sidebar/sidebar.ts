import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatButtonComponent } from '../chat-button/chat-button';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
// Simple route config for home navigation

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, ChatButtonComponent, RouterLink, MatIconModule],
  templateUrl: './sidebar.html'
})

export class SidebarComponent {
  readonly siteRoutesConfig = { base: { url: '/' } } as const;
}

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  templateUrl: './shell.html',
  styleUrls: ['./shell.css'],
})
export class ShellLayout {
  // No agentId needed anymore
}

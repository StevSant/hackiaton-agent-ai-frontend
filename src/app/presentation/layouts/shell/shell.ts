import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  templateUrl: './shell.html',
  styleUrls: ['./shell.css'],
})
export class ShellLayout {
  private readonly route = inject(ActivatedRoute);

  // Expose a safe getter for template
  get currentAgentId(): string | null {
    const child = this.route.firstChild;
    if (!child) return null;
    const id = child.snapshot.paramMap.get('agentId');
    return id ?? null;
  }
}

import {
  Component,
  HostListener,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslateModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  // Inputs/Outputs for compatibility with two-way binding

  @Input() info: any;
  @Input() isOpen: boolean = false;
  @Input() isAdmin: boolean = false;
  @Output() isOpenChange: EventEmitter<boolean> = new EventEmitter<boolean>();

  get backend_repository() {
    return 'https://github.com/SteveSant26/hackiaton-agent-ai-backend';
  }

  get frontend_repository() {
    return 'https://github.com/tu-org/proyecto-frontend';
  }

  get youtube_video() {
    return 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  }

  // si ya tienes lógica para el menú lateral o similar
  toggleMenu() {
    // tu lógica existente
  }

  // toggle correcto del dropdown usando input/output
  toggleRepos(ev?: MouseEvent) {
    ev?.stopPropagation();
    this.isOpenChange.emit(!this.isOpen);
  }

  // util para cerrar
  private closeRepos() {
    if (this.isOpen) this.isOpenChange.emit(false);
  }

  // cierre por click-fuera
  @HostListener('document:click')
  onDocClick() {
    this.closeRepos();
  }

  // cierre por Esc
  @HostListener('document:keydown.escape')
  onEsc() {
    this.closeRepos();
  }
}

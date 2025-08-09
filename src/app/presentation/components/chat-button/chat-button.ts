import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-chat-button',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './chat-button.html'
})
export class ChatButtonComponent {
    // Nombre del ícono de Material o fontIcon registrado
    @Input() icon: string = 'chat';
    @Input() text: string = 'Button';
}
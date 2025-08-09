import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPage {
  sections = [
    { title: 'Usuarios', icon: 'group', route: '/admin/users', desc: 'Crear y gestionar usuarios' },
    { title: 'Archivos', icon: 'folder', route: '/admin/files', desc: 'Explorar archivos subidos' },
    { title: 'Mensajes', icon: 'chat', route: '/admin/messages', desc: 'Ver mensajes por sesión' },
    { title: 'App Info', icon: 'info', route: '/admin/app-info', desc: 'Ver y editar información' },
    { title: 'Risk Weights', icon: 'science', route: '/admin/risk-weights', desc: 'Configurar pesos' },
    { title: 'Compañías', icon: 'business', route: '/admin/companies', desc: 'Explorar compañías' },
  ];
}

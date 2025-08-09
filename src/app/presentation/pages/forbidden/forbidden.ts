import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="p-10 text-center">
    <h1 class="text-2xl font-semibold mb-2">Acceso denegado</h1>
    <p class="opacity-70">No tienes permisos para ver esta página.</p>
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenPage {}

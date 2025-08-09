import { Routes } from '@angular/router';
import { Chat } from '@presentation/pages/chat/chat';
import { AudioChat } from '@presentation/pages/audio/chat';
import { LoginPage } from '@presentation/pages/auth/login';
import { RegisterPage } from '@presentation/pages/auth/register';
import { AuthGuard } from '@infrastructure/guards/auth.guard';
import { GuestGuard } from '@infrastructure/guards/guest.guard';
import { NotFoundPage } from '@presentation/pages/not-found/not-found';
import { ShellLayout } from '@presentation/layouts/shell/shell';
import { RoleGuard } from '@infrastructure/guards/role.guard';
import { ForbiddenPage } from '@presentation/pages/forbidden/forbidden';

export const routes: Routes = [
  // Auth pages without shell
  { path: 'login', component: LoginPage, canActivate: [GuestGuard] },
  { path: 'register', component: RegisterPage, canActivate: [GuestGuard] },
  { path: 'forbidden', component: ForbiddenPage },

  // Shell-wrapped authenticated area
  {
    path: '',
    component: ShellLayout,
    canActivate: [AuthGuard],
    children: [
  { path: '', pathMatch: 'full', redirectTo: 'chat' },
  // Chat without agent routing
  { path: 'chat', component: Chat },
  { path: 'chat/session/:sessionId', component: Chat },
  // Voice-first chat routes (no agent)
  { path: 'audio', component: AudioChat },
  { path: 'audio/session/:sessionId', component: AudioChat },
      // Files and Risk pages
      {
        path: 'files',
        loadComponent: () =>
          import('@presentation/pages/files/files').then((m) => m.FilesPage),
      },
      {
        path: 'risk',
        loadComponent: () =>
          import('@presentation/pages/risk/risk').then((m) => m.RiskPage),
      },
      // Admin area (role: admin)
      {
        path: 'admin',
        canActivate: [RoleGuard],
        data: { roles: ['admin'] },
        children: [
          { path: '', loadComponent: () => import('./presentation/pages/admin/dashboard').then(m => m.AdminDashboardPage) },
          { path: 'users', loadComponent: () => import('./presentation/pages/admin/users').then(m => m.AdminUsersPage) },
          { path: 'files', loadComponent: () => import('./presentation/pages/admin/files').then(m => m.AdminFilesPage) },
          { path: 'messages', loadComponent: () => import('./presentation/pages/admin/messages').then(m => m.AdminMessagesPage) },
          { path: 'app-info', loadComponent: () => import('./presentation/pages/admin/app-info').then(m => m.AdminAppInfoPage) },
          { path: 'risk-weights', loadComponent: () => import('./presentation/pages/admin/risk-weights').then(m => m.AdminRiskWeightsPage) },
          { path: 'companies', loadComponent: () => import('./presentation/pages/admin/companies').then(m => m.AdminCompaniesPage) },
        ]
      },
    ],
  },

  // 404
  { path: '**', component: NotFoundPage },
];

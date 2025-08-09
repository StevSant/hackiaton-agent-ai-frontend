import { Routes } from '@angular/router';
import { AuthGuard } from '@infrastructure/guards/auth.guard';
import { GuestGuard } from '@infrastructure/guards/guest.guard';
import { RoleGuard } from '@infrastructure/guards/role.guard';

export const routes: Routes = [
  // Auth pages without shell
  {
    path: 'login',
    canActivate: [GuestGuard],
    loadComponent: () =>
      import('@presentation/pages/auth/login').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [GuestGuard],
    loadComponent: () =>
      import('@presentation/pages/auth/register').then((m) => m.RegisterPage),
  },
  {
    path: 'forbidden',
    loadComponent: () =>
      import('@presentation/pages/forbidden/forbidden').then(
        (m) => m.ForbiddenPage
      ),
  },

  // Shell-wrapped authenticated area
  {
    path: '',
    loadComponent: () =>
      import('@presentation/layouts/shell/shell').then((m) => m.ShellLayout),
    canActivate: [AuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'chat' },
      // Chat without agent routing
      {
        path: 'chat',
        loadComponent: () =>
          import('@presentation/pages/chat/chat').then((m) => m.Chat),
      },
      {
        path: 'chat/session/:sessionId',
        loadComponent: () =>
          import('@presentation/pages/chat/chat').then((m) => m.Chat),
      },
      // Voice-first chat routes (no agent)
      {
        path: 'audio',
        loadComponent: () =>
          import('@presentation/pages/audio/chat').then((m) => m.AudioChat),
      },
      {
        path: 'audio/session/:sessionId',
        loadComponent: () =>
          import('@presentation/pages/audio/chat').then((m) => m.AudioChat),
      },
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
          {
            path: '',
            loadComponent: () =>
              import('./presentation/pages/admin/dashboard').then(
                (m) => m.AdminDashboardPage
              ),
          },
          {
            path: 'users',
            loadComponent: () =>
              import('./presentation/pages/admin/users').then(
                (m) => m.AdminUsersPage
              ),
          },
          {
            path: 'files',
            loadComponent: () =>
              import('./presentation/pages/admin/files').then(
                (m) => m.AdminFilesPage
              ),
          },
          {
            path: 'messages',
            loadComponent: () =>
              import('./presentation/pages/admin/messages').then(
                (m) => m.AdminMessagesPage
              ),
          },
          {
            path: 'app-info',
            loadComponent: () =>
              import('./presentation/pages/admin/app-info').then(
                (m) => m.AdminAppInfoPage
              ),
          },
          {
            path: 'risk-weights',
            loadComponent: () =>
              import('./presentation/pages/admin/risk-weights').then(
                (m) => m.AdminRiskWeightsPage
              ),
          },
          {
            path: 'companies',
            loadComponent: () =>
              import('./presentation/pages/admin/companies').then(
                (m) => m.AdminCompaniesPage
              ),
          },
        ],
      },
    ],
  },

  // 404
  {
    path: '**',
    loadComponent: () =>
      import('@presentation/pages/not-found/not-found').then(
        (m) => m.NotFoundPage
      ),
  },
];

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
  // Public home page (no shell), accessible to everyone
  {
    path: 'home',
    loadComponent: () =>
      import('@presentation/pages/home').then((m) => m.HomePage),
  },
  {
  path: '',
  pathMatch: 'full',
  redirectTo: 'home',
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
      // Files and Risk pages (moved under admin layout)
      // Admin area is no longer under the normal shell
    ],
  },

  // Admin area (separate layout), protected by RoleGuard
  {
    path: 'admin',
    canActivate: [RoleGuard],
  data: { roles: ['admin'], preload: false },
    loadComponent: () =>
      import('./presentation/layouts/admin-shell/admin-shell').then(
        (m) => m.AdminShellLayout
      ),
    children: [
      {
        path: '',
  data: { preload: true },
        loadComponent: () =>
          import('./presentation/pages/admin/dashboard').then(
            (m) => m.AdminDashboardPage
          ),
      },
      {
        path: 'users',
    data: { preload: false },
        loadComponent: () =>
          import('./presentation/pages/admin/users').then(
            (m) => m.AdminUsersPage
          ),
      },
      {
        path: 'files',
    data: { preload: false },
        loadComponent: () =>
          import('./presentation/pages/admin/files').then(
            (m) => m.AdminFilesPage
          ),
      },
      {
        path: 'messages',
    data: { preload: false },
        loadComponent: () =>
          import('./presentation/pages/admin/messages').then(
            (m) => m.AdminMessagesPage
          ),
      },
      {
        path: 'app-info',
    data: { preload: false },
        loadComponent: () =>
          import('./presentation/pages/admin/app-info').then(
            (m) => m.AdminAppInfoPage
          ),
      },
      {
        path: 'risk-weights',
    data: { preload: false },
        loadComponent: () =>
          import('./presentation/pages/admin/risk-weights').then(
            (m) => m.AdminRiskWeightsPage
          ),
      },
      {
        path: 'companies',
    data: { preload: false },
        loadComponent: () =>
          import('./presentation/pages/admin/companies').then(
            (m) => m.AdminCompaniesPage
          ),
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

import { Routes } from '@angular/router';
import { AgentList } from '@presentation/components/agent-list/agent-list';
import { Chat } from '@presentation/pages/chat/chat';
import { AudioChat } from '@presentation/pages/audio/chat';
import { LoginPage } from '@presentation/pages/auth/login';
import { RegisterPage } from '@presentation/pages/auth/register';
import { AuthGuard } from '@infrastructure/guards/auth.guard';
import { GuestGuard } from '@infrastructure/guards/guest.guard';
import { NotFoundPage } from '@presentation/pages/not-found/not-found';
import { ShellLayout } from '@presentation/layouts/shell/shell';

export const routes: Routes = [
  // Auth pages without shell
  { path: 'login', component: LoginPage, canActivate: [GuestGuard] },
  { path: 'register', component: RegisterPage, canActivate: [GuestGuard] },

  // Shell-wrapped authenticated area
  {
    path: '',
    component: ShellLayout,
    canActivate: [AuthGuard],
    children: [
      { path: '', pathMatch: 'full', component: AgentList },
      // More specific route first to allow session deep-linking
      { path: 'chat/:agentId/session/:sessionId', component: Chat },
      { path: 'chat/:agentId', component: Chat },
      // Voice-first chat routes
      { path: 'audio/:agentId/session/:sessionId', component: AudioChat },
      { path: 'audio/:agentId', component: AudioChat },
  // Files and Risk pages
  { path: 'files', loadComponent: () => import('@presentation/pages/files/files').then(m => m.FilesPage) },
  { path: 'risk', loadComponent: () => import('@presentation/pages/risk/risk').then(m => m.RiskPage) },
    ],
  },

  // 404
  { path: '**', component: NotFoundPage },
];

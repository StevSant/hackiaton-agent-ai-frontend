import { Routes } from '@angular/router';
import { AgentList } from '@presentation/components/agent-list/agent-list';
import { Chat } from '@presentation/pages/chat/chat';
import { AudioChat } from '@presentation/pages/audio/chat';
import { LoginPage } from '@presentation/pages/auth/login';
import { RegisterPage } from '@presentation/pages/auth/register';
import { AuthGuard } from '@infrastructure/guards/auth.guard';
import { GuestGuard } from '@infrastructure/guards/guest.guard';
import { NotFoundPage } from '@presentation/pages/not-found/not-found';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: AgentList,
    canActivate: [AuthGuard],
  },
  // More specific route first to allow session deep-linking
  {
    path: 'chat/:agentId/session/:sessionId',
    component: Chat,
    canActivate: [AuthGuard],
  },
  { path: 'chat/:agentId', component: Chat, canActivate: [AuthGuard] },
  // Voice-first chat routes
  {
    path: 'audio/:agentId/session/:sessionId',
    component: AudioChat,
    canActivate: [AuthGuard],
  },
  { path: 'audio/:agentId', component: AudioChat, canActivate: [AuthGuard] },
  // Auth
  { path: 'login', component: LoginPage, canActivate: [GuestGuard] },
  { path: 'register', component: RegisterPage, canActivate: [GuestGuard] },
  { path: '**', component: NotFoundPage },
];

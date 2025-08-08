import { Routes } from '@angular/router';
import { AgentList } from '@presentation/components/agent-list/agent-list';
import { Chat } from '@presentation/pages/chat/chat';
import { AudioChat } from '@presentation/pages/audio/chat';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: AgentList },
  // More specific route first to allow session deep-linking
  { path: 'chat/:agentId/session/:sessionId', component: Chat },
  { path: 'chat/:agentId', component: Chat },
  // Voice-first chat routes
  { path: 'audio/:agentId/session/:sessionId', component: AudioChat },
  { path: 'audio/:agentId', component: AudioChat },
  { path: '**', redirectTo: '' },
];

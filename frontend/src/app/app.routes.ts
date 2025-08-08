import { Routes } from '@angular/router';
import { AgentList } from '@presentation/components/agent-list/agent-list';
import { Chat } from '@presentation/pages/chat/chat';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', component: AgentList },
	// More specific route first to allow session deep-linking
	{ path: 'chat/:agentId/session/:sessionId', component: Chat },
	{ path: 'chat/:agentId', component: Chat },
	{ path: '**', redirectTo: '' },
];

import { Routes } from '@angular/router';
import { AgentList } from '@presentation/components/agent-list/agent-list';
import { Chat } from '@presentation/pages/chat/chat';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', component: AgentList },
	{
		path: 'chat/:agentId',
		component: Chat,
		// SSR mode controlled in server routes
	},
	{ path: '**', redirectTo: '' },
];

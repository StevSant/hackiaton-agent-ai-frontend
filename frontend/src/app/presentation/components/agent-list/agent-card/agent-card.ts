import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AgentModel } from '@core/models/agent-model';

@Component({
  selector: 'app-agent-card',
  imports: [RouterLink],
  templateUrl: './agent-card.html'
})
export class AgentCard {
  agent = input.required<AgentModel>();
  protected chatRoutes = { base: { path: '/chat' } } as const;
}

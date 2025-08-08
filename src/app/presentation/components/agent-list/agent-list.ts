import { Component, inject } from '@angular/core';
import { AgentDataService } from '@infrastructure/services/agent-data-service';
import { AgentCard } from "./agent-card/agent-card";

@Component({
  selector: 'app-agent-list',
  imports: [AgentCard],
  templateUrl: './agent-list.html',
})
export class AgentList {
  private readonly agentService = inject(AgentDataService);
  protected agents = this.agentService.getAgents();

}

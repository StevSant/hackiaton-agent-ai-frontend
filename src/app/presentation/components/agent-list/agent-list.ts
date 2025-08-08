import { Component, inject } from '@angular/core';
import { AgentDataService } from '@infrastructure/services/agent-data-service';
import { AgentCard } from "./agent-card/agent-card";
import { TokenStorageService } from '@infrastructure/services/token-storage.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-agent-list',
  imports: [AgentCard],
  templateUrl: './agent-list.html',
})
export class AgentList {
  private readonly agentService = inject(AgentDataService);
  protected agents = this.agentService.getAgents();
  protected token = inject(TokenStorageService);
  private readonly router = inject(Router);

  logout() {
    this.token.clear();
    this.router.navigateByUrl('/login');
  }

}

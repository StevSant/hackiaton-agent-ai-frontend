import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { httpResource } from '@angular/common/http';
import { adaptAgents } from '@core/adapters/agent-adapter';

@Injectable({
  providedIn: 'root',
})
export class AgentDataService {
  private readonly agentsDirectUrl = environment.agentsDirectUrl;
  getAgents() {
  return httpResource(() => this.agentsDirectUrl, {
      parse: (response: any) => {
        console.log(response);
        return adaptAgents(response);
      },
    });
  }

}

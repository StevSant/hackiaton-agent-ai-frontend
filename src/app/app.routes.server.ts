import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Dynamic chat route should render on client only to avoid prerender params
  {
  path: 'chat',
    renderMode: RenderMode.Client,
  },
  {
  path: 'chat/session/:sessionId',
    renderMode: RenderMode.Client,
  },
  {
  path: 'audio',
    renderMode: RenderMode.Client,
  },
  {
  path: 'audio/session/:sessionId',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];

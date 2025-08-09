import { RenderMode, ServerRoute } from '@angular/ssr';

// Server-side render modes per route. Guarded/dynamic routes render on Client.
export const serverRoutes: ServerRoute[] = [
  // Public/guest pages can be prerendered
  { path: 'login', renderMode: RenderMode.Prerender },
  { path: 'register', renderMode: RenderMode.Prerender },
  { path: 'forbidden', renderMode: RenderMode.Prerender },

  // Authenticated app pages: render on client to avoid running guards on server
  { path: 'chat', renderMode: RenderMode.Client },
  { path: 'chat/session/:sessionId', renderMode: RenderMode.Client },
  { path: 'files', renderMode: RenderMode.Client },
  { path: 'risk', renderMode: RenderMode.Client },

  // Admin area and all children on client (RBAC/guards)
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/*', renderMode: RenderMode.Client },

  // Fallback
  { path: '**', renderMode: RenderMode.Prerender },
];

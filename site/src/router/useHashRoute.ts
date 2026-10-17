import { useSyncExternalStore } from 'react';

// Hash routing (#/path?query) so every route works on GitHub Pages without server rewrites.
// replaceState does not fire "hashchange", so replace() dispatches its own event.
const REPLACE_EVENT = 'catalog:replace';

export interface Route {
  segments: string[];
  query: URLSearchParams;
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  window.addEventListener(REPLACE_EVENT, onChange);
  return () => {
    window.removeEventListener('hashchange', onChange);
    window.removeEventListener(REPLACE_EVENT, onChange);
  };
}

const getHash = () => window.location.hash;

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [path, search = ''] = raw.split('?', 2) as [string, string?];
  const segments = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { segments, query: new URLSearchParams(search) };
}

export function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, () => '');
  return parseHash(hash);
}

/** Builds "#/a/b?x=1" from path segments and query values (empty values are dropped). */
export function href(segments: string[], query?: Record<string, string | string[] | undefined>): string {
  const path = segments.map(encodeURIComponent).join('/');
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    for (const v of Array.isArray(value) ? value : [value]) if (v) params.append(key, v);
  }
  const search = params.toString();
  return `#/${path}${search ? `?${search}` : ''}`;
}

export function navigate(to: string, options: { replace?: boolean } = {}) {
  if (options.replace) {
    window.history.replaceState(window.history.state, '', to);
    window.dispatchEvent(new Event(REPLACE_EVENT));
  } else {
    window.location.hash = to.replace(/^#/, '');
  }
}

export const routes = {
  home: () => href([]),
  search: (query?: Record<string, string | string[] | undefined>) => href(['search'], query),
  plugin: (name: string) => href(['plugin', name]),
  artifact: (id: string) => href(['artifact', id]),
  whatsNew: () => href(['whats-new']),
  gettingStarted: () => href(['getting-started']),
};

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type MiniSearch from 'minisearch';
import type { Artifact, CatalogIndex, Entry, Plugin, Release, Stats } from '../types';
import { createSearch } from './search';

export interface Catalog {
  index: CatalogIndex;
  releases: Release[];
  stats: Stats;
  entries: Entry[];
  byId: Map<string, Entry>;
  plugins: Map<string, Plugin>;
  artifactsOf: (plugin: string) => Artifact[];
  search: MiniSearch<Entry>;
}

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; catalog: Catalog };

const CatalogContext = createContext<Catalog | null>(null);

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return (await response.json()) as T;
}

function assemble(index: CatalogIndex, releases: Release[], stats: Stats): Catalog {
  const entries: Entry[] = [...index.plugins, ...index.artifacts];
  return {
    index,
    releases,
    stats,
    entries,
    byId: new Map(entries.map((e) => [e.id, e])),
    plugins: new Map(index.plugins.map((p) => [p.name, p])),
    artifactsOf: (plugin) => index.artifacts.filter((a) => a.plugin === plugin),
    search: createSearch(entries),
  };
}

/** Loads the generated index files once (relative URLs, so it works under any Pages base path). */
export function useCatalogLoader(): State {
  const [state, setState] = useState<State>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchJson<CatalogIndex>('./index.json'),
      fetchJson<Release[]>('./releases.json'),
      fetchJson<Stats>('./stats.json'),
    ])
      .then(([index, releases, stats]) => alive && setState({ status: 'ready', catalog: assemble(index, releases, stats) }))
      .catch(() => alive && setState({ status: 'error' }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

export function CatalogProvider({ catalog, children }: { catalog: Catalog; children: ReactNode }) {
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): Catalog {
  const catalog = useContext(CatalogContext);
  if (!catalog) throw new Error('useCatalog must be used inside CatalogProvider');
  return catalog;
}

/** Fetches a markdown body (bodies/<id>.md) on demand. */
export function useBody(path: string): { status: 'loading' | 'error' | 'ready'; text: string } {
  const [result, setResult] = useState<{ path: string; status: 'error' | 'ready'; text: string } | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`./${path}`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => alive && setResult({ path, status: 'ready', text }))
      .catch(() => alive && setResult({ path, status: 'error', text: '' }));
    return () => {
      alive = false;
    };
  }, [path]);
  return useMemo(
    () => (result && result.path === path ? result : { status: 'loading' as const, text: '' }),
    [result, path],
  );
}

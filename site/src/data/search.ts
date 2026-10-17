import MiniSearch from 'minisearch';
import { pluginOf, type Entry, type EntryKind } from '../types';

// Common English words dropped from queries so phrases like "skill for testing React" still match.
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'by', 'can', 'do', 'for', 'from', 'help', 'how', 'i',
  'in', 'is', 'it', 'me', 'my', 'need', 'of', 'on', 'or', 'some', 'something', 'that', 'the', 'this', 'to',
  'use', 'want', 'what', 'which', 'with',
]);

const MIN_RELATIVE_SCORE = 0.15;

export type SortMode = 'relevance' | 'name' | 'updated';
export const SORT_MODES: SortMode[] = ['relevance', 'name', 'updated'];

export interface SearchParams {
  q: string;
  kinds: EntryKind[];
  keywords: string[];
  plugins: string[];
  sort: SortMode;
}

export function createSearch(entries: Entry[]): MiniSearch<Entry> {
  const search = new MiniSearch<Entry>({
    idField: 'id',
    fields: ['name', 'description', 'keywords', 'plugin', 'searchText'],
    extractField: (entry, field) => {
      if (field === 'keywords') return entry.keywords.join(' ');
      if (field === 'plugin') return pluginOf(entry);
      return String(entry[field as keyof Entry] ?? '');
    },
    processTerm: (term) => {
      const lower = term.toLowerCase();
      return STOP_WORDS.has(lower) ? null : lower;
    },
    searchOptions: {
      boost: { name: 4, description: 2, keywords: 2, plugin: 1, searchText: 1 },
      prefix: true,
      fuzzy: 0.2,
      combineWith: 'OR',
    },
  });
  search.addAll(entries);
  return search;
}

export interface Ranked {
  entry: Entry;
  score: number;
}

/** Runs the text query only (no facets). An empty query returns every entry in catalog order. */
export function queryEntries(search: MiniSearch<Entry>, byId: Map<string, Entry>, all: Entry[], q: string): Ranked[] {
  if (!q.trim()) return all.map((entry) => ({ entry, score: 0 }));
  const hits = search.search(q);
  // Drop the long tail of incidental body-text matches relative to the best hit.
  const cutoff = (hits[0]?.score ?? 0) * MIN_RELATIVE_SCORE;
  return hits
    .filter((hit) => hit.score >= cutoff)
    .map((hit) => ({ entry: byId.get(String(hit.id)), score: hit.score }))
    .filter((r): r is Ranked => Boolean(r.entry));
}

export function applyFacets(results: Ranked[], params: SearchParams): Ranked[] {
  return results.filter(({ entry }) => {
    if (params.kinds.length && !params.kinds.includes(entry.kind)) return false;
    if (params.keywords.length && !params.keywords.some((k) => entry.keywords.includes(k))) return false;
    if (params.plugins.length && !params.plugins.includes(pluginOf(entry))) return false;
    return true;
  });
}

export function sortResults(results: Ranked[], sort: SortMode, updatedOf: (entry: Entry) => string): Ranked[] {
  const byName = (a: Ranked, b: Ranked) => a.entry.name.localeCompare(b.entry.name);
  const sorted = [...results];
  if (sort === 'name') sorted.sort(byName);
  else if (sort === 'updated') sorted.sort((a, b) => updatedOf(b.entry).localeCompare(updatedOf(a.entry)) || byName(a, b));
  else sorted.sort((a, b) => b.score - a.score);
  return sorted;
}

export function parseSearchParams(query: URLSearchParams): SearchParams {
  const sort = query.get('sort') as SortMode | null;
  return {
    q: query.get('q') ?? '',
    kinds: query.getAll('kind') as EntryKind[],
    keywords: query.getAll('kw'),
    plugins: query.getAll('plugin'),
    sort: sort && SORT_MODES.includes(sort) ? sort : 'relevance',
  };
}

export function searchQuery(params: Partial<SearchParams>): Record<string, string | string[] | undefined> {
  return {
    q: params.q || undefined,
    kind: params.kinds,
    kw: params.keywords,
    plugin: params.plugins,
    sort: params.sort && params.sort !== 'relevance' ? params.sort : undefined,
  };
}

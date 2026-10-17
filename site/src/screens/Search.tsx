import { useMemo } from 'react';
import { Card } from '../components/Card';
import { applyFacets, queryEntries, searchQuery, sortResults, SORT_MODES, type SearchParams, type SortMode } from '../data/search';
import { useCatalog } from '../data/useCatalog';
import { kindLabel, t, tn } from '../i18n/t';
import { useMediaQuery } from '../lib/useMediaQuery';
import { navigate, routes } from '../router/useHashRoute';
import { ENTRY_KINDS, pluginOf, type EntryKind } from '../types';
import ui from '../styles/ui.module.css';
import styles from './Search.module.css';

const toggle = <T,>(list: T[], value: T): T[] => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

export function Search({ params }: { params: SearchParams }) {
  const catalog = useCatalog();
  const { search, byId, entries, plugins } = catalog;

  const matched = useMemo(() => queryEntries(search, byId, entries, params.q), [search, byId, entries, params.q]);
  const results = useMemo(() => {
    const updatedOf = (e: (typeof entries)[number]) => plugins.get(pluginOf(e))?.updated ?? '';
    return sortResults(applyFacets(matched, params), params.sort, updatedOf);
  }, [matched, params, plugins]);

  // Facet counts reflect the text query, not the other facets.
  const counts = useMemo(() => {
    const kinds = new Map<EntryKind, number>();
    const keywords = new Map<string, number>();
    const byPlugin = new Map<string, number>();
    for (const { entry } of matched) {
      kinds.set(entry.kind, (kinds.get(entry.kind) ?? 0) + 1);
      entry.keywords.forEach((k) => keywords.set(k, (keywords.get(k) ?? 0) + 1));
      byPlugin.set(pluginOf(entry), (byPlugin.get(pluginOf(entry)) ?? 0) + 1);
    }
    return { kinds, keywords, byPlugin };
  }, [matched]);

  const allKeywords = useMemo(() => [...new Set(entries.flatMap((e) => e.keywords))].sort(), [entries]);
  const update = (patch: Partial<SearchParams>) => navigate(routes.search(searchQuery({ ...params, ...patch })), { replace: true });
  const clear = () => navigate(routes.search(searchQuery({ q: params.q })), { replace: true });
  const clearAll = () => navigate(routes.search(), { replace: true });
  // Wide screens always show the facets; narrow screens collapse them above the results.
  const wide = useMediaQuery('(min-width: 761px)');
  const activeFilters = params.kinds.length + params.keywords.length + params.plugins.length;

  return (
    <main className={styles.main}>
      <aside className={styles.sidebar}>
        <details className={styles.filters} open={wide || undefined}>
          <summary className={styles.summary}>
            {activeFilters ? t('search.filters.active', { n: activeFilters }) : t('search.filters')}
          </summary>
          <div className={styles.filtersHead}>
            <span className={ui.label}>{t('search.filters')}</span>
            <button type="button" className={styles.clear} onClick={clear}>
              {t('search.clear')}
            </button>
          </div>

          <div className={styles.facetTitle}>{t('search.facet.kind')}</div>
          <div className={styles.facetList}>
            {ENTRY_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                className={styles.facet}
                aria-pressed={params.kinds.includes(kind)}
                onClick={() => update({ kinds: toggle(params.kinds, kind) })}
              >
                <span className={ui.dot} data-kind={kind} />
                <span className={styles.facetLabel}>{kindLabel(kind, 2)}</span>
                <span className={styles.facetCount}>{counts.kinds.get(kind) ?? 0}</span>
              </button>
            ))}
          </div>

          <div className={styles.facetTitle}>{t('search.facet.keyword')}</div>
          <div className={styles.keywordList}>
            {allKeywords.map((k) => (
              <button
                key={k}
                type="button"
                className={styles.keyword}
                aria-pressed={params.keywords.includes(k)}
                onClick={() => update({ keywords: toggle(params.keywords, k) })}
              >
                {k}
              </button>
            ))}
          </div>

          <div className={styles.facetTitle}>{t('search.facet.plugin')}</div>
          <div className={styles.facetList}>
            {[...plugins.keys()].map((name) => (
              <button
                key={name}
                type="button"
                className={styles.facet}
                aria-pressed={params.plugins.includes(name)}
                onClick={() => update({ plugins: toggle(params.plugins, name) })}
              >
                <span className={`${styles.facetLabel} ${styles.plain}`}>{name}</span>
                <span className={styles.facetCount}>{counts.byPlugin.get(name) ?? 0}</span>
              </button>
            ))}
          </div>
        </details>
      </aside>

      <section className={styles.results}>
        <div className={styles.resultsHead}>
          <div>
            <h1 className={styles.heading}>
              {params.q ? t('search.heading.query', { q: params.q }) : t('search.heading.all')}
            </h1>
            <div className={ui.subtle}>{tn('search.count', results.length)}</div>
          </div>
          <label className={styles.sort}>
            {t('search.sort.label')}
            <select value={params.sort} onChange={(e) => update({ sort: e.target.value as SortMode })}>
              {SORT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {t(`search.sort.${mode}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {results.length > 0 ? (
          <div className={styles.grid}>
            {results.map(({ entry }) => (
              <Card key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyIcon} aria-hidden="true">
              🔍
            </div>
            <h2 className={styles.emptyTitle}>{t('search.empty.title')}</h2>
            <p className={styles.emptyText}>{t('search.empty.text')}</p>
            <button type="button" className={ui.buttonSecondary} onClick={clearAll}>
              {t('search.empty.action')}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

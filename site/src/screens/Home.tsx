import { useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { KindPill } from '../components/KindBadge';
import { SearchInput } from '../components/SearchInput';
import { searchQuery } from '../data/search';
import { useCatalog } from '../data/useCatalog';
import { kindLabel, t, tn } from '../i18n/t';
import { navigate, routes } from '../router/useHashRoute';
import { ENTRY_KINDS } from '../types';
import ui from '../styles/ui.module.css';
import styles from './Home.module.css';

const HERO_CHIPS = 7;
const LATEST_RELEASES = 4;

export function Home() {
  const { index, stats, releases } = useCatalog();
  const [query, setQuery] = useState('');
  const repoUrl = index.marketplace.repositoryUrl;
  const submit = (q: string) => navigate(routes.search(searchQuery({ q })));

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.eyebrow}>{t('home.eyebrow')}</div>
        <h1 className={styles.title}>
          {t('home.title.line1')}
          <br />
          {t('home.title.line2')}
        </h1>
        <p className={styles.subtitle}>{t('home.subtitle')}</p>
        <div className={styles.heroSearch}>
          <SearchInput
            size="lg"
            value={query}
            onChange={setQuery}
            onSubmit={submit}
            placeholder={t('home.search.placeholder')}
            label={t('home.search.label')}
          />
        </div>
        <div className={styles.chips}>
          {stats.topKeywords.slice(0, HERO_CHIPS).map(({ keyword }) => (
            <a key={keyword} className={styles.chip} href={routes.search(searchQuery({ keywords: [keyword] }))}>
              #{keyword}
            </a>
          ))}
        </div>
      </section>

      {index.plugins.length === 0 ? (
        <EmptyState icon="📦" title={t('home.empty.title')} text={t('home.empty.text')}>
          <a className={ui.buttonPrimary} href={routes.gettingStarted()}>
            {t('home.empty.gettingStarted')}
          </a>
          {repoUrl && (
            <a className={ui.buttonSecondary} href={`${repoUrl}/blob/${index.marketplace.branch}/CONTRIBUTING.md`} target="_blank" rel="noopener noreferrer">
              {t('home.empty.contributing')}
            </a>
          )}
        </EmptyState>
      ) : (
        <>
          <StatsSection />

          <section className={styles.block}>
            <div className={ui.sectionHeader}>
              <h2 className={ui.sectionTitle}>{t('home.whatsNew.title')}</h2>
              <a className={ui.subtle} href={routes.whatsNew()}>
                {t('home.whatsNew.all')}
              </a>
            </div>
            <div className={styles.releases}>
              {releases.slice(0, LATEST_RELEASES).map((r) => (
                <a key={`${r.plugin}@${r.version}`} className={styles.release} href={routes.plugin(r.plugin)}>
                  <KindPill kind="plugin">{t('common.version', { version: r.version })}</KindPill>
                  <span className={styles.releaseText}>
                    <span className={styles.releaseName}>{r.plugin}</span>
                    <span className={styles.releaseSummary}>{r.summary}</span>
                  </span>
                  <span className={styles.date}>{r.date}</span>
                </a>
              ))}
            </div>
          </section>

          <section className={styles.block}>
            <h2 className={ui.sectionTitle}>{t('home.browse.title')}</h2>
            <div className={styles.kinds}>
              {ENTRY_KINDS.filter((k) => stats.totals[k] > 0).map((kind) => (
                <a key={kind} className={styles.kind} href={routes.search(searchQuery({ kinds: [kind] }))}>
                  <span className={ui.dot} data-kind={kind} />
                  <span className={styles.kindLabel}>{kindLabel(kind, 2)}</span>
                  <span className={styles.count}>{stats.totals[kind]}</span>
                </a>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function StatsSection() {
  const { index, stats } = useCatalog();
  const { generatedAt, commit } = index.marketplace;
  const tiles = ENTRY_KINDS.map((kind) => ({
    kind,
    count: stats.totals[kind],
    label: kindLabel(kind, stats.totals[kind]),
  }));
  const models = Object.entries(stats.agentModels)
    .map(([model, n]) => `${model} ×${n}`)
    .join(', ');
  const list = (names: string[]) =>
    names.length ? (
      <span className={styles.links}>
        {names.map((n) => (
          <a key={n} href={routes.plugin(n)}>
            {n}
          </a>
        ))}
      </span>
    ) : (
      <span className={ui.faint}>{t('common.none')}</span>
    );

  return (
    <section className={styles.block} aria-labelledby="stats-title">
      <h2 id="stats-title" className={ui.sectionTitle}>
        {t('home.stats.title')}
      </h2>
      <div className={styles.tiles}>
        {tiles.map((tile) => (
          <a key={tile.kind} className={styles.tile} href={routes.search(searchQuery({ kinds: [tile.kind] }))}>
            <span className={styles.tileCount}>{tile.count}</span>
            <span className={styles.tileLabel}>{tile.label}</span>
          </a>
        ))}
        <button
          type="button"
          className={styles.tile}
          onClick={() => document.getElementById('stats-table')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <span className={styles.tileCount}>{stats.totals.dependencyEdges}</span>
          <span className={styles.tileLabel}>{tn('home.stats.dependencyEdges', stats.totals.dependencyEdges)}</span>
        </button>
      </div>
      <div className={styles.tableWrap} id="stats-table">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('home.stats.col.plugin')}</th>
              <th>{t('home.stats.col.version')}</th>
              <th className={styles.num}>{t('home.stats.col.skills')}</th>
              <th className={styles.num}>{t('home.stats.col.agents')}</th>
              <th>{t('home.stats.col.dependsOn')}</th>
              <th>{t('home.stats.col.usedBy')}</th>
              <th>{t('home.stats.col.updated')}</th>
            </tr>
          </thead>
          <tbody>
            {stats.perPlugin.map((p) => (
              <tr key={p.name}>
                <td>
                  <a href={routes.plugin(p.name)}>{p.name}</a>
                </td>
                <td className={ui.mono}>{p.version}</td>
                <td className={styles.num}>{p.skill}</td>
                <td className={styles.num}>{p.agent}</td>
                <td>{list(p.dependsOn)}</td>
                <td>{list(p.usedBy)}</td>
                <td className={ui.mono}>{p.updated ?? t('common.none')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.facts}>
        {stats.minClaudeCode && <span>{t('home.stats.minClaudeCode', { version: stats.minClaudeCode })}</span>}
        {models && <span>{t('home.stats.models', { models })}</span>}
        <span>{tn('home.stats.manualOnly', stats.manualOnlySkills)}</span>
        <span>
          {t('home.stats.generated', {
            date: generatedAt.slice(0, 10),
            commit: commit ? commit.slice(0, 7) : t('common.none'),
          })}
        </span>
      </div>
    </section>
  );
}

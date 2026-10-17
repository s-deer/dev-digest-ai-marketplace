import { InlineMarkdown } from '../components/InlineMarkdown';
import { InstallBox } from '../components/InstallBox';
import { KindPill } from '../components/KindBadge';
import { Markdown } from '../components/Markdown';
import { searchQuery } from '../data/search';
import { useCatalog } from '../data/useCatalog';
import { kindLabel, t } from '../i18n/t';
import { routes } from '../router/useHashRoute';
import { ARTIFACT_KINDS, type Plugin } from '../types';
import { ReleaseSections } from './WhatsNew';
import ui from '../styles/ui.module.css';
import styles from './Detail.module.css';

export function PluginDetail({ plugin }: { plugin: Plugin }) {
  const { artifactsOf, releases } = useCatalog();
  const artifacts = artifactsOf(plugin.name);
  const changelog = releases.filter((r) => r.plugin === plugin.name);
  const groups = ARTIFACT_KINDS.map((kind) => ({ kind, items: artifacts.filter((a) => a.kind === kind) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <main className={`${ui.page} ${ui.wide}`}>
      <a className={ui.back} href={routes.search(searchQuery({ kinds: ['plugin'] }))}>
        {t('plugin.back')}
      </a>

      <div className={styles.header}>
        <div className={styles.icon} aria-hidden="true">
          ◆
        </div>
        <div className={styles.headerText}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{plugin.name}</h1>
            <KindPill kind="plugin">{t('common.version', { version: plugin.version })}</KindPill>
            {plugin.compatibility.claudeCode && (
              <KindPill kind="skill">✓ {t('plugin.compat', { version: plugin.compatibility.claudeCode })}</KindPill>
            )}
          </div>
          <p className={ui.lead}>{plugin.description}</p>
          <div className={styles.meta}>
            <span>{t('plugin.meta', { author: plugin.author, date: plugin.updated ?? t('common.none') })}</span>
            {plugin.owners.length > 0 && <span>{t('plugin.owners', { owners: plugin.owners.join(', ') })}</span>}
          </div>
        </div>
      </div>

      <InstallBox command={plugin.installCommand}>
        {plugin.githubUrl && (
          <a href={plugin.githubUrl} target="_blank" rel="noopener noreferrer">
            {t('plugin.github')}
          </a>
        )}
      </InstallBox>

      <section className={ui.section}>
        <h2 className={ui.sectionTitle}>{t('plugin.components')}</h2>
        <div className={styles.groups}>
          {groups.map((group) => (
            <div key={group.kind}>
              <div className={styles.groupHead}>
                <span className={ui.dot} data-kind={group.kind} />
                <span className={styles.groupLabel}>{kindLabel(group.kind, 2)}</span>
                <span className={styles.groupCount}>{group.items.length}</span>
              </div>
              <div className={styles.components}>
                {group.items.map((a) => (
                  <a key={a.id} className={styles.component} href={routes.artifact(a.id)}>
                    <span className={styles.componentHead}>
                      <span className={styles.componentName}>{a.name}</span>
                      {a.invocation && <code className={styles.invocation}>{a.invocation}</code>}
                    </span>
                    <span className={styles.componentDescription}>{a.description}</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {(plugin.dependencies.length > 0 || plugin.dependents.length > 0) && (
        <section className={`${ui.section} ${styles.relations}`}>
          {plugin.dependencies.length > 0 && (
            <div>
              <h2 className={ui.sectionTitle}>{t('plugin.dependencies')}</h2>
              <div className={ui.chips}>
                {plugin.dependencies.map((d) => (
                  <a key={d.name} className={ui.chip} href={routes.plugin(d.name)}>
                    {d.name}
                    {d.range && <span className={ui.faint}>&nbsp;{d.range}</span>}
                  </a>
                ))}
              </div>
            </div>
          )}
          {plugin.dependents.length > 0 && (
            <div>
              <h2 className={ui.sectionTitle}>{t('plugin.usedBy')}</h2>
              <div className={ui.chips}>
                {plugin.dependents.map((name) => (
                  <a key={name} className={ui.chip} href={routes.plugin(name)}>
                    {name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {plugin.compatibility.notes.length > 0 && (
        <section className={ui.section}>
          <h2 className={ui.sectionTitle}>{t('plugin.compatNotes')}</h2>
          <ul className={styles.notes}>
            {plugin.compatibility.notes.map((note) => (
              <li key={note}>
                <InlineMarkdown text={note} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={ui.section}>
        <h2 className={ui.sectionTitle}>{t('plugin.readme')}</h2>
        <div className={ui.panel}>
          <Markdown body={plugin.body} sourcePath={plugin.sourcePath} />
        </div>
      </section>

      {changelog.length > 0 && (
        <section className={ui.section}>
          <h2 className={ui.sectionTitle}>{t('plugin.changelog')}</h2>
          <div className={styles.changelog}>
            {changelog.map((r) => (
              <div key={r.version} className={styles.release}>
                <div className={styles.releaseHead}>
                  <KindPill kind="plugin">{t('common.version', { version: r.version })}</KindPill>
                  <span className={ui.faint}>{r.date}</span>
                </div>
                <ReleaseSections release={r} />
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

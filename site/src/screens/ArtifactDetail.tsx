import { InstallBox } from '../components/InstallBox';
import { KindBadge } from '../components/KindBadge';
import { Markdown } from '../components/Markdown';
import { useCatalog } from '../data/useCatalog';
import { t } from '../i18n/t';
import { routes } from '../router/useHashRoute';
import type { Artifact } from '../types';
import ui from '../styles/ui.module.css';
import styles from './Detail.module.css';

function ChipList({ label, items, wide }: { label: string; items: Array<{ text: string; href?: string }>; wide?: boolean }) {
  if (!items.length) return null;
  return (
    <div className={wide ? styles.wide : undefined}>
      <div className={ui.label}>{label}</div>
      <div className={ui.chips}>
        {items.map((item) =>
          item.href ? (
            <a key={item.text} className={ui.chip} href={item.href}>
              {item.text}
            </a>
          ) : (
            <span key={item.text} className={ui.chip}>
              {item.text}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

export function ArtifactDetail({ artifact }: { artifact: Artifact }) {
  const { byId, index } = useCatalog();
  const { repositoryUrl, branch } = index.marketplace;
  const dir = artifact.sourcePath.split('/').slice(0, -1).join('/');
  // Preloaded skills are namespaced ("plugin:skill"); link the ones that are in this catalog.
  const preloads = (artifact.agent?.skills ?? []).map((ref) => {
    const [plugin, name] = ref.includes(':') ? ref.split(':', 2) : [artifact.plugin, ref];
    const id = `${plugin}.skill.${name}`;
    return { text: ref, href: byId.has(id) ? routes.artifact(id) : undefined };
  });

  return (
    <main className={`${ui.page} ${ui.medium}`}>
      <nav className={styles.breadcrumb} aria-label={t('artifact.breadcrumb')}>
        <a href={routes.search()}>{t('artifact.catalog')}</a>
        {' / '}
        <a href={routes.plugin(artifact.plugin)}>{artifact.plugin}</a>
        {' / '}
        <span>{artifact.name}</span>
      </nav>

      <div className={styles.titleRow}>
        <KindBadge kind={artifact.kind} size="md" />
        <h1 className={styles.title}>{artifact.name}</h1>
        {artifact.invocation && <code className={styles.invocationChip}>{artifact.invocation}</code>}
      </div>
      <p className={ui.lead}>{artifact.description}</p>

      <div className={styles.facts}>
        <ChipList label={t('artifact.tools')} items={(artifact.agent?.tools ?? []).map((text) => ({ text }))} />
        <ChipList label={t('artifact.allowedTools')} items={(artifact.skill?.allowedTools ?? []).map((text) => ({ text }))} />
        <ChipList label={t('artifact.model')} items={artifact.agent?.model ? [{ text: artifact.agent.model }] : []} />
        <ChipList
          label={t('artifact.arguments')}
          items={artifact.skill?.argumentHint ? [{ text: artifact.skill.argumentHint }] : []}
        />
        <ChipList label={t('artifact.preloads')} items={preloads} wide />
      </div>

      {(artifact.skill?.manualOnly || artifact.skill?.userInvocable === false) && (
        <div className={styles.flags}>
          {artifact.skill.manualOnly && (
            <div className={styles.flag}>
              <strong>{t('artifact.manualOnly')}</strong>
              {t('artifact.manualOnly.hint')}
            </div>
          )}
          {artifact.skill.userInvocable === false && (
            <div className={styles.flag}>
              <strong>{t('artifact.notUserInvocable')}</strong>
              {t('artifact.notUserInvocable.hint')}
            </div>
          )}
        </div>
      )}

      <InstallBox command={artifact.installCommand}>
        {artifact.githubUrl && (
          <a href={artifact.githubUrl} target="_blank" rel="noopener noreferrer">
            {t('artifact.source')}
          </a>
        )}
      </InstallBox>
      <p className={styles.caption}>{t('artifact.installedWith', { plugin: artifact.plugin, version: artifact.pluginVersion })}</p>

      <section className={ui.section}>
        <h2 className={ui.sectionTitle}>{t('artifact.docs')}</h2>
        <div className={ui.panel}>
          <Markdown body={artifact.body} sourcePath={artifact.sourcePath} />
        </div>
      </section>

      {artifact.files.length > 0 && (
        <section className={ui.section}>
          <h2 className={ui.sectionTitle}>{t('artifact.files')}</h2>
          <ul className={styles.files}>
            {artifact.files.map((file) => (
              <li key={file}>
                {repositoryUrl ? (
                  <a href={`${repositoryUrl}/blob/${branch}/${dir}/${file}`} target="_blank" rel="noopener noreferrer">
                    {file}
                  </a>
                ) : (
                  file
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

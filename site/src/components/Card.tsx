import { t, tn } from '../i18n/t';
import { routes } from '../router/useHashRoute';
import type { Entry } from '../types';
import { CopyButton } from './CopyButton';
import { KindBadge } from './KindBadge';
import styles from './Card.module.css';

export const entryHref = (entry: Entry) => (entry.kind === 'plugin' ? routes.plugin(entry.name) : routes.artifact(entry.id));

/** Search result card for a plugin, skill or agent. */
export function Card({ entry }: { entry: Entry }) {
  const isPlugin = entry.kind === 'plugin';
  const version = isPlugin ? entry.version : entry.pluginVersion;
  const meta = isPlugin ? tn('card.components', entry.components.length) : entry.plugin;
  const href = entryHref(entry);

  return (
    <article className={styles.card}>
      <div className={styles.body}>
        <div className={styles.top}>
          <KindBadge kind={entry.kind} />
          <span className={styles.version}>{t('common.version', { version })}</span>
        </div>
        <h3 className={styles.name}>
          <a href={href}>{entry.name}</a>
        </h3>
        <p className={styles.description}>{entry.description}</p>
        <div className={styles.keywords}>
          {entry.keywords.slice(0, 3).map((k) => (
            <span key={k}>#{k}</span>
          ))}
        </div>
      </div>
      <div className={styles.footer}>
        <span className={styles.meta}>{meta}</span>
        <div className={styles.actions}>
          <CopyButton text={entry.installCommand} />
          <a className={styles.open} href={href} tabIndex={-1}>
            {t('common.open')}
          </a>
        </div>
      </div>
    </article>
  );
}

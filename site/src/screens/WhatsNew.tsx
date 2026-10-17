import { InlineMarkdown } from '../components/InlineMarkdown';
import { useCatalog } from '../data/useCatalog';
import { t } from '../i18n/t';
import { routes } from '../router/useHashRoute';
import type { Release } from '../types';
import ui from '../styles/ui.module.css';
import styles from './WhatsNew.module.css';

/** Changelog sections of one release (Added / Changed / Fixed …) as lists. */
export function ReleaseSections({ release }: { release: Release }) {
  return (
    <div className={styles.sections}>
      {Object.entries(release.sections).map(([name, items]) => (
        <div key={name}>
          <div className={styles.sectionName}>{name}</div>
          <ul className={styles.items}>
            {items.map((item) => (
              <li key={item}>
                <InlineMarkdown text={item} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function WhatsNew() {
  const { releases } = useCatalog();
  return (
    <main className={`${ui.page} ${ui.medium}`}>
      <a className={ui.back} href={routes.home()}>
        {t('whatsNew.back')}
      </a>
      <h1 className={ui.pageTitle}>{t('whatsNew.title')}</h1>
      {releases.length === 0 && <p className={ui.lead}>{t('whatsNew.empty')}</p>}
      <div className={styles.feed}>
        {releases.map((r) => (
          <article key={`${r.plugin}@${r.version}`} className={styles.entry}>
            <div className={styles.side}>
              <div className={styles.version}>{t('common.version', { version: r.version })}</div>
              <div className={styles.date}>{r.date}</div>
            </div>
            <div className={styles.content}>
              <h2 className={styles.plugin}>
                <a href={routes.plugin(r.plugin)}>{r.plugin}</a>
              </h2>
              <ReleaseSections release={r} />
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

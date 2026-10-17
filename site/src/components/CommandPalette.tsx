import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { queryEntries } from '../data/search';
import { useCatalog } from '../data/useCatalog';
import { kindLabel, t } from '../i18n/t';
import { navigate } from '../router/useHashRoute';
import { entryHref } from './Card';
import styles from './CommandPalette.module.css';
import ui from '../styles/ui.module.css';

const LIMIT = 8;

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const { search, byId, entries } = useCatalog();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const results = useMemo(
    () => queryEntries(search, byId, entries, query).slice(0, LIMIT).map((r) => r.entry),
    [search, byId, entries, query],
  );

  useEffect(() => {
    setActive(0);
  }, [query]);

  const open = (index: number) => {
    const entry = results[index];
    if (!entry) return;
    onClose();
    navigate(entryHref(entry));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      open(active);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={t('palette.label')} onClick={(e) => e.stopPropagation()}>
        <div className={styles.inputRow}>
          <span className={ui.faint} aria-hidden="true">
            ⌕
          </span>
          <input
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('palette.placeholder')}
            aria-label={t('palette.placeholder')}
            autoFocus
          />
          <span className={styles.esc}>{t('palette.esc')}</span>
        </div>
        <ul className={styles.list} role="listbox">
          {results.map((entry, i) => (
            <li key={entry.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                className={styles.item}
                data-active={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => open(i)}
              >
                <span className={ui.dot} data-kind={entry.kind} />
                <span className={styles.itemName}>
                  <span className={styles.name}>{entry.name}</span>
                  {entry.kind !== 'plugin' && <span className={styles.meta}> · {entry.plugin}</span>}
                </span>
                <span className={styles.kind}>{kindLabel(entry.kind)}</span>
              </button>
            </li>
          ))}
        </ul>
        {results.length === 0 && <div className={styles.empty}>{t('palette.empty')}</div>}
      </div>
    </div>
  );
}

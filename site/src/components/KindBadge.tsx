import type { ReactNode } from 'react';
import { kindLabel } from '../i18n/t';
import type { EntryKind } from '../types';
import styles from './KindBadge.module.css';

export function KindBadge({ kind, size = 'sm' }: { kind: EntryKind; size?: 'sm' | 'md' }) {
  return (
    <span className={styles.badge} data-kind={kind} data-size={size}>
      {kindLabel(kind)}
    </span>
  );
}

/** Small mono pill in a kind color, e.g. a version. */
export function KindPill({ kind, children }: { kind: EntryKind; children: ReactNode }) {
  return (
    <span className={styles.pill} data-kind={kind}>
      {children}
    </span>
  );
}

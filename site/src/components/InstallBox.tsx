import type { ReactNode } from 'react';
import { CopyButton } from './CopyButton';
import styles from './InstallBox.module.css';

/** Terminal-style command line with a Copy button; extra actions (e.g. GitHub link) go in children. */
export function InstallBox({ command, children }: { command: string; children?: ReactNode }) {
  return (
    <div className={styles.row}>
      <div className={styles.terminal}>
        <span className={styles.prompt} aria-hidden="true">
          $
        </span>
        <code className={styles.command}>{command}</code>
      </div>
      <CopyButton text={command} variant="primary" />
      {children}
    </div>
  );
}

/** Compact command line with an inline Copy link, used for Getting started steps. */
export function CommandLine({ command }: { command: string }) {
  return (
    <div className={`${styles.terminal} ${styles.compact}`}>
      <span className={styles.prompt} aria-hidden="true">
        $
      </span>
      <code className={styles.command}>{command}</code>
      <CopyButton text={command} label="common.copy" variant="link" />
    </div>
  );
}

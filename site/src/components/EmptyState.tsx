import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

interface Props {
  icon: string;
  title: string;
  text: string;
  children?: ReactNode;
}

export function EmptyState({ icon, title, text, children }: Props) {
  return (
    <section className={styles.empty}>
      <div className={styles.icon} aria-hidden="true">
        {icon}
      </div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.text}>{text}</p>
      {children && <div className={styles.actions}>{children}</div>}
    </section>
  );
}

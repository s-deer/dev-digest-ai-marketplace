import { useMemo } from 'react';
import { useBody, useCatalog } from '../data/useCatalog';
import { t } from '../i18n/t';
import { renderMarkdown } from '../lib/markdown';
import styles from './Markdown.module.css';

/** Loads a generated body file and renders it as sanitized HTML. */
export function Markdown({ body, sourcePath }: { body: string; sourcePath: string }) {
  const { index } = useCatalog();
  const { status, text } = useBody(body);
  const { repositoryUrl, repository, branch } = index.marketplace;
  const html = useMemo(
    () => (status === 'ready' ? renderMarkdown(text, { repositoryUrl, repository, branch, sourcePath }) : ''),
    [status, text, repositoryUrl, repository, branch, sourcePath],
  );

  if (status === 'loading') return <p className={styles.state}>{t('markdown.loading')}</p>;
  if (status === 'error') return <p className={styles.state}>{t('markdown.error')}</p>;
  // Safe: renderMarkdown always sanitizes with DOMPurify.
  return <div className={styles.markdown} dangerouslySetInnerHTML={{ __html: html }} />;
}

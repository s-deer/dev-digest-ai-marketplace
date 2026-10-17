import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { t } from '../i18n/t';
import type { MessageKey } from '../i18n/en';
import { copyText } from '../lib/clipboard';
import { useToast } from './Toast';
import styles from './CopyButton.module.css';

interface Props {
  text: string;
  label?: MessageKey;
  variant?: 'primary' | 'secondary' | 'link';
  /** Accessible description, e.g. which command is copied. */
  title?: string;
}

export function CopyButton({ text, label = 'common.copyInstall', variant = 'secondary', title }: Props) {
  const notify = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onClick = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const ok = await copyText(text);
    notify(t(ok ? 'toast.copied' : 'toast.copyFailed'), ok ? 'success' : 'error');
    if (!ok) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button type="button" className={styles.button} data-variant={variant} data-copied={copied} onClick={onClick} title={title ?? text}>
      {copied ? t('common.copied') : t(label)}
    </button>
  );
}

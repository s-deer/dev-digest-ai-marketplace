import type { ChangeEvent, FormEvent, KeyboardEvent, Ref } from 'react';
import styles from './SearchInput.module.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  placeholder: string;
  label: string;
  size?: 'sm' | 'lg';
  autoFocus?: boolean;
  inputRef?: Ref<HTMLInputElement>;
}

export function SearchInput({ value, onChange, onSubmit, onKeyDown, placeholder, label, size = 'sm', autoFocus, inputRef }: Props) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit?.(value);
  };
  return (
    <form className={styles.form} data-size={size} role="search" onSubmit={submit}>
      <span className={styles.icon} aria-hidden="true">
        ⌕
      </span>
      <input
        ref={inputRef}
        className={styles.input}
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        autoFocus={autoFocus}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
    </form>
  );
}

import { useEffect, useState } from 'react';
import { searchQuery, parseSearchParams } from '../data/search';
import { useCatalog } from '../data/useCatalog';
import { t } from '../i18n/t';
import { useTheme } from '../lib/theme';
import { navigate, routes, useHashRoute } from '../router/useHashRoute';
import { SearchInput } from './SearchInput';
import styles from './Header.module.css';

export function Header({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { index } = useCatalog();
  const route = useHashRoute();
  const [theme, toggleTheme] = useTheme();
  const onSearch = route.segments[0] === 'search';
  const routeQuery = onSearch ? (route.query.get('q') ?? '') : '';
  const [value, setValue] = useState(routeQuery);

  // Keep the input in sync when the query changes from elsewhere (hero search, chips, back button).
  useEffect(() => {
    setValue(routeQuery);
  }, [routeQuery]);

  const change = (next: string) => {
    setValue(next);
    const params = onSearch ? parseSearchParams(route.query) : {};
    navigate(routes.search(searchQuery({ ...params, q: next })), { replace: onSearch });
  };

  return (
    <header className={styles.header}>
      <a className={styles.brand} href={routes.home()} aria-label={t('header.home')}>
        <span className={styles.logo} aria-hidden="true">
          ◆
        </span>
        <span className={styles.title}>{t('app.title')}</span>
        <span className={styles.badge}>{index.marketplace.name}</span>
      </a>
      <div className={styles.search}>
        <SearchInput
          value={value}
          onChange={change}
          onSubmit={change}
          placeholder={t('header.search.placeholder')}
          label={t('header.search.label')}
        />
      </div>
      <button type="button" className={`${styles.iconButton} ${styles.palette}`} onClick={onOpenPalette} title={t('header.palette.title')}>
        {t('header.palette')}
      </button>
      <button
        type="button"
        className={styles.iconButton}
        onClick={toggleTheme}
        title={t(theme === 'dark' ? 'header.theme.toLight' : 'header.theme.toDark')}
        aria-label={t(theme === 'dark' ? 'header.theme.toLight' : 'header.theme.toDark')}
      >
        {theme === 'dark' ? '☾' : '☀'}
      </button>
      {index.marketplace.repositoryUrl && (
        <a className={styles.github} href={index.marketplace.repositoryUrl} target="_blank" rel="noopener noreferrer">
          {t('header.github')}
        </a>
      )}
    </header>
  );
}

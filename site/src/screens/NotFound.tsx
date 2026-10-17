import { EmptyState } from '../components/EmptyState';
import { t } from '../i18n/t';
import { routes } from '../router/useHashRoute';
import ui from '../styles/ui.module.css';

export function NotFound() {
  return (
    <main className={`${ui.page} ${ui.narrow}`}>
      <EmptyState icon="🧭" title={t('notFound.title')} text={t('notFound.text')}>
        <a className={ui.buttonPrimary} href={routes.home()}>
          {t('notFound.action')}
        </a>
      </EmptyState>
    </main>
  );
}

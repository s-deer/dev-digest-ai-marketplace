import { CommandLine } from '../components/InstallBox';
import { useCatalog } from '../data/useCatalog';
import { t } from '../i18n/t';
import { routes } from '../router/useHashRoute';
import ui from '../styles/ui.module.css';
import styles from './GettingStarted.module.css';

export function GettingStarted() {
  const { index } = useCatalog();
  const { name, repository } = index.marketplace;
  // Suggest the plugin with the most dependencies: installing it pulls in the rest.
  const featured = [...index.plugins].sort((a, b) => b.dependencies.length - a.dependencies.length)[0];

  const steps = [
    repository && {
      title: t('gettingStarted.step.add.title'),
      desc: t('gettingStarted.step.add.desc'),
      cmd: `/plugin marketplace add ${repository}`,
    },
    featured && {
      title: t('gettingStarted.step.install.title'),
      desc: t('gettingStarted.step.install.desc', { plugin: featured.name }),
      cmd: featured.installCommand,
    },
    { title: t('gettingStarted.step.reload.title'), desc: t('gettingStarted.step.reload.desc'), cmd: '/reload-plugins' },
    { title: t('gettingStarted.step.update.title'), desc: t('gettingStarted.step.update.desc'), cmd: `/plugin marketplace update ${name}` },
  ].filter((s): s is { title: string; desc: string; cmd: string } => Boolean(s));

  return (
    <main className={`${ui.page} ${ui.narrow}`}>
      <a className={ui.back} href={routes.home()}>
        {t('gettingStarted.back')}
      </a>
      <h1 className={ui.pageTitle}>{t('gettingStarted.title')}</h1>
      <p className={`${ui.lead} ${styles.lead}`}>{t('gettingStarted.subtitle')}</p>

      <ol className={styles.steps}>
        {steps.map((step, i) => (
          <li key={step.cmd} className={styles.step}>
            <span className={styles.number}>{i + 1}</span>
            <div className={styles.body}>
              <h2 className={styles.title}>{step.title}</h2>
              <p className={styles.desc}>{step.desc}</p>
              <CommandLine command={step.cmd} />
            </div>
          </li>
        ))}
      </ol>

      <div className={styles.note}>
        <strong>{t('gettingStarted.note.update.title')}</strong> {t('gettingStarted.note.update.text')}
      </div>
      <div className={styles.note}>
        <strong>{t('gettingStarted.note.scope.title')}</strong> {t('gettingStarted.note.scope.text')}
      </div>
    </main>
  );
}

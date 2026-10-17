import { useEffect, useMemo, useState } from 'react';
import { CommandPalette } from './components/CommandPalette';
import { Header } from './components/Header';
import { ToastProvider } from './components/Toast';
import { parseSearchParams } from './data/search';
import { CatalogProvider, useCatalog, useCatalogLoader } from './data/useCatalog';
import { t } from './i18n/t';
import { useHashRoute, type Route } from './router/useHashRoute';
import { ArtifactDetail } from './screens/ArtifactDetail';
import { GettingStarted } from './screens/GettingStarted';
import { Home } from './screens/Home';
import { NotFound } from './screens/NotFound';
import { PluginDetail } from './screens/PluginDetail';
import { Search } from './screens/Search';
import { WhatsNew } from './screens/WhatsNew';
import ui from './styles/ui.module.css';

export function App() {
  const state = useCatalogLoader();
  if (state.status === 'loading') return <p className={ui.centered}>{t('app.loading')}</p>;
  if (state.status === 'error') {
    return (
      <div className={ui.centered}>
        <h1 className={ui.pageTitle}>{t('app.loadError.title')}</h1>
        <p>{t('app.loadError.text')}</p>
      </div>
    );
  }
  return (
    <CatalogProvider catalog={state.catalog}>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </CatalogProvider>
  );
}

function Shell() {
  const route = useHashRoute();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const path = route.segments.join('/');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (event.key === 'Escape') {
        setPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // New page: start at the top (filter changes on the search page keep the scroll position).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  return (
    <>
      <Header onOpenPalette={() => setPaletteOpen(true)} />
      <Screen route={route} />
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </>
  );
}

function Screen({ route }: { route: Route }) {
  const { plugins, byId } = useCatalog();
  const [first, second, ...rest] = route.segments;
  const search = route.query.toString();
  const params = useMemo(() => parseSearchParams(new URLSearchParams(search)), [search]);

  if (!first) return <Home />;
  if (rest.length) return <NotFound />;
  if (first === 'search' && !second) return <Search params={params} />;
  if (first === 'whats-new' && !second) return <WhatsNew />;
  if (first === 'getting-started' && !second) return <GettingStarted />;
  if (first === 'plugin' && second) {
    const plugin = plugins.get(second);
    return plugin ? <PluginDetail key={plugin.id} plugin={plugin} /> : <NotFound />;
  }
  if (first === 'artifact' && second) {
    const entry = byId.get(second);
    return entry && entry.kind !== 'plugin' ? <ArtifactDetail key={entry.id} artifact={entry} /> : <NotFound />;
  }
  return <NotFound />;
}

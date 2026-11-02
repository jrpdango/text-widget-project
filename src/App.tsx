'use client';

import { Header } from '@/components/Header';
import { TextWidget } from '@/components/TextWidget';
import { Button } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useWidgets } from '@/hooks/useWidgets';

function App() {
  const {
    widgets,
    focusId,
    status,
    loadError,
    addWidget,
    updateWidget,
    deleteWidget,
    flushWidget,
    retryWidget,
    reload,
  } = useWidgets();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app">
      <Header
        theme={theme}
        onAddWidget={addWidget}
        onToggleTheme={toggleTheme}
        addDisabled={status !== 'ready'}
      />

      <main className="app-main">
        {status === 'loading' && (
          <section className="app-loading" role="status" aria-busy="true">
            <p>Loading widgets…</p>
          </section>
        )}

        {status === 'error' && (
          <section className="app-error" role="alert">
            <h2>Unable to load widgets</h2>
            <p>{loadError ?? 'The server did not respond. Please try again.'}</p>
            <Button onClick={reload}>Retry</Button>
          </section>
        )}

        {status === 'ready' && widgets.length === 0 && (
          <section className="empty-state" aria-labelledby="empty-state-title">
            <span className="empty-state__mark" aria-hidden="true">
              #
            </span>
            <h2 id="empty-state-title">No widgets yet</h2>
            <p>
              Add a widget, then write in plain text or Markdown. Everything is stored in MongoDB.
            </p>
          </section>
        )}

        {status === 'ready' && widgets.length > 0 && (
          <ul className="widget-list" aria-label="Text widgets">
            {widgets.map((widget) => (
              <li key={widget.clientKey}>
                <TextWidget
                  widget={widget}
                  autoFocus={widget.id === focusId}
                  onChange={updateWidget}
                  onDelete={deleteWidget}
                  onFlush={flushWidget}
                  onRetry={retryWidget}
                />
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="app-footer">
        {status === 'ready' ? (
          <>
            <span>{widgets.length === 1 ? '1 widget' : `${widgets.length} widgets`}</span>
            <span aria-hidden="true">·</span>
            <span>Stored in MongoDB</span>
          </>
        ) : (
          <span>{status === 'loading' ? 'Connecting…' : 'Storage unavailable'}</span>
        )}
      </footer>
    </div>
  );
}

export default App;

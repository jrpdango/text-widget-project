import { Header } from './components/Header';
import { TextWidget } from './components/TextWidget';
import { useTheme } from './hooks/useTheme';
import { useWidgets } from './hooks/useWidgets';
import './components/ui/ui.css';
import './App.css';

function App() {
  const { widgets, focusId, addWidget, updateWidget, deleteWidget } = useWidgets();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app">
      <Header theme={theme} onAddWidget={addWidget} onToggleTheme={toggleTheme} />

      <main className="app-main">
        {widgets.length === 0 ? (
          <section className="empty-state" aria-labelledby="empty-state-title">
            <span className="empty-state__mark" aria-hidden="true">
              #
            </span>
            <h2 id="empty-state-title">No widgets yet</h2>
            <p>
              Add a widget, then write in plain text or Markdown. Everything stays in your browser.
            </p>
          </section>
        ) : (
          <ul className="widget-list" aria-label="Text widgets">
            {widgets.map((widget) => (
              <li key={widget.id}>
                <TextWidget
                  widget={widget}
                  autoFocus={widget.id === focusId}
                  onChange={updateWidget}
                  onDelete={deleteWidget}
                />
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="app-footer">
        <span>{widgets.length === 1 ? '1 widget' : `${widgets.length} widgets`}</span>
        <span aria-hidden="true">·</span>
        <span>Saved locally</span>
      </footer>
    </div>
  );
}

export default App;

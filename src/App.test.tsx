import { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/lib/api';
import type { WidgetData } from '@/types';
import App from './App';
import { FIXED_TIMESTAMP, makeWidget } from './test/fixtures';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('text widgets', () => {
  it('shows a loading state, then renders widgets from the API', async () => {
    const pending = deferred<WidgetData[]>();
    vi.mocked(api.fetchWidgets).mockReturnValue(pending.promise);

    render(<App />);

    expect(screen.getByText(/loading widgets/i)).toBeInTheDocument();
    expect(screen.queryByText(/no widgets yet/i)).not.toBeInTheDocument();

    await act(async () => {
      pending.resolve([makeWidget('From the server')]);
    });

    expect(await screen.findByDisplayValue('From the server')).toBeInTheDocument();
    expect(screen.queryByText(/loading widgets/i)).not.toBeInTheDocument();
    expect(api.fetchWidgets).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state when the API returns no widgets', async () => {
    render(<App />);

    expect(await screen.findByText(/no widgets yet/i)).toBeInTheDocument();
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  });

  it('renders widgets in the order returned by the API', async () => {
    vi.mocked(api.fetchWidgets).mockResolvedValue([makeWidget('Newest'), makeWidget('Older')]);

    render(<App />);

    await screen.findByDisplayValue('Newest');

    const textareas = screen.getAllByRole('textbox');
    expect(textareas[0]).toHaveValue('Newest');
    expect(textareas[1]).toHaveValue('Older');
  });

  it('enforces the server content limit in the editor', async () => {
    vi.mocked(api.fetchWidgets).mockResolvedValue([makeWidget('')]);

    render(<App />);

    const textarea = await screen.findByRole('textbox');
    expect(textarea).toHaveAttribute('maxlength', '100000');
  });

  it('adds a widget optimistically, focuses it, and puts it first', async () => {
    const user = userEvent.setup();
    const pending = deferred<WidgetData>();
    vi.mocked(api.createWidget).mockReturnValue(pending.promise);
    vi.mocked(api.fetchWidgets).mockResolvedValue([makeWidget('Older')]);

    render(<App />);
    await screen.findByDisplayValue('Older');

    await user.click(screen.getByRole('button', { name: 'Add widget' }));

    const textareas = screen.getAllByRole('textbox');
    expect(textareas).toHaveLength(2);
    expect(textareas[0]).toHaveValue('');
    expect(textareas[0]).toHaveFocus();
    expect(api.createWidget).toHaveBeenCalledWith('');

    await act(async () => {
      pending.resolve(makeWidget(''));
    });

    await waitFor(() => expect(api.createWidget).toHaveBeenCalledTimes(1));
    expect(screen.getAllByRole('textbox')[0]).toHaveValue('');
  });

  it('adds a widget when crypto.randomUUID is unavailable', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('crypto', {});
    expect(globalThis.crypto.randomUUID).toBeUndefined();

    render(<App />);
    await screen.findByText(/no widgets yet/i);

    await user.click(screen.getByRole('button', { name: 'Add widget' }));

    expect(await screen.findByRole('textbox')).toBeInTheDocument();
    expect(api.createWidget).toHaveBeenCalledTimes(1);
  });

  it('removes a server record when a widget is deleted while creation is in flight', async () => {
    const user = userEvent.setup();
    const pending = deferred<WidgetData>();
    const created = makeWidget('');
    vi.mocked(api.createWidget).mockReturnValue(pending.promise);
    vi.mocked(api.fetchWidgets).mockResolvedValue([]);

    render(<App />);
    await screen.findByText(/no widgets yet/i);

    await user.click(screen.getByRole('button', { name: 'Add widget' }));
    await user.click(screen.getByRole('button', { name: 'Delete widget' }));

    expect(screen.queryAllByRole('textbox')).toHaveLength(0);

    await act(async () => {
      pending.resolve(created);
    });

    await waitFor(() => expect(api.deleteWidget).toHaveBeenCalledWith(created.id));
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  });

  it('debounces edits into a single PATCH after 600 ms', async () => {
    const widget = makeWidget('');
    vi.mocked(api.fetchWidgets).mockResolvedValue([widget]);

    render(<App />);
    const textarea = await screen.findByRole('textbox');

    vi.useFakeTimers();

    fireEvent.change(textarea, { target: { value: 'a' } });
    fireEvent.change(textarea, { target: { value: 'ab' } });
    fireEvent.change(textarea, { target: { value: 'abc' } });

    expect(screen.getByText('3 characters')).toBeInTheDocument();
    expect(api.updateWidget).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(599);
    });
    expect(api.updateWidget).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(api.updateWidget).toHaveBeenCalledTimes(1);
    expect(api.updateWidget).toHaveBeenCalledWith(widget.id, 'abc');
  });

  it('flushes a pending save when the editor loses focus', async () => {
    const user = userEvent.setup();
    const widget = makeWidget('');
    vi.mocked(api.fetchWidgets).mockResolvedValue([widget]);

    render(<App />);
    const textarea = await screen.findByRole('textbox');

    await user.type(textarea, 'hello');
    expect(api.updateWidget).not.toHaveBeenCalled();

    await user.tab();

    await waitFor(() => expect(api.updateWidget).toHaveBeenCalledTimes(1));
    expect(api.updateWidget).toHaveBeenCalledWith(widget.id, 'hello');
  });

  it('flushes dirty content when the page is hidden', async () => {
    const widget = makeWidget('');
    vi.mocked(api.fetchWidgets).mockResolvedValue([widget]);

    render(<App />);
    const textarea = await screen.findByRole('textbox');

    fireEvent.change(textarea, { target: { value: 'draft' } });

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });

    expect(api.flushWidgetUpdate).toHaveBeenCalledWith(widget.id, 'draft');
  });

  it('loads widgets from the API after a remount', async () => {
    vi.mocked(api.fetchWidgets).mockResolvedValue([makeWidget('Remember me')]);

    const view = render(<App />);
    expect(await screen.findByDisplayValue('Remember me')).toBeInTheDocument();

    view.unmount();
    render(<App />);

    expect(await screen.findByDisplayValue('Remember me')).toBeInTheDocument();
    expect(api.fetchWidgets).toHaveBeenCalledTimes(2);
  });

  it('shows a save error and retries the PATCH', async () => {
    const user = userEvent.setup();
    const widget = makeWidget('Start');
    vi.mocked(api.fetchWidgets).mockResolvedValue([widget]);
    vi.mocked(api.updateWidget).mockRejectedValueOnce(
      new api.ApiError(503, 'database_unavailable', 'Database is down.'),
    );

    render(<App />);
    const textarea = await screen.findByRole('textbox');

    await user.type(textarea, '!');
    await user.tab();

    expect(await screen.findByText('Database is down.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();

    vi.mocked(api.updateWidget).mockResolvedValueOnce({
      ...widget,
      content: 'Start!',
      updatedAt: FIXED_TIMESTAMP,
    });

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(api.updateWidget).toHaveBeenCalledTimes(2);
    expect(api.updateWidget).toHaveBeenLastCalledWith(widget.id, 'Start!');
  });

  it('restores a widget when deleting fails', async () => {
    const user = userEvent.setup();
    const widget = makeWidget('Keep me');
    const pending = deferred<void>();
    vi.mocked(api.fetchWidgets).mockResolvedValue([widget]);
    vi.mocked(api.deleteWidget).mockReturnValue(pending.promise);

    render(<App />);
    await screen.findByDisplayValue('Keep me');

    await user.click(screen.getByRole('button', { name: 'Delete widget' }));

    expect(screen.queryByDisplayValue('Keep me')).not.toBeInTheDocument();

    await act(async () => {
      pending.reject(new api.ApiError(503, 'database_unavailable', 'Database is down.'));
      await pending.promise.catch(() => undefined);
    });

    expect(await screen.findByDisplayValue('Keep me')).toBeInTheDocument();
    expect(screen.getByText('Database is down.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('treats a missing widget on delete as already deleted', async () => {
    const user = userEvent.setup();
    const widget = makeWidget('Already gone');
    vi.mocked(api.fetchWidgets).mockResolvedValue([widget]);
    vi.mocked(api.deleteWidget).mockRejectedValueOnce(
      new api.ApiError(404, 'not_found', 'Widget not found.'),
    );

    render(<App />);
    await screen.findByDisplayValue('Already gone');

    await user.click(screen.getByRole('button', { name: 'Delete widget' }));

    await waitFor(() => expect(api.deleteWidget).toHaveBeenCalledWith(widget.id));
    expect(await screen.findByText(/no widgets yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('deletes only the widget whose delete button was clicked', async () => {
    const user = userEvent.setup();
    const keep = makeWidget('Keep me');
    const remove = makeWidget('Delete me');
    vi.mocked(api.fetchWidgets).mockResolvedValue([keep, remove]);

    render(<App />);
    await screen.findByDisplayValue('Keep me');

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete widget' });
    await user.click(deleteButtons[1]);

    await waitFor(() => expect(screen.queryByDisplayValue('Delete me')).not.toBeInTheDocument());
    expect(screen.getByDisplayValue('Keep me')).toBeInTheDocument();
    expect(api.deleteWidget).toHaveBeenCalledWith(remove.id);
  });

  it('returns to the empty state after the last widget is deleted', async () => {
    const user = userEvent.setup();
    vi.mocked(api.fetchWidgets).mockResolvedValue([makeWidget('Only')]);

    render(<App />);
    await screen.findByDisplayValue('Only');

    await user.click(screen.getByRole('button', { name: 'Delete widget' }));

    expect(await screen.findByText(/no widgets yet/i)).toBeInTheDocument();
  });

  it('shows a load error and refetches on retry', async () => {
    const user = userEvent.setup();
    vi.mocked(api.fetchWidgets)
      .mockRejectedValueOnce(new api.ApiError(503, 'database_unavailable', 'Database is down.'))
      .mockResolvedValueOnce([makeWidget('Recovered')]);

    render(<App />);

    expect(await screen.findByText(/unable to load widgets/i)).toBeInTheDocument();
    expect(screen.getByText('Database is down.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByDisplayValue('Recovered')).toBeInTheDocument();
    expect(api.fetchWidgets).toHaveBeenCalledTimes(2);
  });

  it('retries creating a widget after POST fails', async () => {
    const user = userEvent.setup();
    vi.mocked(api.createWidget)
      .mockRejectedValueOnce(new api.ApiError(503, 'database_unavailable', 'Database is down.'))
      .mockImplementationOnce(async (content = '') => makeWidget(content));

    render(<App />);
    await screen.findByText(/no widgets yet/i);

    await user.click(screen.getByRole('button', { name: 'Add widget' }));

    expect(await screen.findByText('Database is down.')).toBeInTheDocument();
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();

    await user.type(textarea, 'Retry me');
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(api.createWidget).toHaveBeenCalledTimes(2));
    expect(api.createWidget).toHaveBeenLastCalledWith('Retry me');
    expect(screen.getByDisplayValue('Retry me')).toBeInTheDocument();
  });
});

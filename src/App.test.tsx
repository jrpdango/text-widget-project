import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

type User = ReturnType<typeof userEvent.setup>

const WIDGETS_KEY = 'text-widgets:v1'

function getTextareas() {
  return screen.queryAllByRole('textbox') as HTMLTextAreaElement[]
}

async function addWidget(user: User) {
  await user.click(screen.getByRole('button', { name: 'Add widget' }))
}

function readStoredWidgets() {
  const raw = window.localStorage.getItem(WIDGETS_KEY)
  return raw ? JSON.parse(raw) : null
}

describe('text widgets', () => {
  it('starts with an empty state and adds a widget when the button is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText(/no widgets yet/i)).toBeInTheDocument()

    await addWidget(user)

    expect(getTextareas()).toHaveLength(1)
    expect(getTextareas()[0]).toHaveValue('')
    expect(screen.queryByText(/no widgets yet/i)).not.toBeInTheDocument()
  })

  it('puts the newest widget first', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addWidget(user)
    await user.type(getTextareas()[0], 'First widget')

    await addWidget(user)
    expect(getTextareas()[0]).toHaveValue('')
    expect(getTextareas()[1]).toHaveValue('First widget')

    await user.type(getTextareas()[0], 'Second widget')
    expect(getTextareas()[0]).toHaveValue('Second widget')
    expect(getTextareas()[1]).toHaveValue('First widget')
  })

  it('focuses the editor of a newly added widget', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addWidget(user)

    expect(getTextareas()[0]).toHaveFocus()
  })

  it('handles and persists more than 1000 characters', async () => {
    const user = userEvent.setup()
    const longText = `# A long note\n\n${'The quick brown fox jumps over the lazy dog. '.repeat(40)}`
    expect(longText.length).toBeGreaterThan(1000)

    const view = render(<App />)
    await addWidget(user)
    await user.click(getTextareas()[0])
    await user.paste(longText)

    expect(getTextareas()[0]).toHaveValue(longText)
    expect(screen.getByText(`${longText.length} characters`)).toBeInTheDocument()

    const stored = readStoredWidgets() as Array<{ content: string }>
    expect(stored[0].content).toBe(longText)

    view.unmount()
    render(<App />)

    expect(getTextareas()[0]).toHaveValue(longText)
  })

  it('updates the character count as the user types', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addWidget(user)
    expect(screen.getByText('0 characters')).toBeInTheDocument()

    await user.type(getTextareas()[0], 'Hello')
    expect(screen.getByText('5 characters')).toBeInTheDocument()
  })

  it('deletes only the widget whose delete button was clicked', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addWidget(user)
    await user.type(getTextareas()[0], 'Delete me')

    await addWidget(user)
    await user.type(getTextareas()[0], 'Keep me')

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete widget' })
    await user.click(deleteButtons[0])

    expect(getTextareas()).toHaveLength(1)
    expect(getTextareas()[0]).toHaveValue('Delete me')
    expect(screen.queryByDisplayValue('Keep me')).not.toBeInTheDocument()
  })

  it('returns to the empty state after the last widget is deleted', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addWidget(user)
    await user.click(screen.getByRole('button', { name: 'Delete widget' }))

    expect(getTextareas()).toHaveLength(0)
    expect(screen.getByText(/no widgets yet/i)).toBeInTheDocument()
  })

  it('restores widgets from localStorage after a remount', async () => {
    const user = userEvent.setup()
    const view = render(<App />)

    await addWidget(user)
    await user.type(getTextareas()[0], 'Remember me')

    view.unmount()
    render(<App />)

    expect(getTextareas()[0]).toHaveValue('Remember me')
  })

  it('ignores malformed stored widget data', () => {
    window.localStorage.setItem(WIDGETS_KEY, '{not valid json')

    render(<App />)

    expect(screen.getByText(/no widgets yet/i)).toBeInTheDocument()
    expect(getTextareas()).toHaveLength(0)
  })

  it('ignores stored widget data with the wrong shape', () => {
    window.localStorage.setItem(
      WIDGETS_KEY,
      JSON.stringify([{ id: 7, content: 'not a widget' }, { id: 'ok' }]),
    )

    render(<App />)

    expect(screen.getByText(/no widgets yet/i)).toBeInTheDocument()
    expect(getTextareas()).toHaveLength(0)
  })
})

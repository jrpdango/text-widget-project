import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button, IconButton, Textarea, ToggleGroup } from './index';

describe('Button', () => {
  it('renders a button that fires its click handler', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Save</Button>);

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('type', 'button');

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire its handler when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('IconButton', () => {
  it('exposes an accessible name and fires its click handler', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <IconButton label="Delete widget" onClick={onClick}>
        <span aria-hidden="true">x</span>
      </IconButton>,
    );

    const button = screen.getByRole('button', { name: 'Delete widget' });
    expect(button).toHaveAttribute('title', 'Delete widget');

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

function ToggleHarness() {
  const [mode, setMode] = useState<'write' | 'preview'>('write');

  return (
    <>
      <ToggleGroup
        label="Widget mode"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'write', label: 'Write' },
          { value: 'preview', label: 'Preview' },
        ]}
      />
      <output>{mode}</output>
    </>
  );
}

describe('ToggleGroup', () => {
  it('marks the active option and reports a new selection', async () => {
    const user = userEvent.setup();

    render(<ToggleHarness />);

    expect(screen.getByRole('button', { name: 'Write' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Preview' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('group', { name: 'Widget mode' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Preview' }));

    expect(screen.getByRole('button', { name: 'Write' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Preview' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('preview')).toBeInTheDocument();
  });
});

describe('Textarea', () => {
  it('associates its hidden label, forwards its ref, and reports changes', async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLTextAreaElement>();
    const onChange = vi.fn();

    render(
      <Textarea ref={ref} label="Widget text" hideLabel defaultValue="Hello" onChange={onChange} />,
    );

    const textarea = screen.getByRole('textbox', { name: 'Widget text' });
    expect(textarea).toHaveValue('Hello');
    expect(ref.current).toBe(textarea);

    ref.current?.focus();
    expect(textarea).toHaveFocus();

    await user.type(textarea, '!');
    expect(onChange).toHaveBeenCalled();
  });
});

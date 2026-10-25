import type { ComponentPropsWithoutRef } from 'react';
import { classNames } from './classNames';

export type IconButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'aria-label' | 'title'> & {
  label: string;
  title?: string;
  tone?: 'default' | 'danger';
  size?: 'md' | 'sm';
};

export function IconButton({
  label,
  title,
  tone = 'default',
  size = 'md',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={classNames(
        'icon-button',
        tone === 'danger' && 'icon-button--danger',
        size === 'sm' && 'icon-button--sm',
        className,
      )}
      aria-label={label}
      title={title ?? label}
    />
  );
}

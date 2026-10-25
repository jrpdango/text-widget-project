import type { ComponentPropsWithoutRef } from 'react';
import { classNames } from './classNames';

export type ButtonProps = ComponentPropsWithoutRef<'button'>;

export function Button({ className, type = 'button', ...props }: ButtonProps) {
  return (
    <button {...props} type={type} className={classNames('button', 'button--primary', className)} />
  );
}

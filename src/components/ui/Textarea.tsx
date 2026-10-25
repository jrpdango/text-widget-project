import { useId, type ComponentPropsWithRef } from 'react';
import { classNames } from './classNames';

export interface TextareaProps extends ComponentPropsWithRef<'textarea'> {
  label: string;
  hideLabel?: boolean;
}

export function Textarea({
  label,
  hideLabel = false,
  id,
  className,
  ref,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <>
      <label className={hideLabel ? 'sr-only' : 'text-area__label'} htmlFor={textareaId}>
        {label}
      </label>
      <textarea
        {...props}
        ref={ref}
        id={textareaId}
        className={classNames('text-area', className)}
      />
    </>
  );
}

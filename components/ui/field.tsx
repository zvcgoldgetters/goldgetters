import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

const Field = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="group"
    className={cn('space-y-2', className)}
    {...props}
  />
));
Field.displayName = 'Field';

const FieldLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => (
  <Label ref={ref} className={cn('', className)} {...props} />
));
FieldLabel.displayName = 'FieldLabel';

const FieldContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col gap-1', className)} {...props} />
));
FieldContent.displayName = 'FieldContent';

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
FieldDescription.displayName = 'FieldDescription';

const fieldErrorVariants = cva('text-sm font-medium', {
  variants: {
    variant: {
      default: 'text-destructive',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

interface FieldErrorProps
  extends
    React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof fieldErrorVariants> {
  errors?: Array<{ message?: string } | undefined>;
}

const FieldError = React.forwardRef<HTMLParagraphElement, FieldErrorProps>(
  ({ className, variant, errors, children, ...props }, ref) => {
    const errorMessage = errors?.[0]?.message || children;

    if (!errorMessage) {
      return null;
    }

    return (
      <p
        ref={ref}
        className={cn(fieldErrorVariants({ variant }), className)}
        role="alert"
        aria-live="polite"
        {...props}
      >
        {errorMessage}
      </p>
    );
  },
);
FieldError.displayName = 'FieldError';

const FieldGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('space-y-4', className)} {...props} />
));
FieldGroup.displayName = 'FieldGroup';

const FieldSet = React.forwardRef<
  HTMLFieldSetElement,
  React.FieldsetHTMLAttributes<HTMLFieldSetElement>
>(({ className, ...props }, ref) => (
  <fieldset ref={ref} className={cn('space-y-4', className)} {...props} />
));
FieldSet.displayName = 'FieldSet';

const FieldLegend = React.forwardRef<
  HTMLLegendElement,
  React.HTMLAttributes<HTMLLegendElement>
>(({ className, ...props }, ref) => (
  <legend
    ref={ref}
    className={cn('text-sm font-medium leading-none', className)}
    {...props}
  />
));
FieldLegend.displayName = 'FieldLegend';

export {
  Field,
  FieldLabel,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldSet,
  FieldLegend,
};

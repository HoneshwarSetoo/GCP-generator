import { cn } from '@/lib/utils';
import { ReactNode, ElementType, type JSX } from 'react';

export type TypographyVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'subtitle1' | 'subtitle2' | 'body1' | 'body2'
  | 'caption' | 'overline' | 'custom';

export type TypographyColor = 'charcoal' | 'gray' | 'black' | 'primary' | 'white' | 'inherit';

const variantMapping: Record<TypographyVariant, keyof JSX.IntrinsicElements> = {
  h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h5', h6: 'h6',
  subtitle1: 'h6', subtitle2: 'h6',
  body1: 'p', body2: 'p',
  caption: 'span', overline: 'span', custom: 'span',
};

const variantClasses: Record<TypographyVariant, string> = {
  h1: 'text-h1', h2: 'text-h2', h3: 'text-h3',
  h4: 'text-h4', h5: 'text-h5', h6: 'text-h6',
  subtitle1: 'text-subtitle1', subtitle2: 'text-subtitle2',
  body1: 'text-body1', body2: 'text-body2',
  caption: 'text-caption', overline: 'text-overline uppercase',
  custom: 'text-body2',
};

const colorClasses: Record<TypographyColor, string> = {
  charcoal: 'text-charcoal',
  gray: 'text-black-99',
  black: 'text-black-de',
  primary: 'text-primary',
  white: 'text-white',
  inherit: '',
};

interface TypographyProps {
  variant?: TypographyVariant;
  color?: TypographyColor;
  component?: keyof JSX.IntrinsicElements;
  gutterBottom?: boolean;
  className?: string;
  children: ReactNode;
  title?: string;
}

export function Typography({
  variant = 'body1',
  color = 'charcoal',
  component,
  gutterBottom = false,
  className,
  children,
  title
}: TypographyProps) {
  const Component: ElementType = component || variantMapping[variant];
  return (
    <Component
      className={cn(
        variantClasses[variant],
        colorClasses[color],
        gutterBottom && 'gutter-bottom',
        className
      )}
      {...(title ? { title } : {})}
    >
      {children}
    </Component>
  );
}

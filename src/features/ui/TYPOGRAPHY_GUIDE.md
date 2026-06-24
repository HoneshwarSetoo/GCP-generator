# Typography System Guide

This project uses a standardized typography system based on semantic variants. This ensures visual consistency across the application and makes it easy to maintain design tokens.

## 🚀 Usage

The primary way to render text is using the `<Typography>` component.

```tsx
import { Typography } from '@/components/ui/Typography';

function MyComponent() {
  return (
    <Typography variant="h4" gutterBottom>
      This is a Heading
    </Typography>
  );
}
```

## 📋 Typography Variants

| Variant | Tag | Tailwind Class | Usage Description |
| :--- | :--- | :--- | :--- |
| `h1` | `h1` | `.text-h1` | Main page titles (use sparingly) |
| `h2` | `h2` | `.text-h2` | Major section headers |
| `h3` | `h3` | `.text-h3` | Dashboard card titles |
| `h4` | `h4` | `.text-h4` | Sub-section headers |
| `h5` | `h5` | `.text-h5` | Smaller section titles |
| `h6` | `h6` | `.text-h6` | Internal component titles |
| `subtitle1` | `h6` | `.text-subtitle1` | Prominent secondary text |
| `subtitle2` | `h6` | `.text-subtitle2` | Standard secondary labels |
| `body1` | `p` | `.text-body1` | Primary paragraph text |
| `body2` | `p` | `.text-body2` | Secondary/Smaller paragraph text |
| `caption` | `span` | `.text-caption` | Annotations and helper text |
| `overline` | `span` | `.text-overline` | Small, uppercase labels/metadata |

## 🛠 Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `variant` | `TypographyVariant` | `'body1'` | The semantic variant to apply |
| `component` | `ElementType` | (Auto) | Override the HTML tag (e.g. render `h4` as a `p` tag) |
| `gutterBottom` | `boolean` | `false` | Adds standard vertical spacing below the text |
| `className` | `string` | `''` | Additional Tailwind classes for color, alignment, etc. |

## ⚙️ Configuration

The font sizes and weights are defined in `tailwind.config.ts` under the `fontSize` section. To update the global scale, modify the values there.

```ts
// tailwind.config.ts
fontSize: {
  'h1': ['48px', { lineHeight: '1.2', fontWeight: '700' }],
  // ...
}
```

## 💡 Best Practices

1.  **Prefer Components over Classes**: Always use `<Typography variant="...">` instead of raw Tailwind classes like `text-sm font-bold`. This ensures that when we update a variant in the config, your code updates automatically.
2.  **Semantic Nesting**: Maintain proper heading hierarchy (`h1` -> `h2` -> `h3`) for SEO and accessibility. Use the `component` prop if the visual variant doesn't match the required semantic tag.
3.  **Spacing**: Use the `gutterBottom` prop instead of manual `mb-2` or `pb-2` to maintain consistent vertical rhythm across different sections.

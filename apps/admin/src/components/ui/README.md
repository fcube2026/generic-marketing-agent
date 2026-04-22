# UI components

Token-driven primitives for the admin Next.js app. Every value comes from the
`--curex-*` CSS variables produced by `@curex24/design-tokens` (imported once
in `src/app/globals.css`). Do not introduce raw hex or px values — extend the
tokens instead.

## Available components

| Component | Variants                                       | Sizes        |
| --------- | ---------------------------------------------- | ------------ |
| `Button`  | `primary`, `secondary`, `ghost`, `destructive` | `sm`/`md`/`lg` |

## Usage

```tsx
import { Button } from '@/components/ui/Button';

<Button onClick={onSave}>Save</Button>
<Button variant="secondary" onClick={onCancel}>Cancel</Button>
<Button variant="destructive" loading={isDeleting}>Delete</Button>
```

## Dark mode

Set `data-theme="dark"` (or `class="theme-dark"`) on `<html>` — every
`--curex-semantic-color-*` variable will switch to its dark palette and these
components will follow automatically.

# UI components

Token-driven components for the curex24 mobile app. Every value (color,
spacing, radius, font, shadow) is sourced from `@curex24/design-tokens` via the
`../theme` module — never hardcoded.

## Available components

| Component | Variants                                       | Sizes        | Notes                                                   |
| --------- | ---------------------------------------------- | ------------ | ------------------------------------------------------- |
| `Button`  | `primary`, `secondary`, `ghost`, `destructive` | `sm`/`md`/`lg` | Supports `loading`, `fullWidth`, `iconLeft`, `iconRight`. |

## Usage

```tsx
import { Button } from '../../components/ui/Button';

<Button label="Save" onPress={onSave} />
<Button label="Cancel" variant="secondary" onPress={onCancel} />
<Button label="Delete" variant="destructive" loading={isDeleting} />
```

## Adding new components

1. Build the component in Figma first (Phase 3 of the design-tokens plan).
2. Read every value from `useTheme()` or `tokens` — do not introduce raw hex
   or pixel values.
3. Mirror the prop surface (`variant`, `size`, `state` booleans, icons) to the
   Figma component properties so designers and engineers speak the same
   language.
4. Add it to the table above.

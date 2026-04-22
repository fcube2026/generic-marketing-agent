# @curex24/design-tokens

Single source of truth for colors, spacing, typography, radii, shadows and component aliases shared across `apps/admin`, `apps/marketing-agent`, and `apps/mobile`.

## Layout

```
packages/design-tokens/
├── tokens/tokens.json     # Source of truth (Tokens Studio / Figma Variables shape)
├── scripts/build-tokens.js # Generator
└── dist/                  # Generated, committed to git
    ├── tokens.css         # CSS variables for web apps (`--curex-...`)
    ├── tokens.js          # Resolved token object (CommonJS) for React Native
    ├── tokens.ts          # Same, as TypeScript source
    └── tokens.d.ts        # Type declarations
```

`dist/` is committed so consumers don't need to run a build step before
`next build` / Metro bundling. The root `.gitignore` un-ignores it.

## Consuming the tokens

### Web (`apps/admin`, `apps/marketing-agent`)

Already wired in each app's `src/app/globals.css`:

```css
@import '@curex24/design-tokens/tokens.css';
```

Use the generated CSS variables anywhere:

```css
.cta {
  background: var(--curex-components-button-primary-bg);
  color:      var(--curex-components-button-primary-fg);
  border-radius: var(--curex-core-radius-md);
}
```

To opt into dark mode for a subtree:

```html
<html data-theme="dark"> <!-- or class="theme-dark" -->
```

The dark variant also activates automatically via `prefers-color-scheme: dark`
when no explicit `data-theme` / `theme-light` opt-out is set.

### React Native (`apps/mobile`)

```ts
import { tokens, useTheme } from '../theme';

const styles = StyleSheet.create({
  cta: {
    backgroundColor: tokens.themes.light.color.action.primary,
    borderRadius: parseInt(tokens.core.radius.md, 10),
  },
});
```

Or for theme-aware components:

```ts
const { colors, mode } = useTheme();
return <View style={{ backgroundColor: colors.surface.background }} />;
```

## Authoring tokens

Edit `tokens/tokens.json` directly or sync from Figma (preferred — see below).

The file follows the [Tokens Studio for Figma](https://docs.tokens.studio/)
shape:

- Every leaf is `{ "value": "...", "type": "..." }`.
- Aliases use `"{path.to.other.token}"`.
- Three top-level groups: `core` (raw primitives), `semantic.{light,dark}`
  (role-based aliases), `components` (per-component aliases).

After editing, regenerate `dist/`:

```bash
pnpm --filter @curex24/design-tokens build
```

## Figma → repo sync

### Manual (start here)

1. In Figma → **Tokens Studio** plugin → **Tools → Export → JSON**.
2. Save over `packages/design-tokens/tokens/tokens.json`.
3. From repo root: `pnpm --filter @curex24/design-tokens build`.
4. Review `git diff packages/design-tokens/`.
5. Open a PR titled `chore(design-tokens): sync from figma YYYY-MM-DD`.

### Automated (later)

In Tokens Studio → **Settings → Sync providers → GitHub**, target
`fcube2026/curex24` at `packages/design-tokens/tokens/tokens.json` on a
`design-tokens/sync` branch. Add a GitHub Action that runs
`pnpm --filter @curex24/design-tokens build` and opens a PR with the
regenerated `dist/`.

## CI guard

`scripts/build-tokens.js --check` (exposed as `lint`) builds in memory and
fails if `dist/` is stale relative to `tokens/tokens.json`. Run it in CI to
guarantee committed outputs match the source.

## Naming convention for CSS variables

Each leaf token becomes `--curex-<kebab-cased-dot-path>`. Examples:

| Source path                                 | CSS variable                                   |
| ------------------------------------------- | ---------------------------------------------- |
| `core.color.brand.500`                      | `--curex-core-color-brand-500`                 |
| `core.spacing.4`                            | `--curex-core-spacing-4`                       |
| `semantic.light.color.surface.background`   | `--curex-semantic-color-surface-background`    |
| `components.button.primary.bg`              | `--curex-components-button-primary-bg`         |

> Note: The `light`/`dark` segment is intentionally dropped from the CSS
> variable name. The same name resolves to a different value depending on the
> active `data-theme` / `.theme-dark` scope. That's the whole point.

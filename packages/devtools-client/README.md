# @websublime/vite-open-api-devtools

Vue-based DevTools SPA for debugging and inspecting the OpenAPI mock server.

## Features

- **Routes Page** - Browse all available API endpoints from your OpenAPI spec
- **Timeline Page** - Monitor request/response traffic in real-time
- **Models Page** - View and edit in-memory store data
- **Simulator Page** - Simulate errors and slow responses for testing

## Installation

```bash
pnpm add @websublime/vite-open-api-devtools
```

## Usage

The DevTools SPA is typically served automatically by the Vite plugin. However, you can also use it standalone for development:

### Development

```bash
# Start the dev server
pnpm dev

# Build for production
pnpm build

# Type check
pnpm typecheck
```

### Standalone Integration

```typescript
import { bootstrap } from '@websublime/vite-open-api-devtools';
import '@websublime/vite-open-api-devtools/style.css';

// Mount the DevTools SPA
bootstrap();
```

## Architecture

```
devtools-client/
├── src/
│   ├── App.vue              # Main layout with tabs
│   ├── main.ts              # Entry point
│   ├── router.ts            # Vue Router setup
│   │
│   ├── pages/
│   │   ├── RoutesPage.vue   # Endpoint listing
│   │   ├── TimelinePage.vue # Request/response log
│   │   ├── ModelsPage.vue   # Store data editor
│   │   └── SimulatorPage.vue# Error simulation
│   │
│   ├── components/          # Reusable UI components
│   │
│   ├── composables/
│   │   ├── useWebSocket.ts  # WebSocket connection (TODO)
│   │   └── useTheme.ts      # Dark/light mode
│   │
│   ├── stores/              # Pinia stores
│   │
│   └── assets/
│       └── main.css         # Global styles with OpenProps
```

## Tech Stack

- **Vue 3** - Composition API with `<script setup>`
- **Pinia** - State management
- **Vue Router** - Navigation with hash history (for iframe compatibility)
- **OpenProps** - CSS design tokens
- **Lucide Vue Next** - Icon library
- **TypeScript** - Type safety

## Theming

The DevTools support both light and dark modes, automatically respecting system preferences. The theme can also be toggled programmatically:

```typescript
import { useTheme } from '@websublime/vite-open-api-devtools';

const { isDark, toggleTheme, setTheme } = useTheme();

// Toggle between light and dark
toggleTheme();

// Set explicit theme
setTheme('dark');

// Use system preference
setTheme('system');
```

## CSS Custom Properties

The DevTools expose CSS custom properties for customization:

```css
:root {
  --devtools-primary: var(--blue-6);
  --devtools-bg: var(--gray-0);
  --devtools-surface: var(--gray-1);
  --devtools-text: var(--gray-9);
  /* ... and more */
}
```

## License

MIT

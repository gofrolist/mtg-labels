# MTG Label Generator - Frontend

React frontend for the MTG Label Generator application, deployed to Vercel.

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS 4** - Styling
- **Vitest** - Testing framework
- **React Testing Library** - Component testing
- **TanStack Query** - Server state management
- **Orval** - API client code generation
- **Bun** - Package manager and runtime

## Development

### Prerequisites

- Bun

### Setup

1. Install dependencies:
```bash
bun install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update `.env` with your backend API URL:
```
VITE_API_BASE_URL=http://localhost:8080
```

### Running Locally

```bash
bun run dev
```

The app will be available at `http://localhost:5173`

### Building

```bash
bun run build
```

Output will be in the `dist/` directory.

### Testing

```bash
# Run tests
bun run test

# Run tests with coverage
bun run test:coverage

# Run tests in watch mode
bun run test:watch
```

### Linting

```bash
bun run lint
```

## Deployment

This frontend is configured for deployment to Vercel.

### Vercel Configuration

- Configuration file: `vercel.json`
- Build command: `bun run build`
- Output directory: `dist`
- Framework: Vite

### Environment Variables

**Production (Vercel)**:
- No environment variables needed by default
- API defaults to `https://mtg-labels.fly.dev`
- Optional: Set `VITE_API_BASE_URL` if using a different API URL

**Development**:
- Set `VITE_API_BASE_URL=http://localhost:8080` in `.env` file

### Manual Deployment

1. Install Vercel CLI:
```bash
bun install --global vercel
```

2. Deploy:
```bash
cd frontend
vercel
```

### Automatic Deployment

Deployment is automated via GitHub Actions when code is pushed to the `main` branch.

See `.github/workflows/frontend-deploy.yml` for the CI/CD configuration.

## Project Structure

```
frontend/
├── src/
│   ├── api/            # Generated API client (orval)
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript types
│   ├── constants/      # Constants and configuration
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── dist/               # Build output
├── openapi.json        # OpenAPI spec (generated from backend)
├── orval.config.ts     # Orval code generation config
├── vercel.json         # Vercel configuration
└── package.json        # Dependencies
```

## Features

- View and select MTG sets
- Search and filter sets
- Generate PDF labels
- Responsive design (mobile, tablet, desktop)
- Light and dark theme support
- State persistence (localStorage)

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

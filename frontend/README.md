# MTG Label Generator - Frontend

React frontend for the MTG Label Generator application, deployed to Vercel.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Vitest** - Testing framework
- **React Testing Library** - Component testing

## Development

### Prerequisites

- Node.js 18+ and npm

### Setup

1. Install dependencies:
```bash
npm install
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
npm run dev
```

The app will be available at `http://localhost:5173`

### Building

```bash
npm run build
```

Output will be in the `dist/` directory.

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in UI mode
npm run test:ui
```

### Linting

```bash
npm run lint
```

## Deployment

This frontend is configured for deployment to Vercel.

### Vercel Configuration

- Configuration file: `vercel.json`
- Build command: `npm run build`
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
npm i -g vercel
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
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API services
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript types
│   ├── constants/      # Constants and configuration
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── dist/               # Build output
├── vercel.json         # Vercel configuration
└── package.json        # Dependencies
```

## Features

- ✅ View and select MTG sets
- ✅ Search and filter sets
- ✅ Generate PDF labels
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Light and dark theme support
- ✅ State persistence (localStorage)

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

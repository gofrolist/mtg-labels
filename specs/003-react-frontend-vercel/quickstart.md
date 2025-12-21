# Quickstart Guide: React Frontend Rewrite & Vercel Deployment

**Date**: 2025-01-27
**Feature**: React Frontend Rewrite & Vercel Deployment
**Phase**: Phase 1 - Design

## Development Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm, yarn, or pnpm
- Backend running on `http://localhost:8080` (or configured URL)

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Configure backend URL** (in `.env`):
   ```env
   VITE_API_BASE_URL=http://localhost:8080
   ```

5. **Start development server**:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

6. **Open browser**: Navigate to `http://localhost:5173`

### Backend Setup (for testing)

1. **Ensure backend is running**:
   ```bash
   cd backend
   uv run uvicorn main:app --reload --host 0.0.0.0 --port 8080
   ```

2. **Verify CORS is configured**:
   - Check `backend/src/api/routes.py` for CORS middleware
   - Ensure `CORS_ORIGINS` includes `http://localhost:5173`

## Testing Scenarios

### Scenario 1: View and Select Sets

**Steps**:
1. Open application in browser
2. Verify sets are displayed organized by set type
3. Click on a set type group to expand/collapse
4. Click checkbox to select a set
5. Verify selection counter updates
6. Click "Select All" button
7. Verify all sets are selected

**Expected Results**:
- Sets load within 2 seconds
- Groups can be expanded/collapsed
- Selection state persists in localStorage
- Selection counter shows correct count

### Scenario 2: Search and Filter

**Steps**:
1. Type in search box (e.g., "Modern")
2. Verify only matching sets are shown
3. Verify groups without matches are hidden
4. Clear search
5. Verify all sets are shown again

**Expected Results**:
- Search filters in real-time (<50ms delay)
- Search feedback shows result count
- Clearing search restores all sets

### Scenario 3: Generate PDF

**Steps**:
1. Select at least one set
2. Choose a label template from dropdown
3. Set quantity for a set (if needed)
4. Set number of empty labels at start (if needed)
5. Click "Generate PDF" button
6. Verify loading indicator appears
7. Verify PDF downloads when complete

**Expected Results**:
- PDF generation completes within 15 seconds (for 30 sets)
- PDF file downloads with correct filename
- Loading state is shown during generation
- Error message shown if no sets selected

### Scenario 4: Theme Toggle

**Steps**:
1. Click theme toggle button
2. Verify interface switches to dark theme
3. Reload page
4. Verify theme preference is restored

**Expected Results**:
- Theme switches instantly (<100ms)
- Theme preference persists in localStorage
- Theme is restored on page reload

### Scenario 5: View Mode Switch

**Steps**:
1. Click "Types" view mode button
2. Verify card types are displayed organized by color
3. Select some card types
4. Switch back to "Sets" view
5. Verify sets are displayed
6. Verify selections are preserved per view mode

**Expected Results**:
- View mode switches smoothly
- Card types are fetched from API
- Selections are preserved per view mode
- View mode preference persists

### Scenario 6: Responsive Design

**Steps**:
1. Open application on desktop (1920x1080)
2. Verify desktop layout (all controls in navbar)
3. Resize browser to mobile size (375x667)
4. Verify mobile layout (hamburger menu, stacked controls)
5. Test on actual mobile device (if available)

**Expected Results**:
- Layout adapts to screen size
- All functionality accessible on mobile
- Touch targets are appropriately sized
- No horizontal scrolling

### Scenario 7: Error Handling

**Steps**:
1. Stop backend server
2. Try to load sets
3. Verify error message is shown
4. Try to generate PDF
5. Verify error message is shown

**Expected Results**:
- User-friendly error messages
- Application doesn't crash
- Errors are logged for debugging

### Scenario 8: State Persistence

**Steps**:
1. Select several sets
2. Choose a template
3. Set quantities
4. Reload page
5. Verify selections are restored
6. Verify template is restored
7. Verify theme is restored

**Expected Results**:
- All state persists across reloads
- State is restored accurately
- No data loss

## Production Deployment

### Vercel Deployment

1. **Connect repository to Vercel**:
   - Go to Vercel dashboard
   - Import GitHub repository
   - Select `frontend` directory as root

2. **Configure environment variables**:
   - `VITE_API_BASE_URL`: Production backend URL
   - Add any other required variables

3. **Configure build settings**:
   - Build command: `npm run build` (or `yarn build`, `pnpm build`)
   - Output directory: `dist` (Vite default)
   - Install command: `npm install` (or `yarn install`, `pnpm install`)

4. **Deploy**:
   - Push to main branch triggers automatic deployment
   - Or deploy manually from Vercel dashboard

### GitHub Actions (Automated)

1. **Verify workflow file** (`.github/workflows/frontend-deploy.yml`):
   - Builds React application
   - Runs tests
   - Deploys to Vercel

2. **Configure secrets** (GitHub repository settings):
   - `VERCEL_TOKEN`: Vercel API token
   - `VERCEL_ORG_ID`: Vercel organization ID
   - `VERCEL_PROJECT_ID`: Vercel project ID

3. **Trigger deployment**:
   - Push to main branch
   - Workflow runs automatically
   - Deployment status visible in GitHub Actions

## Troubleshooting

### CORS Errors

**Problem**: Browser shows CORS error when calling backend API

**Solution**:
1. Verify backend CORS is configured
2. Check `CORS_ORIGINS` includes frontend URL
3. Verify backend is running
4. Check browser console for specific error

### PDF Download Not Working

**Problem**: PDF generation completes but file doesn't download

**Solution**:
1. Check browser console for errors
2. Verify response is `application/pdf`
3. Check blob handling code
4. Verify download trigger code

### State Not Persisting

**Problem**: Selections/theme not saved after reload

**Solution**:
1. Check browser localStorage is enabled
2. Verify localStorage code is working
3. Check for errors in console
4. Verify data format is correct

### Build Fails

**Problem**: Vercel build fails

**Solution**:
1. Check build logs in Vercel dashboard
2. Verify all dependencies are in `package.json`
3. Check Node.js version compatibility
4. Verify build command is correct

## Next Steps

After completing quickstart scenarios:
1. Review implementation tasks in `tasks.md`
2. Begin implementation following TDD approach
3. Write tests first, then implement
4. Verify all scenarios pass before moving to next task

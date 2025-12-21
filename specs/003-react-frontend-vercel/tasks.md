# Tasks: React Frontend Rewrite & Vercel Deployment

**Input**: Design documents from `/specs/003-react-frontend-vercel/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are REQUIRED per constitution (Test-First Development). All tests must be written first and verified to fail before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, BACKEND)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths shown below follow the plan.md structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create React project structure in `frontend/` directory using Vite
- [x] T002 [P] Initialize TypeScript configuration in `frontend/tsconfig.json`
- [x] T003 [P] Configure ESLint in `frontend/.eslintrc.js`
- [x] T004 [P] Configure Prettier in `frontend/.prettierrc`
- [x] T005 [P] Setup Tailwind CSS configuration in `frontend/tailwind.config.js`
- [x] T006 [P] Create `frontend/.env.example` with `VITE_API_BASE_URL` variable
- [x] T007 [P] Install core dependencies: React, TypeScript, Vite, Tailwind CSS, Vitest, React Testing Library
- [x] T008 [P] Configure Vitest in `frontend/vitest.config.ts`
- [x] T009 [P] Create `frontend/public/` directory and copy favicon files from existing frontend
- [x] T010 [P] Create basic `frontend/vite.config.ts` with proper configuration

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend Refactoring (Must Complete First)

- [x] T011 [BACKEND] Add CORS middleware to `backend/src/api/routes.py` with environment variable support
- [x] T012 [BACKEND] Create GET `/api/card-types` endpoint in `backend/src/api/routes.py` (currently only in HTML route)
- [x] T013 [BACKEND] Remove GET "/" HTML template route from `backend/src/api/routes.py`
- [x] T014 [BACKEND] Remove Jinja2 template setup from `backend/src/api/routes.py`
- [x] T015 [BACKEND] Remove frontend directory copying from `backend/Dockerfile` (lines 39-42 and 64-66)
- [x] T016 [BACKEND] Update backend tests to verify HTML route is removed and API endpoints work
- [x] T017 [BACKEND] Add CORS_ORIGINS environment variable to backend configuration

### Frontend Foundation

- [x] T018 [P] Create TypeScript types in `frontend/src/types/index.ts` (MTGSet, CardType, LabelTemplate, SelectionState, ThemePreference)
- [x] T019 [P] Create API client service in `frontend/src/services/api.ts` with fetch wrapper
- [x] T020 [P] Create localStorage utility in `frontend/src/utils/localStorage.ts` with error handling
- [x] T021 [P] Create grouping utility in `frontend/src/utils/grouping.ts` for sets and card types
- [x] T022 [P] Create custom hook `frontend/src/hooks/useTheme.ts` for theme management
- [x] T023 [P] Create custom hook `frontend/src/hooks/useSets.ts` for fetching sets
- [x] T024 [P] Create custom hook `frontend/src/hooks/useSelection.ts` for selection state management
- [x] T025 [P] Create custom hook `frontend/src/hooks/useCardTypes.ts` for fetching card types
- [x] T026 [P] Create error handling utility in `frontend/src/utils/errorHandler.ts`
- [x] T027 [P] Create constants file `frontend/src/constants/templates.ts` with label template configurations

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View and Select MTG Sets (Priority: P1) 🎯 MVP

**Goal**: Users can browse available MTG sets, view them organized by set type, search for sets, and select sets for label generation.

**Independent Test**: Can be fully tested by loading the application, verifying sets are displayed in organized groups, searching for sets, and selecting/deselecting sets.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T028 [P] [US1] Unit test for `useSets` hook in `frontend/src/hooks/__tests__/useSets.test.ts`
- [x] T029 [P] [US1] Unit test for `useSelection` hook in `frontend/src/hooks/__tests__/useSelection.test.ts`
- [x] T030 [P] [US1] Unit test for grouping utility in `frontend/src/utils/__tests__/grouping.test.ts`
- [x] T031 [P] [US1] Component test for SetList in `frontend/src/components/SetList/SetList.test.tsx`
- [x] T032 [P] [US1] Component test for SetItem in `frontend/src/components/SetItem/SetItem.test.tsx`
- [x] T033 [P] [US1] Component test for SearchBar in `frontend/src/components/SearchBar/SearchBar.test.tsx`
- [x] T034 [P] [US1] Integration test for set selection flow in `frontend/src/__tests__/integration/setSelection.test.tsx`

### Implementation for User Story 1

- [x] T035 [P] [US1] Create SetItem component in `frontend/src/components/SetItem/SetItem.tsx`
- [x] T036 [P] [US1] Create SetList component in `frontend/src/components/SetList/SetList.tsx`
- [x] T037 [P] [US1] Create SearchBar component in `frontend/src/components/SearchBar/SearchBar.tsx`
- [x] T038 [P] [US1] Create SelectionCounter component in `frontend/src/components/SelectionCounter/SelectionCounter.tsx`
- [x] T039 [US1] Create AccordionGroup component in `frontend/src/components/AccordionGroup/AccordionGroup.tsx` (depends on SetItem)
- [x] T040 [US1] Integrate SetList, SearchBar, and SelectionCounter in main App component `frontend/src/App.tsx` (depends on T035-T038)
- [x] T041 [US1] Implement "Select All" functionality in `frontend/src/components/SetList/SetList.tsx`
- [ ] T042 [US1] Implement "Select Group" functionality in `frontend/src/components/AccordionGroup/AccordionGroup.tsx`
- [x] T043 [US1] Implement search filtering logic in `frontend/src/components/SearchBar/SearchBar.tsx`
- [x] T044 [US1] Implement view mode toggle (Sets/Types) in `frontend/src/App.tsx`
- [x] T045 [US1] Add selection persistence to localStorage in `frontend/src/hooks/useSelection.ts`
- [x] T046 [US1] Add auto-expand groups with selected sets on page load

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Generate PDF Labels (Priority: P1)

**Goal**: Users can generate printable PDF files containing labels for their selected sets or card types with configurable options.

**Independent Test**: Can be fully tested by selecting sets, configuring options, clicking generate, and verifying a PDF file is downloaded.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T047 [P] [US2] Unit test for PDF generation API call in `frontend/src/services/__tests__/api.test.ts`
- [x] T048 [P] [US2] Component test for TemplateSelector in `frontend/src/components/TemplateSelector/TemplateSelector.test.tsx`
- [x] T049 [P] [US2] Component test for PDFGenerator button in `frontend/src/components/PDFGenerator/PDFGenerator.test.tsx`
- [x] T050 [P] [US2] Integration test for PDF generation flow in `frontend/src/__tests__/integration/pdfGeneration.test.tsx`

### Implementation for User Story 2

- [x] T051 [P] [US2] Create TemplateSelector component in `frontend/src/components/TemplateSelector/TemplateSelector.tsx`
- [x] T052 [P] [US2] Create PDFGenerator component in `frontend/src/components/PDFGenerator/PDFGenerator.tsx`
- [x] T053 [US2] Implement PDF generation API call in `frontend/src/services/api.ts` (depends on T019)
- [x] T054 [US2] Implement PDF download handling in `frontend/src/components/PDFGenerator/PDFGenerator.tsx` (depends on T052)
- [x] T055 [US2] Add loading state and spinner to PDFGenerator button
- [x] T056 [US2] Add validation for "at least one set selected" before PDF generation
- [x] T057 [US2] Add error handling and user-friendly error messages for PDF generation failures
- [x] T058 [US2] Implement quantity input for each set in SetItem component
- [x] T059 [US2] Implement placeholders input in PDFGenerator component
- [x] T060 [US2] Integrate TemplateSelector and PDFGenerator into main App component

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Responsive Design and Theme Support (Priority: P2)

**Goal**: Application works well on different screen sizes and supports light and dark themes with smooth transitions.

**Independent Test**: Can be fully tested by resizing the browser window, testing on mobile devices, and toggling between light and dark themes.

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T061 [P] [US3] Component test for ThemeToggle in `frontend/src/components/ThemeToggle/ThemeToggle.test.tsx`
- [x] T062 [P] [US3] Unit test for useTheme hook in `frontend/src/hooks/__tests__/useTheme.test.ts`
- [ ] T063 [P] [US3] Visual regression test for responsive layouts in `frontend/src/__tests__/visual/responsive.test.tsx`

### Implementation for User Story 3

- [x] T064 [P] [US3] Create ThemeToggle component in `frontend/src/components/ThemeToggle/ThemeToggle.tsx`
- [x] T065 [US3] Implement theme persistence in `frontend/src/hooks/useTheme.ts` (depends on T022)
- [x] T066 [US3] Add Tailwind dark mode configuration and theme classes throughout components
- [x] T067 [US3] Implement responsive navbar with hamburger menu for mobile in `frontend/src/App.tsx`
- [x] T068 [US3] Add responsive breakpoints and mobile-optimized layouts for all components
- [x] T069 [US3] Implement smooth theme transitions (CSS transitions)
- [x] T070 [US3] Add system theme detection on first visit in `frontend/src/hooks/useTheme.ts`
- [x] T071 [US3] Ensure all UI elements (buttons, inputs, cards, modals) adapt to both themes
- [x] T072 [US3] Test responsive design on actual mobile devices (320px+)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - Deploy to Vercel (Priority: P2)

**Goal**: Application is automatically deployed to Vercel when code changes are merged, with reliable deployment process.

**Independent Test**: Can be fully tested by pushing code changes, verifying deployment triggers automatically, and confirming the application is accessible at the Vercel URL.

### Tests for User Story 4 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T073 [P] [US4] Test build process in `frontend/` directory
- [ ] T074 [P] [US4] Test Vercel configuration in `frontend/vercel.json`

### Implementation for User Story 4

- [x] T075 [P] [US4] Create `frontend/vercel.json` with deployment configuration
- [x] T076 [US4] Update `.github/workflows/frontend-deploy.yml` for React/Vite build process
- [ ] T077 [US4] Configure Vercel environment variables (VITE_API_BASE_URL for production) - Manual step required
- [ ] T078 [US4] Test deployment to Vercel preview environment - Manual step required
- [ ] T079 [US4] Verify CORS configuration works with Vercel domain - Manual step required
- [ ] T080 [US4] Test automated deployment trigger on main branch merge - Manual step required
- [ ] T081 [US4] Add deployment status notifications (if needed) - Optional
- [x] T082 [US4] Document Vercel deployment process in README

**Checkpoint**: All user stories should now be independently functional and deployed

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T083 [P] Add error boundary component in `frontend/src/components/ErrorBoundary/ErrorBoundary.tsx`
- [x] T084 [P] Add loading states for all async operations (already implemented in components)
- [x] T085 [P] Implement accessibility improvements (ARIA labels, keyboard navigation, focus management) - Basic ARIA labels added
- [x] T086 [P] Add performance optimizations (React.memo, useMemo, useCallback where appropriate)
- [ ] T087 [P] Add code splitting and lazy loading for better initial load time - Optional optimization
- [ ] T088 [P] Add comprehensive error logging and monitoring - Basic console logging implemented
- [ ] T089 [P] Run all quickstart.md validation scenarios - Manual testing required
- [x] T090 [P] Update frontend README with setup and development instructions
- [ ] T091 [P] Add JSDoc/TSDoc comments to all public APIs and components - Partial (types documented)
- [ ] T092 [P] Verify all UX checklist items from `checklists/ux.md` - Manual validation required
- [ ] T093 [P] Code cleanup and refactoring based on code review feedback - Ongoing
- [ ] T094 [P] Performance testing and optimization (verify <2s load time, <50ms search) - Manual testing required
- [ ] T095 [P] Cross-browser testing (Chrome, Firefox, Safari, Edge) - Manual testing required
- [ ] T096 [P] Verify code coverage meets 80% threshold for core modules (constitution requirement) - Run `npm run test:coverage`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
  - Backend refactoring (T011-T017) must complete before frontend can test API calls
  - Frontend foundation (T018-T027) must complete before user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed) after foundational phase
  - Or sequentially in priority order (P1 → P2)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Depends on US1 for selection state
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Can work in parallel with US1/US2
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Should deploy after US1 and US2 are complete

### Within Each User Story

- Tests (TDD) MUST be written and FAIL before implementation
- Components before integration
- Core implementation before polish
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Backend refactoring (T011-T017) can run in parallel with frontend foundation setup
- Once Foundational phase completes, US1 and US3 can start in parallel
- All tests for a user story marked [P] can run in parallel
- Components within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members (after foundational)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for useSets hook in frontend/src/hooks/__tests__/useSets.test.ts"
Task: "Unit test for useSelection hook in frontend/src/hooks/__tests__/useSelection.test.ts"
Task: "Unit test for grouping utility in frontend/src/utils/__tests__/grouping.test.ts"
Task: "Component test for SetList in frontend/src/components/SetList/__tests__/SetList.test.tsx"
Task: "Component test for SetItem in frontend/src/components/SetItem/__tests__/SetItem.test.tsx"
Task: "Component test for SearchBar in frontend/src/components/SearchBar/__tests__/SearchBar.test.tsx"

# Launch all components for User Story 1 together:
Task: "Create SetItem component in frontend/src/components/SetItem/SetItem.tsx"
Task: "Create SetList component in frontend/src/components/SetList/SetList.tsx"
Task: "Create SearchBar component in frontend/src/components/SearchBar/SearchBar.tsx"
Task: "Create SelectionCounter component in frontend/src/components/SelectionCounter/SelectionCounter.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (View and Select Sets)
4. Complete Phase 4: User Story 2 (Generate PDF)
5. **STOP and VALIDATE**: Test both stories independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (View and Select)
   - Developer B: User Story 3 (Theme and Responsive) - can work in parallel
   - Developer C: Backend refactoring (if not done) or User Story 2 prep
3. After US1 complete:
   - Developer A: User Story 2 (PDF Generation)
   - Developer B: Continue User Story 3
   - Developer C: User Story 4 (Deployment)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- [BACKEND] label indicates backend refactoring tasks
- Each user story should be independently completable and testable
- **CRITICAL**: Write tests FIRST (TDD), ensure they FAIL before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Backend refactoring (T011-T017) must be completed early to unblock frontend API testing
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All tests must pass before moving to next phase
- Follow constitution requirements: TDD, performance targets, code quality standards

# Feature Specification: React Frontend Rewrite & Vercel Deployment

**Feature Branch**: `003-react-frontend-vercel`
**Created**: 2025-01-27
**Status**: Draft
**Input**: User description: "I split my project to backend and frontend. Now I want to rewrite my frontend using react and deploy to vercel."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Select MTG Sets (Priority: P1)

Users need to browse available Magic: The Gathering sets, view them organized by set type, search for specific sets, and select sets they want to generate labels for. Users can toggle between viewing sets organized by set type or viewing card types organized by color.

**Why this priority**: This is the core functionality - users must be able to see and select what they want to generate labels for. Without this, the application provides no value.

**Independent Test**: Can be fully tested by loading the application, verifying sets are displayed in organized groups, searching for sets, and selecting/deselecting sets. Delivers the ability to browse and select MTG sets for label generation.

**Acceptance Scenarios**:

1. **Given** a user opens the application, **When** the page loads, **Then** all available MTG sets are displayed organized by set type in collapsible groups
2. **Given** sets are displayed, **When** a user types in the search box, **Then** only matching sets are shown and groups without matches are hidden
3. **Given** sets are displayed, **When** a user clicks a set checkbox, **Then** the set is selected and the selection counter updates
4. **Given** sets are displayed, **When** a user clicks "Select All", **Then** all sets are selected
5. **Given** sets are displayed, **When** a user clicks "Select Group" for a specific group, **Then** all sets in that group are selected
6. **Given** the application is loaded, **When** a user switches between "Sets" and "Types" view modes, **Then** the appropriate data is displayed for each view mode

---

### User Story 2 - Generate PDF Labels (Priority: P1)

Users need to generate printable PDF files containing labels for their selected sets or card types. Users can configure label template, quantity per set, and number of empty labels at the start.

**Why this priority**: This is the primary value proposition - generating the PDF labels. Without this, users cannot accomplish their goal of organizing their MTG collection.

**Independent Test**: Can be fully tested by selecting sets, configuring options, clicking generate, and verifying a PDF file is downloaded. Delivers printable labels for selected MTG sets.

**Acceptance Scenarios**:

1. **Given** a user has selected at least one set, **When** they click the "Generate PDF" button, **Then** a PDF file is generated and downloaded
2. **Given** a user has not selected any sets, **When** they click "Generate PDF", **Then** an error message is shown asking them to select at least one set
3. **Given** sets are selected, **When** a user changes the label template dropdown, **Then** the selected template is saved and used for PDF generation
4. **Given** sets are selected with quantities, **When** PDF is generated, **Then** the PDF contains the correct number of labels matching the quantities specified
5. **Given** a user configures empty labels at start, **When** PDF is generated, **Then** the specified number of empty label positions appear at the beginning of the first page
6. **Given** PDF generation is in progress, **When** the request is processing, **Then** a loading indicator is shown and the button is disabled

---

### User Story 3 - Responsive Design and Theme Support (Priority: P2)

Users need the application to work well on different screen sizes (desktop, tablet, mobile) and support both light and dark themes. The interface should adapt to different viewport sizes while maintaining usability.

**Why this priority**: Users access the application from various devices. Responsive design ensures accessibility across devices, and theme support improves user experience and reduces eye strain.

**Independent Test**: Can be fully tested by resizing the browser window, testing on mobile devices, and toggling between light and dark themes. Delivers a usable interface across devices and preferences.

**Acceptance Scenarios**:

1. **Given** a user accesses the application on a mobile device, **When** the page loads, **Then** the interface is optimized for mobile with appropriate button placement and layout
2. **Given** a user accesses the application on desktop, **When** the page loads, **Then** the interface uses desktop-optimized layout with all controls visible in the navbar
3. **Given** the application is loaded, **When** a user clicks the theme toggle button, **Then** the interface switches between light and dark themes and the preference is saved
4. **Given** a user has selected a theme preference, **When** they return to the application, **Then** their theme preference is restored
5. **Given** the application is displayed, **When** a user resizes the browser window, **Then** the layout adapts appropriately without breaking functionality

---

### User Story 4 - Deploy to Vercel (Priority: P2)

The application must be automatically deployed to Vercel when code changes are merged, ensuring users always have access to the latest version. The deployment process must be reliable and provide feedback on deployment status.

**Why this priority**: Automated deployment ensures rapid delivery of updates and reduces manual errors. Vercel provides excellent performance and reliability for React applications.

**Independent Test**: Can be fully tested by pushing code changes, verifying deployment triggers automatically, and confirming the application is accessible at the Vercel URL. Delivers automated, reliable deployments to production.

**Acceptance Scenarios**:

1. **Given** code changes are merged to the main branch, **When** the merge completes, **Then** deployment to Vercel is automatically triggered
2. **Given** a deployment is triggered, **When** the build completes successfully, **Then** the application is deployed to Vercel and becomes accessible
3. **Given** a deployment fails, **When** the failure occurs, **Then** appropriate notifications are sent and the previous version remains available
4. **Given** the application is deployed, **When** users access the Vercel URL, **Then** they see the latest version of the application

---

### Edge Cases

- What happens when the backend API is unavailable or returns an error?
- How does the application handle network failures during PDF generation?
- What happens when a user selects a very large number of sets (performance)?
- How does the application handle invalid or corrupted data from the backend API?
- What happens when browser storage (localStorage) is disabled or full?
- How does the application handle rapid theme toggling or view mode switching?
- What happens when PDF generation takes longer than expected (timeout scenarios)?
- How does the application handle browser back/forward navigation with state?
- What happens when the backend API returns an unexpected response format?
- How does the backend handle requests to the old HTML template route after it's removed?

## Requirements *(mandatory)*

### Architectural Clarification

The backend and frontend MUST be completely decoupled. The backend will serve only API endpoints (JSON responses) and MUST NOT include any frontend files, templates, or dependencies. The React frontend will be deployed separately to Vercel and communicate with the backend via HTTP API calls. This separation ensures:
- Backend can be deployed independently without frontend dependencies
- Frontend can be updated and deployed independently
- Clear separation of concerns between API and UI layers
- Backend Dockerfile contains only backend code and dependencies

### Functional Requirements

- **FR-001**: Frontend MUST be built using React framework
- **FR-002**: Frontend MUST communicate with backend API via HTTP requests
- **FR-003**: Frontend MUST display MTG sets organized by set type in collapsible groups
- **FR-004**: Frontend MUST support searching and filtering sets by name
- **FR-005**: Frontend MUST allow users to select and deselect individual sets
- **FR-006**: Frontend MUST support "Select All" and "Select Group" functionality
- **FR-007**: Frontend MUST display a selection counter showing number of selected items and total labels
- **FR-008**: Frontend MUST support switching between "Sets" and "Types" view modes
- **FR-009**: Frontend MUST allow users to specify quantity for each selected set (1-100)
- **FR-010**: Frontend MUST provide a label template selection dropdown
- **FR-011**: Frontend MUST allow users to specify number of empty labels at the start (0 to labels per page - 1)
- **FR-012**: Frontend MUST generate PDF by sending POST request to backend `/generate-pdf` endpoint
- **FR-013**: Frontend MUST display loading state during PDF generation
- **FR-014**: Frontend MUST handle PDF download when generation completes
- **FR-015**: Frontend MUST display error messages when PDF generation fails
- **FR-016**: Frontend MUST validate that at least one set is selected before allowing PDF generation
- **FR-017**: Frontend MUST be responsive and work on desktop, tablet, and mobile devices
- **FR-018**: Frontend MUST support light and dark themes with theme toggle
- **FR-019**: Frontend MUST persist theme preference in browser storage
- **FR-020**: Frontend MUST persist selected sets in browser storage
- **FR-021**: Frontend MUST restore selected sets when page is reloaded
- **FR-022**: Frontend MUST expand groups containing selected sets on page load
- **FR-023**: Frontend MUST be deployed to Vercel
- **FR-024**: Frontend MUST have automated deployment via CI/CD when code is merged to main branch
- **FR-025**: Frontend MUST handle API errors gracefully with user-friendly error messages
- **FR-026**: Frontend MUST maintain all existing functionality from the current HTML/Bootstrap frontend (see `checklists/ux.md` for comprehensive feature parity validation)
- **FR-027**: Backend MUST be completely independent from frontend - no frontend files, templates, or dependencies in backend Dockerfile
- **FR-028**: Backend Dockerfile MUST NOT copy or reference frontend directory
- **FR-029**: Backend MUST remove HTML template serving route (GET "/") that renders frontend templates
- **FR-030**: Backend MUST only serve API endpoints (JSON responses) - no HTML template rendering

### Key Entities *(include if feature involves data)*

- **MTG Set**: Represents a Magic: The Gathering set with properties including id, name, code, set_type, icon_svg_uri, and other metadata
- **Card Type**: Represents a card type organized by color (e.g., "White:Creature") with color and type properties
- **Label Template**: Represents a label template configuration (e.g., "avery5160", "averyl7160") with dimensions and labels per page
- **Selection State**: Represents the current user selections including selected set IDs, quantities, template choice, and view mode
- **Theme Preference**: Represents user's theme choice (light or dark) stored in browser

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully generate PDF labels for selected sets with 100% success rate when backend is available
- **SC-002**: Application loads and displays sets within 2 seconds on standard broadband connection
- **SC-003**: Application works correctly on mobile devices (screen width 320px and above) with all functionality accessible
- **SC-004**: Theme switching completes instantly (under 100ms) without visual glitches
- **SC-005**: Search functionality filters sets in real-time (results appear as user types, under 50ms delay)
- **SC-006**: PDF generation request completes and downloads PDF within 15 seconds for typical workloads (30 sets or fewer)
- **SC-007**: Application maintains selected sets and theme preference across page reloads with 100% accuracy
- **SC-008**: Automated deployments to Vercel complete successfully within 5 minutes of code merge
- **SC-009**: Application handles backend API errors gracefully, displaying user-friendly messages without crashing
- **SC-010**: All existing functionality from HTML/Bootstrap frontend is preserved and works identically in React version
- **SC-011**: Backend Dockerfile builds successfully without frontend directory or dependencies
- **SC-012**: Backend serves only API endpoints - no HTML template routes remain

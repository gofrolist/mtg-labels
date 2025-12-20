# UX Checklist: React Frontend Rewrite & Vercel Deployment

**Purpose**: Validate UX requirements, user experience quality, and interface design for the React frontend rewrite
**Created**: 2025-01-27
**Feature**: [spec.md](../spec.md)

**Note**: This checklist validates UX requirements and implementation quality for the React frontend. Items should be checked off during development and testing phases.

## Responsive Design

- [ ] CHK001 - Application works correctly on mobile devices (screen width 320px and above) with all functionality accessible
- [ ] CHK002 - Application works correctly on tablet devices (screen width 768px and above) with optimized layout
- [ ] CHK003 - Application works correctly on desktop devices (screen width 1024px and above) with full feature set visible
- [ ] CHK004 - Layout adapts smoothly when browser window is resized without breaking functionality
- [ ] CHK005 - Mobile interface uses hamburger menu for navigation controls
- [ ] CHK006 - Desktop interface displays all controls in navbar without overflow
- [ ] CHK007 - Touch targets are appropriately sized (minimum 44x44px) for mobile devices
- [ ] CHK008 - No horizontal scrolling occurs on any screen size
- [ ] CHK009 - Text is readable without zooming on mobile devices (minimum 16px font size)
- [ ] CHK010 - Accordion groups expand/collapse smoothly on all devices

## Theme Support

- [ ] CHK011 - Light theme displays correctly with appropriate contrast ratios
- [ ] CHK012 - Dark theme displays correctly with appropriate contrast ratios
- [ ] CHK013 - Theme toggle button is visible and accessible in navbar
- [ ] CHK014 - Theme switching completes instantly (under 100ms) without visual glitches
- [ ] CHK015 - Theme preference persists in localStorage and is restored on page reload
- [ ] CHK016 - Theme respects system preference on first visit (if no saved preference)
- [ ] CHK017 - All UI elements (buttons, inputs, cards, modals) adapt correctly to both themes
- [ ] CHK018 - Set symbol icons are visible in both light and dark themes
- [ ] CHK019 - No flash of incorrect theme on page load (theme applied before render)

## Search and Filtering

- [ ] CHK020 - Search input is clearly visible and accessible in navbar
- [ ] CHK021 - Search filters sets in real-time (results appear as user types, under 50ms delay)
- [ ] CHK022 - Search feedback shows result count (e.g., "5 sets found")
- [ ] CHK023 - Search feedback shows "No sets found" message when no matches
- [ ] CHK024 - Clear search button appears when search has text
- [ ] CHK025 - Clearing search restores all sets and groups to default state
- [ ] CHK026 - Groups without matching sets are hidden during search
- [ ] CHK027 - Groups with matching sets are automatically expanded during search
- [ ] CHK028 - Search works correctly in both "Sets" and "Types" view modes
- [ ] CHK029 - Search is case-insensitive and matches set names and codes

## Set Selection Interface

- [ ] CHK030 - Sets are displayed organized by set type in collapsible accordion groups
- [ ] CHK031 - Set checkboxes are clearly visible and easy to click/tap
- [ ] CHK032 - Selected sets are visually indicated (checked checkbox)
- [ ] CHK033 - Selection counter displays correct count of selected items
- [ ] CHK034 - Selection counter shows total labels and page count
- [ ] CHK035 - Selection counter updates immediately when sets are selected/deselected
- [ ] CHK036 - "Select All" button selects all sets across all groups
- [ ] CHK037 - "Select All" button text changes to "Deselect All" when all are selected
- [ ] CHK038 - "Select Group" button selects all sets within a specific group
- [ ] CHK039 - "Select Group" button text changes to "Deselect Group" when all in group are selected
- [ ] CHK040 - Groups containing selected sets are automatically expanded on page load
- [ ] CHK041 - Set names are truncated with ellipsis if too long, with full name in tooltip
- [ ] CHK042 - Set symbols (icons) are displayed correctly next to set names
- [ ] CHK043 - Quantity input is visible and functional for each set (1-100 range)

## View Mode Switching

- [ ] CHK044 - View mode toggle buttons ("Sets" and "Types") are clearly visible
- [ ] CHK045 - Switching to "Types" view loads and displays card types organized by color
- [ ] CHK046 - Switching to "Sets" view loads and displays sets organized by set type
- [ ] CHK047 - View mode switch is smooth without page reload
- [ ] CHK048 - Selections are preserved separately for each view mode
- [ ] CHK049 - View mode preference persists in localStorage
- [ ] CHK050 - Active view mode is visually indicated (highlighted button)

## PDF Generation Workflow

- [ ] CHK051 - "Generate PDF" button is visible and accessible (desktop and mobile)
- [ ] CHK052 - Button shows loading spinner during PDF generation
- [ ] CHK053 - Button is disabled during PDF generation to prevent duplicate requests
- [ ] CHK054 - Error message is shown if no sets are selected when clicking "Generate PDF"
- [ ] CHK055 - Error message is user-friendly and actionable ("Please select at least one set")
- [ ] CHK056 - PDF downloads automatically when generation completes
- [ ] CHK057 - PDF filename is appropriate ("mtg_labels.pdf")
- [ ] CHK058 - Donate modal appears after successful PDF generation (if implemented)
- [ ] CHK059 - Template dropdown is visible and functional
- [ ] CHK060 - Selected template is clearly displayed in dropdown
- [ ] CHK061 - Placeholders input is visible and functional (0 to labels_per_page - 1)
- [ ] CHK062 - Placeholders input validates input range correctly

## Error Handling and Feedback

- [ ] CHK063 - Error messages are user-friendly and non-technical
- [ ] CHK064 - Error messages are displayed prominently (not hidden in console)
- [ ] CHK065 - Application doesn't crash when backend API is unavailable
- [ ] CHK066 - Loading states are shown for all async operations
- [ ] CHK067 - Network errors show appropriate message ("Unable to connect to server")
- [ ] CHK068 - API errors show appropriate message ("Failed to generate PDF. Please try again.")
- [ ] CHK069 - Timeout errors are handled gracefully with user feedback
- [ ] CHK070 - Error states don't break the UI layout

## State Persistence

- [ ] CHK071 - Selected sets persist in localStorage across page reloads
- [ ] CHK072 - Selected card types persist in localStorage across page reloads
- [ ] CHK073 - Template selection persists in localStorage across page reloads
- [ ] CHK074 - View mode persists in localStorage across page reloads
- [ ] CHK075 - Theme preference persists in localStorage across page reloads
- [ ] CHK076 - Application gracefully handles localStorage being disabled
- [ ] CHK077 - Application gracefully handles localStorage being full
- [ ] CHK078 - State is restored accurately (no data loss or corruption)

## Performance and Responsiveness

- [ ] CHK079 - Application loads and displays sets within 2 seconds on standard broadband
- [ ] CHK080 - Search filtering responds in real-time (under 50ms delay)
- [ ] CHK081 - Theme switching completes instantly (under 100ms)
- [ ] CHK082 - UI interactions (clicks, selections) respond immediately
- [ ] CHK083 - No lag or stuttering when selecting many sets
- [ ] CHK084 - Smooth scrolling on all devices
- [ ] CHK085 - No performance degradation with 300+ sets displayed

## Accessibility

- [ ] CHK086 - All interactive elements are keyboard accessible
- [ ] CHK087 - Focus indicators are visible for keyboard navigation
- [ ] CHK088 - Form inputs have proper labels
- [ ] CHK089 - Buttons have descriptive aria-labels
- [ ] CHK090 - Color contrast meets WCAG 2.1 AA standards
- [ ] CHK091 - Set symbols have alt text or aria-labels
- [ ] CHK092 - Error messages are announced to screen readers
- [ ] CHK093 - Loading states are announced to screen readers

## Browser Compatibility

- [ ] CHK094 - Application works in Chrome (latest 2 versions)
- [ ] CHK095 - Application works in Firefox (latest 2 versions)
- [ ] CHK096 - Application works in Safari (latest 2 versions)
- [ ] CHK097 - Application works in Edge (latest 2 versions)
- [ ] CHK098 - Application degrades gracefully in older browsers
- [ ] CHK099 - localStorage is checked before use (feature detection)

## Edge Cases and Error Scenarios

- [ ] CHK100 - Very long set names are handled (truncation with tooltip)
- [ ] CHK101 - Many selected sets (100+) are handled without performance issues
- [ ] CHK102 - Rapid clicking/selection doesn't cause UI issues
- [ ] CHK103 - Browser back/forward navigation preserves state correctly
- [ ] CHK104 - PDF generation timeout shows appropriate error message
- [ ] CHK105 - Empty search results show helpful message
- [ ] CHK106 - No sets available scenario is handled gracefully
- [ ] CHK107 - Slow network conditions don't break UI responsiveness
- [ ] CHK108 - localStorage quota exceeded is handled gracefully

## Visual Design and Polish

- [ ] CHK109 - Visual hierarchy is clear (important actions are prominent)
- [ ] CHK110 - Consistent spacing and alignment throughout interface
- [ ] CHK111 - Consistent button styles and sizes
- [ ] CHK112 - Consistent form input styles
- [ ] CHK113 - Hover states are visible and provide feedback
- [ ] CHK114 - Focus states are visible and clear
- [ ] CHK115 - Active states are visible and clear
- [ ] CHK116 - Transitions and animations are smooth and not jarring
- [ ] CHK117 - Loading spinners are appropriately sized and positioned

## User Flow Validation

- [ ] CHK118 - Primary flow (select sets → generate PDF) works end-to-end
- [ ] CHK119 - Alternate flow (search → filter → select → generate) works end-to-end
- [ ] CHK120 - View mode switch flow works smoothly
- [ ] CHK121 - Theme toggle flow works smoothly
- [ ] CHK122 - Error recovery flow (retry after error) works correctly
- [ ] CHK123 - State persistence flow (reload → restore) works correctly

## Notes

- Check items off as completed: `[x]`
- Add comments or findings inline
- Link to relevant test results or screenshots
- Items marked with specific success criteria from spec.md
- Performance targets: Load <2s, Search <50ms, Theme <100ms, PDF <15s
- All UX requirements from spec.md are covered in this checklist

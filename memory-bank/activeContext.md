# Active Context: ENG App

## Current Focus: API Integration Update & Layout Improvements

We've been working on enhancing the layout, navigation, mobile responsiveness, and updating our API integration for exercise data.

### Recent Changes

1. **API Integration Update**
   - Switched from wger.de/api to the HeyGainz API (https://svc.heygainz.com/api/exercises)
   - The HeyGainz API provides more comprehensive exercise data, including:
     - Detailed exercise information with instructions and tips
     - High-quality GIF animations
     - Muscle group categorization and filtering
     - Extensive search capabilities
   - Updated documentation and references across the project

2. **Footer Positioning**
   - Fixed footer placement in both AdminLayout and MainLayout
   - Restructured layout to ensure footer spans the full width below content
   - Implemented proper flex container hierarchy for consistent layout

3. **Sidebar Navigation**
   - Applied consistent styling between Admin and Main layouts
   - Improved mobile responsiveness with slide-in animation and backdrop
   - Enhanced visual hierarchy with proper spacing and organization
   - Added "Back to App" button in Admin sidebar for easy navigation to main app

4. **Mobile Responsiveness**
   - Improved athlete management list to avoid horizontal scrolling on mobile
   - Created card-based layout for mobile view of the athlete list
   - Implemented responsive detection with window resize listeners
   - Enhanced button styling for better touch interaction on mobile

### Active Decisions

1. **API Integration**
   - Using HeyGainz API for all exercise data
   - Implementing caching for offline functionality
   - Structuring exercise data models to match the API response format

2. **Layout Structure**
   - Using a flex column layout with content and footer as separate sections
   - Sidebar and content area wrapped in flex row container
   - Footer placed outside both sidebar and content for full-width display

3. **Navigation Pattern**
   - Consistent NavItem component across admin and main layouts
   - Mobile-first approach with responsive breakpoints
   - Clear visual hierarchy with active state indicators

4. **Mobile Design**
   - Table view on desktop, card view on mobile for data display
   - Touch-friendly button sizing and spacing
   - Conditional rendering based on screen size

### Next Steps

- Implement exercise data fetching and caching using the new HeyGainz API
- Consider implementing the same card-based mobile view for other data tables
- Review and improve responsive behavior of forms
- Enhance accessibility of navigation elements
- Consider adding loading skeleton states for better loading experience

## Active Decisions & Considerations

*   Sidebar navigation pattern with mobile responsiveness.
*   Component-based design system with reusable elements.
*   Light/dark mode implementation using Tailwind's dark mode class approach.
*   Theme preference persistence in Redux with localStorage fallback.
*   Consistent color scheme using Tailwind's indigo as primary color.
*   Clean, modern aesthetic with appropriate white space and card-based layouts.
*   Mobile-first approach enforcement.
*   Dark mode support throughout all components.
*   **Tailwind CSS v3.3.2**: Decided to use the stable version of Tailwind CSS instead of the experimental v4 to ensure compatibility and stability.
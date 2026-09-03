---
name: Academic Utility
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#59413d'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#8d706c'
  outline-variant: '#e1bfb9'
  surface-tint: '#b02d1f'
  primary: '#520000'
  on-primary: '#ffffff'
  primary-container: '#7b0000'
  on-primary-container: '#ff7d6a'
  inverse-primary: '#ffb4a8'
  secondary: '#7c5800'
  on-secondary: '#ffffff'
  secondary-container: '#feb700'
  on-secondary-container: '#6b4b00'
  tertiary: '#001278'
  on-tertiary: '#ffffff'
  tertiary-container: '#0020b1'
  on-tertiary-container: '#8f9cff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad4'
  primary-fixed-dim: '#ffb4a8'
  on-primary-fixed: '#410000'
  on-primary-fixed-variant: '#8e120a'
  secondary-fixed: '#ffdea8'
  secondary-fixed-dim: '#ffba20'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5e4200'
  tertiary-fixed: '#dfe0ff'
  tertiary-fixed-dim: '#bcc3ff'
  on-tertiary-fixed: '#000d60'
  on-tertiary-fixed-variant: '#1b32be'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
  status-success: '#0F9D58'
  status-warning: '#F4B400'
  status-danger: '#DB4437'
  interactive-blue: '#1A73E8'
  text-muted: '#9AA0A6'
  surface-border: '#E9ECEF'
typography:
  hero-eta:
    fontFamily: system-ui
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: system-ui
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: system-ui
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: system-ui
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: system-ui
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-bold:
    fontFamily: system-ui
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: system-ui
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  hero-eta-mobile:
    fontFamily: system-ui
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-margin: 16px
  gutter: 12px
  stack-sm: 4px
  stack-md: 16px
  stack-lg: 24px
  touch-target: 48px
---

## Brand & Style
The design system is built on a philosophy of **High-Utility Modernism**. It prioritizes immediate cognitive clarity over decorative elements, catering to students and staff navigating the UNILAG campus. The brand personality is professional, institutional, and dependable, reflecting its role in critical university infrastructure.

The visual style is **Corporate / Modern** with a strong emphasis on **Information Density Control**. It utilizes a "Mobile-First, Answer-First" hierarchy, where the most vital data points (ETA and bus status) are isolated from the secondary map interface. The interface uses high-contrast surfaces and generous touch targets (min 48px) to ensure accessibility in bright outdoor conditions and for users on the move.

## Colors
The palette leverages the traditional UNILAG Maroon and Gold while grounding them in a modern, neutral-heavy environment to prevent visual fatigue. 

- **Primary Maroon (#7B0000):** Reserved for high-level branding, primary action buttons, and critical headers.
- **Secondary Gold (#FFB800):** Used sparingly as an accent color or for institutional affiliation markers.
- **Status Colors:** These are the functional workhorses of the system. **Green (#0F9D58)** represents available/low-wait states, **Orange (#F4B400)** signals moderate congestion or delays, and **Red (#DB4437)** indicates a packed/critical wait time.
- **Neutrals:** A range of cool grays and off-whites provide a clean backdrop that makes the chromatic status indicators "pop."

## Typography
The system uses a **System-UI font stack** (San Francisco on iOS, Roboto on Android) to ensure zero-latency font loading and maximum legibility. 

- **Hierarchy:** The largest weight is dedicated to the "Answer"—the ETA. This is the first thing a user sees.
- **Legibility:** Body text is set at 16px minimum for accessibility. 
- **Labels:** Small, bold labels are used for secondary metadata (e.g., "Updated 2 min ago") to provide context without cluttering the primary view.

## Layout & Spacing
This design system follows a **Fixed-Width Mobile-Optimized Grid** (max-width 480px for core content) that scales to tablets. 

- **Mobile First:** The layout uses a 16px side margin. Elements are stacked vertically to favor one-thumb operation.
- **The Answer-First Hero:** The top 30-40% of the viewport is a dedicated "Decision Card" that remains visible or pinned.
- **Rhythm:** An 8px base unit drives all padding and margins, ensuring a consistent vertical rhythm. Large gaps (24px+) are used to separate the functional tracking data from the secondary map interface.

## Elevation & Depth
Depth is used functionally to communicate the hierarchy of information layers.

- **Surface Tiers:** The background is a light neutral (#F8F9FA). Primary "Answer" cards use a pure white surface with a subtle 1px border (#E9ECEF) and a soft, low-blur shadow to appear elevated above the map.
- **Tonal Layering:** Interactive elements, such as buttons or chips, use solid fills. Secondary information resides on slightly darker gray surfaces (#F1F3F4) to recede visually.
- **Interactive States:** On-tap states should use a subtle darkening of the background color rather than complex elevation changes to maintain the "Utility" feel.

## Shapes
The shape language is **Rounded**, strike a balance between friendly campus vibes and institutional structure.

- **Standard Elements:** 8px (0.5rem) radius for cards and input fields.
- **Large Elements:** 16px (1rem) for the main Hero Answer Card to distinguish it as the primary container.
- **Interactive Elements:** Buttons utilize the 8px radius, while status chips (like "Low Queue") use a full pill-shape (999px) for quick visual categorization.

## Components

- **Hero Answer Card:** A high-contrast white card at the top of the Student View. It must contain the ETA in `hero-eta` size and use status color accents for the "Queue" state.
- **Giant Action Buttons (Dispatcher/Driver):** Full-width buttons with a minimum height of 64px. These use high-saturation status colors (Green/Orange/Red) to minimize input errors in high-stress environments.
- **Status Chips:** Small, pill-shaped indicators used on the map or in lists. They must include both a color and a text label (e.g., "🟠 Moderate") for color-blind accessibility.
- **Map Markers:** The shuttle marker is a Maroon circular icon with a white bus glyph. When the state is 'Stale' or 'Disconnected', the marker opacity drops to 50%.
- **Walking Suggestion:** Displayed as a text-only banner or a small card below the ETA if walking time is faster. It uses `interactive-blue` to suggest an alternative action.
- **Lists:** Clean, border-bottom separated rows for stop lists, using 16px padding to ensure easy tapping.
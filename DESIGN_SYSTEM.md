# Design System Specification

## 1. Overview
This document outlines the design system for the Whois Query Tool, ensuring a consistent, modern, and accessible user interface.

## 2. Color System
We use the OKLCH color space for perceptually uniform colors and better gamut support.

### Primary Palette
- **Primary (Indigo)**: `oklch(0.55 0.22 260)`
  - Used for primary actions, active states, and brand identity.
- **Secondary (Teal)**: `oklch(0.7 0.15 180)`
  - Used for secondary actions, accents, and success states.
- **Accent (Purple/Pink)**: `oklch(0.65 0.2 310)`
  - Used for highlights and gradients.

### Functional Colors
- **Background**: `oklch(0.985 0.002 240)` (Light) / `oklch(0.12 0.01 240)` (Dark)
- **Foreground**: `oklch(0.15 0.01 240)` (Light) / `oklch(0.98 0.002 240)` (Dark)
- **Muted**: `oklch(0.96 0.005 240)` (Light) / `oklch(0.2 0.02 240)` (Dark)
- **Destructive**: `oklch(0.6 0.18 25)` (Red)

## 3. Typography
- **Font Family**: Inter (sans-serif), Geist Mono (monospace).
- **Scale** (4:3:2 Ratio approx):
  - **Heading 1**: 2.25rem (36px) - 3.75rem (60px)
  - **Heading 2**: 1.5rem (24px)
  - **Body**: 1rem (16px)
  - **Small**: 0.875rem (14px)
  - **Tiny**: 0.75rem (12px)

## 4. Spacing & Layout
- **Grid System**: 8px baseline grid.
- **Radius**:
  - Small: 0.375rem (6px)
  - Medium: 0.5rem (8px)
  - Large: 0.75rem (12px)
  - Round: 9999px
- **Breakpoints**:
  - Mobile: < 768px
  - Tablet: 768px - 1024px
  - Desktop: > 1024px

## 5. Components

### Buttons
- **Variants**: Default (Primary), Secondary, Outline, Ghost, Destructive.
- **Sizes**: Sm (32px), Default (40px), Lg (48px).
- **Interaction**: Scale effect on active (0.98), shadow on hover.

### Cards
- **Style**: Clean border or shadow based on context.
- **Glass Effect**: Used for main containers (`bg-card/50 backdrop-blur`).

### Inputs
- **Style**: Minimal border, focus ring matches primary color.
- **Validation**: Real-time feedback with icons (Check/Alert).

## 6. Animation
- **Duration**: 200-300ms for interactions.
- **Easing**: Ease-out.
- **Keyframes**:
  - `fade-in`: Opacity 0 -> 1
  - `slide-up`: TranslateY 10px -> 0
  - `scale-in`: Scale 0.95 -> 1

## 7. Accessibility
- **Contrast**: All text meets WCAG AA standards.
- **Focus**: Visible focus rings for keyboard navigation.
- **Labels**: Aria-labels and proper HTML semantics used throughout.

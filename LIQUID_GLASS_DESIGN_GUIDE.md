# FaceGlow Liquid Glass Design System - Implementation Guide

## Overview
The FaceGlow app has been redesigned with a **liquid glass aesthetic** featuring aurora backdrops, glassmorphism effects, and a warm coral-peach color palette. This guide explains how to apply the design system across the app.

## Design System Features

### 1. Color Tokens (CSS Variables)
All colors use OKLch color space via CSS variables defined in `src/index.css`:

```css
/* Brand colors */
--fg-coral: 30 47% 72%;        /* Primary accent */
--fg-peach: 336 46% 87%;       /* Light accent */
--fg-lavender: 332 52% 76%;    /* Secondary accent */
--fg-warm: 338 62% 70%;        /* Warm tone */

/* Neutrals - warm, very low chroma */
--fg-ink: oklch(0.18 0.02 320);     /* Dark text */
--fg-ink-2: oklch(0.32 0.015 320);  /* Medium text */
--fg-ink-3: oklch(0.5 0.012 320);   /* Light text */
--fg-paper: oklch(0.985 0.005 80);  /* Background */

/* Liquid Glass Surfaces */
--glass-bg-strong: rgba(255, 255, 255, 0.62);
--glass-bg: rgba(255, 255, 255, 0.45);
--glass-bg-soft: rgba(255, 255, 255, 0.28);
--glass-border: rgba(255, 255, 255, 0.7);

/* Gradients */
--grad-aurora: radial-gradient(...);  /* Aurora backdrop */
--grad-coral: linear-gradient(...);   /* Coral gradient */
--grad-orb: radial-gradient(...);     /* Score orb gradient */
```

### 2. Core Components

#### Aurora Backdrop
Creates the dreamy background with animated gradient blobs:

```tsx
import { AuroraBackdrop } from "@/components/shared";

<div className="relative w-full min-h-screen overflow-hidden">
  <AuroraBackdrop tone="warm" />
  {/* Page content */}
</div>
```

**Props:**
- `tone`: "warm" | "cool" (default: "warm")
- `className`: Additional CSS classes

#### Score Orb
Circular score/health display:

```tsx
import { FGScoreOrb } from "@/components/shared";

// Full size (dashboard)
<FGScoreOrb score={87} size={320} label="Saúde da pele" />

// Compact (card inline)
<FGScoreOrb score={87} size={120} variant="compact" />
```

**Props:**
- `score`: Number 0-100 (default: 84)
- `size`: Display size in pixels (default: 320)
- `label`: Label text (default: "Saúde da pele")
- `variant`: "default" | "compact"

#### Metric Bar
Progress bar with label and value:

```tsx
import { FGMetricBar } from "@/components/shared";

<FGMetricBar label="Hidratação" value={75} max={100} accent="#ef8fb8" />
```

**Props:**
- `label`: Metric name
- `value`: Current value
- `max`: Maximum value (default: 100)
- `accent`: Color (default: "#ef8fb8")

#### Gradient Text
Text with coral gradient:

```tsx
import { FGGradientText } from "@/components/shared";

<h1>
  Sua pele, <FGGradientText>compreendida</FGGradientText> em 30s
</h1>
```

**Props:**
- `animate`: Boolean - animate the gradient (default: false)

#### Orb Mark
Tiny brand logo sphere:

```tsx
import { FGOrbMark } from "@/components/shared";

<div className="flex items-center gap-2">
  <FGOrbMark size={32} />
  <span className="font-bold">Face·Glow</span>
</div>
```

### 3. Glass Surface Utilities (Tailwind Classes)

Apply liquid glass effects using Tailwind utilities:

```tsx
/* Glass surfaces with varying opacity */
<div className="lg-surface p-4 rounded-2xl">
  {/* Moderate glass effect - blur 24px, 65% opacity */}
</div>

<div className="lg-surface-strong p-6 rounded-3xl">
  {/* Strong glass effect - blur 40px, 85% opacity */}
</div>

<div className="glass p-4 rounded-xl">
  {/* Basic glass - blur 20px, 45% opacity */}
</div>

/* Soft glass for subtle backgrounds */
<div className="glass-soft p-3 rounded-lg">
  {/* Subtle glass effect - blur 10px, 28% opacity */}
</div>
```

### 4. Button Styles

```tsx
/* Coral gradient button - Primary CTA */
<button className="coral-button px-6 py-3 rounded-xl">
  Começar análise grátis
</button>

/* Glass button - Secondary action */
<button className="liquiglass-button px-6 py-3 rounded-xl">
  Já tenho conta
</button>
```

### 5. Background Gradient

Use the aurora gradient for full-page backgrounds:

```tsx
<div className="w-full min-h-screen" style={{ background: "var(--grad-aurora)" }}>
  {/* Page content */}
</div>
```

## Implementation Pattern

### Full Page Template

```tsx
import { AuroraBackdrop, FGScoreOrb, FGGradientText } from "@/components/shared";

export default function ExamplePage() {
  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      {/* Aurora backdrop */}
      <AuroraBackdrop tone="warm" />

      {/* Page content with relative positioning */}
      <div className="relative z-10 px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Your Title with <FGGradientText>Emphasis</FGGradientText>
          </h1>
          <p className="text-[var(--fg-ink-3)]">Subtitle text</p>
        </div>

        {/* Score card section */}
        <div className="lg-surface-strong p-6 rounded-3xl mb-6">
          <div className="flex items-center gap-4">
            <FGScoreOrb score={87} size={120} variant="compact" />
            <div className="flex-1">
              <div className="text-sm text-[var(--fg-ink-3)] font-medium">SCORE HOJE</div>
              <div className="text-3xl font-bold">87</div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button className="coral-button flex-1 py-3 rounded-xl">
            Primary Action
          </button>
          <button className="liquiglass-button flex-1 py-3 rounded-xl">
            Secondary
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Tailwind Classes Reference

```
/* Glass surfaces */
lg-surface              /* 65% opacity, 24px blur, strong border */
lg-surface-strong       /* 85% opacity, 40px blur, strong shadow */
glass                   /* 45% opacity, 20px blur */
glass-soft              /* 28% opacity, 10px blur */

/* Buttons */
coral-button            /* Gradient background, white text */
liquiglass-button       /* Glass effect, light text */

/* Effects */
shadow-glow             /* Coral-tinted shadow */
shadow-soft             /* Subtle shadow */
gradient-bg             /* Full aurora gradient background */
fg-gradient-text        /* Coral gradient text */
fg-mono                 /* Monospace font (JetBrains Mono) */

/* Border radius */
rounded-xl              /* 1.25rem */
rounded-2xl             /* 1.5rem */
rounded-3xl             /* 1.75rem */
rounded-4xl             /* 2.5rem */
```

## Color Reference

```tsx
/* Using text colors */
<div className="text-[var(--fg-ink)]">Dark text</div>
<div className="text-[var(--fg-ink-2)]">Medium text</div>
<div className="text-[var(--fg-ink-3)]">Light text</div>

/* Using gradients */
<div className="bg-gradient-to-r" style={{ backgroundImage: "var(--grad-coral)" }}>
  Coral gradient background
</div>

/* Using specific colors */
<button className="bg-[#ef8fb8] text-white">Coral button</button>
```

## Key Design Principles

1. **Glassmorphism**: Use semi-transparent backgrounds with blur effects
2. **Aurora**: Soft radial gradients create depth and warmth
3. **Hierarchy**: Use stronger glass effects for primary content
4. **Spacing**: Generous padding within glass surfaces
5. **Shadows**: Subtle shadows enhance glass depth
6. **Gradients**: Coral gradients for emphasis and CTAs
7. **Typography**: Plus Jakarta Sans for all text, JetBrains Mono for data

## Responsive Design

Glass surfaces adapt to screen sizes:
- Mobile: Smaller padding, tighter spacing
- Tablet: Balanced spacing and sizing
- Desktop: Generous spacing, larger components

```tsx
/* Example responsive pattern */
<div className="lg-surface p-4 md:p-6 rounded-2xl">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {/* Responsive grid content */}
  </div>
</div>
```

## Browser Support

The liquid glass design uses modern CSS features:
- `backdrop-filter` (with `-webkit-` prefix for Safari)
- `oklch()` color space
- `radial-gradient` and `conic-gradient`

All modern browsers are fully supported. For older browsers, the design gracefully degrades with solid backgrounds.

## Performance Tips

1. Use `transform: translateZ(0)` for glass surfaces on mobile to enable GPU acceleration
2. Minimize the number of blur effects on a single screen
3. Use `will-change: transform` sparingly, only on interactive elements
4. Consider using `@supports` for feature detection

```tsx
/* GPU acceleration for glass surfaces */
<div className="lg-surface" style={{ transform: "translateZ(0)" }}>
  Content
</div>
```

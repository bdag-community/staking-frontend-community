

# Plan: Improve Hero Background Image Visibility

## Problem Analysis

The current hero section has two issues:
1. **Background image is too obscured** - The image has `opacity-60` plus two heavy gradient overlays that make it hard to see
2. **Text in the background image conflicts with UI** - The hero-bg.jpg contains baked-in text ("Web3 Staking Platform", etc.) that shows behind the hero content, creating visual confusion

## Solution

### Approach 1: Restructure Hero Layout (Recommended)

Instead of using the image as a full-bleed background that overlaps with text, restructure the hero into two sections:
- **Top section**: Hero content (title, stats, CTAs) with a subtle dark background
- **Bottom section**: The background image displayed clearly below the content

This keeps the beautiful crypto artwork visible while avoiding text-on-text conflicts.

### Changes to `src/components/dashboard/HeroSection.tsx`

```text
BEFORE (current layout):
+------------------------------------------+
|  [Background Image with baked-in text]   |
|    +--------------------------------+    |
|    | Hero Title (overlapping image)|    |
|    | Stats badges                   |    |
|    | CTA buttons                    |    |
|    +--------------------------------+    |
+------------------------------------------+

AFTER (new layout):
+------------------------------------------+
|    +--------------------------------+    |
|    | Hero Title (dark bg)           |    |  <- Content area
|    | Stats badges                   |    |
|    | CTA buttons                    |    |
|    +--------------------------------+    |
+------------------------------------------+
|  [Background Image displayed clearly]    |  <- Image area below
|  (full visibility, no text overlap)      |
+------------------------------------------+
```

### Implementation Details

1. **Remove the absolute-positioned background image** from behind the content

2. **Add a new section below the hero content** that displays the background image at higher opacity (80-90%) with only a subtle bottom gradient to blend into the next section

3. **Adjust image CSS**:
   - Increase opacity from `opacity-60` to `opacity-80` or `opacity-90`
   - Reduce gradient overlay intensity
   - Set a max-height to control how much of the image is shown
   - Use `object-position: center` to focus on the crystal/wave artwork

4. **Maintain visual continuity** with a subtle gradient that blends the image into the dark background below

### Technical Changes

**File: `src/components/dashboard/HeroSection.tsx`**
- Restructure JSX to separate content from background image
- Move `<img>` element to a dedicated section below the content
- Adjust Tailwind classes for opacity and gradient overlays


# SpedizioneFacile - Design System

## Overview
Questo documento definisce il design system di SpedizioneFacile per garantire coerenza visiva e UX su tutto il sito.

---

## 🎨 Color Palette

### Brand Colors
```css
--color-brand-primary: #095866        /* Teal principale */
--color-brand-primary-hover: #074a56  /* Teal hover */
--color-brand-primary-light: #0b6d7d /* Teal chiaro */
--color-brand-accent: #E44203         /* Arancione CTA */
--color-brand-accent-hover: #c93800   /* Arancione hover */
```

### Semantic Colors
```css
--color-brand-success: #0a8a7a        /* Verde successo (NOT #10b981) */
--color-brand-warning: #f59e0b        /* Giallo warning */
--color-brand-error: #ef4444          /* Rosso errore */
```

### Text Colors
```css
--color-brand-text: #252B42           /* Testo principale */
--color-brand-text-secondary: #737373 /* Testo secondario */
```

### UI Colors
```css
--color-brand-bg: #eeeeee             /* Background pagina */
--color-brand-card: #ffffff           /* Background card */
--color-brand-border: #E9EBEC         /* Bordi */
```

---

## 📏 Typography

### Font Family
- **Primary**: Inter (body text, UI)
- **Secondary**: Montserrat (headings speciali)

### Scale (rem units)
```css
/* Base */
font-size: 1rem;        /* 16px - body text */

/* Sizes */
font-size: 0.75rem;     /* 12px - small text, badges */
font-size: 0.8125rem;   /* 13px - labels */
font-size: 0.875rem;    /* 14px - secondary text */
font-size: 1rem;        /* 16px - body */
font-size: 1.125rem;    /* 18px - large body */
font-size: 1.25rem;     /* 20px - section titles */
font-size: 1.5rem;      /* 24px - page titles mobile */
font-size: 2rem;        /* 32px - page titles desktop */
font-size: 2.5rem;      /* 40px - hero titles */
```

### Utility Classes
```css
.page-title       /* 1.5rem mobile, 2rem desktop, font-bold */
.section-title    /* 1.25rem, font-semibold */
.card-title       /* 1.125rem, font-semibold */
.body-text        /* 0.875rem, color-text-secondary */
```

---

## 📐 Spacing Scale

Usa multipli di 4px per coerenza:
```
8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px
```

### Tailwind Classes
```css
gap-[8px]   /* Spacing minimo tra elementi inline */
gap-[12px]  /* Spacing tra icone/badge */
gap-[16px]  /* Spacing standard tra elementi */
gap-[20px]  /* Spacing tra sezioni piccole */
gap-[24px]  /* Spacing tra card */
gap-[32px]  /* Spacing tra sezioni */
gap-[40px]  /* Spacing tra sezioni grandi */
gap-[48px]  /* Spacing tra blocchi */
gap-[64px]  /* Spacing tra macro-sezioni */
```

---

## 🔘 Border Radius

### Standard Values
```css
/* Inputs */
border-radius: 8px;   /* rounded-[8px] */

/* Buttons */
border-radius: 12px;  /* rounded-[12px] */

/* Cards */
border-radius: 16px;  /* rounded-[16px] */

/* Modals */
border-radius: 20px;  /* rounded-[20px] */

/* Pills/Tags */
border-radius: 24px;  /* rounded-[24px] o rounded-full */

/* Circles */
border-radius: 50%;   /* rounded-full */
```

---

## 🌑 Box Shadow

### Three Levels
```css
/* Small - subtle elevation */
box-shadow: 0 2px 8px rgba(0,0,0,0.08);
/* Utility: shadow-sm */

/* Medium - standard cards */
box-shadow: 0 4px 16px rgba(0,0,0,0.12);
/* Utility: shadow-md */

/* Large - modals, popovers */
box-shadow: 0 8px 32px rgba(0,0,0,0.16);
/* Utility: shadow-lg */
```

### Hover Effects
```css
/* Card hover */
.card-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* Button hover */
.btn-hover:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

---

## ⚡ Transitions

### Speed
```css
/* Fast - micro-interactions */
transition: 150ms ease;

/* Standard - buttons, links, colors */
transition: 200ms ease;

/* Slow - complex animations */
transition: 300ms ease;
```

### Properties
```css
/* ✅ GOOD - specific properties */
transition: color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;

/* ❌ BAD - avoid "all" (performance issues) */
transition: all 0.2s ease;
```

---

## 🎯 Layout

### Container
```css
.my-container {
  max-width: 1280px;  /* UNIFIED across all pages */
  margin: 0 auto;
  padding: 0 20px;
}

/* Tablet */
@media (min-width: 720px) {
  padding: 0 40px;
}

/* Desktop */
@media (min-width: 1024px) {
  padding: 0 40px;
  max-width: 1280px;  /* NO reduction to 1000px */
}

/* Desktop XL */
@media (min-width: 1440px) {
  padding: 0 20px;
  max-width: 1280px;
}
```

### Breakpoints
```css
--breakpoint-mobile: 375px
--breakpoint-tablet: 720px
--breakpoint-mid-desktop: 840px
--breakpoint-desktop: 1024px
--breakpoint-desktop-xl: 1440px
```

---

## 🔲 Components

### Buttons

#### Primary Button
```vue
<button class="btn-primary">
  Azione Principale
</button>
```
```css
.btn-primary {
  background: #095866;
  color: white;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  transition: background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}
.btn-primary:hover {
  background: #074a56;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: scale(1.02);
}
```

#### CTA Button (Orange)
```vue
<button class="btn-cta">
  Call to Action
</button>
```
```css
.btn-cta {
  background: #E44203;
  color: white;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
}
.btn-cta:hover {
  background: #c93800;
  box-shadow: 0 4px 12px rgba(228, 66, 3, 0.3);
}
```

#### Secondary Button
```vue
<button class="btn-secondary">
  Azione Secondaria
</button>
```
```css
.btn-secondary {
  background: transparent;
  color: #095866;
  border: 1px solid #095866;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
}
.btn-secondary:hover {
  background: #095866;
  color: white;
}
```

### Cards
```vue
<div class="card-base">
  <!-- Content -->
</div>
```
```css
.card-base {
  background: white;
  border: 1px solid #E9EBEC;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
```

### Form Inputs
```vue
<input class="form-input" type="text" placeholder="Inserisci testo">
```
```css
.form-input {
  width: 100%;
  background: #F8F9FB;
  border: 1px solid #E9EBEC;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 0.875rem;
  color: #252B42;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.form-input:focus {
  border-color: #095866;
  box-shadow: 0 0 0 3px rgba(9, 88, 102, 0.1);
  background: white;
  outline: none;
}
```

### Badges
```vue
<span class="badge badge-success">Completato</span>
<span class="badge badge-pending">In attesa</span>
<span class="badge badge-error">Errore</span>
```
```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}
.badge-success { background: #dcfce7; color: #15803d; }
.badge-pending { background: #fef3c7; color: #a16207; }
.badge-error { background: #fee2e2; color: #b91c1c; }
```

---

## ✅ Best Practices

### DO ✅
- Use `.my-container` for all page layouts (1280px max-width)
- Use inline SVG for icons (NOT `<Icon>` component)
- Use rem units for typography
- Use specific transition properties (color, transform, etc.)
- Use semantic color variables from main.css
- Follow 8px spacing scale
- Use standard border-radius (8/12/16/20px)

### DON'T ❌
- Don't use custom max-width overrides (stick to 1280px)
- Don't use `<Icon>` component (missing @iconify-json/mdi)
- Don't use `transition: all` (performance issues)
- Don't use hardcoded colors (use CSS variables)
- Don't use arbitrary spacing values
- Don't use #10b981 for success (use #0a8a7a)

---

## 🔧 Maintenance

### Adding New Colors
1. Add to `assets/css/main.css` in `@theme` section
2. Document here in Color Palette
3. Update all relevant components

### Adding New Components
1. Follow existing patterns (btn-*, card-*, form-*)
2. Use design system values (colors, spacing, radius)
3. Add to this documentation
4. Test across all breakpoints

### Checking Consistency
```bash
# Find non-standard colors
grep -r "text-\[#" components/ | grep -v "#252B42\|#737373\|#095866"

# Find non-standard shadows
grep -r "shadow-\[" pages/ | grep -v "shadow-\[0_2px_8px\|shadow-\[0_4px_16px"

# Find custom max-width
grep -r "max-w-\[" pages/ | grep -E "(1400|900|1000)px"
```

---

## 📱 Responsive Design

### Mobile First
Start with mobile layout, then enhance for larger screens:
```vue
<div class="text-[1rem] tablet:text-[1.125rem] desktop:text-[1.25rem]">
  Responsive text
</div>
```

### Touch Targets
Minimum 44x44px for interactive elements:
```vue
<button class="min-w-[44px] min-h-[44px]">
  <!-- Icon -->
</button>
```

---

## 🎨 Accessibility

### Focus States
```css
:focus-visible {
  outline: 2px solid #095866;
  outline-offset: 2px;
}
```

### Color Contrast
- Text on white: minimum #252B42 (AAA)
- Text on primary: white (AAA)
- Links: #095866 with underline on hover

### ARIA Labels
```vue
<button aria-label="Chiudi menu" @click="closeMenu">
  <svg><!-- Icon --></svg>
</button>
```

---

**Last Updated**: 2026-03-03
**Maintained by**: Agent 7 (Global UI/UX & Design System Specialist)

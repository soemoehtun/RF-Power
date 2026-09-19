# DESIGN.md — RF Power Calculator & Unit Converter Design Specification

> Standardized UI/UX Design System Specification for the RF Power Calculator, establishing design tokens, typographic hierarchy, responsive breakpoints, layout grids, interaction patterns, and accessibility guidelines.

---

## 1. Design Philosophy & Principles

The RF Power Calculator is an engineering-grade scientific tool inspired by professional telecom tools (e.g., Antenna Tilt & Coverage visualizers, Cell-ID decoders, 3GPP network planning utilities).

1. **Precision First**: RF engineers require unmistakable unit clarity, zero rounding ambiguities, and immediate visual feedback.
2. **Watts as Source of Truth**: All internal representations flow through linear Watts (`W`) before projecting into milliwatts (`mW`), `dBm`, or `dBW`.
3. **Focused Two-Tab Flow**: Clean, segmented navigation separates the utility into:
   - **Calculator**: Direct input, real-time recalculation, result cards, copy actions, and Convert/Clear controls.
   - **Formulas**: Essential mathematical derivations and RF rules of thumb without additional tools or data tables.
4. **Distraction-Free Professional Aesthetic**: Crisp borders, minimal shadows, Slate-based neutral canvas with Electric Blue (`#2563eb`) and Indigo (`#4f46e5`) decibel accents.

---

## 2. Design Tokens (YAML Specification)

```yaml
design_tokens:
  color_palette:
    canvas_background: "#f8fafc"       # Slate-50
    card_background: "#ffffff"         # Pure White
    card_header_bg: "#f1f5f9"          # Slate-100
    card_border: "#e2e8f0"             # Slate-200
    divider: "#f1f5f9"                 # Slate-100
    
    text:
      primary: "#0f172a"               # Slate-900 (High contrast)
      secondary: "#334155"             # Slate-700
      muted: "#64748b"                 # Slate-500
      subtle: "#94a3b8"                # Slate-400

    brand_accent:
      primary: "#2563eb"               # Blue-600
      primary_hover: "#1d4ed8"         # Blue-700
      primary_light: "#eff6ff"         # Blue-50
      primary_ring: "rgba(37,99,235,0.25)"

    unit_ident:
      watts:
        badge_bg: "#f1f5f9"
        badge_text: "#334155"
        card_border: "#e2e8f0"
      milliwatts:
        badge_bg: "#f1f5f9"
        badge_text: "#334155"
        card_border: "#e2e8f0"
      dbm:
        badge_bg: "#dbeafe"            # Blue-100
        badge_text: "#1e40af"          # Blue-800
        card_border: "#93c5fd"         # Blue-300
        card_bg: "#eff6ff"             # Blue-50/60
      dbw:
        badge_bg: "#e0e7ff"            # Indigo-100
        badge_text: "#3730a3"          # Indigo-800
        card_border: "#a5b4fc"         # Indigo-300
        card_bg: "#eef2ff"             # Indigo-50/60

    status:
      error_bg: "#fef2f2"              # Red-50
      error_border: "#fecaca"          # Red-200
      error_text: "#b91c1c"            # Red-700
      success_bg: "#ecfdf5"            # Emerald-50
      success_text: "#047857"          # Emerald-700

  typography:
    font_family_sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    font_family_mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    weights:
      normal: 400
      medium: 500
      semibold: 600
      bold: 700
      extrabold: 800

  radii:
    card: "12px"
    button: "8px"
    chip: "6px"
    input: "8px"

  shadows:
    subtle: "0 1px 3px 0 rgba(0, 0, 0, 0.05)"
    elevated: "0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.05)"
```

---

## 3. Navigation & Tab Architecture

Inspired by clean telecom dashboards, the interface is organized into two focused workflow tabs:

| Tab ID | Tab Name | Purpose & Contents |
|---|---|---|
| `calculator` | **Calculator** | Single numerical power input, unit selector dropdown, real-time conversion cards (W, mW, dBm, dBW), copy buttons, and manual Convert/Clear controls. |
| `formulas` | **Formulas** | Mathematical equations, logarithmic rules of thumb (+3 dB, +10 dB), explanation of 0 dBm and 0 dBW references, and engineering scope distinction. |

---

## 4. Interaction Patterns & Validation Rules

### 4.1 Input Validation Matrix
- **Empty input**: Display `Please enter a power value.` Clear result outputs to `—`.
- **Non-numeric string**: Display `Please enter a valid numeric value.`
- **Watts $\le 0$**: Display `Power in Watts must be greater than 0.` (Logarithm of non-positive is undefined).
- **Milliwatts $\le 0$**: Display `Power in milliwatts must be greater than 0.`
- **dBm / dBW $\le 0$**: **Valid**. E.g., $-120\text{ dBm}$ (thermal noise floor), $-30\text{ dBW}$ ($1\text{ mW}$). Must never produce an error for negative decibel values.

### 4.2 Formatting Rules
- **dBm & dBW**: Up to 3 decimal places. Clean formatting for integers (e.g. `37 dBm` instead of `37.00000000`).
- **Watts & Milliwatts**: Up to 6 decimal places. Automatically shifts to scientific notation if magnitude is $< 10^{-7}$ or $\ge 10^8$ to prevent visual truncation.

---

## 5. Accessibility (a11y) & Responsiveness
- Semantic `<main>`, `<header>`, `<nav>`, and `<section>` elements.
- ARIA live region (`role="alert"`) for error communication.
- Full keyboard operability with logical Tab order and Enter to calculate.
- High-contrast text exceeding WCAG AA standards (minimum 4.5:1 ratio).

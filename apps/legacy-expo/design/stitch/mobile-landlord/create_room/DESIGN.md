---
name: Serene Nocturne
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#464555'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#795900'
  on-secondary: '#ffffff'
  secondary-container: '#ffc329'
  on-secondary-container: '#6f5100'
  tertiary: '#41485e'
  on-tertiary: '#ffffff'
  tertiary-container: '#586076'
  on-tertiary-container: '#d4dbf5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#ffdf9f'
  secondary-fixed-dim: '#f9bd22'
  on-secondary-fixed: '#261a00'
  on-secondary-fixed-variant: '#5c4300'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  title-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  title-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-base-medium:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm-medium:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  tabular-amount:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

This design system is engineered specifically for modern residential rental management in Vietnam, balancing the operational rigor demanded by property owners with the effortless clarity needed by tenants. The brand personality embodies simplicity, calm authority, modern efficiency, and deep trustworthiness.

Rooted in a Clean SaaS aesthetic optimized for native mobile ergonomics (iOS and Android), the interface avoids visual clutter in favor of structured card-based hierarchies, deliberate whitespace, and gentle nocturnal undertones. The experience delivers an immediate sense of financial precision and domestic stability, turning stressful tasks—such as utility billing, contract tracking, and incident escalation—into transparent, predictable actions.

### Design Movement
- **Clean Modern SaaS with Card-Driven Modularity:** Every unit of information (room cards, billing line items, maintenance tickets) lives in self-contained, elevated surfaces.
- **Atmospheric Accentuation:** Grounded primarily in functional light canvas backgrounds, punctuated by deep slate structural anchors (`#0F172A`) and warm lunar yellow accents (`#FBBF24`) that evoke a sense of home, safety, and nocturnal calm.

## Colors

The palette is engineered to support dense financial schedules, status checks, and multi-property views without eye fatigue. Color functions strictly as communication, not mere decoration.

### Functional Color Palette
- **Primary Indigo (`#4F46E5`):** Serves as the primary touch interaction point, brand signature, and active navigational focus. Hover/Pressed state: `#4338CA`. Subtle fill/surface tint: `#EEF2FF`.
- **Brand Accent / Moon Glow (`#FBBF24`):** Warm amber used deliberately for attention markers, premium tags, spotlight counters, and non-critical status highlights.
- **Deep Night (`#0F172A`):** Anchoring slate used for top app bar headers, high-emphasis modals, dark identity screens, and contrast balance.
- **Neutrals:**
  - `Gray 50` (`#F9FAFB`): Canvas base background.
  - `Gray 100` (`#F3F4F6`): Secondary surface, input base, inactive pill fill.
  - `Gray 200` (`#E5E7EB`): Structural hairpins, borders, card dividers.
  - `Gray 400` (`#9CA3AF`): Placeholder text, deactivated controls, secondary icons.
  - `Gray 600` (`#4B5563`): Supporting copy, meta-labels, timestamps.
  - `Gray 900` (`#111827`): High-contrast titles, primary text (contrast ratio exceeding 11:1 on white).

### Semantic & Status Tokens
All semantic tokens pair dark foreground pigment with high-tint backgrounds (10–15% opacity equivalents) to maintain readability without overwhelming card contents:
- **Success (`#16A34A` / Surface `#DCFCE7`):** Completed rents, fully collected payments, active leases.
- **Warning (`#D97706` / Surface `#FEF3C7`):** Expiring contracts, partial rents collected, reserved rooms.
- **Danger (`#DC2626` / Surface `#FEE2E2`):** Overdue bills, critical maintenance alerts, lease breaches.
- **Info (`#2563EB` / Surface `#DBEAFE`):** Issued notices, processing steps, tenant check-ins.

## Typography

The type system uses `Inter` exclusively to achieve immaculate clarity across complex nested data layouts. 

### Localized Formatting & Tabular Rules
- **Vietnamese Diacritics:** Line heights are calibrated with ample vertical headroom (`1.4` to `1.5`) to prevent diacritical marks (e.g., dấu hỏi, dấu ngã, dấu nặng on capital letters like `Ẳ`, `Ệ`, `Ộ`) from clipping against borders or adjoining labels.
- **Tabular Numerals (`font-feature-settings: 'tnum'`):** All monetary figures, room numbers, meter readings (kWh / m³), and dates must enforce monospaced digits.
- **Currency Standard:** Render amounts strictly with Vietnamese dot grouping and space-separated currency symbol: `3.935.000 ₫`.
- **Date Standard:** Standard calendar display follows `dd/MM/yyyy` (e.g., `25/08/2025`).

## Layout & Spacing

The layout model is crafted for mobile-first handheld usage (screens ranging from 360px to 430px viewport widths), scaling into single-column centered card feeds on larger tablet viewports.

### Rhythm & Constraints
- **Vertical Grid Rhythm:** Enforces a rigid 4px base increment (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`).
- **Canvas Margins:** Screen edge inset is fixed to `16px` (`margin`), giving maximum horizontal real estate to data-dense room rosters while preventing accidental palm triggers.
- **Card Padding:** Standard cards use internal padding of `16px` (`space-lg`), while compact summary widgets use `12px` (`space-md`).
- **Touch Safe Zones:** All tap targets maintain a minimum dimension of `44px × 44px` with minimum inter-target spacing of `8px`.

## Elevation & Depth

Visual hierarchy relies on clean surface layering paired with ultra-diffused, ambient drop shadows rather than heavy structural borders.

### Elevation Levels
1. **Level 0 (Canvas Base):** `Gray 50` (`#F9FAFB`), flat, non-elevated ground.
2. **Level 1 (Cards, List Tiles, Form Panels):** Solid `#FFFFFF` fill supported by a 1px border of `Gray 200` (`#E5E7EB`) and an ambient shadow:
   `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)`.
3. **Level 2 (Dropdowns, Floating Badges, Sticky Bottom Navs):** `#FFFFFF` fill with elevated depth:
   `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
4. **Level 3 (Action Sheets, Quick Pay Drawers, Modal Dialogs):** `#FFFFFF` fill on top of backdrop dimming (`rgba(15, 23, 42, 0.40)`):
   `box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08)`.

## Shapes

The interface embraces a balanced curvature model that conveys both approachability and structural precision.

### Geometric Scale
- **Controls & Form Elements (8px / `rounded-md`):** Buttons, text inputs, search fields, date pickers, and stepper buttons.
- **Containers & Surfaces (12px / `rounded-lg`):** Room cards, invoice breakdowns, metric widgets, bottom modal sheets, and quick-action groups.
- **Pills & Status Chips (999px / `rounded-full`):** State tags, badges, user avatars, utility chips, and segmented filter triggers.

## Components

### Buttons
- **Primary Action:** Solid `#4F46E5` background, `#FFFFFF` text (`body-sm-medium`), 8px border radius, 48px height for full-width thumb actions. Active press: `#4338CA`.
- **Secondary / Ghost:** Transparent background, `#4F46E5` border or text, 8px border radius. Used for alternative workflows (e.g., "Gửi thông báo nhắc nợ").
- **Destructive:** Solid `#DC2626` or `#FEE2E2` background with `#DC2626` label.

### Cards & Room Tiles
- **Structure:** White container, 12px radius, 16px internal padding, subtle 1px border `#E5E7EB`.
- **Room Card Layout:** Room identifier (e.g., "Phòng 302") in `title-sm`, accompanied by current rent in tabular bold (`3.500.000 ₫`), occupant thumbnail or name, and status badge pinned to the top right.

### Badges & Status Chips
Always pair an SVG icon (14px) with high-contrast text. Badge border radius is strictly 999px (full pill). Height: 24px; padding: 2px 10px.

#### Status Badge Specifications
- **Invoices (Hóa đơn):**
  - *Nháp (Draft):* `#4B5563` text on `#F3F4F6` bg. Icon: Document outline.
  - *Đã phát hành (Issued):* `#2563EB` text on `#DBEAFE` bg. Icon: Send outline.
  - *Đã thu 1 phần (Partially Paid):* `#D97706` text on `#FEF3C7` bg. Icon: Pie-slice outline.
  - *Đã thanh toán (Paid):* `#16A34A` text on `#DCFCE7` bg. Icon: Check-circle outline.
  - *Quá hạn (Overdue):* `#DC2626` text on `#FEE2E2` bg. Icon: Alert-triangle outline.
- **Rooms (Phòng trọ / Căn hộ):**
  - *Trống (Vacant):* `#16A34A` text on `#DCFCE7` bg. Icon: Door-open outline.
  - *Đang thuê (Occupied):* `#2563EB` text on `#DBEAFE` bg. Icon: User outline.
  - *Đã cọc (Reserved):* `#D97706` text on `#FEF3C7` bg. Icon: Clock/Key outline.
  - *Bảo trì (Maintenance):* `#DC2626` text on `#FEE2E2` bg. Icon: Wrench outline.
- **Tickets (Sự cố / Yêu cầu):**
  - *Mới (New):* `#2563EB` text on `#DBEAFE` bg. Icon: Sparkle/Plus-circle outline.
  - *Đã tiếp nhận (Acknowledged):* `#D97706` text on `#FEF3C7` bg. Icon: Eye outline.
  - *Đang xử lý (In Progress):* `#4F46E5` text on `#EEF2FF` bg. Icon: Loader outline.
  - *Hoàn thành (Resolved):* `#16A34A` text on `#DCFCE7` bg. Icon: Checkmark-badge outline.

### Input Fields & Controls
- **Text Inputs:** Height 48px, 8px radius, `Gray 100` background or white with 1px `Gray 200` border. Active focus state transitions border to `#4F46E5` with a 2px outer tint ring (`#EEF2FF`).
- **Utility Meter Inputs (Điện / Nước):** Split card design featuring previous index (`Chỉ số cũ`), new index (`Chỉ số mới`), and automatic consumption computation with delta tag.
- **Checkboxes & Radios:** Minimum target area 44px × 44px; active state fills with `#4F46E5` with `#FFFFFF` checkmark or center pip.
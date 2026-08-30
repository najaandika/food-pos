# 🔧 CODE REFACTOR ROADMAP - ACTIONABLE PLAN

**Audit Date:** 2026-08-30  
**Total Issues Found:** 34 distinct categories  
**Estimated Refactoring Time:** 12-15 hours (distributed across sprints)

---

## 📊 QUICK SUMMARY

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| **CSS Issues** | 0 | 5 | 6 | 1 | **12** |
| **TypeScript/React** | 1 | 3 | 4 | 1 | **9** |
| **Configuration** | 0 | 0 | 2 | 0 | **2** |
| **Code Quality** | 0 | 0 | 4 | 7 | **11** |
| | | | | | **34** |

---

## 🚀 RECOMMENDED EXECUTION ORDER

### **PHASE 1: Foundation (3-4 hours) - DO FIRST**
These changes unblock everything else and have highest ROI.

#### 1.1 Create CSS Design Token System ⭐ PRIORITY
**Effort:** 2-3 hours | **Impact:** HIGH | **Files:** Create `app/styles/tokens.css`

**Currently:** Magic numbers scattered everywhere (170+ hardcoded pixel values)  
**Goal:** Centralized, reusable design tokens

**Steps:**
```css
/* app/styles/tokens.css - NEW FILE */

:root {
  /* Spacing Scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;

  /* Sidebar & Layout */
  --sidebar-width: 232px;
  --sidebar-padding: var(--space-4);
  --main-max-width: 1920px;

  /* Colors */
  --primary: #3047ff;
  --surface: rgba(255, 255, 255, 0.28);
  --card-bg: #ffffff;
  --border: #f0f0f0;
  --text-primary: #1f2b59;
  --text-secondary: #8b8e98;

  /* Shadows */
  --shadow-sm: 0 4px 12px rgba(31, 43, 89, 0.08);
  --shadow-md: 0 10px 30px rgba(31, 43, 89, 0.12);
  --shadow-lg: 0 20px 60px rgba(31, 43, 89, 0.16);
  --shadow-blue: 0 14px 30px rgba(48, 71, 255, 0.24);

  /* Border Radius */
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 18px;
  --radius-xl: 26px;
  --radius-full: 999px;

  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 24px;

  /* Transitions */
  --transition-fast: 150ms ease-out;
  --transition-normal: 250ms ease-out;
  --transition-slow: 350ms ease-out;
}
```

**Then:** Update all CSS files to use tokens
```bash
# Examples of replacements needed:
width: 232px → width: var(--sidebar-width);
padding: 26px 14px → padding: var(--space-6) var(--space-4);
border-radius: 14px → border-radius: var(--radius-md);
box-shadow: 0 14px 30px rgba(48, 71, 255, 0.24) → box-shadow: var(--shadow-blue);
```

**Files to Update (Priority):**
1. `app/styles/admin-shell.css` - 40+ magic numbers
2. `app/styles/login.css` - 25+ magic numbers
3. `app/styles/dashboard.css` - 20+ magic numbers
4. All other CSS files in `app/styles/`

---

#### 1.2 Create Utility CSS Classes ⭐ PRIORITY
**Effort:** 1-1.5 hours | **Impact:** HIGH | **File:** `app/styles/utilities.css`

**Currently:** Same flexbox patterns repeated 50+ times across all CSS files  
**Goal:** Reusable utility classes (similar to Tailwind philosophy)

```css
/* app/styles/utilities.css - ADD TO EXISTING */

/* Flexbox utilities */
.u-flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.u-flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.u-flex-start {
  display: flex;
  align-items: center;
}

.u-flex-col {
  display: flex;
  flex-direction: column;
}

.u-flex-col-center {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Grid utilities */
.u-grid-center {
  display: grid;
  place-items: center;
}

/* Gap utilities */
.u-gap-sm { gap: var(--space-2); }
.u-gap-md { gap: var(--space-3); }
.u-gap-lg { gap: var(--space-4); }

/* Padding/Margin utilities */
.u-p-sm { padding: var(--space-2); }
.u-p-md { padding: var(--space-4); }
.u-p-lg { padding: var(--space-6); }

.u-m-0 { margin: 0; }
.u-m-auto { margin: auto; }

/* Text utilities */
.u-text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.u-text-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Visibility */
.u-hidden {
  display: none !important;
}

.u-invisible {
  visibility: hidden;
}

@media (max-width: 640px) {
  .u-hidden-mobile {
    display: none !important;
  }
}
```

**Usage in HTML:**
```html
<!-- BEFORE -->
<div style="display: flex; align-items: center; gap: 12px; margin: 0 0 30px;">
  <span>Icon</span>
  <strong>Text</strong>
</div>

<!-- AFTER -->
<div class="u-flex-start u-gap-md u-m-0">
  <span>Icon</span>
  <strong>Text</strong>
</div>
```

**Files to Update:** All `.css` files (use find & replace)

---

### **PHASE 2: Component Refactoring (4-5 hours) - THEN DO THIS**
These changes improve code maintainability and testability.

#### 2.1 Split MenuView Component ⭐ CRITICAL
**Effort:** 2-2.5 hours | **Impact:** CRITICAL | **File:** `app/admin/views/MenuView.tsx`

**Current Issues:**
- 10 state variables in one component
- 500+ lines of code
- Hard to test
- Difficult to maintain

**Refactoring Plan:**
```
MenuView (Main Coordinator - 100 lines)
├── MenuFilterPanel (Category + Search - 80 lines)
│   └── Manages: activeCategory, query
├── MenuGrid (Dish Display - 150 lines)
│   └── Manages: dish rendering, add-to-cart
├── OrderDetailsPanel (80 lines)
│   └── Manages: orderType, tableCode, customerName, guests
└── CartPanel (140 lines)
    └── Manages: cart state, submission, errors
```

**Benefits:**
- ✅ Each component < 150 lines
- ✅ Easier to test in isolation
- ✅ Reusable components
- ✅ Better error boundaries

**Timeline:** 2-2.5 hours

---

#### 2.2 Add Error Boundary Component
**Effort:** 30 mins | **Impact:** HIGH | **File:** Create `app/components/ErrorBoundary.tsx`

```typescript
// app/components/ErrorBoundary.tsx
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: '20px', color: 'red' }}>
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Usage:**
```tsx
<ErrorBoundary>
  <MenuView />
</ErrorBoundary>
```

---

### **PHASE 3: Type Safety & Validation (2-3 hours) - PARALLEL WITH PHASE 2**

#### 3.1 Add Schema Validation to API Routes
**Effort:** 1.5 hours | **Impact:** HIGH

**Example for `/api/orders/route.ts`:**
```typescript
import { z } from 'zod';

const CreateOrderSchema = z.object({
  tableCode: z.string().optional(),
  customerName: z.string().min(1).max(100),
  type: z.enum(['dine_in', 'takeaway']),
  guests: z.number().int().min(1).max(99),
  items: z.array(z.object({
    menuItemId: z.number().positive(),
    quantity: z.number().int().min(1).max(999),
    notes: z.string().max(500).optional(),
  })).min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = CreateOrderSchema.parse(body);
    // ... rest of logic
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { errors: error.flatten() },
        { status: 422 }
      );
    }
    // ... other error handling
  }
}
```

**Files to Update:**
- `app/api/orders/route.ts`
- `app/api/menu-items/[id]/route.ts`
- All other API route files

---

#### 3.2 Improve Error Handling Structure
**Effort:** 1 hour | **Impact:** HIGH

Create error class hierarchy:
```typescript
// lib/errors.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export class ValidationError extends ApiError {
  constructor(public fields: Record<string, string>) {
    super(422, 'VALIDATION_ERROR', 'Validation failed');
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}
```

---

### **PHASE 4: Config & Quality (1-1.5 hours) - FINAL POLISH**

#### 4.1 Enhance TypeScript Config
**Effort:** 15 mins | **Impact:** MEDIUM

Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

#### 4.2 Enhance ESLint Config
**Effort:** 30 mins | **Impact:** MEDIUM

Add to `.eslintrc.json`:
```json
{
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/consistent-type-imports": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

---

#### 4.3 Organize Imports Consistently
**Effort:** 45 mins | **Impact:** LOW

Standard import order:
```typescript
// 1. React/Next imports
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party libraries
import { CheckCircle2, Plus, Search } from 'lucide-react';

// 3. Internal absolute imports
import { AdminTitle } from '@/app/admin';
import { formatRupiah } from '@/lib/format';

// 4. Types (if not imported above)
import type { AdminDish } from '@/app/admin/runtime-data';
```

---

## 📋 DETAILED CHECKLIST BY PHASE

### Phase 1 Checklist (Foundation)
```
[ ] Create app/styles/tokens.css with all design tokens
[ ] Create comprehensive utilities.css with utility classes
[ ] Update admin-shell.css to use tokens (40+ replacements)
[ ] Update login.css to use tokens (25+ replacements)
[ ] Update dashboard.css to use tokens (20+ replacements)
[ ] Update remaining CSS files to use tokens
[ ] Remove duplicate shadow definitions
[ ] Standardize border-radius using tokens
[ ] Test all pages load correctly
[ ] Verify no visual regressions
```

**Time: 3-4 hours**

---

### Phase 2 Checklist (Components)
```
[ ] Create ErrorBoundary.tsx component
[ ] Wrap app layout with ErrorBoundary
[ ] Create MenuFilterPanel component
[ ] Create MenuGrid component
[ ] Create OrderDetailsPanel component
[ ] Create CartPanel component
[ ] Refactor MenuView to use new components
[ ] Test MenuView functionality
[ ] Add loading states to cart submission
[ ] Add error states with user feedback
```

**Time: 4-5 hours**

---

### Phase 3 Checklist (Type Safety)
```
[ ] Install zod library (npm install zod)
[ ] Create lib/errors.ts error classes
[ ] Create lib/validation.ts with schemas
[ ] Add validation to POST /api/orders
[ ] Add validation to PATCH /api/menu-items/[id]
[ ] Add validation to DELETE endpoints
[ ] Add validation to staff endpoints
[ ] Add validation to table endpoints
[ ] Update error handling in all routes
[ ] Test with invalid data inputs
```

**Time: 2-3 hours**

---

### Phase 4 Checklist (Config & Quality)
```
[ ] Update tsconfig.json with stricter rules
[ ] Update .eslintrc.json with additional rules
[ ] Run lint check across all files
[ ] Fix all lint errors
[ ] Organize imports in all .tsx files
[ ] Add /** comments to public functions
[ ] Review and remove dead code
[ ] Test full build process
```

**Time: 1-1.5 hours**

---

## 🎯 PRIORITIZATION MATRIX

| Task | Effort | Impact | Priority | When |
|------|--------|--------|----------|------|
| CSS Tokens | 2-3h | HIGH | ⭐⭐⭐ | Phase 1 |
| Utility CSS | 1-1.5h | HIGH | ⭐⭐⭐ | Phase 1 |
| Split MenuView | 2-2.5h | CRITICAL | ⭐⭐⭐ | Phase 2 |
| Error Boundary | 0.5h | HIGH | ⭐⭐ | Phase 2 |
| Schema Validation | 1.5h | HIGH | ⭐⭐ | Phase 3 |
| Error Handling | 1h | HIGH | ⭐⭐ | Phase 3 |
| TypeScript Config | 0.25h | MEDIUM | ⭐ | Phase 4 |
| ESLint Config | 0.5h | MEDIUM | ⭐ | Phase 4 |
| Import Organization | 0.75h | LOW | ⭐ | Phase 4 |

---

## 📊 EXPECTED OUTCOMES

### Before Refactoring:
- ❌ 170+ magic numbers in CSS
- ❌ 50+ duplicate flexbox patterns
- ❌ MenuView component with 10 states
- ❌ Generic error handling
- ❌ No validation on API inputs
- ❌ Inconsistent import organization

### After Refactoring:
- ✅ Centralized design tokens (170 → 0 magic numbers)
- ✅ Reusable utility classes (50 patterns → 20 utilities)
- ✅ 5 focused components instead of 1 monolith
- ✅ Structured error handling with proper status codes
- ✅ Full Zod validation on all APIs
- ✅ Consistent TypeScript & ESLint configuration
- ✅ Better code maintainability & testability
- ✅ Faster CSS file sizes with token reuse
- ✅ Easier onboarding for new developers

---

## 🚀 QUICK START

**To get started immediately:**

```bash
# Phase 1: Foundation
1. Create tokens.css and utilities.css
2. Run find & replace in CSS files
3. Test all pages

# Phase 2: Components  
4. Create ErrorBoundary component
5. Split MenuView
6. Test MenuView features

# Phase 3: Type Safety
7. Add Zod schemas
8. Update error handling

# Phase 4: Finalize
9. Update configs
10. Run full lint check
```

---

## 💾 RELATED DOCUMENTS

- **CODE_REFACTOR_AUDIT.md** - Full detailed audit (758 lines)
- **BACKEND_IMPLEMENTATION_COMPLETE.md** - Backend verification
- **ADMIN_AUDIT_REPORT.md** - Admin panel audit

---

**Status:** Ready for implementation  
**Recommendation:** Start with Phase 1 (CSS foundation) for immediate ROI  
**Time Investment:** 12-15 hours total (can be done in 3-4 week sprints)  
**Expected Result:** Production-grade, maintainable codebase 🎉


# LockIn MVP Build Plan

## Recommendation
Build LockIn in this repo as a single-page React app that turns the current GPA calculator into one module of a broader study dashboard.

## What To Build First

### 1. App Shell
- Top-level navigation: Dashboard, Tasks, Classes, GPA
- Shared state loaded from `localStorage`

### 2. Dashboard
- Overdue
- Due Today
- Lock-In Zone
- Coming Up
- Daily load summary
- Streak and weekly progress widgets

### 3. Tasks
- Add task form
- Task list
- Complete task flow
- Edit and delete controls

### 4. Classes
- Add class form
- Class cards with current grade
- Quick view of upcoming assignments by class
- Grade health chart

### 5. GPA
- Move current calculator into a dedicated tab
- Preserve existing weighted projection behavior for v1

## Smart Priority Rules For MVP
- Always show overdue first
- Always show due-today before future prep
- Tests and exams stay in Coming Up until they are close enough to matter
- Heavy due-today workload reduces additional lock-in suggestions
- Coming Up should inform, not overwhelm

## Suggested v1 State Shape
```js
{
  tasks: [],
  classes: [],
  completionLog: {},
  gpa: {
    junior: {},
    senior: {}
  }
}
```

## Acceptance Criteria
- Student can create a class
- Student can create a task tied to a class
- Dashboard automatically sorts tasks into smart sections
- Completing a task updates dashboard sections immediately
- Student can manually enter class grades
- Student can view GPA projection in-app
- Reloading the browser preserves data

## Why This MVP Works
It proves the core value quickly:

- better daily prioritization
- one place for assignments and academics
- useful without needing backend or school integrations

## Best Next Step
Replace the current `App.jsx` GPA-only layout with the LockIn app shell and wire the existing `priority.js` and `storage.js` into the first real dashboard build.

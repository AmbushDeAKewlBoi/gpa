# LockIn PRD

## Product Summary
LockIn is a student planning app that combines assignment tracking, grade visibility, and GPA projection into one place. Its core job is not just storing school work, but deciding what deserves attention today.

The key differentiator is the Priority Engine: LockIn should answer "what do I actually need to lock in on right now?" instead of dumping every upcoming item into the same list.

For v1, LockIn will be built as an expansion of this existing GPA calculator repo so the GPA experience becomes one part of a larger student dashboard.

## Problem
Students already know when everything is due. The real problem is attention management.

Most planner apps fail in three ways:

1. They treat a test in two weeks and homework due tonight as equally visible.
2. They make students manually decide priority every day.
3. They separate grades, assignments, and GPA into different tools.

This creates stress, overload, and bad daily decisions.

## Product Goal
Help students make better day-by-day decisions by surfacing:

1. What is overdue
2. What must be submitted today
3. What deserves active work next
4. What is coming up but does not need attention yet

At the same time, the app should show course health through grade visuals and include the existing GPA calculator as an integrated academic planning tool.

## Target User
Primary user:

- High school students managing multiple classes, assignments, quizzes, projects, and tests

Secondary user:

- Students who care about balancing workload and GPA, not just checking off tasks

## Product Principles
- Daily clarity over feature overload
- Attention guidance over raw task storage
- Academic context over generic productivity
- Fast input, low friction, mobile-friendly
- Visual motivation without feeling childish

## Core User Stories
- As a student, I want to add assignments with due dates, class, effort, and type so the app understands what I have coming up.
- As a student, I want the app to tell me what to work on today so I do not have to manually prioritize everything.
- As a student, I want the app to avoid telling me to study for a test that is still far away when I already have urgent homework due today.
- As a student, I want to see which classes are slipping so I can decide where extra effort matters most.
- As a student, I want a GPA calculator in the same app so I can connect daily work with long-term outcomes.

## Main Jobs To Be Done
- Decide today's focus
- Track upcoming submissions
- Reduce mental overload
- Monitor grade health by class
- Understand GPA impact

## Features

### 1. Smart Today Dashboard
Main view answering:

- What is overdue?
- What is due today?
- What should I lock in on next?
- What is coming up soon?

Sections:

- Overdue
- Due Today
- Lock-In Zone
- Coming Up

### 2. Assignment Capture
Each task should support:

- Title
- Class
- Type: homework, quiz, test, exam, project, essay, lab, other
- Due date
- Estimated effort in minutes
- Optional grade weight or points
- Status: not started, in progress, done
- Optional notes

### 3. Priority Engine
The priority engine determines which tasks appear in which dashboard bucket.

Inputs:

- Due date proximity
- Task type
- Estimated effort
- Existing load due today
- Completion state

Rules for v1:

1. Overdue items always surface first.
2. Due-today items outrank future prep.
3. Tests and exams should not enter the Lock-In Zone too early.
4. If today's due workload is already heavy, the app should reduce extra "prep" suggestions.
5. Coming Up is informational, not a demand list.

Example behavior:

- If there are 3 homeworks due today and a test in 14 days, the dashboard should emphasize the 3 homeworks and keep the test in Coming Up.
- If there is a test in 4 days and today's load is light, the test can move into Lock-In Zone.

### 4. Class Overview
Per class, show:

- Current grade
- Trend or health indicator
- Upcoming assignments
- Risk level

This is lighter than a full gradebook in v1, but enough to answer "which class needs attention?"

### 5. GPA Calculator Integration
The existing GPA calculator becomes a dedicated area inside LockIn.

For v1:

- Keep the current weighted GPA projection functionality
- Integrate it into the main product navigation
- Allow user-managed classes rather than hardcoded course lists over time

### 6. Weekly Momentum
Motivation layer for consistency:

- Current streak
- Weekly completion progress
- Simple weekly win state

This should feel supportive, not gamey.

## Non-Goals For MVP
- Teacher portal
- Account system
- Multi-device sync
- Calendar integrations
- AI chat assistant
- Auto-import from school portals
- Notifications across devices

## Functional Requirements

### Task Management
- Users can create, edit, complete, and delete tasks
- Users can assign tasks to a class
- Users can set due date and estimated effort

### Dashboard Logic
- App computes task buckets automatically
- Dashboard updates immediately when a task changes
- Completed tasks disappear from active priority sections

### Grade Tracking
- Users can create classes
- Users can assign a current grade to each class
- App displays grade distribution visually

### GPA
- Users can project cumulative GPA using integrated calculator logic

### Persistence
- Data persists in `localStorage` for v1
- App works offline after initial load

## Suggested Information Architecture
- Dashboard
- Tasks
- Classes
- GPA

Optional v1.1:

- Insights

## Data Model

### Class
- `id`
- `name`
- `teacher` optional
- `currentGrade` optional
- `targetGrade` optional
- `color`
- `credits` optional
- `level` optional: standard, honors, AP, DE

### Task
- `id`
- `title`
- `classId`
- `type`
- `dueDate`
- `estimatedMinutes`
- `status`
- `notes`
- `createdAt`
- `completedAt` optional

### Completion Log
- date key
- tasks due count
- tasks completed count
- all completed boolean

## MVP Definition
The MVP is successful if a student can:

1. Add classes
2. Add assignments and tests
3. Open the app and immediately see today's true priorities
4. See what is due today versus what is just coming up
5. Track class grades visually
6. Use the GPA calculator in the same product

## MVP Scope

### Include
- Local task storage
- User-created classes
- Smart dashboard with priority sections
- Manual class grade tracking
- Basic charts for academic health
- Integrated GPA calculator tab
- Streak and weekly progress summary

### Exclude
- Login
- Cloud sync
- Push notifications
- School SIS integrations
- Collaboration

## Success Metrics
- User can add first task in under 1 minute
- User can understand today's priorities without opening task details
- Due-today items always appear before distant assessments
- User returns daily because the dashboard feels useful, not cluttered

## UX Direction
LockIn should feel focused and sharp rather than cute or corporate.

Visual direction:

- Strong dashboard hierarchy
- Clear urgency colors
- Dense but readable information
- Calm academic feel with energy in the "Lock-In Zone"
- Charts that explain, not decorate

## Technical Direction
Recommended for this repo:

1. Continue in the existing Vite + React app
2. Replace hardcoded GPA-only landing page with tabbed or sidebar app shell
3. Keep `localStorage` for v1
4. Use the existing `priority.js` and `storage.js` as the starting point for MVP logic
5. Keep GPA logic modular so it can live as one feature area inside LockIn

## MVP Build Plan

### Phase 1
- App shell and navigation
- Dashboard layout
- Task and class local state
- Task input form

### Phase 2
- Connect priority engine
- Build dashboard sections
- Build task completion flow
- Add streak and weekly progress widgets

### Phase 3
- Build class overview and grade visuals
- Integrate GPA calculator into dedicated tab
- Polish responsive UI

## Key Product Decisions
- Build as an expansion of this existing GPA repo
- Let users add their own classes
- Use `localStorage` for v1
- Keep the priority engine opinionated and daily-focus first

## Open Questions For Later
- Should task priority also account for current class grade risk?
- Should tests automatically create recommended prep windows?
- Should classes support weighted categories later?
- Should recurring homework exist in v1.1 or later?

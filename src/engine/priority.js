// ─── Priority Engine ────────────────────────────────────
// Scores each task and returns sorted arrays for Today view sections.

const TYPE_WEIGHTS = {
  test: 10,
  exam: 10,
  project: 8,
  essay: 7,
  lab: 5,
  homework: 3,
  participation: 1,
  other: 2,
};

function daysBetween(dateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + 'T00:00:00');
  return Math.round((due - now) / (1000 * 60 * 60 * 24));
}

function urgencyScore(daysUntilDue) {
  if (daysUntilDue < 0) return 12;   // overdue
  if (daysUntilDue === 0) return 10;  // due today
  if (daysUntilDue === 1) return 8;   // tomorrow
  if (daysUntilDue <= 3) return 6;
  if (daysUntilDue <= 7) return 3;
  if (daysUntilDue <= 14) return 1;
  return 0;
}

function effortFitScore(task, todayLoad) {
  // todayLoad = total estimated minutes already due today
  // If today is already heavy (>180min / 3hrs), penalize adding more
  const taskMin = task.estimatedMinutes || 30;
  if (todayLoad > 240) return 0;
  if (todayLoad + taskMin > 300) return 1;
  if (todayLoad > 120) return 3;
  return 5;
}

export function computePriorityScore(task, todayLoadMinutes) {
  const days = daysBetween(task.dueDate);
  const urgency = urgencyScore(days);
  const weight = TYPE_WEIGHTS[task.type] || 2;
  const effortFit = effortFitScore(task, todayLoadMinutes);

  return {
    score: (urgency * 4) + (weight * 2) + (effortFit * 1.5),
    daysUntilDue: days,
    urgency,
  };
}

export function categorizeTasks(tasks) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const activeTasks = tasks.filter(t => t.status !== 'done');

  // Calculate today's load (total minutes of due-today items)
  const todayLoad = activeTasks
    .filter(t => daysBetween(t.dueDate) === 0)
    .reduce((sum, t) => sum + (t.estimatedMinutes || 30), 0);

  // Score all active tasks
  const scored = activeTasks.map(task => {
    const priority = computePriorityScore(task, todayLoad);
    return { ...task, _priority: priority };
  });

  // Categorize
  const overdue = scored
    .filter(t => t._priority.daysUntilDue < 0)
    .sort((a, b) => a._priority.daysUntilDue - b._priority.daysUntilDue);

  const dueToday = scored
    .filter(t => t._priority.daysUntilDue === 0)
    .sort((a, b) => b._priority.score - a._priority.score);

  // Lock-In Zone: NOT due today, but within 5 days and high enough score
  // For tests/exams: only enter Lock-In if ≤5 days away
  const lockInCandidates = scored.filter(t => {
    const days = t._priority.daysUntilDue;
    if (days <= 0) return false; // already in due-today or overdue
    if (days > 7) return false;  // too far out
    // Tests only enter lock-in zone when ≤5 days away
    if ((t.type === 'test' || t.type === 'exam') && days > 5) return false;
    return true;
  });

  // If today's load is already heavy (>240min), limit lock-in zone
  let lockIn = lockInCandidates
    .sort((a, b) => b._priority.score - a._priority.score);

  if (todayLoad > 240) {
    lockIn = lockIn.slice(0, 2); // Show max 2 items
  } else if (todayLoad > 120) {
    lockIn = lockIn.slice(0, 4);
  } else {
    lockIn = lockIn.slice(0, 6);
  }

  // Coming Up: 3-14 days out (info only, not action)
  const comingUp = scored
    .filter(t => {
      const days = t._priority.daysUntilDue;
      return days > 2 && days <= 14 && !lockIn.find(li => li.id === t.id);
    })
    .sort((a, b) => a._priority.daysUntilDue - b._priority.daysUntilDue)
    .slice(0, 8);

  return { overdue, dueToday, lockIn, comingUp, todayLoad };
}

export function getDateStr(date = new Date()) {
  return date.toISOString().split('T')[0];
}

export function formatRelativeDate(dateStr) {
  const days = daysBetween(dateStr);
  if (days < -1) return `${Math.abs(days)} days overdue`;
  if (days === -1) return 'Yesterday';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 7) return `In ${days} days`;
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

// ─── Streak / Rewards Logic ─────────────────────────────

export function calculateStreak(completionLog) {
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Walk backwards from yesterday (today isn't over yet)
  for (let i = 1; i <= 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = getDateStr(d);
    const entry = completionLog[key];

    // Skip weekends in streak calculation
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;

    if (entry && entry.allCompleted) {
      streak++;
    } else if (entry && !entry.allCompleted) {
      break; // streak broken
    } else {
      // No entry = no tasks were due that day, continue streak
      continue;
    }
  }

  return streak;
}

export function getWeekProgress(completionLog) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay(); // 0=Sun, 1=Mon...
  // Find the Monday of the current week
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow === 0 ? 7 : dow) - 1));

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = getDateStr(d);
    const entry = completionLog[key];
    const isPast = d < today;
    const isToday = d.getTime() === today.getTime();
    days.push({
      date: key,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      isPast,
      isToday,
      completed: entry ? entry.allCompleted : null, // null = no tasks due
      tasksDue: entry ? entry.tasksDue : 0,
      tasksCompleted: entry ? entry.tasksCompleted : 0,
    });
  }

  // Weekday unlocked = all Mon-Fri days that have passed are complete (or had no tasks)
  const weekdaysPassed = days.filter(d => !d.isWeekend && d.isPast);
  const allWeekdaysComplete = weekdaysPassed.length > 0 &&
    weekdaysPassed.every(d => d.completed === true || d.completed === null);

  return { days, allWeekdaysComplete };
}

// ─── localStorage Helpers ───────────────────────────────
const KEYS = {
  TASKS: 'lockin_tasks',
  CLASSES: 'lockin_classes',
  COMPLETION_LOG: 'lockin_completion_log',
  GPA_JUNIOR: 'lockin_gpa_junior',
  GPA_SENIOR: 'lockin_gpa_senior',
};

function get(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('localStorage write failed:', e);
  }
}

// ─── Domain Helpers ─────────────────────────────────────
export function getTasks() {
  return get(KEYS.TASKS) || [];
}

export function saveTasks(tasks) {
  set(KEYS.TASKS, tasks);
}

export function getClasses() {
  return get(KEYS.CLASSES) || [];
}

export function saveClasses(classes) {
  set(KEYS.CLASSES, classes);
}

export function getCompletionLog() {
  return get(KEYS.COMPLETION_LOG) || {};
}

export function saveCompletionLog(log) {
  set(KEYS.COMPLETION_LOG, log);
}

export function getGPAData(key) {
  return get(key);
}

export function saveGPAData(key, data) {
  set(key, data);
}

export function getLocalAppState() {
  return {
    tasks: getTasks(),
    classes: getClasses(),
    gpa: {
      junior: getGPAData(KEYS.GPA_JUNIOR) || {},
      senior: getGPAData(KEYS.GPA_SENIOR) || {},
    },
  };
}

export function saveLocalAppState({ tasks = [], classes = [], gpa = {} }) {
  saveTasks(tasks);
  saveClasses(classes);
  saveCompletionLog(
    tasks.reduce((log, task) => {
      const current = log[task.dueDate] || {
        tasksDue: 0,
        tasksCompleted: 0,
        allCompleted: false,
      };

      current.tasksDue += 1;
      if (task.status === 'done') {
        current.tasksCompleted += 1;
      }
      current.allCompleted = current.tasksDue > 0 && current.tasksCompleted === current.tasksDue;
      log[task.dueDate] = current;
      return log;
    }, {}),
  );
  saveGPAData(KEYS.GPA_JUNIOR, gpa.junior || {});
  saveGPAData(KEYS.GPA_SENIOR, gpa.senior || {});
}

export { KEYS };

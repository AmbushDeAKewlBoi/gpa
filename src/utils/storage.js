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

export { KEYS };

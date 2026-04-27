import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Cloud,
  CloudOff,
  Clock3,
  Flame,
  GraduationCap,
  LayoutDashboard,
  ListTodo,
  LogIn,
  LogOut,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
  UserCircle2,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import './App.css';
import { categorizeTasks, calculateStreak, formatRelativeDate, getWeekProgress } from './engine/priority';
import { fetchUserAppState, normalizeCloudState, saveUserAppState } from './lib/cloudSync';
import { signInWithGoogle, signOutUser, supabaseEnabled, watchAuthState } from './lib/supabase';
import {
  KEYS,
  getClasses,
  getGPAData,
  getLocalAppState,
  getTasks,
  saveClasses,
  saveCompletionLog,
  saveGPAData,
  saveTasks,
} from './utils/storage';

const gradeScale = {
  'A+': 4.3,
  A: 4.0,
  'A-': 3.7,
  'B+': 3.3,
  B: 3.0,
  'B-': 2.7,
  'C+': 2.3,
  C: 2.0,
  'C-': 1.7,
  'D+': 1.3,
  D: 1.0,
  'D-': 0.7,
  F: 0.0,
};

const classColors = ['#7dd3fc', '#fca5a5', '#86efac', '#fcd34d', '#c4b5fd', '#f9a8d4', '#fdba74', '#67e8f9'];

const juniorCourses = [
  { name: 'AP Calculus BC', weight: 1.0, type: 'ap' },
  { name: 'AP Eng Language & Comp', weight: 1.0, type: 'ap' },
  { name: 'AP Psychology', weight: 1.0, type: 'ap' },
  { name: 'AP Comp Sci Principles', weight: 1.0, type: 'ap' },
  { name: 'Adv Cyber Ops H', weight: 0.5, type: 'honors' },
  { name: 'Physics H', weight: 0.5, type: 'honors' },
];

const seniorCourses = [
  { name: 'Economics/Personal Fin', weight: 0.0, type: 'standard' },
  { name: 'AP Eng Lit & Comp', weight: 1.0, type: 'ap' },
  { name: 'Film Studies/Analysis', weight: 0.0, type: 'standard' },
  { name: 'AP Computer Science A', weight: 1.0, type: 'ap' },
  { name: 'Multi Calculus DE', weight: 1.0, type: 'de' },
  { name: 'AP Physics C: Mechanics', weight: 1.0, type: 'ap' },
];

const defaultJuniorGrades = {
  'AP Calculus BC': 'C+',
  'AP Eng Language & Comp': 'B+',
  'AP Psychology': 'A-',
  'AP Comp Sci Principles': 'A',
  'Adv Cyber Ops H': 'A-',
  'Physics H': 'A',
};

const defaultSeniorGrades = {
  'Economics/Personal Fin': 'A',
  'AP Eng Lit & Comp': 'A',
  'Film Studies/Analysis': 'A',
  'AP Computer Science A': 'A',
  'Multi Calculus DE': 'A',
  'AP Physics C: Mechanics': 'A',
};

function shiftDate(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

const bulkImportExample = `Class | Assignment | 2026-05-01 | homework | 45
Class | Assignment | 2026-05-03 | lab | 60
Class | Assignment | 2026-05-05 | essay | 90`;

const legacyTaskIdPattern = /^(t\d+|lang-\d+|psych-\d+|physics-\d+|calc-\d+|csp-\d+|cyber-\d+)$/;
const legacyClassIds = new Set(['c1', 'c2', 'c3', 'c4', 'c5', 'c6']);

const emptyTaskForm = {
  title: '',
  classId: '',
  type: 'homework',
  dueDate: shiftDate(0),
  estimatedMinutes: 45,
  status: 'not_started',
  notes: '',
};

const emptyClassForm = {
  name: '',
  currentGrade: '',
  targetGrade: '',
  level: 'Standard',
  credits: 1,
};

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'classes', label: 'Classes', icon: BookOpen },
  { id: 'gpa', label: 'GPA', icon: GraduationCap },
];

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function calculateGPA(courses, grades, baseCredits = 0, basePoints = 0) {
  const points = courses.reduce((sum, course) => {
    const gradeValue = gradeScale[grades[course.name]] ?? 0;
    return sum + gradeValue + course.weight;
  }, 0);

  const totalCredits = baseCredits + courses.length;
  const totalPoints = basePoints + points;
  const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';

  return { totalCredits, totalPoints, gpa };
}

function buildCompletionLog(tasks) {
  const activeDates = [...new Set(tasks.map((task) => task.dueDate))];
  return activeDates.reduce((log, date) => {
    const dueTasks = tasks.filter((task) => task.dueDate === date);
    const tasksCompleted = dueTasks.filter((task) => task.status === 'done').length;
    log[date] = {
      tasksDue: dueTasks.length,
      tasksCompleted,
      allCompleted: dueTasks.length > 0 && tasksCompleted === dueTasks.length,
    };
    return log;
  }, {});
}

function getClassName(classes, classId) {
  return classes.find((course) => course.id === classId)?.name || 'Unassigned';
}

function getClassColor(classes, classId) {
  return classes.find((course) => course.id === classId)?.color || '#94a3b8';
}

function getGradeTone(grade) {
  if (grade >= 93) return 'strong';
  if (grade >= 85) return 'steady';
  if (grade >= 75) return 'watch';
  return 'critical';
}

function TaskPill({ label, tone = 'default' }) {
  return <span className={`task-pill tone-${tone}`}>{label}</span>;
}

function SectionCard({ title, subtitle, icon: Icon, children, accent = 'default' }) {
  return (
    <section className={`panel section-card accent-${accent}`}>
      <div className="section-heading">
        <div>
          <div className="section-kicker">{subtitle}</div>
          <h3>{title}</h3>
        </div>
        <div className="section-icon-wrap">
          <Icon size={18} />
        </div>
      </div>
      {children}
    </section>
  );
}

function TaskRow({ task, classes, onToggleDone, onDelete }) {
  const done = task.status === 'done';
  return (
    <div className={`task-row ${done ? 'is-done' : ''}`}>
      <button
        type="button"
        className={`status-toggle ${done ? 'done' : ''}`}
        onClick={() => onToggleDone(task.id)}
        aria-label={done ? `Mark ${task.title} as active` : `Mark ${task.title} complete`}
      >
        <CheckCircle2 size={18} />
      </button>
      <div className="task-main">
        <div className="task-main-top">
          <span className="task-title">{task.title}</span>
          <TaskPill label={task.type.replace('_', ' ')} />
        </div>
        <div className="task-meta">
          <span className="task-course-dot" style={{ '--course-color': getClassColor(classes, task.classId) }} />
          <span>{getClassName(classes, task.classId)}</span>
          <span>{formatRelativeDate(task.dueDate)}</span>
          <span>{task.estimatedMinutes} min</span>
        </div>
        {task.notes ? <p className="task-notes">{task.notes}</p> : null}
      </div>
      <button type="button" className="icon-button danger" onClick={() => onDelete(task.id)} aria-label={`Delete ${task.title}`}>
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function GradeSelect({ course, value, onChange }) {
  return (
    <label className="gpa-row">
      <div className="gpa-course">
        <span>{course.name}</span>
        <TaskPill label={`${course.type.toUpperCase()} +${course.weight.toFixed(1)}`} tone="muted" />
      </div>
      <select className="field select-field compact" value={value} onChange={onChange}>
        {Object.keys(gradeScale).map((grade) => (
          <option key={grade} value={grade}>
            {grade}
          </option>
        ))}
      </select>
    </label>
  );
}

function removeLegacyTasks(savedTasks) {
  return savedTasks.filter((task) => !legacyTaskIdPattern.test(task.id));
}

function removeUnusedLegacyClasses(savedClasses, remainingTasks) {
  const usedClassIds = new Set(remainingTasks.map((task) => task.classId));
  return savedClasses.filter((course) => !legacyClassIds.has(course.id) || usedClassIds.has(course.id));
}

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [classes, setClasses] = useState(() => {
    const savedClasses = getClasses();
    const savedTasks = getTasks();
    return removeUnusedLegacyClasses(savedClasses, removeLegacyTasks(savedTasks));
  });
  const [tasks, setTasks] = useState(() => {
    const savedTasks = getTasks();
    return removeLegacyTasks(savedTasks);
  });
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [classForm, setClassForm] = useState(emptyClassForm);
  const [bulkText, setBulkText] = useState('');
  const [juniorGrades, setJuniorGrades] = useState(() => getGPAData(KEYS.GPA_JUNIOR) || defaultJuniorGrades);
  const [seniorGrades, setSeniorGrades] = useState(() => getGPAData(KEYS.GPA_SENIOR) || defaultSeniorGrades);
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(!supabaseEnabled);
  const [cloudReady, setCloudReady] = useState(!supabaseEnabled);
  const [cloudStatus, setCloudStatus] = useState(supabaseEnabled ? 'Waiting for sign-in' : 'Local-only mode');
  const [cloudError, setCloudError] = useState('');
  const [syncBusy, setSyncBusy] = useState(false);
  const [cloudDirty, setCloudDirty] = useState(false);
  const initializingCloudRef = useRef(true);

  useEffect(() => {
    saveClasses(classes);
  }, [classes]);

  useEffect(() => {
    saveTasks(tasks);
    saveCompletionLog(buildCompletionLog(tasks));
  }, [tasks]);

  useEffect(() => {
    saveGPAData(KEYS.GPA_JUNIOR, juniorGrades);
  }, [juniorGrades]);

  useEffect(() => {
    saveGPAData(KEYS.GPA_SENIOR, seniorGrades);
  }, [seniorGrades]);

  useEffect(() => {
    if (!supabaseEnabled) return undefined;

    return watchAuthState((user) => {
      initializingCloudRef.current = true;
      setAuthUser(user);
      setAuthReady(true);
      setCloudReady(!user);
      setCloudDirty(false);
      setCloudError('');
      setCloudStatus(user ? 'Syncing with Supabase' : 'Local-only mode');
      setSyncBusy(Boolean(user));
    });
  }, []);

  useEffect(() => {
    if (!supabaseEnabled || !authReady || !authUser) {
      return undefined;
    }

    let cancelled = false;

    fetchUserAppState(authUser.uid)
      .then(async (remoteData) => {
        if (cancelled) return;
        const normalized = normalizeCloudState(remoteData);

        if (normalized) {
          const cleanedTasks = removeLegacyTasks(normalized.tasks);
          const cleanedClasses = removeUnusedLegacyClasses(normalized.classes, cleanedTasks);
          const removedLegacyData = cleanedTasks.length !== normalized.tasks.length || cleanedClasses.length !== normalized.classes.length;

          setTasks(cleanedTasks);
          setClasses(cleanedClasses);
          setJuniorGrades(Object.keys(normalized.gpa.junior).length ? normalized.gpa.junior : defaultJuniorGrades);
          setSeniorGrades(Object.keys(normalized.gpa.senior).length ? normalized.gpa.senior : defaultSeniorGrades);

          if (removedLegacyData) {
            await saveUserAppState(authUser.uid, {
              tasks: cleanedTasks,
              classes: cleanedClasses,
              gpa: normalized.gpa,
            });
            setCloudStatus('Old starter data removed from Supabase');
          } else {
            setCloudStatus('Cloud data loaded');
          }
        } else {
          const localState = getLocalAppState();
          if (localState.tasks.length || localState.classes.length) {
            setCloudStatus('Local data ready to save');
            setCloudDirty(true);
          } else {
            setCloudStatus('Cloud sync ready');
          }
        }

        setCloudReady(true);
        setSyncBusy(false);
        initializingCloudRef.current = false;
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(error);
        setCloudError(error.message || 'Unable to read cloud data.');
        setCloudStatus('Fell back to local mode');
        setCloudReady(true);
        setSyncBusy(false);
        initializingCloudRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, authUser]);

  const cloudPayload = useMemo(
    () => ({
      tasks,
      classes,
      gpa: {
        junior: juniorGrades,
        senior: seniorGrades,
      },
    }),
    [classes, juniorGrades, seniorGrades, tasks],
  );

  useEffect(() => {
    if (!supabaseEnabled || !authUser || !cloudReady || initializingCloudRef.current) {
      return;
    }

    setCloudDirty(true);
    setCloudStatus('Unsaved cloud changes');
  }, [classes, tasks, juniorGrades, seniorGrades, authUser, cloudReady]);

  const completionLog = useMemo(() => buildCompletionLog(tasks), [tasks]);
  const priority = useMemo(() => categorizeTasks(tasks), [tasks]);
  const streak = useMemo(() => calculateStreak(completionLog), [completionLog]);
  const weekProgress = useMemo(() => getWeekProgress(completionLog), [completionLog]);
  const selectedTaskClassId = taskForm.classId || classes[0]?.id || '';

  const gradeChartData = useMemo(
    () =>
      classes.map((course) => ({
        name: course.name.length > 12 ? `${course.name.slice(0, 12)}...` : course.name,
        grade: Number(course.currentGrade || 0),
        fill: course.color,
      })),
    [classes],
  );

  const activeTasks = useMemo(() => tasks.filter((task) => task.status !== 'done'), [tasks]);
  const classSnapshot = useMemo(
    () =>
      classes.map((course) => {
        const upcoming = activeTasks.filter((task) => task.classId === course.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
        return {
          ...course,
          upcomingCount: upcoming.length,
          nextTask: upcoming[0] || null,
          tone: getGradeTone(Number(course.currentGrade || 0)),
        };
      }),
    [classes, activeTasks],
  );

  const juniorProjection = useMemo(() => calculateGPA(juniorCourses, juniorGrades, 19.0, 72.01), [juniorGrades]);
  const seniorProjection = useMemo(
    () => calculateGPA(seniorCourses, seniorGrades, juniorProjection.totalCredits, juniorProjection.totalPoints),
    [seniorGrades, juniorProjection],
  );

  const todayFocusCount = priority.overdue.length + priority.dueToday.length + priority.lockIn.length;

  function handleTaskSubmit(event) {
    event.preventDefault();
    if (!taskForm.title.trim() || !selectedTaskClassId) return;

    const nextTask = {
      id: uid(),
      title: taskForm.title.trim(),
      classId: selectedTaskClassId,
      type: taskForm.type,
      dueDate: taskForm.dueDate,
      estimatedMinutes: Number(taskForm.estimatedMinutes) || 30,
      status: taskForm.status,
      notes: taskForm.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    setTasks((current) => [nextTask, ...current]);
    setTaskForm(emptyTaskForm);
  }

  function handleClassSubmit(event) {
    event.preventDefault();
    if (!classForm.name.trim()) return;

    const nextClass = {
      id: uid(),
      name: classForm.name.trim(),
      currentGrade: classForm.currentGrade === '' ? '' : Number(classForm.currentGrade),
      targetGrade: classForm.targetGrade === '' ? '' : Number(classForm.targetGrade),
      level: classForm.level,
      credits: Number(classForm.credits) || 1,
      color: classColors[classes.length % classColors.length],
    };

    setClasses((current) => [...current, nextClass]);
    setClassForm(emptyClassForm);
    setActiveView('classes');
  }

  function handleToggleDone(taskId) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: task.status === 'done' ? 'not_started' : 'done',
              completedAt: task.status === 'done' ? null : new Date().toISOString(),
            }
          : task,
      ),
    );
  }

  function handleDeleteTask(taskId) {
    setTasks((current) => current.filter((task) => task.id !== taskId));
  }

  function handleDeleteClass(classId) {
    setClasses((current) => current.filter((course) => course.id !== classId));
    setTasks((current) => current.filter((task) => task.classId !== classId));
    setTaskForm((current) => ({
      ...current,
      classId: current.classId === classId ? '' : current.classId,
    }));
  }

  function handleBulkImport(event) {
    event.preventDefault();
    const rows = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!rows.length) return;

    const nextClasses = [...classes];
    const importedTasks = [];

    rows.forEach((row) => {
      const parts = row.includes('|') ? row.split('|') : row.split(',');
      const [classNameRaw, titleRaw, dueDateRaw, typeRaw, minutesRaw, ...notesParts] = parts.map((part) => part.trim());
      const title = titleRaw || classNameRaw;
      const className = titleRaw ? classNameRaw : 'Unassigned';

      if (!title) return;

      let course = nextClasses.find((item) => item.name.toLowerCase() === className.toLowerCase());
      if (!course) {
        course = {
          id: uid(),
          name: className,
          currentGrade: '',
          targetGrade: '',
          level: 'Standard',
          credits: 1,
          color: classColors[nextClasses.length % classColors.length],
        };
        nextClasses.push(course);
      }

      const dueDate = dueDateRaw && !Number.isNaN(Date.parse(`${dueDateRaw}T00:00:00`)) ? dueDateRaw : shiftDate(0);
      const normalizedType = typeRaw?.toLowerCase().replace(/\s+/g, '_');
      const type = ['homework', 'quiz', 'test', 'exam', 'project', 'essay', 'lab', 'other'].includes(normalizedType) ? normalizedType : 'homework';

      importedTasks.push({
        id: uid(),
        title,
        classId: course.id,
        type,
        dueDate,
        estimatedMinutes: Number(minutesRaw) || 45,
        status: 'not_started',
        notes: notesParts.join(' | '),
        createdAt: new Date().toISOString(),
      });
    });

    if (!importedTasks.length) return;
    setClasses(nextClasses);
    setTasks((current) => [...importedTasks, ...current]);
    setBulkText('');
  }

  function clearAllData() {
    setClasses([]);
    setTasks([]);
    setTaskForm(emptyTaskForm);
    setClassForm(emptyClassForm);
  }

  async function handleSignIn() {
    try {
      setCloudError('');
      setSyncBusy(true);
      await signInWithGoogle();
    } catch (error) {
      console.error(error);
      setCloudError(error.message || 'Google sign-in failed.');
      setCloudStatus('Sign-in failed');
      setSyncBusy(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOutUser();
    } catch (error) {
      console.error(error);
      setCloudError(error.message || 'Unable to sign out.');
    }
  }

  async function handleSaveToCloud() {
    if (!authUser) return;

    try {
      setSyncBusy(true);
      setCloudError('');
      setCloudStatus('Saving to cloud');
      await saveUserAppState(authUser.uid, cloudPayload);
      setCloudDirty(false);
      setCloudStatus('Cloud sync active');
    } catch (error) {
      console.error(error);
      setCloudError(error.message || 'Unable to sync to Supabase.');
      setCloudStatus('Save failed');
    } finally {
      setSyncBusy(false);
    }
  }

  const syncTone = supabaseEnabled ? (authUser ? (cloudDirty ? 'warn' : 'good') : 'muted') : 'muted';
  const syncLabel = supabaseEnabled ? (authUser ? 'Cloud sync' : 'Local mode') : 'Supabase not configured';

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="eyebrow">Study system</div>
            <h1>LockIn</h1>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`nav-button ${activeView === id ? 'active' : ''}`}
              onClick={() => setActiveView(id)}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sync-panel panel">
          <div className="note-head">
            {supabaseEnabled ? <Cloud size={16} /> : <CloudOff size={16} />}
            <span>{syncLabel}</span>
          </div>
          <div className="sync-summary">
            <TaskPill label={cloudStatus} tone={syncTone} />
            {authUser ? (
              <div className="sync-user">
                <UserCircle2 size={16} />
                <span>{authUser.user_metadata?.full_name || authUser.email || 'Signed in'}</span>
              </div>
            ) : null}
          </div>
          <p>
            {supabaseEnabled
              ? authUser
                ? 'Your tasks, classes, and GPA settings sync to Supabase.'
                : 'Connect Google to save this LockIn data across devices.'
              : 'Add Supabase env keys to enable account-based cloud sync.'}
          </p>
          {cloudError ? <div className="sync-error">{cloudError}</div> : null}
          <div className="sync-actions">
            {supabaseEnabled ? (
              authUser ? (
                <>
                  <button type="button" className="primary-button" onClick={handleSaveToCloud} disabled={syncBusy || !cloudDirty}>
                    <Save size={16} />
                    <span>{syncBusy ? 'Saving...' : cloudDirty ? 'Save to cloud' : 'Saved'}</span>
                  </button>
                  <button type="button" className="ghost-button" onClick={handleSignOut} disabled={syncBusy}>
                    <LogOut size={16} />
                    <span>Sign out</span>
                  </button>
                </>
              ) : (
                <button type="button" className="secondary-button" onClick={handleSignIn} disabled={syncBusy}>
                  <LogIn size={16} />
                  <span>{syncBusy ? 'Connecting...' : 'Continue with Google'}</span>
                </button>
              )
            ) : (
              <div className="inline-hint">Create a `.env` from `.env.example` to turn sync on.</div>
            )}
          </div>
        </div>

        <div className="sidebar-note panel">
          <div className="note-head">
            <Target size={16} />
            <span>Today&apos;s focus</span>
          </div>
          <div className="focus-count">{todayFocusCount}</div>
          <p>{priority.dueToday.length > 0 ? 'Urgent work is leading the board today.' : 'No hard deadlines today. Use Lock-In Zone smartly.'}</p>
        </div>
      </aside>

      <main className="content">
        <header className="hero panel">
          <div className="hero-copy">
            <div className="eyebrow">Attention manager</div>
            <h2>See what actually matters today.</h2>
            <p>
              LockIn keeps urgent homework in front, pushes far-off tests out of the way, and keeps your grades and GPA in the same view of school.
            </p>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-label">Due today</span>
              <strong>{priority.dueToday.length}</strong>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-label">Load</span>
              <strong>{priority.todayLoad}m</strong>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-label">Streak</span>
              <strong>{streak}d</strong>
            </div>
          </div>
        </header>

        {activeView === 'dashboard' ? (
          <div className="view-grid">
            <div className="dashboard-column">
              <SectionCard title="Daily Brief" subtitle="What needs your attention" icon={AlertCircle} accent="warm">
                <div className="brief-grid">
                  <div className="metric-card">
                    <span>Overdue</span>
                    <strong>{priority.overdue.length}</strong>
                  </div>
                  <div className="metric-card">
                    <span>Due today</span>
                    <strong>{priority.dueToday.length}</strong>
                  </div>
                  <div className="metric-card">
                    <span>Lock-In zone</span>
                    <strong>{priority.lockIn.length}</strong>
                  </div>
                  <div className="metric-card">
                    <span>Coming up</span>
                    <strong>{priority.comingUp.length}</strong>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Overdue" subtitle="Clear this first" icon={AlertCircle} accent="danger">
                {priority.overdue.length ? (
                  <div className="stack-list">
                    {priority.overdue.map((task) => (
                      <TaskRow key={task.id} task={task} classes={classes} onToggleDone={handleToggleDone} onDelete={handleDeleteTask} />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">Nothing overdue. Keep it that way.</div>
                )}
              </SectionCard>

              <SectionCard title="Due Today" subtitle="Must submit or finish" icon={Clock3} accent="hot">
                {priority.dueToday.length ? (
                  <div className="stack-list">
                    {priority.dueToday.map((task) => (
                      <TaskRow key={task.id} task={task} classes={classes} onToggleDone={handleToggleDone} onDelete={handleDeleteTask} />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">No due-today tasks right now.</div>
                )}
              </SectionCard>

              <SectionCard title="Lock-In Zone" subtitle="Worth active work next" icon={Flame} accent="electric">
                {priority.lockIn.length ? (
                  <div className="stack-list">
                    {priority.lockIn.map((task) => (
                      <TaskRow key={task.id} task={task} classes={classes} onToggleDone={handleToggleDone} onDelete={handleDeleteTask} />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">The engine is intentionally holding future work back right now.</div>
                )}
              </SectionCard>

              <SectionCard title="Coming Up" subtitle="Awareness, not pressure" icon={CalendarDays} accent="cool">
                {priority.comingUp.length ? (
                  <div className="stack-list">
                    {priority.comingUp.map((task) => (
                      <TaskRow key={task.id} task={task} classes={classes} onToggleDone={handleToggleDone} onDelete={handleDeleteTask} />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">Nothing in the next two weeks yet.</div>
                )}
              </SectionCard>
            </div>

            <div className="dashboard-rail">
              <SectionCard title="Momentum" subtitle="Consistency view" icon={Flame} accent="neutral">
                <div className="streak-card">
                  <div>
                    <span className="small-label">Current streak</span>
                    <strong>{streak} weekdays</strong>
                  </div>
                  <TaskPill label={weekProgress.allWeekdaysComplete ? 'Week clean' : 'In progress'} tone={weekProgress.allWeekdaysComplete ? 'good' : 'muted'} />
                </div>
                <div className="week-strip">
                  {weekProgress.days.map((day) => (
                    <div
                      key={day.date}
                      className={`day-chip ${day.isToday ? 'today' : ''} ${day.completed === true ? 'done' : ''} ${day.completed === false ? 'missed' : ''}`}
                    >
                      <span>{day.dayName}</span>
                      <strong>{day.tasksDue}</strong>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Class Health" subtitle="Where grades stand" icon={BookOpen} accent="neutral">
                {classes.length ? (
                  <>
                    <div className="chart-wrap">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={gradeChartData} barCategoryGap={18}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} />
                          <YAxis domain={[0, 100]} stroke="#64748b" tickLine={false} axisLine={false} width={28} />
                          <Tooltip
                            cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                            contentStyle={{
                              background: '#111827',
                              border: '1px solid rgba(148,163,184,0.22)',
                              borderRadius: '12px',
                              color: '#e5eefb',
                            }}
                          />
                          <Bar dataKey="grade" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mini-class-list">
                      {classSnapshot.map((course) => (
                        <div key={course.id} className={`mini-class tone-${course.tone}`}>
                          <div className="mini-class-top">
                            <span className="mini-class-name">{course.name}</span>
                            <strong>{course.currentGrade || '--'}%</strong>
                          </div>
                          <p>{course.nextTask ? `Next: ${course.nextTask.title} ${formatRelativeDate(course.nextTask.dueDate).toLowerCase()}` : 'No active assignments right now.'}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="empty-state">Add classes to unlock grade tracking.</div>
                )}
              </SectionCard>
            </div>
          </div>
        ) : null}

        {activeView === 'tasks' ? (
          <div className="view-grid single-focus">
            <div className="dashboard-column">
              <SectionCard title="Add Task" subtitle="Capture work fast" icon={Plus} accent="neutral">
                <form className="form-grid" onSubmit={handleTaskSubmit}>
                  <label className="field-group wide">
                    <span>Task title</span>
                    <input
                      className="field"
                      value={taskForm.title}
                      onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Unit 7 problem set"
                    />
                  </label>

                  <label className="field-group">
                    <span>Class</span>
                    <select
                      className="field select-field"
                      value={selectedTaskClassId}
                      onChange={(event) => setTaskForm((current) => ({ ...current, classId: event.target.value }))}
                    >
                      <option value="">Select class</option>
                      {classes.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field-group">
                    <span>Type</span>
                    <select
                      className="field select-field"
                      value={taskForm.type}
                      onChange={(event) => setTaskForm((current) => ({ ...current, type: event.target.value }))}
                    >
                      <option value="homework">Homework</option>
                      <option value="quiz">Quiz</option>
                      <option value="test">Test</option>
                      <option value="exam">Exam</option>
                      <option value="project">Project</option>
                      <option value="essay">Essay</option>
                      <option value="lab">Lab</option>
                      <option value="other">Other</option>
                    </select>
                  </label>

                  <label className="field-group">
                    <span>Due date</span>
                    <input
                      className="field"
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))}
                    />
                  </label>

                  <label className="field-group">
                    <span>Minutes</span>
                    <input
                      className="field"
                      type="number"
                      min="5"
                      step="5"
                      value={taskForm.estimatedMinutes}
                      onChange={(event) => setTaskForm((current) => ({ ...current, estimatedMinutes: event.target.value }))}
                    />
                  </label>

                  <label className="field-group wide">
                    <span>Notes</span>
                    <textarea
                      className="field textarea"
                      value={taskForm.notes}
                      onChange={(event) => setTaskForm((current) => ({ ...current, notes: event.target.value }))}
                      placeholder="What actually needs to get done?"
                    />
                  </label>

                  <div className="form-actions wide">
                    <button type="submit" className="primary-button" disabled={!classes.length}>
                      <Plus size={16} />
                      <span>Add task</span>
                    </button>
                    {!classes.length ? <p className="inline-hint">Add a class first so tasks have context.</p> : null}
                  </div>
                </form>
              </SectionCard>

              <SectionCard title="Bulk Add" subtitle="Paste a batch" icon={ListTodo} accent="neutral">
                <form className="bulk-import" onSubmit={handleBulkImport}>
                  <textarea
                    className="field textarea bulk-textarea"
                    value={bulkText}
                    onChange={(event) => setBulkText(event.target.value)}
                    placeholder={bulkImportExample}
                  />
                  <div className="form-actions">
                    <button type="submit" className="secondary-button" disabled={!bulkText.trim()}>
                      <Plus size={16} />
                      <span>Import assignments</span>
                    </button>
                  </div>
                </form>
              </SectionCard>

              <SectionCard title="All Active Work" subtitle="Everything not done yet" icon={ListTodo} accent="neutral">
                {activeTasks.length ? (
                  <div className="stack-list">
                    {activeTasks
                      .slice()
                      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                      .map((task) => (
                        <TaskRow key={task.id} task={task} classes={classes} onToggleDone={handleToggleDone} onDelete={handleDeleteTask} />
                      ))}
                  </div>
                ) : (
                  <div className="empty-state with-actions">
                    <p>No active tasks yet.</p>
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        ) : null}

        {activeView === 'classes' ? (
          <div className="view-grid single-focus">
            <div className="dashboard-column">
              <SectionCard title="Add Class" subtitle="Set up your schedule" icon={BookOpen} accent="neutral">
                <form className="form-grid" onSubmit={handleClassSubmit}>
                  <label className="field-group wide">
                    <span>Class name</span>
                    <input
                      className="field"
                      value={classForm.name}
                      onChange={(event) => setClassForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="AP Biology"
                    />
                  </label>

                  <label className="field-group">
                    <span>Current grade</span>
                    <input
                      className="field"
                      type="number"
                      min="0"
                      max="100"
                      value={classForm.currentGrade}
                      onChange={(event) => setClassForm((current) => ({ ...current, currentGrade: event.target.value }))}
                      placeholder="92"
                    />
                  </label>

                  <label className="field-group">
                    <span>Target grade</span>
                    <input
                      className="field"
                      type="number"
                      min="0"
                      max="100"
                      value={classForm.targetGrade}
                      onChange={(event) => setClassForm((current) => ({ ...current, targetGrade: event.target.value }))}
                      placeholder="95"
                    />
                  </label>

                  <label className="field-group">
                    <span>Level</span>
                    <select
                      className="field select-field"
                      value={classForm.level}
                      onChange={(event) => setClassForm((current) => ({ ...current, level: event.target.value }))}
                    >
                      <option value="Standard">Standard</option>
                      <option value="Honors">Honors</option>
                      <option value="AP">AP</option>
                      <option value="DE">DE</option>
                    </select>
                  </label>

                  <label className="field-group">
                    <span>Credits</span>
                    <input
                      className="field"
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={classForm.credits}
                      onChange={(event) => setClassForm((current) => ({ ...current, credits: event.target.value }))}
                    />
                  </label>

                  <div className="form-actions wide">
                    <button type="submit" className="primary-button">
                      <Plus size={16} />
                      <span>Add class</span>
                    </button>
                    <button type="button" className="ghost-button" onClick={clearAllData}>
                      Clear all
                    </button>
                  </div>
                </form>
              </SectionCard>

              <SectionCard title="Class Overview" subtitle="Academic health by course" icon={GraduationCap} accent="neutral">
                {classSnapshot.length ? (
                  <div className="class-card-list">
                    {classSnapshot.map((course) => (
                      <article key={course.id} className={`class-card tone-${course.tone}`}>
                        <div className="class-card-top">
                          <div className="class-id">
                            <span className="class-swatch" style={{ background: course.color }} />
                            <div>
                              <h4>{course.name}</h4>
                              <p>
                                {course.level} · {course.credits} credit{Number(course.credits) === 1 ? '' : 's'}
                              </p>
                            </div>
                          </div>
                          <button type="button" className="icon-button danger" onClick={() => handleDeleteClass(course.id)} aria-label={`Delete ${course.name}`}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="class-grade-line">
                          <strong>{course.currentGrade || '--'}%</strong>
                          <span>Target {course.targetGrade || '--'}%</span>
                        </div>
                        <div className="class-card-footer">
                          <TaskPill label={`${course.upcomingCount} active task${course.upcomingCount === 1 ? '' : 's'}`} tone="muted" />
                          <span>{course.nextTask ? `${course.nextTask.title} · ${formatRelativeDate(course.nextTask.dueDate)}` : 'No upcoming work'}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">No classes yet. Add your courses and LockIn will connect tasks and grade health.</div>
                )}
              </SectionCard>
            </div>
          </div>
        ) : null}

        {activeView === 'gpa' ? (
          <div className="view-grid">
            <div className="dashboard-column">
              <SectionCard title="Weighted GPA Planner" subtitle="Graduation projection" icon={GraduationCap} accent="neutral">
                <div className="gpa-summary-row">
                  <div className="gpa-summary-card">
                    <span>Prior GPA</span>
                    <strong>{(72.01 / 19.0).toFixed(2)}</strong>
                    <p>19.0 credits · 72.01 quality points</p>
                  </div>
                  <div className="gpa-summary-card highlight">
                    <span>End of junior year</span>
                    <strong>{juniorProjection.gpa}</strong>
                    <p>{juniorProjection.totalCredits} total credits</p>
                  </div>
                  <div className="gpa-summary-card accent">
                    <span>Graduation GPA</span>
                    <strong>{seniorProjection.gpa}</strong>
                    <p>{seniorProjection.totalCredits} total credits</p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Junior Year" subtitle="Weighted projection inputs" icon={BookOpen} accent="neutral">
                <div className="gpa-grid">
                  {juniorCourses.map((course) => (
                    <GradeSelect
                      key={course.name}
                      course={course}
                      value={juniorGrades[course.name]}
                      onChange={(event) =>
                        setJuniorGrades((current) => ({
                          ...current,
                          [course.name]: event.target.value,
                        }))
                      }
                    />
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Senior Year" subtitle="Final graduation scenario" icon={BookOpen} accent="neutral">
                <div className="gpa-grid">
                  {seniorCourses.map((course) => (
                    <GradeSelect
                      key={course.name}
                      course={course}
                      value={seniorGrades[course.name]}
                      onChange={(event) =>
                        setSeniorGrades((current) => ({
                          ...current,
                          [course.name]: event.target.value,
                        }))
                      }
                    />
                  ))}
                </div>
              </SectionCard>
            </div>

            <div className="dashboard-rail">
              <SectionCard title="Why it matters" subtitle="Daily work to long-term outcome" icon={Target} accent="neutral">
                <div className="insight-stack">
                  <div className="insight-card">
                    <span className="small-label">Current projection</span>
                    <strong>{seniorProjection.gpa}</strong>
                    <p>Your GPA planner now lives beside the workload that actually drives it.</p>
                  </div>
                  <div className="insight-card">
                    <span className="small-label">Use with classes</span>
                    <p>Track weak classes in the Classes tab, then use Dashboard priorities to decide what gets effort today.</p>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

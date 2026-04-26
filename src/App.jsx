import React, { useState, useEffect } from 'react';
import './App.css';

// ─── LCPS Grade Scale ───────────────────────────────────
const gradeScale = {
  "A+": 4.3, "A": 4.0, "A-": 3.7,
  "B+": 3.3, "B": 3.0, "B-": 2.7,
  "C+": 2.3, "C": 2.0, "C-": 1.7,
  "D+": 1.3, "D": 1.0, "D-": 0.7,
  "F": 0.0
};

// ─── Course Definitions ─────────────────────────────────
// weight: 1.0 = AP/DE, 0.5 = Honors, 0.0 = Standard
const juniorCourses = [
  { name: "AP Calculus BC",         weight: 1.0, type: "ap" },
  { name: "AP Eng Language & Comp", weight: 1.0, type: "ap" },
  { name: "AP Psychology",          weight: 1.0, type: "ap" },
  { name: "AP Comp Sci Principles", weight: 1.0, type: "ap" },
  { name: "Adv Cyber Ops H",       weight: 0.5, type: "honors" },
  { name: "Physics H",             weight: 0.5, type: "honors" },
];

const seniorCourses = [
  { name: "Economics/Personal Fin",   weight: 0.0, type: "standard" },
  { name: "AP Eng Lit & Comp",       weight: 1.0, type: "ap" },
  { name: "Film Studies/Analysis",    weight: 0.0, type: "standard" },
  { name: "AP Computer Science A",   weight: 1.0, type: "ap" },
  { name: "Multi Calculus DE",       weight: 1.0, type: "de" },
  { name: "AP Physics C: Mechanics", weight: 1.0, type: "ap" },
];

// ─── GradeSelect Component ─────────────────────────────
function GradeSelect({ id, course, value, onChange }) {
  const typeLabels = { ap: "AP +1.0", honors: "H +0.5", de: "DE +1.0", standard: "STD" };
  return (
    <div className="grade-row" id={`row-${id}`}>
      <div className="course-info">
        <span className="course-name">{course.name}</span>
        <span className={`weight-tag ${course.type}`}>{typeLabels[course.type]}</span>
      </div>
      <div className="grade-select-wrapper">
        <select
          id={`select-${id}`}
          className="grade-select"
          value={value}
          onChange={onChange}
          aria-label={`Grade for ${course.name}`}
        >
          {Object.keys(gradeScale).map(grade => (
            <option key={grade} value={grade}>{grade}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Main GPA Calculator ───────────────────────────────
export default function App() {
  // Hardcoded base stats (through Sophomore year)
  const baseCredits = 19.0;
  const basePoints = 72.01;

  // Junior Year grade state — default grades from user spec
  const [juniorGrades, setJuniorGrades] = useState({
    "AP Calculus BC": "C+",
    "AP Eng Language & Comp": "B+",
    "AP Psychology": "A-",
    "AP Comp Sci Principles": "A",
    "Adv Cyber Ops H": "A-",
    "Physics H": "A",
  });

  // Senior Year grade state — all default to A
  const [seniorGrades, setSeniorGrades] = useState({
    "Economics/Personal Fin": "A",
    "AP Eng Lit & Comp": "A",
    "Film Studies/Analysis": "A",
    "AP Computer Science A": "A",
    "Multi Calculus DE": "A",
    "AP Physics C: Mechanics": "A",
  });

  // Calculated values
  const [juniorGPA, setJuniorGPA] = useState("0.00");
  const [juniorTotalCredits, setJuniorTotalCredits] = useState(0);
  const [juniorTotalPoints, setJuniorTotalPoints] = useState(0);
  const [seniorGPA, setSeniorGPA] = useState("0.00");
  const [seniorTotalCredits, setSeniorTotalCredits] = useState(0);

  // ─── Junior Year Calculation ───────────────────────────
  useEffect(() => {
    let currentPoints = 0;
    juniorCourses.forEach(course => {
      const gradeVal = gradeScale[juniorGrades[course.name]] ?? 0;
      currentPoints += gradeVal + course.weight;
    });

    const newTotalCredits = baseCredits + juniorCourses.length;
    const newTotalPoints = basePoints + currentPoints;

    setJuniorTotalCredits(newTotalCredits);
    setJuniorTotalPoints(newTotalPoints);
    setJuniorGPA((newTotalPoints / newTotalCredits).toFixed(2));
  }, [juniorGrades]);

  // ─── Senior Year Calculation (chained from Junior) ─────
  useEffect(() => {
    let currentPoints = 0;
    seniorCourses.forEach(course => {
      const gradeVal = gradeScale[seniorGrades[course.name]] ?? 0;
      currentPoints += gradeVal + course.weight;
    });

    const finalTotalCredits = juniorTotalCredits + seniorCourses.length;
    const finalTotalPoints = juniorTotalPoints + currentPoints;

    setSeniorTotalCredits(finalTotalCredits);
    setSeniorGPA(finalTotalCredits > 0 ? (finalTotalPoints / finalTotalCredits).toFixed(2) : "0.00");
  }, [seniorGrades, juniorTotalCredits, juniorTotalPoints]);

  // ─── Handlers ──────────────────────────────────────────
  const handleJuniorChange = (courseName, val) =>
    setJuniorGrades(prev => ({ ...prev, [courseName]: val }));

  const handleSeniorChange = (courseName, val) =>
    setSeniorGrades(prev => ({ ...prev, [courseName]: val }));

  // ─── Render ────────────────────────────────────────────
  return (
    <div className="app-container">
      {/* Header */}
      <header className="header" id="header">
        <div className="header-content">
          <div className="header-icon">🎓</div>
          <h1>Academic GPA Tracker</h1>
          <p className="header-subtitle">Projecting your path to graduation</p>
          <div className="header-divider" />
        </div>
      </header>

      {/* Base Stats Banner */}
      <div className="base-stats-banner" id="base-stats">
        <div className="base-stat">
          Prior Credits: <span className="base-stat-value">{baseCredits}</span>
        </div>
        <div className="base-stat">
          Prior Quality Pts: <span className="base-stat-value">{basePoints}</span>
        </div>
        <div className="base-stat">
          Prior GPA: <span className="base-stat-value">{(basePoints / baseCredits).toFixed(2)}</span>
        </div>
      </div>

      {/* Main Card Body */}
      <main className="card-body">

        {/* ── Junior Year ── */}
        <section className="year-section" id="junior-section">
          <div className="section-header">
            <span className="section-icon">📘</span>
            <h2 className="section-title">Junior Year Projections</h2>
            <span className="section-badge">{juniorCourses.length} Courses</span>
          </div>

          <div className="course-grid" id="junior-courses">
            {juniorCourses.map(course => (
              <GradeSelect
                key={course.name}
                id={`junior-${course.name.replace(/\s+/g, '-').toLowerCase()}`}
                course={course}
                value={juniorGrades[course.name]}
                onChange={e => handleJuniorChange(course.name, e.target.value)}
              />
            ))}
          </div>

          <div className="gpa-result junior" id="junior-gpa-result">
            <div>
              <div className="gpa-result-label">End of Junior Year Cumulative GPA</div>
              <div className="gpa-result-sublabel">Weighted · LCPS 4.0 Scale</div>
            </div>
            <div className="gpa-value-container">
              <span className="gpa-value" key={juniorGPA}>{juniorGPA}</span>
              <span className="gpa-credits">{juniorTotalCredits} credits</span>
            </div>
          </div>
        </section>

        {/* ── Divider ── */}
        <div className="section-divider">
          <span className="section-divider-icon">⬇</span>
        </div>

        {/* ── Senior Year ── */}
        <section className="year-section" id="senior-section">
          <div className="section-header">
            <span className="section-icon">📗</span>
            <h2 className="section-title">Senior Year Projections</h2>
            <span className="section-badge">{seniorCourses.length} Courses</span>
          </div>

          <div className="course-grid" id="senior-courses">
            {seniorCourses.map(course => (
              <GradeSelect
                key={course.name}
                id={`senior-${course.name.replace(/\s+/g, '-').toLowerCase()}`}
                course={course}
                value={seniorGrades[course.name]}
                onChange={e => handleSeniorChange(course.name, e.target.value)}
              />
            ))}
          </div>

          <div className="gpa-result senior" id="senior-gpa-result">
            <div>
              <div className="gpa-result-label">Final Graduation Cumulative GPA</div>
              <div className="gpa-result-sublabel">Weighted · LCPS 4.0 Scale</div>
            </div>
            <div className="gpa-value-container">
              <span className="gpa-value" key={seniorGPA}>{seniorGPA}</span>
              <span className="gpa-credits">{seniorTotalCredits} credits</span>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="footer" id="footer">
        <p className="footer-text">
          Based on the LCPS weighted 4.0 grading scale · AP/DE +1.0 · Honors +0.5
          <br />
          Base stats: {baseCredits} credits &amp; {basePoints} quality points through Sophomore year
        </p>
      </footer>
    </div>
  );
}

"use strict";

(function () {
  const app = document.getElementById("app");
  const BANK = Array.isArray(window.QUESTION_BANK) ? window.QUESTION_BANK.filter(q => q.verified) : [];
  const Engine = window.PermitEngine;
  const STORE_KEY = "massachusetts-permit-prep-v1";
  const LETTERS = ["A", "B", "C", "D"];
  let deferredInstallPrompt = null;
  let view = "home";
  let flash = "";
  let resultId = null;
  let manualSource = null;
  let study = null;

  function emptyStore() {
    return { profile: null, history: [], seenIds: [], missedCounts: {}, activeTest: null };
  }

  function loadStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY));
      if (!parsed || typeof parsed !== "object") return emptyStore();
      return Object.assign(emptyStore(), parsed);
    } catch (_) {
      return emptyStore();
    }
  }

  let data = loadStore();

  function saveStore() {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function shuffle(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function questionById(id) {
    return BANK.find(q => q.id === id);
  }

  function shell(body, options = {}) {
    const showBack = Boolean(options.showBack);
    const title = options.title || "Massachusetts Permit Prep";
    const subtitle = options.subtitle || "Official Massachusetts manual practice";
    const flashMessage = flash;
    flash = "";
    return `
      <div class="shell">
        <header class="topbar">
          ${showBack ? `<button class="icon-button" data-action="back-home" aria-label="Return home">←</button>` : `<div class="mark" aria-hidden="true"><span>MA</span></div>`}
          <div class="brand"><strong>${esc(title)}</strong><small>${esc(subtitle)}</small></div>
        </header>
        ${flashMessage ? `<div class="notice error" role="alert">${esc(flashMessage)}</div>` : ""}
        ${body}
        <footer class="footer-note">
          <span>Original practice questions verified against the Massachusetts Driver's Manual, Revised April 2026. This is not an official RMV exam.</span>
          <strong class="drawz-brand">DRAWZ PRODUCTIONS</strong>
        </footer>
      </div>`;
  }

  function render() {
    flash = "";
    if (!data.profile) return renderWelcome();
    if (view === "home") return renderHome();
    if (view === "test-intro") return renderTestIntro();
    if (view === "test") return renderTest();
    if (view === "results") return renderResults();
    if (view === "history") return renderHistory();
    if (view === "topics") return renderTopics();
    if (view === "study") return renderStudy();
    if (view === "manual") return renderManual();
    renderHome();
  }

  function renderWelcome() {
    app.innerHTML = shell(`
      <section class="card">
        <p class="eyebrow">Massachusetts Class D</p>
        <h1>Ready to practice?</h1>
        <p class="lede">Enter the learner's name. Scores and progress will stay saved on this device.</p>
        <form id="profile-form">
          <div class="form-row">
            <label for="learner-name">Learner's name</label>
            <input id="learner-name" name="name" maxlength="40" autocomplete="name" required />
          </div>
          <button class="button" type="submit">Save and Continue</button>
        </form>
      </section>
    `);
    document.getElementById("learner-name").focus();
  }

  function renderHome() {
    const passes = data.history.filter(item => item.passed).length;
    const latest = data.history[0];
    const readiness = passes >= 5
      ? `<div class="notice success"><strong>NOW YOU ARE READY TO SCHEDULE FOR THE REAL PERMIT TEST!!!</strong></div>`
      : `<div class="notice">${5 - passes} more passed ${5 - passes === 1 ? "test" : "tests"} to reach the readiness milestone.</div>`;
    const resume = data.activeTest
      ? `<button class="menu-button" data-action="resume-test"><span class="menu-icon">↻</span><span class="menu-copy"><strong>Resume Full Test</strong><small>Continue at Question ${data.activeTest.index + 1} of 25</small></span></button>`
      : "";

    app.innerHTML = shell(`
      <section class="home-screen">
        <p class="eyebrow">Welcome back, ${esc(data.profile.name)}</p>
        <h1>Permit practice that remembers.</h1>
        <p class="lede">Take a realistic full test or study one topic at a time.</p>
        <div class="stats" aria-label="Progress summary">
          <div class="stat"><strong>${data.history.length}</strong><span>Tests taken</span></div>
          <div class="stat"><strong>${passes}</strong><span>Tests passed</span></div>
          <div class="stat"><strong>${latest ? latest.score + "/25" : "—"}</strong><span>Latest score</span></div>
        </div>
        ${readiness}
        <div class="menu">
          ${resume}
          <button class="menu-button" data-action="new-test"><span class="menu-icon">25</span><span class="menu-copy"><strong>Start Full Test</strong><small>25 questions with no help until the end</small></span></button>
          <button class="menu-button" data-action="topics"><span class="menu-icon">✓</span><span class="menu-copy"><strong>Study by Topic</strong><small>Get feedback after every answer</small></span></button>
          <button class="menu-button" data-action="review-mistakes" ${Object.keys(data.missedCounts).length ? "" : "disabled"}><span class="menu-icon">↺</span><span class="menu-copy"><strong>Review Mistakes</strong><small>Practice questions missed before</small></span></button>
          <button class="menu-button" data-action="history"><span class="menu-icon">▤</span><span class="menu-copy"><strong>Test History</strong><small>See every saved score</small></span></button>
          <button class="menu-button" data-action="manual-index"><span class="menu-icon">§</span><span class="menu-copy"><strong>Read Manual Material</strong><small>Tap a topic and review the rule behind it</small></span></button>
          <button class="menu-button" data-action="install"><span class="menu-icon">↓</span><span class="menu-copy"><strong>Install This App</strong><small>Add it to a phone's Home Screen</small></span></button>
        </div>
        <div class="actions two">
          <button class="button ghost" data-action="edit-name">Change Name</button>
          <button class="button ghost" data-action="confirm-reset">Reset History</button>
        </div>
      </section>
    `);
  }

  function renderTestIntro() {
    app.innerHTML = shell(`
      <section class="card">
        <p class="eyebrow">Full Test Mode</p>
        <h1>25 questions. Running score.</h1>
        <div class="notice"><strong>The real test allows 25 minutes.</strong><br />Set a 25-minute timer now if you want real test conditions.</div>
        <p class="muted">Choose an answer, then press Next. You can change your selection as many times as needed before pressing Next. Only then will that answer lock, be recorded as correct or wrong, and be added to the running totals. The correct answer and explanation stay hidden until the test ends. You may skip any question, including the first, but you cannot skip two questions in a row. A skipped question is placed back later in this same test and does not count as wrong.</p>
        <div class="actions">
          <button class="button" data-action="begin-test">Begin Question 1</button>
          <button class="button ghost" data-action="back-home">Not Yet</button>
        </div>
      </section>
    `, {showBack:true, title:"Full Test", subtitle:"Real-test conditions"});
  }

  function generateTest() {
    const generated = Engine.createTest(BANK, data.seenIds);
    if (generated.cycleReset) data.seenIds = [];
    return {
      id: "test-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      startedAt: new Date().toISOString(),
      index: 0,
      questions: generated.questions,
      answers: {},
      gradedQuestionIds: [],
      lastActionWasSkip: false,
      lastResult: null,
      nextSeenIds: generated.nextSeenIds
    };
  }

  function runningCounts(test) {
    let correct = 0;
    let wrong = 0;
    const gradedIds = new Set(Array.isArray(test.gradedQuestionIds) ? test.gradedQuestionIds : []);
    Object.entries(test.answers || {}).forEach(([id, answerId]) => {
      if (!gradedIds.has(id)) return;
      const question = questionById(id);
      if (!question) return;
      if (answerId === question.correct) correct += 1;
      else wrong += 1;
    });
    return {correct, wrong, answered: correct + wrong};
  }

  function recordCurrentAnswer(test) {
    const questionId = test.questions[test.index].id;
    const answerId = test.answers[questionId];
    if (!answerId || (test.gradedQuestionIds || []).includes(questionId)) return null;
    test.gradedQuestionIds = Array.isArray(test.gradedQuestionIds) ? test.gradedQuestionIds : [];
    test.gradedQuestionIds.push(questionId);
    const correct = answerId === questionById(questionId).correct;
    test.lastResult = correct ? "Correct" : "Wrong";
    return correct;
  }

  function renderTest() {
    const test = data.activeTest;
    if (!test || !Array.isArray(test.questions) || test.questions.length !== 25) {
      data.activeTest = null;
      saveStore();
      view = "home";
      flash = "That test could not be restored. Start a new test.";
      return renderHome();
    }
    const item = test.questions[test.index];
    const question = questionById(item.id);
    if (!question) {
      data.activeTest = null;
      saveStore();
      view = "home";
      return renderHome();
    }
    const answer = test.answers[question.id];
    const answerFinal = Array.isArray(test.gradedQuestionIds) && test.gradedQuestionIds.includes(question.id);
    const counts = runningCounts(test);
    const options = item.optionIds.map(id => question.options.find(o => o.id === id));
    const choices = options.map((option, index) => `
      <button class="choice ${answer === option.id ? "selected" : ""}" data-action="answer-test" data-option="${esc(option.id)}" aria-pressed="${answer === option.id}" ${answerFinal ? "disabled" : ""}>
        <span class="choice-letter">${LETTERS[index]}</span><span>${esc(option.text)}</span>
      </button>`).join("");
    app.innerHTML = shell(`
      <section class="card">
        <p class="eyebrow">Question ${test.index + 1} of 25</p>
        <div class="progress" aria-label="Test progress"><span style="width:${((test.index + 1) / 25) * 100}%"></span></div>
        <div class="running-score" aria-live="polite">
          <span class="correct-count">Correct: <strong>${counts.correct}</strong>/18</span>
          <span class="wrong-count">Wrong: <strong>${counts.wrong}</strong>/8</span>
        </div>
        <h2 class="question">${esc(question.prompt)}</h2>
        <div class="choices">${choices}</div>
        ${test.lastResult ? `<div class="notice ${test.lastResult === "Correct" ? "success" : "error"}" role="status"><strong>Previous answer: ${test.lastResult}.</strong> Running total: ${counts.correct} correct and ${counts.wrong} wrong. ${18 - counts.correct} more correct answer${18 - counts.correct === 1 ? "" : "s"} passes the test; ${8 - counts.wrong} more wrong answer${8 - counts.wrong === 1 ? "" : "s"} ends it.</div>` : ""}
      </section>
      <div class="sticky-actions">
        <button class="button secondary" data-action="previous-question" ${test.index === 0 ? "disabled" : ""}>Back</button>
        <button class="button ghost" data-action="skip-question" ${test.lastActionWasSkip || test.index === 24 ? "disabled" : ""}>Skip Question</button>
        <button class="button" data-action="next-question">${test.index === 24 ? "Finish Test" : "Next"}</button>
      </div>
    `, {title:"Full Test", subtitle:`Question ${test.index + 1} of 25`});
  }

  function submitTest(endedEarly = false, endReason = "") {
    const test = data.activeTest;
    const unanswered = test.questions.filter(item => !test.answers[item.id]);
    if (!endedEarly && unanswered.length) {
      flash = `Answer all 25 questions first. ${unanswered.length} ${unanswered.length === 1 ? "is" : "are"} still unanswered.`;
      const firstIndex = test.questions.findIndex(item => !test.answers[item.id]);
      test.index = firstIndex;
      saveStore();
      return renderTest();
    }

    const grade = Engine.gradeTest(BANK, test);
    grade.missed.forEach(miss => { data.missedCounts[miss.id] = (data.missedCounts[miss.id] || 0) + 1; });

    const completed = {
      id: test.id,
      learner: data.profile.name,
      startedAt: test.startedAt,
      completedAt: new Date().toISOString(),
      score: grade.score,
      percentage: grade.percentage,
      passed: grade.passed,
      questions: test.questions,
      answers: test.answers,
      missed: grade.missed,
      topicMisses: grade.topicMisses,
      correctCount: grade.score,
      wrongCount: grade.missed.length,
      answeredCount: grade.score + grade.missed.length,
      endedEarly,
      endReason,
      manualVersion: "Massachusetts Driver's Manual - Revised April 2026"
    };
    data.history.unshift(completed);
    data.seenIds = endedEarly
      ? Array.from(new Set(data.seenIds.concat(Object.keys(test.answers))))
      : (test.nextSeenIds || Array.from(new Set(data.seenIds.concat(test.questions.map(item => item.id)))));
    data.activeTest = null;
    resultId = completed.id;
    saveStore();
    view = "results";
    renderResults();
  }

  function renderResults() {
    const result = data.history.find(item => item.id === resultId) || data.history[0];
    if (!result) { view = "home"; return renderHome(); }
    const statusClass = result.passed ? "pass" : "fail";
    const weak = Object.entries(result.topicMisses || {}).sort((a,b) => b[1] - a[1]).slice(0,3);
    const review = result.missed.length ? result.missed.map((miss, i) => {
      const q = questionById(miss.id);
      const chosen = q.options.find(o => o.id === miss.answerId);
      const correct = q.options.find(o => o.id === q.correct);
      return `<article class="card review-item wrong">
        <p class="eyebrow">Missed Question ${i + 1}</p>
        <h3>${esc(q.prompt)}</h3>
        <p class="answer-line">Your answer: <strong>${esc(chosen ? chosen.text : "No answer")}</strong></p>
        <p class="answer-line">Correct answer: <strong>${esc(correct.text)}</strong></p>
        <p>${esc(q.explanation)}</p>
        ${manualButton(q)}
      </article>`;
    }).join("") : `<div class="notice success"><strong>Perfect score. No missed questions to review.</strong></div>`;
    const passes = data.history.filter(item => item.passed).length;

    app.innerHTML = shell(`
      <section class="result-title">
        <p class="eyebrow">Test Complete</p>
        <div class="score-ring ${statusClass}"><div><strong>${result.score}/25</strong><span>${result.percentage}%</span></div></div>
        <span class="status ${statusClass}">${result.passed ? "PASS" : "NOT YET PASSING"}</span>
        <h2>${result.passed ? "You passed this practice test." : "Keep practicing. You are building it."}</h2>
      </section>
      ${result.endedEarly ? `<div class="notice ${result.passed ? "success" : "error"}"><strong>${esc(result.endReason)}</strong><br />Final running total: ${result.correctCount} correct and ${result.wrongCount} wrong. Unanswered questions were not counted as wrong.</div>` : ""}
      ${passes >= 5 ? `<div class="notice success"><strong>NOW YOU ARE READY TO SCHEDULE FOR THE REAL PERMIT TEST!!!</strong></div>` : ""}
      ${weak.length ? `<section class="card compact"><h3>Weakest topics on this test</h3><p class="muted">${weak.map(([name,count]) => `${esc(name)} (${count})`).join(" • ")}</p></section>` : ""}
      <section><h2>Review</h2>${review}</section>
      <div class="actions two">
        <button class="button secondary" data-action="back-home">Return Home</button>
        <button class="button" data-action="new-test">New Test</button>
      </div>
    `, {showBack:true, title:"Test Results", subtitle:result.endedEarly ? `${result.correctCount} correct • ${result.wrongCount} wrong` : `${result.score} correct out of 25`});
  }

  function renderHistory() {
    const rows = data.history.length ? data.history.map(item => {
      const date = new Date(item.completedAt);
      return `<div class="history-row">
        <span class="status ${item.passed ? "pass" : "fail"}">${item.passed ? "PASS" : "REVIEW"}</span>
        <div class="history-meta"><strong>${esc(item.learner)}</strong><small>${esc(date.toLocaleString([], {dateStyle:"medium", timeStyle:"short"}))}</small></div>
        <button class="icon-button history-score" data-action="open-result" data-id="${esc(item.id)}" aria-label="Open result ${item.score} out of 25">${item.score}/25</button>
      </div>`;
    }).join("") : `<div class="card"><p class="muted">No completed tests yet.</p></div>`;
    app.innerHTML = shell(`<section><p class="eyebrow">Saved on this device</p><h1>Test history</h1><div class="history-list">${rows}</div></section>`, {showBack:true, title:"Test History", subtitle:`${data.history.length} completed`});
  }

  function categories() {
    return Array.from(new Set(BANK.map(q => q.category))).sort();
  }

  function renderTopics() {
    const buttons = categories().map(category => {
      const count = BANK.filter(q => q.category === category).length;
      return `<button class="button secondary topic-button" data-action="start-topic" data-topic="${esc(category)}">${esc(category)} <span class="tiny">(${count})</span></button>`;
    }).join("");
    app.innerHTML = shell(`<section><p class="eyebrow">Study Mode</p><h1>Choose a topic.</h1><p class="lede">You will see the correct answer and a simple explanation after each question.</p><div class="topic-grid">${buttons}</div></section>`, {showBack:true, title:"Study by Topic", subtitle:"Feedback after each answer"});
  }

  function startStudy(pool, label) {
    if (!pool.length) {
      flash = "There are no questions available for that study set.";
      view = "home";
      return renderHome();
    }
    study = {pool:shuffle(pool.map(q => q.id)), position:0, label, answered:null, optionIds:null};
    prepareStudyQuestion();
    view = "study";
    renderStudy();
  }

  function prepareStudyQuestion() {
    const q = questionById(study.pool[study.position % study.pool.length]);
    study.answered = null;
    study.optionIds = shuffle(q.options.map(o => o.id));
  }

  function renderStudy() {
    if (!study) { view = "topics"; return renderTopics(); }
    const q = questionById(study.pool[study.position % study.pool.length]);
    const chosenId = study.answered;
    const answered = Boolean(chosenId);
    const choices = study.optionIds.map((id,index) => {
      const option = q.options.find(o => o.id === id);
      let stateClass = "";
      if (answered && id === q.correct) stateClass = "good";
      else if (answered && id === chosenId) stateClass = "bad";
      return `<button class="choice ${stateClass}" data-action="answer-study" data-option="${esc(id)}" ${answered ? "disabled" : ""}><span class="choice-letter">${LETTERS[index]}</span><span>${esc(option.text)}</span></button>`;
    }).join("");
    const feedback = answered ? `<div class="notice ${chosenId === q.correct ? "success" : "error"}"><strong>${chosenId === q.correct ? "Correct." : "Not quite."}</strong> ${esc(q.explanation)}${manualButton(q)}</div>` : "";
    app.innerHTML = shell(`
      <section class="card">
        <p class="eyebrow">${esc(study.label)} • Question ${study.position + 1}</p>
        <h2 class="question">${esc(q.prompt)}</h2>
        <div class="choices">${choices}</div>
        ${feedback}
      </section>
      <div class="sticky-actions">
        <button class="button secondary" data-action="back-home">Finish</button>
        <button class="button" data-action="next-study" ${answered ? "" : "disabled"}>Next Question</button>
      </div>
    `, {showBack:true, title:"Study Mode", subtitle:study.label});
  }

  function sourceKey(source) {
    return [source.chapter, source.section, source.manualPage, source.pdfPage].join("|");
  }

  function manualButton(question) {
    return `<button class="source-button" data-action="open-manual" data-source="${esc(sourceKey(question.source))}">
      <span>Read manual material</span>
      <small>Chapter ${esc(question.source.chapter)}, ${esc(question.source.section)}, printed page ${question.source.manualPage} (PDF page ${question.source.pdfPage})</small>
    </button>`;
  }

  function manualSections() {
    const grouped = new Map();
    BANK.forEach(question => {
      const key = sourceKey(question.source);
      if (!grouped.has(key)) {
        grouped.set(key, {source: question.source, questions: []});
      }
      grouped.get(key).questions.push(question);
    });
    return Array.from(grouped.values()).sort((a, b) => {
      if (a.source.chapter !== b.source.chapter) return Number(a.source.chapter) - Number(b.source.chapter);
      return a.source.manualPage - b.source.manualPage || a.source.section.localeCompare(b.source.section);
    });
  }

  function renderManual() {
    const sections = manualSections();
    const selected = manualSource
      ? sections.find(section => sourceKey(section.source) === manualSource)
      : null;

    if (!selected) {
      const rows = sections.map(section => `
        <button class="manual-row" data-action="open-manual" data-source="${esc(sourceKey(section.source))}">
          <strong>${esc(section.source.section)}</strong>
          <span>Chapter ${esc(section.source.chapter)} • printed page ${section.source.manualPage} • ${section.questions.length} ${section.questions.length === 1 ? "question" : "questions"}</span>
        </button>
      `).join("");
      app.innerHTML = shell(`
        <section>
          <p class="eyebrow">Manual Material</p>
          <h1>Read by topic.</h1>
          <p class="lede">These are the manual sections used by the practice questions. Tap any topic to review the rule before practicing.</p>
          <div class="manual-list">${rows}</div>
        </section>
      `, {showBack:true, title:"Manual Material", subtitle:"Source topics"});
      return;
    }

    const source = selected.source;
    const rules = selected.questions.map(question => `<li>${esc(question.explanation)}</li>`).join("");
    const related = selected.questions.map(question => `<li>${esc(question.prompt)}</li>`).join("");
    app.innerHTML = shell(`
      <section class="card manual-card">
        <p class="eyebrow">Chapter ${esc(source.chapter)}</p>
        <h1>${esc(source.section)}</h1>
        <p class="source plain">Printed page ${source.manualPage}; PDF page ${source.pdfPage}. Source: Massachusetts Driver's Manual, Revised April 2026.</p>
        <h2>What to read for</h2>
        <ul class="study-list">${rules}</ul>
        <h2>Practice questions using this material</h2>
        <ul class="study-list">${related}</ul>
        <div class="actions two">
          <button class="button secondary" data-action="manual-index">All Topics</button>
          <button class="button" data-action="start-manual-study" data-source="${esc(sourceKey(source))}">Practice This Material</button>
        </div>
      </section>
    `, {showBack:true, title:"Manual Material", subtitle:source.section});
  }

  function showModal(title, body, actions) {
    const wrapper = document.createElement("div");
    wrapper.className = "modal-backdrop";
    wrapper.setAttribute("role", "presentation");
    wrapper.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">${esc(title)}</h2><div>${body}</div><div class="actions two">${actions}</div></section>`;
    document.body.appendChild(wrapper);
    const first = wrapper.querySelector("button");
    if (first) first.focus();
  }

  function closeModal(button) {
    const backdrop = button.closest(".modal-backdrop");
    if (backdrop) backdrop.remove();
  }

  app.addEventListener("submit", function (event) {
    if (event.target.id !== "profile-form") return;
    event.preventDefault();
    const name = new FormData(event.target).get("name").trim();
    if (!name) return;
    data.profile = {name, createdAt:new Date().toISOString()};
    saveStore();
    view = "home";
    render();
  });

  app.addEventListener("click", async function (event) {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    const action = button.dataset.action;

    if (action === "back-home") {
      if (view === "test" && data.activeTest) {
        showModal("Leave this test?", "<p>Your answers are saved. You can resume from the Home screen.</p>", `<button class="button secondary" data-modal-action="close">Keep Testing</button><button class="button" data-modal-action="leave-test">Save and Leave</button>`);
        return;
      }
      view = "home"; study = null; manualSource = null; render(); return;
    }
    if (action === "new-test") { view = "test-intro"; render(); return; }
    if (action === "resume-test") { view = "test"; render(); return; }
    if (action === "begin-test") {
      try { data.activeTest = generateTest(); saveStore(); view = "test"; render(); }
      catch (error) { flash = error.message; view = "home"; renderHome(); }
      return;
    }
    if (action === "answer-test") {
      const test = data.activeTest;
      const qid = test.questions[test.index].id;
      if (Array.isArray(test.gradedQuestionIds) && test.gradedQuestionIds.includes(qid)) return;
      test.answers[qid] = button.dataset.option;
      test.lastActionWasSkip = false;
      test.lastResult = null;
      saveStore(); renderTest(); return;
    }
    if (action === "previous-question") { data.activeTest.index -= 1; saveStore(); renderTest(); return; }
    if (action === "skip-question") {
      const test = data.activeTest;
      if (test.lastActionWasSkip) { flash = "Answer this question before using Skip again."; return renderTest(); }
      const skipped = test.questions.splice(test.index, 1)[0];
      const firstAllowedPosition = Math.min(test.index + 1, test.questions.length);
      const lastPosition = test.questions.length;
      const insertAt = firstAllowedPosition + Math.floor(Math.random() * (lastPosition - firstAllowedPosition + 1));
      test.questions.splice(insertAt, 0, skipped);
      test.lastActionWasSkip = true;
      test.lastResult = null;
      saveStore(); renderTest(); return;
    }
    if (action === "next-question") {
      const test = data.activeTest;
      const qid = test.questions[test.index].id;
      if (!test.answers[qid]) { flash = "Choose an answer before continuing."; return renderTest(); }
      recordCurrentAnswer(test);
      const counts = runningCounts(test);
      if (counts.correct >= 18) { submitTest(true, "You reached 18 correct answers, so this test ended automatically."); return; }
      if (counts.wrong >= 8) { submitTest(true, "You reached 8 wrong answers, so this test ended automatically."); return; }
      if (test.index < 24) { test.index += 1; saveStore(); renderTest(); }
      else showModal("Submit this test?", "<p>You answered all 25 questions. After submission, your score and explanations will appear.</p>", `<button class="button secondary" data-modal-action="close">Review Answers</button><button class="button" data-modal-action="submit-test">Submit Test</button>`);
      return;
    }
    if (action === "history") { view = "history"; render(); return; }
    if (action === "open-result") { resultId = button.dataset.id; view = "results"; render(); return; }
    if (action === "topics") { view = "topics"; render(); return; }
    if (action === "manual-index") { manualSource = null; view = "manual"; renderManual(); return; }
    if (action === "open-manual") { manualSource = button.dataset.source; view = "manual"; renderManual(); return; }
    if (action === "start-manual-study") {
      const section = manualSections().find(item => sourceKey(item.source) === button.dataset.source);
      startStudy(section ? section.questions : [], section ? section.source.section : "Manual Material");
      return;
    }
    if (action === "start-topic") { startStudy(BANK.filter(q => q.category === button.dataset.topic), button.dataset.topic); return; }
    if (action === "review-mistakes") {
      const pool = Object.keys(data.missedCounts).map(questionById).filter(Boolean);
      startStudy(pool, "Review Mistakes"); return;
    }
    if (action === "answer-study") { study.answered = button.dataset.option; renderStudy(); return; }
    if (action === "next-study") { study.position += 1; prepareStudyQuestion(); renderStudy(); return; }
    if (action === "edit-name") {
      showModal("Change learner name", `<form id="rename-form"><div class="form-row"><label for="new-name">Learner's name</label><input id="new-name" name="name" maxlength="40" value="${esc(data.profile.name)}" required /></div><p class="muted">Saving a different name starts a clean practice history for that learner.</p></form>`, `<button class="button secondary" data-modal-action="close">Cancel</button><button class="button" data-modal-action="save-name">Save Name</button>`); return;
    }
    if (action === "confirm-reset") {
      showModal("Reset all progress?", "<p>This permanently removes the learner profile, test history, saved answers, and missed-question progress from this device.</p>", `<button class="button secondary" data-modal-action="close">Cancel</button><button class="button danger" data-modal-action="reset">Reset Everything</button>`); return;
    }
    if (action === "install") {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
      } else {
        showModal("Install this app", "<p><strong>iPhone:</strong> Open this page in Safari, tap Share, then tap Add to Home Screen.</p><p><strong>Android:</strong> Open the browser menu and tap Install app or Add to Home screen.</p>", `<button class="button" data-modal-action="close">Got It</button>`);
      }
    }
  });

  document.body.addEventListener("click", function (event) {
    const button = event.target.closest("[data-modal-action]");
    if (!button) return;
    const action = button.dataset.modalAction;
    if (action === "close") { closeModal(button); return; }
    if (action === "leave-test") { closeModal(button); view = "home"; render(); return; }
    if (action === "submit-test") { closeModal(button); submitTest(); return; }
    if (action === "reset") {
      closeModal(button); localStorage.removeItem(STORE_KEY); data = emptyStore(); view = "home"; study = null; resultId = null; render(); return;
    }
    if (action === "save-name") {
      const form = document.getElementById("rename-form");
      if (!form.reportValidity()) return;
      const name = new FormData(form).get("name").trim();
      if (!name) return;
      const oldName = data.profile.name;
      data.profile.name = name;
      if (name !== oldName) {
        data.history = [];
        data.seenIds = [];
        data.missedCounts = {};
        data.activeTest = null;
        study = null;
        resultId = null;
        view = "home";
      }
      saveStore(); closeModal(button); render();
    }
  });

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    deferredInstallPrompt = event;
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("./sw.js").catch(function () {}); });
  }

  render();
})();

/* Beginner-friendly loop: explain picture → one action → feedback */

(() => {
  const $ = (id) => document.getElementById(id);
  const SAVE = "canary-mine-progress";

  const titleScreen = $("title-screen");
  const gameScreen = $("game-screen");
  const winScreen = $("win-screen");
  const mineCanvas = $("mine-canvas");
  const stepEl = $("step");
  const titleEl = $("title");
  const explainEl = $("explain");
  const todoEl = $("todo");
  const feedbackEl = $("feedback");
  const choicesEl = $("choices");
  const formEl = $("term-form");
  const inputEl = $("term-input");
  const btnNext = $("btn-next");
  const btnHint = $("btn-hint");
  const btnReset = $("btn-reset");
  const btnContinue = $("btn-continue");
  const progressNote = $("progress-note");
  const stackView = $("stack-view");

  const state = {
    levelIndex: 0,
    tick: 0,
    inputBytes: [],
    fillRatio: 0,
    birdAlive: true,
    guardOn: true,
    derived: false,
    exitCorrupted: false,
    escaped: false,
    canaryValue: "BIRD",
    bufferSize: 8,
    offByOne: false,
    nulHazard: false,
    animating: false,
    locked: false,
    levelComplete: false,
    highlightBird: false,
  };

  function levels() {
    return window.LEVELS;
  }

  function L() {
    return levels()[state.levelIndex];
  }

  function loadProgress() {
    const n = parseInt(localStorage.getItem(SAVE) || "0", 10);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(n, levels().length));
  }

  function saveProgress(i) {
    localStorage.setItem(SAVE, String(i));
  }

  function show(screen) {
    [titleScreen, gameScreen, winScreen].forEach((s) => s.classList.remove("active"));
    screen.classList.add("active");
  }

  function clearFeedback() {
    feedbackEl.hidden = true;
    feedbackEl.textContent = "";
    feedbackEl.classList.remove("bad");
  }

  function feedback(msg, bad) {
    feedbackEl.hidden = false;
    feedbackEl.textContent = msg;
    feedbackEl.classList.toggle("bad", !!bad);
  }

  function paint() {
    // keep stack stub updated for renderer helpers, but user never sees it
    if (window.Render && stackView) Render.renderStack(stackView, state);
  }

  function win(msg) {
    state.levelComplete = true;
    state.locked = true;
    feedback(msg, false);
    btnNext.hidden = false;
    inputEl.disabled = true;
    saveProgress(state.levelIndex + 1);
  }

  function retry() {
    const cur = L();
    state.inputBytes = [];
    state.fillRatio = 0;
    state.birdAlive = true;
    state.guardOn = cur.guardOn !== false;
    state.exitCorrupted = false;
    state.escaped = false;
    state.animating = false;
    state.locked = false;
    state.levelComplete = false;
    state.highlightBird = cur.kind === "find";
    state.bufferSize = cur.bufferSize || 8;
    if (cur.scene === "noguard") state.guardOn = false;
    if (cur.scene === "safe") {
      state.escaped = true;
      state.guardOn = true;
    }

    stepEl.textContent = `Step ${cur.id} of ${levels().length}`;
    titleEl.textContent = cur.name;
    explainEl.textContent = cur.explain;
    todoEl.textContent = cur.todo;
    clearFeedback();
    btnNext.hidden = true;
    inputEl.disabled = false;
    inputEl.value = "";
    choicesEl.innerHTML = "";
    choicesEl.hidden = true;
    formEl.hidden = true;

    if (cur.kind === "choice") {
      choicesEl.hidden = false;
      cur.choices.forEach((c) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn choice";
        b.textContent = c.label;
        b.onclick = () => {
          if (state.locked || state.levelComplete) return;
          if (c.ok) {
            b.classList.add("good");
            win(cur.success);
          } else {
            feedback("Not that one. Still on this step — try another.", true);
          }
        };
        choicesEl.appendChild(b);
      });
    } else {
      formEl.hidden = false;
      inputEl.focus();
    }
    paint();
  }

  function start(i) {
    state.levelIndex = i;
    if (i >= levels().length) {
      saveProgress(levels().length);
      show(winScreen);
      return;
    }
    saveProgress(i);
    show(gameScreen);
    retry();
  }

  function onAnswer(raw) {
    if (state.locked || state.levelComplete) return;
    const cur = L();
    const str = (raw || "").trim();
    if (!str) return;

    if (cur.kind === "find") {
      if (str.toLowerCase().replace(/\s+/g, "") === "canary") {
        state.highlightBird = true;
        win(cur.success);
      } else {
        feedback('Still this step. Type the word "canary".', true);
      }
      return;
    }

    // reset visuals for a new try
    state.birdAlive = true;
    state.exitCorrupted = false;
    state.escaped = false;
    state.guardOn = cur.guardOn !== false;
    if (cur.scene === "noguard") state.guardOn = false;

    const bytes = [...str].map((ch) => ch.charCodeAt(0) & 0xff);
    const buf = state.bufferSize;
    const overflow = Math.max(0, bytes.length - buf);
    state.inputBytes = bytes;
    state.locked = true;
    inputEl.disabled = true;

    let step = 0;
    const target = Math.max(bytes.length / buf, 0.05);
    state.fillRatio = 0;
    state.animating = true;
    const timer = setInterval(() => {
      step++;
      state.fillRatio = target * (step / 10);
      if (step >= 10) {
        clearInterval(timer);
        state.animating = false;
        finish(cur, overflow);
      }
    }, 45);
  }

  function finish(cur, overflow) {
    if (cur.kind === "safe") {
      if (overflow <= 0) {
        state.birdAlive = true;
        state.escaped = true;
        win(cur.success);
      } else {
        state.birdAlive = false;
        state.locked = false;
        inputEl.disabled = false;
        inputEl.value = "";
        inputEl.focus();
        feedback("That was too long — still Step 2. Try a shorter name.", true);
      }
    } else if (cur.kind === "smash") {
      if (overflow > 0) {
        state.birdAlive = false;
        win(cur.success);
      } else {
        state.locked = false;
        inputEl.disabled = false;
        inputEl.value = "";
        inputEl.focus();
        feedback("Need a longer string so the “gas” reaches the bird.", true);
      }
    } else if (cur.kind === "hijack") {
      if (overflow > 8) {
        state.guardOn = false;
        state.exitCorrupted = true;
        win(cur.success);
      } else {
        state.locked = false;
        inputEl.disabled = false;
        inputEl.value = "";
        inputEl.focus();
        feedback("Still Step 4. Type a longer string (20+ letters).", true);
      }
    }
    paint();
  }

  function refreshTitle() {
    const p = loadProgress();
    if (p > 0 && p < levels().length) {
      btnContinue.hidden = false;
      btnContinue.textContent = `Keep going (step ${p + 1})`;
      progressNote.textContent = `Saved progress: step ${p + 1} of ${levels().length}`;
      $("btn-start").textContent = "Start over";
      $("btn-start").classList.remove("primary");
    } else {
      btnContinue.hidden = true;
      progressNote.textContent = "";
      $("btn-start").textContent = "Start from beginning";
      $("btn-start").classList.add("primary");
    }
  }

  function loop() {
    state.tick++;
    Render.drawMine(mineCanvas, {
      ...state,
      highlightBird: state.highlightBird && state.birdAlive,
    });
    requestAnimationFrame(loop);
  }

  $("btn-start").onclick = () => {
    saveProgress(0);
    start(0);
  };
  btnContinue.onclick = () => start(loadProgress());
  $("btn-replay").onclick = () => {
    saveProgress(0);
    start(0);
  };
  btnNext.onclick = () => start(state.levelIndex + 1);
  btnHint.onclick = () => feedback(L().hint || "", true);
  btnReset.onclick = () => retry();
  $("term-form").onsubmit = (e) => {
    e.preventDefault();
    onAnswer(inputEl.value);
  };

  Render.drawTitleBird($("title-bird"));
  refreshTitle();
  show(titleScreen);
  loop();
})();

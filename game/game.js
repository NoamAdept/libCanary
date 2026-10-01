/* Beginner story + coding challenges with stack animation */

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
  const stackPanel = $("stack-panel");
  const legendEl = $("legend");
  const codeSnip = $("code-snip");

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
    canaryValue: "B1RD00",
    bufferSize: 8,
    offByOne: false,
    nulHazard: false,
    animating: false,
    locked: false,
    levelComplete: false,
    highlightBird: false,
  };

  let demoTimer = null;

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
    if (window.Render && stackView) Render.renderStack(stackView, state);
  }

  function stopDemo() {
    if (demoTimer) {
      clearInterval(demoTimer);
      demoTimer = null;
    }
  }

  function runDemo(str) {
    stopDemo();
    const bytes = [...str].map((ch) => ch.charCodeAt(0) & 0xff);
    const buf = state.bufferSize;
    state.inputBytes = [];
    state.fillRatio = 0;
    state.birdAlive = true;
    state.exitCorrupted = false;
    state.escaped = false;
    state.guardOn = L().guardOn !== false;
    if (L().scene === "noguard") state.guardOn = false;

    let step = 0;
    const target = Math.max(bytes.length / buf, 0.05);
    state.animating = true;
    demoTimer = setInterval(() => {
      step++;
      state.fillRatio = target * (step / 12);
      state.inputBytes = bytes.slice(0, Math.ceil((bytes.length * step) / 12));
      const overflow = Math.max(0, state.inputBytes.length - buf);
      if (overflow > 0 && state.guardOn) state.birdAlive = false;
      if (overflow > 8 && !state.guardOn) state.exitCorrupted = true;
      if (overflow <= 0 && step >= 12) state.escaped = true;
      paint();
      if (step >= 12) {
        stopDemo();
        state.animating = false;
        paint();
      }
    }, 55);
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
    stopDemo();
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
    state.highlightBird = !!(cur.highlightBird || cur.kind === "find");
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

    // viz mode
    const coding = !!cur.showStack;
    stackPanel.hidden = !coding;
    legendEl.hidden = coding; // keep picture legend for story; stack label for coding
    if (cur.codeSnippet) {
      codeSnip.hidden = false;
      codeSnip.textContent = cur.codeSnippet;
    } else {
      codeSnip.hidden = true;
      codeSnip.textContent = "";
    }

    paint();

    if (cur.autoDemo && cur.demoInput) {
      runDemo(cur.demoInput);
    }

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
            feedback("Not that one — still this step. Try again.", true);
          }
        };
        choicesEl.appendChild(b);
      });
    } else {
      formEl.hidden = false;
      inputEl.focus();
    }
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

  function normalize(s) {
    return s.toLowerCase().replace(/\s+/g, "");
  }

  function onAnswer(raw) {
    if (state.locked || state.levelComplete) return;
    const cur = L();
    const str = (raw || "").trim();
    if (!str) return;

    if (cur.kind === "find") {
      if (normalize(str) === "canary") {
        state.highlightBird = true;
        win(cur.success);
      } else {
        feedback('Still this step. Type the word "canary".', true);
      }
      return;
    }

    if (cur.kind === "fill") {
      const ok =
        normalize(str) === normalize(cur.answer) ||
        (cur.altAnswers || []).some((a) => normalize(str) === normalize(a));
      if (ok) {
        state.escaped = true;
        state.birdAlive = true;
        paint();
        win(cur.success);
      } else {
        feedback("Not quite — still this step. Hint: the buffer length.", true);
      }
      return;
    }

    // interactive buffer challenges (story)
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
      paint();
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
        feedback("Too long — still this step. Try a shorter name.", true);
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
        feedback("Need a longer string so gas reaches the bird.", true);
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
        feedback("Still this step. Type 20+ letters.", true);
      }
    }
    paint();
  }

  function refreshTitle() {
    const p = loadProgress();
    if (p > 0 && p < levels().length) {
      btnContinue.hidden = false;
      btnContinue.textContent = `Keep going (step ${p + 1})`;
      progressNote.textContent = `Saved: step ${p + 1} of ${levels().length}`;
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

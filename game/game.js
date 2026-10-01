/* CANARY MINE — full-screen split + progress that survives fails */

(() => {
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "canary-mine-progress";

  const titleScreen = $("title-screen");
  const gameScreen = $("game-screen");
  const winScreen = $("win-screen");
  const mineCanvas = $("mine-canvas");
  const stackView = $("stack-view");
  const termWrap = $("terminal");
  const termOutput = $("term-output");
  const termInput = $("term-input");
  const termForm = $("term-form");
  const choicesEl = $("choices");
  const dialogueEl = $("dialogue");
  const goalEl = $("goal");
  const factEl = $("fact");
  const levelLabel = $("level-label");
  const canaryStatus = $("canary-status");
  const guardStatus = $("guard-status");
  const codeView = $("code-view");
  const binaryName = $("binary-name");
  const btnNext = $("btn-next");
  const btnHint = $("btn-hint");
  const btnReset = $("btn-reset");
  const btnContinue = $("btn-continue");
  const progressNote = $("progress-note");

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
    canaryValue: "C4A10000", // ponytail: fake glibc-style NUL-low nibble for teaching display
    bufferSize: 8,
    offByOne: false,
    nulHazard: false,
    animating: false,
    locked: false,
    levelComplete: false,
    highlightBird: false,
  };

  function lvl() {
    return window.LEVELS[state.levelIndex];
  }

  function loadProgress() {
    const n = parseInt(localStorage.getItem(SAVE_KEY) || "0", 10);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(n, window.LEVELS.length));
  }

  function saveProgress(i) {
    localStorage.setItem(SAVE_KEY, String(i));
  }

  function show(screen) {
    [titleScreen, gameScreen, winScreen].forEach((s) => s.classList.remove("active"));
    screen.classList.add("active");
  }

  function say(text) {
    dialogueEl.textContent = text;
  }

  function clearTerm() {
    termOutput.innerHTML = "";
  }

  function term(lines) {
    lines.forEach(({ cls, text }) => {
      const div = document.createElement("div");
      if (cls) div.className = cls;
      div.textContent = text;
      termOutput.appendChild(div);
    });
    termOutput.scrollTop = termOutput.scrollHeight;
  }

  function hud() {
    const L = lvl();
    levelLabel.textContent = `CH.${L.id}/${window.LEVELS.length} ${L.name}`;
    goalEl.textContent = L.goal;
    factEl.textContent = L.fact || "";
    if (!state.guardOn) {
      canaryStatus.textContent = "NO BIRD";
      canaryStatus.className = "status off";
    } else {
      canaryStatus.textContent = state.birdAlive ? "ALIVE" : "DEAD";
      canaryStatus.className = `status ${state.birdAlive ? "alive" : "dead"}`;
    }
    guardStatus.textContent = state.guardOn ? "GUARD ON" : "GUARD OFF";
    guardStatus.className = `status ${state.guardOn ? "on" : "off"}`;
  }

  function showCode(L) {
    codeView.textContent = (window.LESSON_SOURCES || {})[L.source] || `/* ${L.source} */`;
    binaryName.textContent = L.binary || L.source || "";
  }

  function win(msg) {
    state.levelComplete = true;
    state.locked = true;
    say(msg);
    btnNext.hidden = false;
    termInput.disabled = true;
    // save the *next* challenge so CONTINUE resumes forward
    saveProgress(state.levelIndex + 1);
  }

  /** Retry current challenge only — never jumps back to CH.1 */
  function retryCurrent() {
    const L = lvl();
    state.inputBytes = [];
    state.fillRatio = 0;
    state.birdAlive = true;
    state.guardOn = !!L.guardOn;
    state.derived = false;
    state.bufferSize = L.bufferSize || 8;
    state.exitCorrupted = false;
    state.escaped = false;
    state.offByOne = false;
    state.nulHazard = false;
    state.animating = false;
    state.locked = false;
    state.levelComplete = false;
    state.highlightBird = L.kind === "find";
    state.canaryValue = "C4A10000";
    btnNext.hidden = true;
    termInput.disabled = false;
    termInput.value = "";
    clearTerm();
    choicesEl.innerHTML = "";
    choicesEl.hidden = true;
    termWrap.hidden = true;

    if (L.scene === "noguard") state.guardOn = false;
    if (L.scene === "safe") {
      state.escaped = true;
      state.guardOn = true;
    }

    hud();
    showCode(L);
    say(L.prompt);
    Render.renderStack(stackView, state);

    if (L.kind === "choice") {
      choicesEl.hidden = false;
      L.choices.forEach((c) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "pixel-btn choice";
        b.textContent = c.label;
        b.addEventListener("click", () => {
          if (state.locked || state.levelComplete) return;
          if (c.ok) {
            b.classList.add("good");
            win(L.success);
          } else {
            // wrong choice: stay on this challenge
            say("Not that one — still on this challenge. " + (L.hint || "Try again."));
          }
        });
        choicesEl.appendChild(b);
      });
    } else {
      termWrap.hidden = false;
      if (L.kind === "find") term([{ cls: "sys", text: "What sits between BUFFER and EXIT / RET?" }]);
      else if (L.kind === "safe")
        term([
          { cls: "cyan", text: "$ ./bin/L01_safe_copy" },
          { cls: "sys", text: "name (short):" },
        ]);
      else if (L.kind === "smash")
        term([
          { cls: "cyan", text: "$ ./bin/L02_strcpy_overflow" },
          { cls: "hl", text: "watch epilogue → __stack_chk_fail" },
          { cls: "sys", text: "overflow:" },
        ]);
      else if (L.kind === "hijack")
        term([
          { cls: "err", text: "cc -fno-stack-protector" },
          { cls: "cyan", text: "$ ./bin/L07_guard_off" },
          { cls: "sys", text: "deep overflow:" },
        ]);
    }
    termInput.focus();
  }

  function start(i) {
    state.levelIndex = i;
    if (i >= window.LEVELS.length) {
      saveProgress(window.LEVELS.length);
      show(winScreen);
      return;
    }
    saveProgress(i); // remember where you are even before clearing
    show(gameScreen);
    retryCurrent();
  }

  function softFail(msg) {
    // keep levelIndex; re-enable input; restore bird for next try
    say(msg);
    state.locked = false;
    state.animating = false;
    termInput.disabled = false;
    termInput.value = "";
    termInput.focus();
    // visual: leave smash state visible until they type again / hit RETRY
  }

  function onSubmit(raw) {
    if (state.locked || state.levelComplete) return;
    const L = lvl();
    const str = raw.trim();
    if (!str) return;

    if (L.kind === "find") {
      term([{ text: str }]);
      if (str.toLowerCase().replace(/\s+/g, "") === "canary") {
        state.highlightBird = true;
        win(L.success);
      } else {
        softFail("Still CH.1 — type the bird's name. Hint: canary");
      }
      return;
    }

    // fresh attempt visuals
    state.birdAlive = true;
    state.exitCorrupted = false;
    state.escaped = false;
    state.guardOn = !!L.guardOn;
    if (L.scene === "noguard") state.guardOn = false;

    const bytes = [...str].map((ch) => ch.charCodeAt(0) & 0xff);
    const buf = state.bufferSize;
    const overflow = Math.max(0, bytes.length - buf);
    state.inputBytes = bytes;
    state.animating = true;
    state.locked = true;
    termInput.disabled = true;
    term([{ text: str }]);

    let step = 0;
    const target = Math.max(bytes.length / buf, 0.01);
    state.fillRatio = 0;
    const timer = setInterval(() => {
      step++;
      state.fillRatio = target * (step / 10);
      Render.renderStack(stackView, state);
      if (step >= 10) {
        clearInterval(timer);
        state.animating = false;
        finishBuffer(L, overflow, bytes.length);
      }
    }, 40);
  }

  function finishBuffer(L, overflow, len) {
    if (L.kind === "safe") {
      if (overflow <= 0) {
        state.birdAlive = true;
        state.escaped = true;
        term([
          { cls: "ok", text: `wrote ${len} B into buffer[${state.bufferSize}]` },
          { cls: "ok", text: "canary intact — epilogue OK — exit 0" },
        ]);
        win(L.success);
      } else {
        state.birdAlive = false;
        term([{ cls: "err", text: "too long — canary hit. Still on CH.2 — try a shorter name." }]);
        softFail(L.hint);
      }
    } else if (L.kind === "smash") {
      if (overflow > 0 && state.guardOn) {
        state.birdAlive = false;
        state.escaped = false;
        term([
          { cls: "err", text: `OVERFLOW +${overflow} past buffer` },
          { cls: "err", text: "epilogue: canary mismatch → __stack_chk_fail" },
          { cls: "sys", text: "*** stack smashing detected *** — EXIT unused" },
        ]);
        win(L.success);
      } else {
        term([{ cls: "sys", text: "Still on CH.3 — need a longer string to reach the bird." }]);
        softFail(L.hint);
      }
    } else if (L.kind === "hijack") {
      if (overflow > 8) {
        state.guardOn = false;
        state.exitCorrupted = true;
        term([
          { cls: "err", text: `OVERFLOW +${overflow} — no canary in frame` },
          { cls: "err", text: "return address overwritten (silent)" },
        ]);
        win(L.success);
      } else {
        term([{ cls: "sys", text: "Still on CH.4 — go deeper (20+ chars) to hit RET." }]);
        softFail(L.hint);
      }
    }
    hud();
    Render.renderStack(stackView, state);
  }

  function refreshTitle() {
    const p = loadProgress();
    if (p > 0 && p < window.LEVELS.length) {
      btnContinue.hidden = false;
      progressNote.textContent = `Saved at challenge ${p + 1} of ${window.LEVELS.length}`;
    } else if (p >= window.LEVELS.length) {
      btnContinue.hidden = true;
      progressNote.textContent = "All challenges cleared — START OVER to replay";
    } else {
      btnContinue.hidden = true;
      progressNote.textContent = "";
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
  btnHint.onclick = () => say(lvl().hint || "");
  btnReset.onclick = () => retryCurrent(); // RETRY this challenge only
  termForm.onsubmit = (e) => {
    e.preventDefault();
    onSubmit(termInput.value);
  };

  Render.drawTitleBird($("title-bird"));
  refreshTitle();
  show(titleScreen);
  loop();
})();

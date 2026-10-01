/* CANARY MINE — simple challenge loop */

(() => {
  const $ = (id) => document.getElementById(id);

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
  const levelLabel = $("level-label");
  const canaryStatus = $("canary-status");
  const guardStatus = $("guard-status");
  const codeView = $("code-view");
  const binaryName = $("binary-name");
  const peek = $("peek");
  const btnNext = $("btn-next");
  const btnHint = $("btn-hint");
  const btnReset = $("btn-reset");

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
    canaryValue: "C4A1B170",
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
    levelLabel.textContent = `CH.${L.id} ${L.name}`;
    goalEl.textContent = L.goal;
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
    const src = (window.LESSON_SOURCES || {})[L.source] || `/* ${L.source} */`;
    codeView.textContent = src;
    binaryName.textContent = L.binary || "";
  }

  function win(msg) {
    state.levelComplete = true;
    state.locked = true;
    say(msg);
    btnNext.hidden = false;
    termInput.disabled = true;
  }

  function reset() {
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
    state.canaryValue = "C4A1B170";
    btnNext.hidden = true;
    termInput.disabled = false;
    termInput.value = "";
    clearTerm();
    choicesEl.innerHTML = "";
    choicesEl.hidden = true;
    termWrap.hidden = true;
    peek.open = L.kind === "find" || L.kind === "choice";

    // scene presets for the mine
    if (L.scene === "noguard") {
      state.guardOn = false;
      state.birdAlive = true;
    }
    if (L.scene === "safe") {
      state.escaped = true;
      state.birdAlive = true;
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
            say("Not that one. " + (L.hint || "Try again."));
          }
        });
        choicesEl.appendChild(b);
      });
    } else {
      termWrap.hidden = false;
      if (L.kind === "find") {
        term([{ cls: "sys", text: "What sits between BUFFER and EXIT?" }]);
      } else if (L.kind === "safe") {
        term([
          { cls: "cyan", text: `$ ./bin/L01_safe_copy` },
          { cls: "sys", text: "name (short):" },
        ]);
      } else if (L.kind === "smash") {
        term([
          { cls: "cyan", text: `$ ./bin/L02_strcpy_overflow` },
          { cls: "sys", text: "overflow payload:" },
        ]);
      } else if (L.kind === "hijack") {
        term([
          { cls: "err", text: "compiled -fno-stack-protector" },
          { cls: "cyan", text: `$ ./bin/L07_guard_off` },
          { cls: "sys", text: "deep overflow:" },
        ]);
      }
    }

    termInput.focus();
  }

  function start(i) {
    state.levelIndex = i;
    if (i >= window.LEVELS.length) {
      show(winScreen);
      return;
    }
    show(gameScreen);
    reset();
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
        say("Nope. Hint: it's the yellow bird's job title.");
      }
      return;
    }

    // buffer challenges
    const bytes = [...str].map((ch) => ch.charCodeAt(0) & 0xff);
    const buf = state.bufferSize;
    const overflow = Math.max(0, bytes.length - buf);
    state.inputBytes = bytes;
    state.animating = true;
    state.locked = true;
    termInput.disabled = true;
    term([{ text: str }]);

    let step = 0;
    const target = bytes.length / buf;
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
          { cls: "ok", text: `wrote ${len} bytes into buffer[${state.bufferSize}]` },
          { cls: "ok", text: "canary intact — exit 0" },
        ]);
        win(L.success);
      } else {
        state.birdAlive = false;
        term([{ cls: "err", text: "too long — canary hit. Reset and stay ≤7 chars." }]);
        say(L.hint);
        state.locked = false;
        termInput.disabled = false;
        termInput.value = "";
        termInput.focus();
      }
    } else if (L.kind === "smash") {
      if (overflow > 0 && L.guardOn) {
        state.birdAlive = false;
        state.escaped = false;
        term([
          { cls: "err", text: `OVERFLOW +${overflow}` },
          { cls: "err", text: "*** stack smashing detected ***: aborted" },
          { cls: "sys", text: "EXIT never used — canary did its job" },
        ]);
        win(L.success);
      } else {
        term([{ cls: "sys", text: "Need a longer string to reach the bird." }]);
        say(L.hint);
        state.locked = false;
        termInput.disabled = false;
        termInput.value = "";
        termInput.focus();
      }
    } else if (L.kind === "hijack") {
      if (overflow > 8) {
        state.guardOn = false;
        state.exitCorrupted = true;
        state.escaped = false;
        term([
          { cls: "err", text: `OVERFLOW +${overflow} — no canary installed` },
          { cls: "err", text: "return address overwritten" },
        ]);
        win(L.success);
      } else {
        term([{ cls: "sys", text: "Deeper — push past saved frame to hit RET (20+ chars)." }]);
        say(L.hint);
        state.locked = false;
        termInput.disabled = false;
        termInput.value = "";
        termInput.focus();
      }
    }
    hud();
    Render.renderStack(stackView, state);
  }

  function loop() {
    state.tick++;
    // pass highlight flag for find challenge
    const drawState = { ...state, highlightBird: state.highlightBird && state.birdAlive };
    Render.drawMine(mineCanvas, drawState);
    requestAnimationFrame(loop);
  }

  $("btn-start").onclick = () => start(0);
  $("btn-replay").onclick = () => start(0);
  btnNext.onclick = () => start(state.levelIndex + 1);
  btnHint.onclick = () => say(lvl().hint || "");
  btnReset.onclick = () => reset();
  termForm.onsubmit = (e) => {
    e.preventDefault();
    onSubmit(termInput.value);
  };

  Render.drawTitleBird($("title-bird"));
  show(titleScreen);
  loop();
})();

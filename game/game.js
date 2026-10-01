/* CANARY MINE — main game loop */

(() => {
  const $ = (id) => document.getElementById(id);

  const titleScreen = $("title-screen");
  const gameScreen = $("game-screen");
  const winScreen = $("win-screen");
  const mineCanvas = $("mine-canvas");
  const stackView = $("stack-view");
  const termOutput = $("term-output");
  const termInput = $("term-input");
  const termForm = $("term-form");
  const dialogueEl = $("dialogue");
  const objectiveEl = $("objective");
  const levelLabel = $("level-label");
  const canaryStatus = $("canary-status");
  const guardStatus = $("guard-status");
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
    canaryValue: "A7F3C91D",
    animating: false,
    locked: false,
    levelComplete: false,
  };

  let raf = 0;

  function showScreen(which) {
    [titleScreen, gameScreen, winScreen].forEach((s) => s.classList.remove("active"));
    which.classList.add("active");
  }

  function randomCanary(derived) {
    const base = Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .toUpperCase()
      .padStart(8, "0");
    if (!derived) return base;
    // pretend XOR with frame constant
    const mixed = (parseInt(base, 16) ^ 0xdeadbeef) >>> 0;
    return mixed.toString(16).toUpperCase().padStart(8, "0");
  }

  function currentLevel() {
    return window.LEVELS[state.levelIndex];
  }

  function setDialogue(text) {
    dialogueEl.textContent = text;
  }

  function appendTerm(lines) {
    lines.forEach(({ cls, text }) => {
      const line = document.createElement("div");
      if (cls) line.className = cls;
      line.textContent = text;
      termOutput.appendChild(line);
    });
    termOutput.scrollTop = termOutput.scrollHeight;
  }

  function clearTerm() {
    termOutput.innerHTML = "";
  }

  function updateHud() {
    const lvl = currentLevel();
    levelLabel.textContent = `LV.${lvl.id} ${lvl.name}`;
    objectiveEl.textContent = lvl.objective;
    if (!state.guardOn) {
      canaryStatus.textContent = "BIRD: NONE";
      canaryStatus.className = "status off";
    } else {
      canaryStatus.textContent = state.birdAlive ? "BIRD: ALIVE" : "BIRD: DEAD";
      canaryStatus.className = `status ${state.birdAlive ? "alive" : "dead"}`;
    }
    guardStatus.textContent = state.guardOn ? "GUARD: ON" : "GUARD: OFF";
    guardStatus.className = `status ${state.guardOn ? "on" : "off"}`;
    $("mine-mode").textContent = lvl.highlightStack ? "MAPPED" : "METAPHOR";
    $("stack-mode").textContent = state.derived ? "DERIVED" : "MEMORY";
  }

  function resetLevelState(keepComplete = false) {
    const lvl = currentLevel();
    state.inputBytes = [];
    state.fillRatio = 0;
    state.birdAlive = true;
    state.guardOn = lvl.guardOn;
    state.derived = !!lvl.derived;
    state.exitCorrupted = false;
    state.escaped = false;
    state.canaryValue = randomCanary(state.derived);
    state.animating = false;
    state.locked = false;
    if (!keepComplete) {
      state.levelComplete = false;
      btnNext.hidden = true;
    }
    termInput.disabled = false;
    termInput.value = "";
    updateHud();
    Render.renderStack(stackView, state);
    clearTerm();
    appendTerm(lvl.termIntro);
    setDialogue(lvl.dialogue);
    termInput.focus();
  }

  function startLevel(index) {
    state.levelIndex = index;
    if (index >= window.LEVELS.length) {
      showScreen(winScreen);
      return;
    }
    showScreen(gameScreen);
    resetLevelState(false);
  }

  function encodeInput(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i) & 0xff);
    return bytes;
  }

  function evaluate(str) {
    const lvl = currentLevel();
    const bytes = encodeInput(str);
    const len = bytes.length;
    const overflow = Math.max(0, len - BUFFER_SIZE);

    state.inputBytes = bytes;
    state.fillRatio = len / BUFFER_SIZE;
    state.animating = true;
    state.locked = true;
    termInput.disabled = true;

    appendTerm([{ cls: "", text: str }]);

    // animate fill then resolve
    const steps = 12;
    let step = 0;
    const targetFill = state.fillRatio;
    state.fillRatio = 0;

    const timer = setInterval(() => {
      step++;
      state.fillRatio = targetFill * (step / steps);
      Render.renderStack(stackView, state);

      if (step >= steps) {
        clearInterval(timer);
        state.animating = false;
        resolveOutcome(lvl, overflow, len, str);
      }
    }, 55);
  }

  function resolveOutcome(lvl, overflow, len, str) {
    let outcome = "safe";

    if (overflow <= 0) {
      outcome = "safe";
      state.birdAlive = true;
      state.escaped = true;
      state.exitCorrupted = false;
      appendTerm([
        { cls: "ok", text: `wrote ${len} bytes into buffer[8]` },
        { cls: "ok", text: "canary intact ✓" },
        { cls: "cyan", text: "returning via EXIT → 0x4011ae" },
        { cls: "ok", text: "process exited normally (0)" },
      ]);
    } else if (lvl.guardOn) {
      outcome = "smash";
      state.birdAlive = false;
      state.escaped = false;
      state.exitCorrupted = false;

      appendTerm([
        { cls: "err", text: `OVERFLOW +${overflow} bytes past buffer` },
        { cls: "err", text: "toxic gas reached the canary..." },
      ]);

      if (lvl.showEpilogue) {
        appendTerm([
          { cls: "sys", text: "// function epilogue" },
          { cls: "hl", text: `mov  rax, [canary_slot]   ; ${smashPreview(state.canaryValue)}` },
          { cls: "hl", text: `xor  rax, fs:0x28         ; expected ${state.canaryValue}` },
          { cls: "err", text: "jnz  canary_fail" },
        ]);
      }

      appendTerm([
        { cls: "err", text: "*** stack smashing detected ***: terminated" },
        { cls: "sys", text: "canary_fail() → abort() — EXIT never used" },
      ]);
    } else {
      // guard off
      outcome = overflow > 8 ? "hijack" : "partial";
      state.birdAlive = true; // no bird
      state.escaped = false;
      state.exitCorrupted = overflow > 8;
      appendTerm([
        { cls: "err", text: `OVERFLOW +${overflow} bytes — no canary installed` },
        {
          cls: "err",
          text: state.exitCorrupted
            ? "return address overwritten → control-flow HIJACK"
            : "saved frame clobbered; push deeper to hit RET",
        },
      ]);
      if (state.exitCorrupted) {
        appendTerm([
          { cls: "err", text: "jumping to 0xDEAD!!!! — segfault / exploit" },
          { cls: "sys", text: "without a canary, silence is death" },
        ]);
        outcome = "hijack";
      }
    }

    Render.renderStack(stackView, state);
    updateHud();

    const success = outcome === lvl.unlockNextOn;
    if (success) {
      state.levelComplete = true;
      setDialogue(lvl.successDialogue);
      btnNext.hidden = false;
      appendTerm([{ cls: "hl", text: "▶ LEVEL CLEAR — press NEXT LEVEL" }]);
    } else {
      setDialogue(lvl.failDialogue);
      appendTerm([{ cls: "sys", text: "▶ try again (RESET or type a new input)" }]);
      state.locked = false;
      termInput.disabled = false;
      termInput.value = "";
      // soft reset bird for retry after short delay if they failed smash-needed with safe etc.
      termInput.focus();
    }
  }

  function smashPreview(hex) {
    return hex.slice(0, 2) + "XXXX" + hex.slice(6);
  }

  function loop() {
    state.tick++;
    Render.drawMine(mineCanvas, state);
    raf = requestAnimationFrame(loop);
  }

  // events
  $("btn-start").addEventListener("click", () => startLevel(0));
  $("btn-replay").addEventListener("click", () => startLevel(0));

  btnNext.addEventListener("click", () => {
    startLevel(state.levelIndex + 1);
  });

  btnHint.addEventListener("click", () => {
    setDialogue(currentLevel().hint);
  });

  btnReset.addEventListener("click", () => {
    resetLevelState(false);
  });

  termForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.locked || state.levelComplete) return;
    const val = termInput.value;
    if (!val) return;
    evaluate(val);
  });

  // boot
  Render.drawTitleBird($("title-bird"));
  Render.drawForeman($("foreman"));
  showScreen(titleScreen);
  loop();

  // keep title bird bobbing via redraw occasionally
  setInterval(() => {
    if (titleScreen.classList.contains("active")) {
      Render.drawTitleBird($("title-bird"));
    }
  }, 400);
})();

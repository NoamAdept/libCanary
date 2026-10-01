/* CANARY MINE — main game loop (12 C-lesson levels) */

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
  const codeView = $("code-view");
  const codeFile = $("code-file");
  const compileLine = $("compile-line");
  const binaryName = $("binary-name");
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
    bufferSize: 8,
    offByOne: false,
    nulHazard: false,
    animating: false,
    locked: false,
    levelComplete: false,
  };

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

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function highlightC(src) {
    const lines = src.split("\n");
    return lines
      .map((line) => {
        let escaped = escapeHtml(line);
        const isComment = /^\s*\/\*/.test(line) || /^\s*\*/.test(line) || /^\s\/\//.test(line);
        if (isComment || line.includes("Lesson:") || line.includes("Binary:")) {
          return `<span class="cm">${escaped}</span>`;
        }
        if (/UNSAFE|NEVER|BUG:|gets\s*\(|strcpy\s*\(/.test(line)) {
          return `<span class="bad">${escaped}</span>`;
        }
        escaped = escaped.replace(
          /\b(char|int|void|size_t|uint64_t|return|if|else|for|include|define|sizeof|const|struct)\b/g,
          '<span class="kw">$1</span>'
        );
        escaped = escaped.replace(/(&quot;|")((?:\\.|[^\\])*?)(&quot;|")/g, '<span class="str">$1$2$3</span>');
        return escaped;
      })
      .join("\n");
  }

  function renderCode(lvl) {
    const sources = window.LESSON_SOURCES || {};
    let text = sources[lvl.source] || `/* missing ${lvl.source} — run: make bundle */\n`;
    if (lvl.extraSources) {
      lvl.extraSources.forEach((extra) => {
        if (sources[extra]) {
          text += `\n/* ─── ${extra} ─── */\n` + sources[extra];
        }
      });
    }
    codeFile.textContent = lvl.source;
    compileLine.textContent = lvl.compile || "";
    binaryName.textContent = "./" + (lvl.binary || "vulnerable");
    codeView.innerHTML = highlightC(text);
    codeView.scrollTop = 0;
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

  function resetLevelState() {
    const lvl = currentLevel();
    state.inputBytes = [];
    state.fillRatio = 0;
    state.birdAlive = true;
    state.guardOn = lvl.guardOn;
    state.derived = !!lvl.derived;
    state.bufferSize = lvl.bufferSize || 8;
    state.exitCorrupted = false;
    state.escaped = false;
    state.offByOne = false;
    state.nulHazard = false;
    state.canaryValue = randomCanary(state.derived);
    state.animating = false;
    state.locked = false;
    state.levelComplete = false;
    btnNext.hidden = true;
    termInput.disabled = false;
    termInput.value = "";
    updateHud();
    renderCode(lvl);
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
    resetLevelState();
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
    const bufSize = state.bufferSize;
    const overflow = Math.max(0, len - bufSize);

    state.inputBytes = bytes;
    state.fillRatio = len / bufSize;
    state.offByOne = false;
    state.nulHazard = false;
    state.animating = true;
    state.locked = true;
    termInput.disabled = true;

    appendTerm([{ cls: "", text: str }]);

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
    }, 50);
  }

  function smashPreview(hex) {
    return hex.slice(0, 2) + "XXXX" + hex.slice(6);
  }

  function resolveOutcome(lvl, overflow, len, str) {
    const mode = lvl.mode || "default";
    const bufSize = state.bufferSize;
    let outcome = "safe";

    if (mode === "offbyone") {
      if (len === bufSize) {
        outcome = "offbyone";
        state.offByOne = true;
        state.birdAlive = false;
        state.escaped = false;
        state.fillRatio = 1.05;
        appendTerm([
          { cls: "err", text: `off-by-one: wrote buf[${bufSize}] one past the end` },
          { cls: "err", text: "neighbor byte (canary edge) corrupted" },
          { cls: "err", text: "*** stack smashing detected ***: terminated" },
        ]);
      } else if (len < bufSize) {
        outcome = "safe";
        state.birdAlive = true;
        state.escaped = true;
        appendTerm([
          { cls: "sys", text: `len=${len} < ${bufSize} — buggy bound not triggered` },
          { cls: "ok", text: "no off-by-one this run" },
        ]);
      } else {
        outcome = "smash";
        state.birdAlive = false;
        appendTerm([
          { cls: "err", text: `len=${len} > ${bufSize} — full overflow path` },
          { cls: "err", text: "*** stack smashing detected ***" },
        ]);
      }
    } else if (mode === "nul") {
      if (len >= bufSize) {
        outcome = "nul";
        state.nulHazard = true;
        state.birdAlive = true;
        state.escaped = false;
        state.fillRatio = 1;
        appendTerm([
          { cls: "err", text: `strncpy(buf, src, ${bufSize}) with len=${len}` },
          { cls: "err", text: "NO terminating NUL written into buf" },
          { cls: "err", text: "printf(\"%s\") walks past buffer → memory hazard" },
          { cls: "hl", text: "fix: buf[sizeof(buf)-1] = '\\0';" },
        ]);
      } else {
        outcome = "safe";
        state.birdAlive = true;
        state.escaped = true;
        appendTerm([
          { cls: "ok", text: `len=${len} < ${bufSize} — strncpy added padding NULs` },
          { cls: "sys", text: "pitfall not triggered; use length ≥ 8" },
        ]);
      }
    } else if (overflow <= 0) {
      outcome = "safe";
      state.birdAlive = true;
      state.escaped = true;
      state.exitCorrupted = false;
      appendTerm([
        { cls: "ok", text: `wrote ${len} bytes into buffer[${bufSize}]` },
        { cls: "ok", text: state.guardOn ? "canary intact ✓" : "no canary (guard off) — still within buf" },
        { cls: "cyan", text: `./${lvl.binary} → exit 0` },
      ]);
      if (mode === "safe_api" || mode === "hardened") {
        appendTerm([{ cls: "ok", text: "bounded API path — defender pattern" }]);
      }
      if (state.derived) {
        appendTerm([{ cls: "hl", text: `canary_check() == 0  (slot ${state.canaryValue})` }]);
      }
    } else if (lvl.guardOn) {
      outcome = "smash";
      state.birdAlive = false;
      state.escaped = false;
      state.exitCorrupted = false;
      appendTerm([
        { cls: "err", text: `OVERFLOW +${overflow} bytes past buffer[${bufSize}]` },
        { cls: "err", text: "toxic gas reached the canary..." },
      ]);
      if (lvl.showEpilogue) {
        appendTerm([
          { cls: "sys", text: "// function epilogue (compiler SSP)" },
          { cls: "hl", text: `mov  rax, [canary_slot]   ; ${smashPreview(state.canaryValue)}` },
          { cls: "hl", text: `xor  rax, fs:0x28         ; expected ${state.canaryValue}` },
          { cls: "err", text: "jnz  __stack_chk_fail" },
        ]);
      }
      appendTerm([
        { cls: "err", text: "*** stack smashing detected ***: terminated" },
        { cls: "sys", text: `./${lvl.binary} aborted — EXIT never used` },
      ]);
    } else {
      outcome = overflow > 8 ? "hijack" : "partial";
      state.birdAlive = true;
      state.escaped = false;
      state.exitCorrupted = overflow > 8;
      appendTerm([
        { cls: "err", text: `OVERFLOW +${overflow} bytes — compiled -fno-stack-protector` },
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
          { cls: "sys", text: `./${lvl.binary} — without a canary, silence is death` },
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
      appendTerm([{ cls: "hl", text: `▶ LEVEL ${lvl.id}/12 CLEAR — NEXT LEVEL` }]);
    } else {
      setDialogue(lvl.failDialogue);
      appendTerm([{ cls: "sys", text: "▶ try again (RESET or new input)" }]);
      state.locked = false;
      termInput.disabled = false;
      termInput.value = "";
      termInput.focus();
    }
  }

  function loop() {
    state.tick++;
    Render.drawMine(mineCanvas, state);
    requestAnimationFrame(loop);
  }

  $("btn-start").addEventListener("click", () => startLevel(0));
  $("btn-replay").addEventListener("click", () => startLevel(0));
  btnNext.addEventListener("click", () => startLevel(state.levelIndex + 1));
  btnHint.addEventListener("click", () => setDialogue(currentLevel().hint));
  btnReset.addEventListener("click", () => resetLevelState());

  termForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.locked || state.levelComplete) return;
    const val = termInput.value;
    if (!val) return;
    evaluate(val);
  });

  Render.drawTitleBird($("title-bird"));
  Render.drawForeman($("foreman"));
  showScreen(titleScreen);
  loop();

  setInterval(() => {
    if (titleScreen.classList.contains("active")) {
      Render.drawTitleBird($("title-bird"));
    }
  }, 400);
})();

/* Pixel rendering for CANARY MINE */

const PX = {
  ink: "#0d0a08",
  coal: "#1a1410",
  rock: "#2e241c",
  timber: "#5a3a22",
  timberLite: "#7a5230",
  dirt: "#3a2a1c",
  lantern: "#f0a830",
  lanternCore: "#ffe08a",
  canary: "#ffe566",
  canaryDark: "#c9a800",
  beak: "#ff8a3a",
  eye: "#1a1008",
  toxic: "#6dff4a",
  toxicDeep: "#2f8f28",
  exit: "#5ec8ff",
  exitDark: "#2a6a8a",
  danger: "#ff4a3a",
  bone: "#e8dcc8",
  rail: "#6a5a48",
};

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function drawPixel(ctx, x, y, color, scale = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x * scale, y * scale, scale, scale);
}

function blitSprite(ctx, sprite, ox, oy, scale, palette) {
  for (let y = 0; y < sprite.length; y++) {
    for (let x = 0; x < sprite[y].length; x++) {
      const ch = sprite[y][x];
      if (ch === "." || ch === " ") continue;
      const color = palette[ch];
      if (color) drawPixel(ctx, ox + x, oy + y, color, scale);
    }
  }
}

/* 12x10 canary facing right */
const BIRD = [
  "............",
  "......YY....",
  ".....YYYY...",
  "....EYYYB...",
  "...YYYYYY...",
  "..YYYYYYD...",
  "...YY.YY....",
  "....Y..Y....",
  "............",
  "............",
];

const BIRD_DEAD = [
  "............",
  "......XX....",
  ".....XXXX...",
  "....XXxxX...",
  "...XXXXXX...",
  "..XXXXXX....",
  "...XX.XX....",
  "....X..X....",
  ".....++.....",
  "............",
];

const FOREMAN = [
  "......HHHH..",
  ".....HHHHHH.",
  ".....SKSKS..",
  "......SSSS..",
  ".....BBBBBB.",
  "....BBBBBBBB",
  "....BB.BB.BB",
  ".....PP..PP.",
  ".....PP..PP.",
  ".....FF..FF.",
];

window.Render = {
  drawTitleBird(canvas) {
    const ctx = canvas.getContext("2d");
    const scale = 6;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // glow perch
    ctx.fillStyle = PX.timber;
    ctx.fillRect(16, 78, 64, 8);
    blitSprite(ctx, BIRD, 2, 2, scale, {
      Y: PX.canary,
      E: PX.eye,
      B: PX.beak,
      D: PX.canaryDark,
    });
  },

  drawForeman(canvas) {
    const ctx = canvas.getContext("2d");
    const scale = 4;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = PX.coal;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    blitSprite(ctx, FOREMAN, 0, 1, scale, {
      H: PX.lantern,
      S: "#d4a574",
      K: PX.eye,
      B: "#3a5070",
      P: "#2a3040",
      F: "#1a1810",
    });
  },

  drawMine(canvas, state) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const scale = 4; // logical 120x60
    const lw = W / scale;
    const lh = H / scale;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);

    // background rock
    ctx.fillStyle = PX.coal;
    ctx.fillRect(0, 0, W, H);

    // brick / seam pattern
    for (let y = 0; y < lh; y++) {
      for (let x = 0; x < lw; x++) {
        if ((x + y * 3) % 11 === 0) drawPixel(ctx, x, y, PX.rock, scale);
        if ((x * 5 + y) % 17 === 0) drawPixel(ctx, x, y, PX.dirt, scale);
      }
    }

    // tunnel floor & ceiling timbers
    for (let x = 0; x < lw; x++) {
      drawPixel(ctx, x, 8, PX.timber, scale);
      drawPixel(ctx, x, 9, PX.timberLite, scale);
      drawPixel(ctx, x, 50, PX.timber, scale);
      drawPixel(ctx, x, 51, PX.rail, scale);
    }
    // vertical supports
    for (const sx of [8, 40, 72, 104]) {
      for (let y = 10; y < 50; y++) {
        drawPixel(ctx, sx, y, PX.timber, scale);
        drawPixel(ctx, sx + 1, y, PX.timberLite, scale);
      }
    }

    // lanterns
    const flicker = state.tick % 20 < 12 ? PX.lanternCore : PX.lantern;
    drawPixel(ctx, 20, 14, flicker, scale);
    drawPixel(ctx, 21, 14, PX.lantern, scale);
    drawPixel(ctx, 84, 14, flicker, scale);

    // zones: buffer (left), canary perch (mid), exit (right)
    // buffer crate zone
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#6b4a2e";
    ctx.fillRect(12 * scale, 20 * scale, 36 * scale, 28 * scale);
    ctx.globalAlpha = 1;

    // exit door
    ctx.fillStyle = state.exitCorrupted ? PX.danger : PX.exitDark;
    ctx.fillRect(96 * scale, 22 * scale, 16 * scale, 26 * scale);
    ctx.fillStyle = state.exitCorrupted ? "#ff8080" : PX.exit;
    ctx.fillRect(98 * scale, 24 * scale, 12 * scale, 22 * scale);
    // door window
    ctx.fillStyle = state.exitCorrupted ? "#400000" : "#0a2030";
    ctx.fillRect(102 * scale, 28 * scale, 4 * scale, 4 * scale);

    // labels (tiny)
    ctx.fillStyle = PX.bone;
    ctx.font = "10px monospace";
    ctx.fillText("BUFFER", 14 * scale, 18 * scale);
    ctx.fillText(state.exitCorrupted ? "HIJACKED" : "EXIT/RET", 94 * scale, 18 * scale);

    // cargo / gas fill in buffer based on fillRatio 0..1+
    const fill = Math.min(state.fillRatio, 1.6);
    const gasHeight = Math.floor(26 * Math.min(fill, 1));
    if (gasHeight > 0) {
      const color = fill > 1 ? PX.toxic : "#8a6238";
      ctx.globalAlpha = fill > 1 ? 0.75 : 0.55;
      ctx.fillStyle = color;
      const top = (46 - gasHeight) * scale;
      ctx.fillRect(14 * scale, top, 32 * scale, gasHeight * scale);
      ctx.globalAlpha = 1;
    }

    // overflow gas creeping toward bird / exit
    if (fill > 1) {
      const creep = Math.min((fill - 1) / 0.6, 1); // 0..1 across mid
      const gasW = Math.floor(40 * creep);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = PX.toxic;
      ctx.fillRect(48 * scale, 28 * scale, gasW * scale, 18 * scale);
      // particles
      for (let i = 0; i < 12 * creep; i++) {
        const gx = 48 + Math.floor((state.tick * 3 + i * 7) % Math.max(gasW, 1));
        const gy = 28 + ((i * 5 + state.tick) % 16);
        drawPixel(ctx, gx, gy, PX.toxicDeep, scale);
      }
      ctx.globalAlpha = 1;

      if (creep > 0.85 && !state.guardOn) {
        // gas reaches exit
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = PX.danger;
        ctx.fillRect(96 * scale, 26 * scale, 16 * scale, 20 * scale);
        ctx.globalAlpha = 1;
      }
    }

    // canary perch
    ctx.fillStyle = PX.timberLite;
    ctx.fillRect(62 * scale, 40 * scale, 14 * scale, 3 * scale);

    const birdSprite = state.birdAlive ? BIRD : BIRD_DEAD;
    const birdPalette = state.birdAlive
      ? { Y: PX.canary, E: PX.eye, B: PX.beak, D: PX.canaryDark }
      : { X: "#6a6a6a", x: "#3a3a3a", "+": PX.danger };

    // bobbing
    const bob = state.birdAlive ? (state.tick % 30 < 15 ? 0 : -1) : 1;
    blitSprite(ctx, birdSprite, 62, 28 + bob, scale, birdPalette);

    if (!state.birdAlive) {
      // alarm rays
      ctx.strokeStyle = PX.danger;
      ctx.lineWidth = 2;
      const cx = 68 * scale;
      const cy = 32 * scale;
      for (let a = 0; a < 8; a++) {
        const ang = (Math.PI * 2 * a) / 8 + state.tick * 0.1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * 28, cy + Math.sin(ang) * 28);
        ctx.stroke();
      }
      ctx.fillStyle = PX.danger;
      ctx.font = "bold 14px monospace";
      ctx.fillText("! ALARM !", 50 * scale, 14 * scale);
    }

    if (state.escaped && state.birdAlive) {
      ctx.fillStyle = PX.toxic;
      ctx.font = "bold 14px monospace";
      ctx.fillText("CLEAR EXIT", 48 * scale, 14 * scale);
    }

    // miner walking out on success
    if (state.escaped && state.birdAlive) {
      const mx = 88 + (state.tick % 10);
      ctx.fillStyle = "#d4a574";
      ctx.fillRect(mx * scale, 36 * scale, 4 * scale, 4 * scale);
      ctx.fillStyle = "#3a5070";
      ctx.fillRect(mx * scale, 40 * scale, 4 * scale, 6 * scale);
    }
  },

  /**
   * Build stack frame DOM detail.
   * slots grow visually from buffer upward (toward ret).
   */
  renderStack(container, state) {
    const secret = state.canaryValue;
    const slots = [
      {
        key: "buf",
        addr: "0x7ffe10",
        label: "buffer[8]",
        kind: "buffer",
        bytes: formatBufferBytes(state.inputBytes, BUFFER_SIZE),
      },
      {
        key: "can",
        addr: "0x7ffe18",
        label: state.guardOn ? (state.derived ? "canary (derived)" : "canary") : "canary (NONE)",
        kind: "canary",
        bytes: state.guardOn ? secret : "--------",
      },
      {
        key: "rbp",
        addr: "0x7ffe20",
        label: "saved RBP",
        kind: "frame",
        bytes: "0x7ffe90",
      },
      {
        key: "ret",
        addr: "0x7ffe28",
        label: "return addr",
        kind: "ret",
        bytes: state.exitCorrupted ? "0xDEAD!!" : "0x4011ae",
      },
    ];

    const overflowLen = Math.max(0, state.inputBytes.length - BUFFER_SIZE);
    // corruption stages: canary at +0..7, rbp +8..15, ret +16..
    const canCorrupt = state.guardOn && overflowLen > 0;
    const rbpCorrupt = overflowLen > 8;
    const retCorrupt = overflowLen > 16 || (!state.guardOn && overflowLen > 8);

    container.innerHTML = "";

    const grow = document.createElement("div");
    grow.className = "arrow-hint";
    grow.textContent = "▲ overflow grows this way ▲";
    container.appendChild(grow);

    // show ret at top (high addr), buffer at bottom — classic stack diagram
    const order = [...slots].reverse();
    order.forEach((slot) => {
      const el = document.createElement("div");
      el.className = `stack-slot ${slot.kind}`;
      el.dataset.key = slot.key;

      let bytes = slot.bytes;
      if (slot.key === "can" && canCorrupt) {
        el.classList.add("corrupted", "gas");
        bytes = smashBytes(secret, overflowLen);
      } else if (slot.key === "can" && state.guardOn && state.inputBytes.length > 0 && overflowLen === 0) {
        el.classList.add("safe-fill");
      } else if (slot.key === "rbp" && (rbpCorrupt || (!state.guardOn && overflowLen > 0))) {
        if (!state.guardOn || rbpCorrupt) {
          el.classList.add("corrupted");
          bytes = "0xOVERWR";
        }
      } else if (slot.key === "ret" && (state.exitCorrupted || retCorrupt)) {
        el.classList.add("corrupted");
        bytes = "0xDEAD!!";
      } else if (slot.key === "buf" && state.inputBytes.length > 0) {
        el.classList.add(overflowLen > 0 ? "gas" : "safe-fill");
        if (state.animating) el.classList.add("filling");
      }

      el.innerHTML = `<span class="addr">${slot.addr}</span><span class="label">${slot.label}</span><span class="bytes">${bytes}</span>`;
      container.appendChild(el);
    });

    const low = document.createElement("div");
    low.className = "arrow-hint";
    low.textContent = "▼ lower addresses / buffer start ▼";
    container.appendChild(low);
  },
};

function formatBufferBytes(arr, size) {
  const out = [];
  for (let i = 0; i < size; i++) {
    if (i < arr.length) {
      const c = arr[i];
      out.push(c >= 33 && c <= 126 ? String.fromCharCode(c) : "·");
    } else {
      out.push(".");
    }
  }
  return out.join("");
}

function smashBytes(hex, overflowLen) {
  const clean = hex.replace(/\s/g, "");
  const chars = clean.split("");
  const n = Math.min(chars.length, Math.max(2, Math.floor(overflowLen)));
  for (let i = 0; i < n; i++) chars[i] = "X";
  return chars.join("");
}

window.BUFFER_SIZE = BUFFER_SIZE;

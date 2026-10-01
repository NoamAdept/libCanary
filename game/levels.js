/* Story first (1–4), then harder coding challenges with stack animation (5–10).
 * Understanding + safe coding only — not exploit / bypass training.
 */

window.LEVELS = [
  /* ===== STORY ===== */
  {
    id: 1,
    name: "Look at the picture",
    kind: "find",
    explain:
      "This picture is a tiny tunnel inside a computer program. Your typing goes in the brown box on the left. The blue door on the right is where the program wants to go next. Between them sits a yellow bird — the canary.",
    todo: "Type the word: canary",
    hint: "Just type: canary",
    answer: "canary",
    guardOn: true,
    scene: "idle",
    showStack: false,
    success: "Nice. The yellow bird is the canary. It stands between your text and the exit door.",
  },
  {
    id: 2,
    name: "A short, safe message",
    kind: "safe",
    explain:
      "The brown box is small. A short name stays inside. The bird stays happy. The door stays safe.",
    todo: "Type a short name (7 letters or fewer), like: alice",
    hint: "Try: alice",
    guardOn: true,
    bufferSize: 8,
    scene: "idle",
    showStack: false,
    success: "Short text stayed in the box. Bird alive. Door safe.",
  },
  {
    id: 3,
    name: "Too much text!",
    kind: "smash",
    explain:
      "Type a LONG string. Extra letters spill like gas. When gas hits the bird, the bird dies and the program stops — so the door is not used after the mess.",
    todo: "Type at least 12 letters, like: AAAAAAAAAAAA",
    hint: "12+ letters, then OK.",
    guardOn: true,
    bufferSize: 8,
    scene: "idle",
    showStack: false,
    success: "Alarm! Bird died, program stopped, door unused. That stop is the canary working.",
  },
  {
    id: 4,
    name: "What if there is no bird?",
    kind: "hijack",
    explain:
      "Someone removed the bird. No alarm. If text spills far enough, it can smash the blue door.",
    todo: "Type 20+ letters and watch the door break.",
    hint: "AAAAAAAAAAAAAAAAAAAA",
    guardOn: false,
    bufferSize: 8,
    scene: "noguard",
    showStack: false,
    success: "No bird → no alarm → door smashed. Keep the canary in real programs.",
  },

  /* ===== CODING CHALLENGES (harder) ===== */
  {
    id: 5,
    name: "Coding 1 — Meet the stack",
    kind: "choice",
    explain:
      "Same story, now as memory boxes. Bottom = start of your text box. Top = exit door. Watch the stack panel light up with the picture.",
    todo: "Which box is the canary (the bird)?",
    hint: "It sits between the buffer and the return address.",
    guardOn: true,
    scene: "idle",
    showStack: true,
    highlightBird: true,
    codeSnippet:
      "char buf[8];   // brown box (buffer)\n// canary sits here automatically\n// saved frame\n// return address = EXIT door",
    choices: [
      { id: "a", label: "buffer[8] — the brown box", ok: false },
      { id: "b", label: "canary — the yellow bird", ok: true },
      { id: "c", label: "return addr — the blue door", ok: false },
    ],
    success: "Yes. On the stack, the canary box is the bird between your buffer and the exit.",
  },
  {
    id: 6,
    name: "Coding 2 — Predict: short input",
    kind: "choice",
    explain:
      "Read this tiny C idea. Buffer size is 8. Someone types 5 letters. Watch the stack: will the bird die?",
    todo: "Will the canary die?",
    hint: "5 fits inside 8. Gas never reaches the bird.",
    guardOn: true,
    bufferSize: 8,
    scene: "idle",
    showStack: true,
    demoInput: "alice",
    autoDemo: true,
    codeSnippet: 'char buf[8];\nstrcpy(buf, "alice");  // 5 letters',
    choices: [
      { id: "a", label: "Yes — bird dies", ok: false },
      { id: "b", label: "No — bird lives", ok: true },
    ],
    success: "Correct. 5 < 8, so only the buffer fills. Canary untouched.",
  },
  {
    id: 7,
    name: "Coding 3 — Predict: long input",
    kind: "choice",
    explain:
      "Same buffer[8], but the text is 12 letters. Watch the stack fill upward into the canary.",
    todo: "Will the canary die?",
    hint: "12 > 8, so overflow reaches the bird.",
    guardOn: true,
    bufferSize: 8,
    scene: "idle",
    showStack: true,
    demoInput: "AAAAAAAAAAAA",
    autoDemo: true,
    codeSnippet: 'char buf[8];\nstrcpy(buf, "AAAAAAAAAAAA");  // 12 letters',
    choices: [
      { id: "a", label: "Yes — bird dies, program aborts", ok: true },
      { id: "b", label: "No — bird lives", ok: false },
    ],
    success: "Yes. Overflow climbs the stack into the canary → alarm → stop before EXIT.",
  },
  {
    id: 8,
    name: "Coding 4 — Fill the blank",
    kind: "fill",
    explain:
      "Safe code limits how much can be read. Complete the size argument so reading cannot pass the box.",
    todo: "What number belongs in the blank? fgets(buf, ____ , stdin);",
    hint: "The buffer has 8 bytes total. Use 8 (or sizeof(buf)).",
    answer: "8",
    altAnswers: ["sizeof(buf)", "sizeof buf"],
    guardOn: true,
    bufferSize: 8,
    scene: "safe",
    showStack: true,
    codeSnippet: "char buf[8];\nfgets(buf, ____ , stdin);  // safe: pass the box size",
    success: "Right — pass the real size (8 / sizeof(buf)). The stack stays calm.",
  },
  {
    id: 9,
    name: "Coding 5 — Which program smashes?",
    kind: "choice",
    explain:
      "Three tiny programs. Only one lets text pour forever into a small box. Pick the smasher. Stack shows a smash preview.",
    todo: "Which one smashes the canary?",
    hint: "gets() does not know the buffer size.",
    guardOn: true,
    bufferSize: 8,
    scene: "idle",
    showStack: true,
    demoInput: "AAAAAAAAAAAA",
    autoDemo: true,
    codeSnippet: "// A) fgets(buf, sizeof buf, stdin);\n// B) gets(buf);\n// C) buf[0] = 'A';",
    choices: [
      { id: "a", label: "A) fgets(buf, sizeof buf, stdin);", ok: false },
      { id: "b", label: "B) gets(buf);", ok: true },
      { id: "c", label: "C) buf[0] = 'A';", ok: false },
    ],
    success: "gets() ignores the box size. That is the classic smash. Prefer fgets with a size.",
  },
  {
    id: 10,
    name: "Coding 6 — Keep the bird when shipping",
    kind: "choice",
    explain:
      "Last coding challenge. You are shipping software. Which choice keeps the canary and bounds the text?",
    todo: "Pick the defender setup.",
    hint: "Bounded read + stack protector ON.",
    guardOn: true,
    scene: "safe",
    showStack: true,
    codeSnippet:
      "// Ship checklist\n// - bound every read/copy\n// - keep stack protector ON\n// - never rely on the bird alone",
    choices: [
      { id: "a", label: "gets + strcpy, turn protector OFF", ok: false },
      {
        id: "b",
        label: "fgets/snprintf + keep stack protector ON",
        ok: true,
      },
      { id: "c", label: "Unlimited copy is fine if we hope nobody notices", ok: false },
    ],
    success:
      "Ship it. Bound the text. Keep the bird. You can read the stack — and you know what it means.",
  },
];

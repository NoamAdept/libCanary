/* Level definitions for CANARY MINE */

const BUFFER_SIZE = 8;

window.LEVELS = [
  {
    id: 1,
    name: "MEET THE BIRD",
    objective: "Type a SHORT name (≤8 chars). Watch the mine stay safe.",
    dialogue:
      "Welcome to the shaft, miner. That yellow bird sits between the work zone and the EXIT. Keep your cargo short — don't flood the tunnel.",
    hint: "Try something like: alice  then press ENTER.",
    guardOn: true,
    successMode: "safe",
    unlockNextOn: "safe",
    termIntro: [
      { cls: "sys", text: "# Level 1 — safe cargo run" },
      { cls: "cyan", text: "$ ./vulnerable" },
      { cls: "sys", text: "Enter name:" },
    ],
    successDialogue:
      "Good. The buffer held your bytes. The canary still sings. You walk out the EXIT (return address) unharmed.",
    failDialogue:
      "Too much cargo! Toxic bytes flooded past the buffer. Try again with 8 characters or fewer.",
  },
  {
    id: 2,
    name: "TOXIC OVERFLOW",
    objective: "OVERFLOW the buffer (>8 chars). Watch the bird die.",
    dialogue:
      "Now overload the tunnel on purpose. Extra bytes become toxic gas. If gas reaches the bird… the alarm screams before you hit the EXIT.",
    hint: "Type 12+ characters, e.g. AAAAAAAAAAAA",
    guardOn: true,
    successMode: "smash",
    unlockNextOn: "smash",
    termIntro: [
      { cls: "sys", text: "# Level 2 — trigger the canary" },
      { cls: "cyan", text: "$ ./vulnerable" },
      { cls: "sys", text: "Enter name:" },
    ],
    successDialogue:
      "ALARM! The canary died — but that saved the EXIT. Stack smashing detected. Process aborted before hijack.",
    failDialogue:
      "That input was too short to reach the bird. Flood the buffer past 8 bytes.",
  },
  {
    id: 3,
    name: "STACK FRAME REVEAL",
    objective: "Overflow again. Same layout — now as MEMORY.",
    dialogue:
      "Flip the metaphor: BUFFER → CANARY → SAVED FRAME → RETURN ADDR. Gas rising in the mine = bytes climbing the stack.",
    hint: "Smash it again. Watch the stack panel light up slot by slot.",
    guardOn: true,
    successMode: "smash",
    unlockNextOn: "smash",
    highlightStack: true,
    termIntro: [
      { cls: "sys", text: "# Level 3 — map mine → stack frame" },
      { cls: "hl", text: "layout: [buf 8][canary][rbp][ret]" },
      { cls: "cyan", text: "$ ./vulnerable" },
      { cls: "sys", text: "Enter name:" },
    ],
    successDialogue:
      "See it? Low addresses hold the buffer. Overflow grows upward. Canary is the tripwire before saved RIP.",
    failDialogue: "Need an overflow to light up the stack climb. Use >8 characters.",
  },
  {
    id: 4,
    name: "EPILOGUE CHECK",
    objective: "Overflow, then watch the epilogue CHECK the bird.",
    dialogue:
      "On function return, the program re-reads the canary. Mismatch? It calls the fail path — abort — instead of jumping to a corrupted return address.",
    hint: "Overflow once more. Read the terminal epilogue carefully.",
    guardOn: true,
    successMode: "smash",
    unlockNextOn: "smash",
    showEpilogue: true,
    termIntro: [
      { cls: "sys", text: "# Level 4 — function epilogue" },
      { cls: "cyan", text: "$ ./vulnerable" },
      { cls: "sys", text: "Enter name:" },
    ],
    successDialogue:
      "Epilogue: expected_canary ^ stored_canary != 0 → canary_fail(). The bird's death is the signal, not the disaster.",
    failDialogue: "Overflow to force the epilogue check to fail.",
  },
  {
    id: 5,
    name: "GUARD OFF",
    objective: "Same overflow — but canary DISABLED. See the EXIT fall.",
    dialogue:
      "Foreman killed the bird for 'performance.' Overflow again. Nothing warns you. The EXIT (return address) gets rewritten. Game over for control flow.",
    hint: "Type a long string. Watch RET corrupt with no alarm.",
    guardOn: false,
    successMode: "hijack",
    unlockNextOn: "hijack",
    termIntro: [
      { cls: "sys", text: "# Level 5 — compiled with -fno-stack-protector" },
      { cls: "err", text: "warning: stack canary disabled" },
      { cls: "cyan", text: "$ ./vulnerable" },
      { cls: "sys", text: "Enter name:" },
    ],
    successDialogue:
      "No bird. No alarm. Return address became attacker-controlled. That's why canaries exist.",
    failDialogue: "Need a deep overflow to reach the return address (16+ chars helps).",
  },
  {
    id: 6,
    name: "SECRET SONG",
    objective: "Safe input with a DERIVED canary (secret ⊕ frame).",
    dialogue:
      "Real protectors mix a global secret with frame info — like your libcanary. A leaked canary from one frame won't replay cleanly into another.",
    hint: "Keep it ≤8 chars. Watch the canary bytes look unique to this frame.",
    guardOn: true,
    derived: true,
    successMode: "safe",
    unlockNextOn: "safe",
    termIntro: [
      { cls: "sys", text: "# Level 6 — derived canary (secret XOR frame)" },
      { cls: "hl", text: "canary = secret ^ ret ^ (frame * DEADBEEF)" },
      { cls: "cyan", text: "$ ./vulnerable" },
      { cls: "sys", text: "Enter name:" },
    ],
    successDialogue:
      "You get it: the canary is a cheap early-warning token. Kill the bird on purpose in production? Never. In the mine? That's how miners learn.",
    failDialogue: "Stay ≤8 characters so the derived canary survives the trip.",
  },
];

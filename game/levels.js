/* Complete-beginner steps. Plain English only. */

window.LEVELS = [
  {
    id: 1,
    name: "Look at the picture",
    kind: "find",
    explain:
      "This picture is a tiny tunnel inside a computer program. Your typing goes in the brown box on the left. The blue door on the right is where the program wants to go next. Between them sits a yellow bird — the canary.",
    todo: 'Type the word: canary',
    hint: "Just type: canary",
    answer: "canary",
    guardOn: true,
    scene: "idle",
    success:
      "Nice. The yellow bird is the canary. Its only job is to stand between your text and the exit door.",
  },
  {
    id: 2,
    name: "A short, safe message",
    kind: "safe",
    explain:
      "The brown box is small. It only has room for a short word. If you type a short name, the text stays in the box. The bird stays happy. The door stays safe.",
    todo: "Type a short name (7 letters or fewer), like: alice",
    hint: "Try: alice",
    guardOn: true,
    bufferSize: 8,
    scene: "idle",
    success: "Perfect. Short text stayed in the brown box. The bird is still alive. The program can walk out the blue door.",
  },
  {
    id: 3,
    name: "Too much text!",
    kind: "smash",
    explain:
      "Now type a LONG string on purpose. Extra letters spill out of the brown box like gas in a mine. When the gas reaches the bird, the bird dies — and the program stops. That stop is good: it means the door was not used after the mess.",
    todo: "Type at least 12 letters, like: AAAAAAAAAAAA",
    hint: "Hold A until you have 12 or more, then press OK.",
    guardOn: true,
    bufferSize: 8,
    scene: "idle",
    success:
      "See the alarm? The bird died, so the program stopped. The blue door was never used. The bird sacrificed itself to protect the exit.",
  },
  {
    id: 4,
    name: "What if there is no bird?",
    kind: "hijack",
    explain:
      "Someone removed the bird to “go faster.” There is no alarm now. If your text spills far enough, it can smash the blue door. That is bad — the program may jump to the wrong place.",
    todo: "Type a very long string (20+ letters) and watch the door break.",
    hint: "Type something like: AAAAAAAAAAAAAAAAAAAA",
    guardOn: false,
    bufferSize: 8,
    scene: "noguard",
    success:
      "No bird → no alarm → the door got smashed. That is why real programs keep the canary.",
  },
  {
    id: 5,
    name: "Which idea is dangerous?",
    kind: "choice",
    explain:
      "Programmers write rules for reading your text. Some rules carefully stop when the brown box is full. Some rules keep stuffing text forever. Which one is dangerous?",
    todo: "Tap the dangerous idea.",
    hint: "Anything that keeps copying with no size limit is dangerous.",
    guardOn: true,
    scene: "idle",
    choices: [
      { id: "a", label: "Only accept as much text as fits in the box", ok: false },
      { id: "b", label: "Keep stuffing text with no size limit", ok: true },
      { id: "c", label: "Check the bird before using the exit door", ok: false },
    ],
    success: "Right. Unlimited stuffing is the real problem. The bird only notices the mess later.",
  },
  {
    id: 6,
    name: "What should we remember?",
    kind: "choice",
    explain:
      "You now know the whole story: small box for text, bird in the middle, door at the end. What is the best habit?",
    todo: "Pick the best habit.",
    hint: "Limit the text AND keep the bird.",
    guardOn: true,
    scene: "safe",
    choices: [
      { id: "a", label: "Remove the bird so the program runs faster", ok: false },
      {
        id: "b",
        label: "Only allow text that fits — and keep the bird as a backup alarm",
        ok: true,
      },
      { id: "c", label: "Always type huge amounts of text on purpose", ok: false },
    ],
    success:
      "That’s the lesson. Limit the text. Keep the bird. The canary dies so the exit doesn’t have to.",
  },
];

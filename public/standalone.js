(() => {
  const app = document.querySelector(".app");
  const slider = document.querySelector('input[type="range"]');
  const statusTitle = document.querySelector(".status-row > div:first-child strong");
  const statusNote = document.querySelector(".status-row > div:first-child small");
  const levelNumber = document.querySelector(".level strong");
  const saveButton = document.querySelector(".checkin-card .primary");
  const soundButton = document.querySelector(".sound");
  const gameSection = document.querySelector(".game-section");
  const gameTitle = gameSection.querySelector("h2");
  const gameCopy = gameSection.querySelector(".section-intro > p");
  const gameShell = () => gameSection.querySelector(".game-shell");

  const progressLink = document.querySelector('.nav-actions a[href="#progress"]');
  if (progressLink) { progressLink.textContent = "Progress"; progressLink.href = "./progress.html"; progressLink.classList.add("progress-link"); }
  document.querySelector("#progress")?.remove();
  const videoSectionNumber = document.querySelector(".video-section .section-number");
  if (videoSectionNumber) videoSectionNumber.textContent = "02";

  const removedVideo = document.querySelector('iframe[src*="xNN7iTA57jM"]')?.closest(".video-card");
  if (removedVideo) removedVideo.remove();
  document.querySelector(".video-grid")?.classList.add("two-videos");

  const puzzleImages = [
    { name: "Misty lake", url: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd4297?auto=format&fit=crop&w=900&q=85" },
    { name: "Forest light", url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=85" },
    { name: "Soft coast", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=85" },
  ];

  let stress = Number(slider.value || 5);
  let soundOn = false;
  let soundSession = null;
  let currentMode = "";

  function stressInfo(level) {
    if (level <= 3) return { key: "low", label: "Light & steady", note: "You have room for a little energising focus.", game: "Focus Sprint", copy: "A playful burst to channel your energy into one simple target." };
    if (level <= 7) return { key: "moderate", label: "A little stretched", note: "Let’s gently redirect your attention.", game: "Hidden Object Room", copy: "Let busy thoughts soften while you search a cosy room for one tiny object." };
    return { key: "high", label: "Feeling overloaded", note: "No rush. Turn a familiar song into a gentle focus game.", game: "Your Song Rhythm", copy: "Choose a song you enjoy and turn it into a private four-lane rhythm challenge." };
  }

  function shuffle(size = 9) {
    const values = Array.from({ length: size }, (_, index) => index);
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
  }

  function renderFocus() {
    gameShell().outerHTML = `<div class="game-shell focus-game"><div class="game-top"><span>Tap the drifting orb</span><strong class="focus-score">20s · 0 hits</strong></div><div class="focus-field"><div class="game-message"><span>Ready when you are</span><button type="button">Start 20 seconds</button></div></div></div>`;
    const field = gameSection.querySelector(".focus-field");
    const scoreLabel = gameSection.querySelector(".focus-score");
    let score = 0;
    let seconds = 20;
    let timer;

    function start() {
      clearInterval(timer);
      score = 0; seconds = 20;
      field.innerHTML = '<button class="focus-orb" type="button" aria-label="Tap the moving orb"></button>';
      const orb = field.querySelector(".focus-orb");
      const move = () => { orb.style.left = `${12 + Math.random() * 76}%`; orb.style.top = `${14 + Math.random() * 68}%`; };
      move();
      orb.addEventListener("click", () => { score += 1; scoreLabel.textContent = `${seconds}s · ${score} hits`; move(); });
      timer = setInterval(() => {
        seconds -= 1; scoreLabel.textContent = `${seconds}s · ${score} hits`;
        if (seconds <= 0) {
          clearInterval(timer);
          field.innerHTML = `<div class="game-message"><span>${score} gentle wins</span><button type="button">Play again</button></div>`;
          field.querySelector("button").addEventListener("click", start);
        }
      }, 1000);
    }
    field.querySelector("button").addEventListener("click", start);
  }

  function renderFind(round = 1) {
    const objects = [
      { name: "golden key", icon: "🔑", position: "object-key" },
      { name: "tiny star", icon: "⭐", position: "object-star" },
      { name: "blue feather", icon: "🪶", position: "object-feather" },
      { name: "red apple", icon: "🍎", position: "object-apple" },
      { name: "little book", icon: "📕", position: "object-book" },
      { name: "tea cup", icon: "☕", position: "object-cup" },
      { name: "round glasses", icon: "👓", position: "object-glasses" },
      { name: "striped ball", icon: "⚽", position: "object-ball" },
      { name: "small candle", icon: "🕯️", position: "object-candle" },
      { name: "sea shell", icon: "🐚", position: "object-shell" },
      { name: "magnifying glass", icon: "🔍", position: "object-magnifier" },
      { name: "headphones", icon: "🎧", position: "object-headphones" },
      { name: "camera", icon: "📷", position: "object-camera" },
      { name: "scissors", icon: "✂️", position: "object-scissors" },
      { name: "blue gem", icon: "💎", position: "object-gem" },
      { name: "winter glove", icon: "🧤", position: "object-glove" },
      { name: "pink flower", icon: "🌸", position: "object-flower" },
      { name: "umbrella", icon: "☂️", position: "object-umbrella" },
      { name: "yellow pencil", icon: "✏️", position: "object-pencil" },
      { name: "little bottle", icon: "🧴", position: "object-bottle" },
    ];
    const hiddenAt = (round - 1) % objects.length;
    const target = objects[hiddenAt];
    const objectButtons = objects.map((item, index) => `<button type="button" aria-label="${item.name}" class="room-object ${item.position}" data-target="${index === hiddenAt}">${item.icon}</button>`).join("");
    gameShell().outerHTML = `<div class="game-shell find-game"><div class="game-top"><span>Find the ${target.name} hidden in the room</span><strong>Round ${round}</strong></div><div class="room-scene"><div class="room-ceiling"></div><div class="room-side room-side-left"></div><div class="room-side room-side-right"></div><div class="room-floor-lines"><i></i><i></i><i></i><i></i><i></i></div><div class="room-stairs"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="room-bookcase"><i></i><i></i><i></i><i></i><span></span><span></span><span></span></div><div class="room-coat-rack"><i></i><i></i><i></i></div><div class="room-curtain curtain-left"></div><div class="room-curtain curtain-right"></div><div class="room-window"><span></span><span></span></div><div class="room-frame">☁</div><div class="room-pictures"><i>✦</i><i>❧</i></div><div class="room-shelf"><i></i><i></i><i></i></div><div class="room-clock"><i></i></div><div class="room-cabinet"><i></i><i></i><span></span><span></span></div><div class="room-desk"><div class="room-monitor">◒</div><i></i><i></i></div><div class="room-boxes"><i></i><i></i><i></i></div><div class="room-papers">▱ ▰ ▱</div><div class="room-suitcase">▥</div><div class="room-lamp"><i></i></div><div class="room-sofa"><span></span><span></span></div><div class="room-table"></div><div class="room-ottoman"></div><div class="room-basket">⌁</div><div class="room-rug"></div><div class="room-plant">♧</div>${objectButtons}</div></div>`;
    const room = gameSection.querySelector(".room-scene");
    room.querySelector('[data-target="true"]').addEventListener("click", (event) => {
      event.currentTarget.classList.add("found");
      room.insertAdjacentHTML("beforeend", `<div class="found-message"><strong>You found it!</strong><span>One small detail brought you into the moment.</span><button type="button">Explore a new room</button></div>`);
      room.querySelector(".found-message button").addEventListener("click", () => renderFind(round + 1));
    });
  }

  function renderPuzzle() {
    let tiles = shuffle();
    let selected = null;
    let imageIndex = 0;
    gameShell().outerHTML = `<div class="game-shell puzzle-game"><div class="game-top"><span>Tap two pieces to swap them</span><button type="button" class="text-button puzzle-shuffle">Shuffle</button></div><div class="puzzle-layout"><div class="puzzle-board" aria-label="3 by 3 jigsaw puzzle"></div><div class="scene-picker"><span>Choose a scene</span>${puzzleImages.map((image, index) => `<button type="button" data-image="${index}" class="${index === 0 ? "active" : ""}"><img src="${image.url}" alt=""><span>${image.name}</span></button>`).join("")}</div></div></div>`;
    const board = gameSection.querySelector(".puzzle-board");

    function draw() {
      board.innerHTML = tiles.map((tile, index) => `<button type="button" data-index="${index}" aria-label="Puzzle piece ${tile + 1}" class="${selected === index ? "selected" : ""}" style="background-image:url('${puzzleImages[imageIndex].url}');background-position:${(tile % 3) * 50}% ${Math.floor(tile / 3) * 50}%"></button>`).join("");
      if (tiles.every((tile, index) => tile === index)) board.insertAdjacentHTML("beforeend", '<div class="solved-message">Beautifully done <span>Take one slow breath.</span></div>');
      board.querySelectorAll("button[data-index]").forEach((button) => button.addEventListener("click", () => {
        const index = Number(button.dataset.index);
        if (selected === null) { selected = index; draw(); return; }
        [tiles[selected], tiles[index]] = [tiles[index], tiles[selected]];
        selected = null; draw();
      }));
    }

    gameSection.querySelector(".puzzle-shuffle").addEventListener("click", () => { tiles = shuffle(); selected = null; draw(); });
    gameSection.querySelectorAll(".scene-picker button").forEach((button) => button.addEventListener("click", () => {
      imageIndex = Number(button.dataset.image); tiles = shuffle(); selected = null;
      gameSection.querySelectorAll(".scene-picker button").forEach((item) => item.classList.toggle("active", item === button)); draw();
    }));
    draw();
  }

  function renderBreathing() {
    const phases = [
      { key: "inhale", label: "Breathe in", duration: 4 },
      { key: "hold", label: "Hold gently", duration: 2 },
      { key: "exhale", label: "Breathe out", duration: 6 },
    ];
    let phaseIndex = 0;
    let seconds = phases[0].duration;
    let cycles = 0;
    let running = false;
    let timer = null;
    gameShell().outerHTML = `<div class="game-shell breathing-game"><div class="game-top"><span>Follow the circle at your own pace</span><strong class="breath-cycles">0 cycles</strong></div><div class="breathing-field phase-inhale"><div class="breath-rings"><i></i><i></i><div class="breath-orb"><span aria-live="polite">Breathe in</span><strong>4</strong></div></div><div class="breath-guide"><span><b>4</b> inhale</span><span><b>2</b> hold</span><span><b>6</b> exhale</span></div><div class="breath-controls"><button type="button" class="breath-toggle">Begin breathing</button><button type="button" class="breath-reset">Reset</button></div></div></div>`;
    const field = gameSection.querySelector(".breathing-field");
    const label = field.querySelector(".breath-orb span");
    const countdown = field.querySelector(".breath-orb strong");
    const cycleLabel = gameSection.querySelector(".breath-cycles");
    const toggle = field.querySelector(".breath-toggle");

    function drawBreath() {
      const phase = phases[phaseIndex];
      field.className = `breathing-field phase-${phase.key}${running ? " running" : ""}`;
      label.textContent = phase.label;
      countdown.textContent = seconds;
      cycleLabel.textContent = `${cycles} ${cycles === 1 ? "cycle" : "cycles"}`;
      toggle.textContent = running ? "Pause" : cycles ? "Continue" : "Begin breathing";
    }

    function stopTimer() { if (timer) window.clearInterval(timer); timer = null; }
    function startTimer() {
      stopTimer();
      timer = window.setInterval(() => {
        if (!field.isConnected) { stopTimer(); return; }
        if (seconds > 1) seconds -= 1;
        else {
          phaseIndex = (phaseIndex + 1) % phases.length;
          if (phaseIndex === 0) cycles += 1;
          seconds = phases[phaseIndex].duration;
        }
        drawBreath();
      }, 1000);
    }

    toggle.addEventListener("click", () => { running = !running; if (running) startTimer(); else stopTimer(); drawBreath(); });
    field.querySelector(".breath-reset").addEventListener("click", () => { stopTimer(); running = false; phaseIndex = 0; seconds = phases[0].duration; cycles = 0; drawBreath(); });
  }

  function renderRhythm() {
    const pads = [
      { note: "C4", label: "Rain", symbol: "●" },
      { note: "E4", label: "Glow", symbol: "◆" },
      { note: "G4", label: "Wave", symbol: "≈" },
      { note: "C5", label: "Star", symbol: "✦" },
    ];
    let sequence = [0, 2, 1];
    let input = [];
    let playing = false;
    let round = 1;
    let rhythmSynth = null;
    let rhythmGain = null;
    gameShell().outerHTML = `<div class="game-shell rhythm-game"><div class="game-top"><span>Listen and repeat the gentle pattern</span><strong class="rhythm-round">Round 1</strong></div><div class="rhythm-field"><div class="rhythm-status" aria-live="polite"><strong>Listen, then echo the pattern</strong><span>3 beat pattern</span></div><div class="rhythm-pads">${pads.map((pad, index) => `<button type="button" class="rhythm-pad pad-${index}" data-pad="${index}" aria-label="${pad.label} tone"><b>${pad.symbol}</b><span>${pad.label}</span></button>`).join("")}</div><button type="button" class="rhythm-play">Play the rhythm</button></div></div>`;
    const field = gameSection.querySelector(".rhythm-field");
    const status = field.querySelector(".rhythm-status strong");
    const lengthLabel = field.querySelector(".rhythm-status span");
    const roundLabel = gameSection.querySelector(".rhythm-round");
    const playButton = field.querySelector(".rhythm-play");
    const padButtons = [...field.querySelectorAll(".rhythm-pad")];

    async function soundPad(index) {
      const Tone = await waitForTone();
      if (!Tone) return;
      await Tone.start();
      if (!rhythmSynth) {
        rhythmGain = new Tone.Gain(0.2).toDestination();
        rhythmSynth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.03, release: 0.7 } }).connect(rhythmGain);
      }
      rhythmSynth.triggerAttackRelease(pads[index].note, "8n", undefined, 0.65);
    }

    function flash(index, duration = 260) {
      padButtons[index].classList.add("active");
      window.setTimeout(() => padButtons[index]?.classList.remove("active"), duration);
    }

    async function playPattern(pattern = sequence) {
      if (playing || !field.isConnected) return;
      playing = true; input = []; status.textContent = "Listen closely…"; playButton.textContent = "Playing pattern…";
      padButtons.forEach((button) => { button.disabled = true; });
      for (const pad of pattern) {
        flash(pad, 440); void soundPad(pad);
        await new Promise((resolve) => window.setTimeout(resolve, 610));
      }
      playing = false; status.textContent = "Your turn — repeat the rhythm"; playButton.textContent = "Hear pattern again";
      padButtons.forEach((button) => { button.disabled = false; });
    }

    function choosePad(index) {
      if (playing) return;
      flash(index); void soundPad(index);
      const nextInput = [...input, index];
      if (sequence[nextInput.length - 1] !== index) {
        input = []; status.textContent = "Almost — listen once more";
        window.setTimeout(() => void playPattern(sequence), 750); return;
      }
      if (nextInput.length === sequence.length) {
        sequence = [...sequence, (sequence.length * 3 + round) % pads.length];
        input = []; round += 1; roundLabel.textContent = `Round ${round}`; lengthLabel.textContent = `${sequence.length} beat pattern`; status.textContent = "Beautiful timing! Adding one beat…";
        window.setTimeout(() => void playPattern(sequence), 850); return;
      }
      input = nextInput; status.textContent = `${input.length} of ${sequence.length} beats matched`;
    }

    padButtons.forEach((button) => button.addEventListener("click", () => choosePad(Number(button.dataset.pad))));
    playButton.addEventListener("click", () => void playPattern());
  }

  function renderCustomSongRhythm() {
    gameShell().outerHTML = `<div class="game-shell custom-rhythm-game"><div class="game-top"><span>Tap, hold and slide with the uploaded song</span><strong>Neon rhythm track</strong></div><iframe class="custom-rhythm-frame" src="./rhythm-upload.html?v=arcade-modes-v5" title="Upload your own song rhythm game" allow="autoplay"></iframe></div>`;
  }

  function renderExperience(force = false) {
    const info = stressInfo(stress);
    app.className = `app theme-${info.key}`;
    slider.style.setProperty("--progress", `${((stress - 1) / 9) * 100}%`);
    statusTitle.textContent = info.label;
    statusNote.textContent = info.note;
    levelNumber.textContent = stress;
    gameTitle.textContent = info.game;
    gameCopy.textContent = info.copy;
    if (!force && currentMode === info.key) return;
    currentMode = info.key;
    if (info.key === "low") renderFocus();
    else if (info.key === "moderate") renderFind();
    else renderCustomSongRhythm();
    if (soundOn) restartSound();
  }

  function renderProgress() {
    let checkIns = [];
    try { checkIns = JSON.parse(localStorage.getItem("drift-checkins") || "[]"); } catch { checkIns = []; }
    const chart = document.querySelector(".chart");
    if (!chart) return;
    const chartTitle = document.querySelector(".chart-head > div:first-child strong");
    const average = document.querySelector(".average strong");
    const empty = document.querySelector(".empty-note");
    if (!checkIns.length) return;
    chartTitle.textContent = "Your last seven moments";
    average.textContent = (checkIns.reduce((sum, item) => sum + item.level, 0) / checkIns.length).toFixed(1);
    chart.innerHTML = checkIns.map((item, index) => `<div class="bar-wrap"><span class="bar-value">${item.level}</span><div class="bar" style="height:${item.level * 9}%;animation-delay:${index * 70}ms"></div><small>${item.time}</small></div>`).join("");
    if (empty) empty.remove();
  }

  async function waitForTone() {
    for (let attempt = 0; attempt < 12; attempt++) {
      if (window.Tone) return window.Tone;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!document.querySelector('script[data-tone-fallback]')) {
      const fallback = document.createElement("script");
      fallback.src = "./vendor/Tone.js";
      fallback.dataset.toneFallback = "true";
      document.head.appendChild(fallback);
    }

    for (let attempt = 0; attempt < 50; attempt++) {
      if (window.Tone) return window.Tone;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return null;
  }

  function stopSound() {
    if (soundSession) soundSession.dispose();
    soundSession = null;
  }

  async function restartSound() {
    stopSound();
    const Tone = await waitForTone();
    if (!Tone || !soundOn) return;
    await Tone.start();
    const info = stressInfo(stress);
    const gain = new Tone.Gain(0.16).toDestination();
    const reverb = new Tone.Reverb({ decay: info.key === "high" ? 8 : 4, wet: 0.7 }).connect(gain);
    const synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: info.key === "low" ? "triangle" : "sine" }, envelope: { attack: info.key === "low" ? 0.8 : info.key === "moderate" ? 2.2 : 3.8, release: info.key === "high" ? 7 : 4 } }).connect(reverb);
    const notes = info.key === "low" ? ["C4", "E4", "G4", "C5", "G4", "E4"] : info.key === "moderate" ? ["A3", "C4", "E4", "G4", "E4", "C4"] : ["F3", "C4", "A3", "G3"];
    let step = 0;
    const duration = info.key === "low" ? "4n" : info.key === "moderate" ? "2n" : "1m";
    const interval = info.key === "low" ? "4n" : info.key === "moderate" ? "2n" : "1m";
    const loop = new Tone.Loop((time) => synth.triggerAttackRelease(notes[step++ % notes.length], duration, time, info.key === "high" ? 0.42 : 0.52), interval).start(0);
    Tone.getTransport().bpm.value = info.key === "low" ? 78 : info.key === "moderate" ? 60 : 44;
    Tone.getTransport().start();
    soundSession = { dispose: () => { loop.dispose(); synth.dispose(); reverb.dispose(); gain.dispose(); } };
  }

  slider.addEventListener("input", () => { stress = Number(slider.value); renderExperience(); });
  saveButton.addEventListener("click", () => {
    const info = stressInfo(stress);
    let checkIns = [];
    try { checkIns = JSON.parse(localStorage.getItem("drift-checkins") || "[]"); } catch { checkIns = []; }
    checkIns = [...checkIns, { id: Date.now(), level: stress, label: info.label, time: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }) }].slice(-7);
    localStorage.setItem("drift-checkins", JSON.stringify(checkIns));
    saveButton.textContent = "Check-in saved ✓";
    setTimeout(() => { saveButton.textContent = "Save today’s check-in"; }, 1800);
    renderProgress();
  });
  soundButton.addEventListener("click", async () => {
    soundOn = !soundOn;
    soundButton.classList.toggle("active", soundOn);
    soundButton.setAttribute("aria-pressed", String(soundOn));
    soundButton.innerHTML = `<span>${soundOn ? "◖))" : "◖"}</span>${soundOn ? "Sound on" : "Sound off"}`;
    if (soundOn) await restartSound(); else stopSound();
  });

  renderExperience(true);
  renderProgress();
})();

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
    if (level <= 7) return { key: "moderate", label: "A little stretched", note: "Let’s gently redirect your attention.", game: "Hidden Meadow", copy: "Let the busy thoughts soften while your eyes search the meadow." };
    return { key: "high", label: "Feeling overloaded", note: "No rush. Settle into something slow and tactile.", game: "Quiet Jigsaw", copy: "Piece by piece. There is nothing to hurry and nowhere else to be." };
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
    const hiddenAt = Math.floor(Math.random() * 35);
    const blooms = Array.from({ length: 35 }, (_, index) => `<button type="button" aria-label="${index === hiddenAt ? "Hidden leaf" : "Flower"}">${index === hiddenAt ? "☘" : ["✿", "❀", "✽"][index % 3]}</button>`).join("");
    gameShell().outerHTML = `<div class="game-shell find-game"><div class="game-top"><span>Find the tiny leaf among the blooms</span><strong>Round ${round}</strong></div><div class="meadow-grid">${blooms}</div></div>`;
    const meadow = gameSection.querySelector(".meadow-grid");
    meadow.querySelector('[aria-label="Hidden leaf"]').addEventListener("click", (event) => {
      event.currentTarget.classList.add("found");
      meadow.insertAdjacentHTML("beforeend", `<div class="found-message"><strong>You found it!</strong><span>Notice that tiny moment of focus.</span><button type="button">New meadow</button></div>`);
      meadow.querySelector(".found-message button").addEventListener("click", () => renderFind(round + 1));
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
    else renderPuzzle();
    if (soundOn) restartSound();
  }

  function renderProgress() {
    let checkIns = [];
    try { checkIns = JSON.parse(localStorage.getItem("drift-checkins") || "[]"); } catch { checkIns = []; }
    const chart = document.querySelector(".chart");
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
    const gain = new Tone.Gain(0.075).toDestination();
    const reverb = new Tone.Reverb({ decay: info.key === "high" ? 8 : 4, wet: 0.7 }).connect(gain);
    const synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" }, envelope: { attack: 2.8, release: 5 } }).connect(reverb);
    const notes = info.key === "low" ? ["C4", "E4", "G4", "E4"] : info.key === "moderate" ? ["A3", "C4", "E4", "C4"] : ["F3", "A3", "C4", "G3"];
    let step = 0;
    const loop = new Tone.Loop((time) => synth.triggerAttackRelease(notes[step++ % notes.length], "2n", time, 0.35), info.key === "high" ? "1m" : "2n").start(0);
    Tone.getTransport().bpm.value = info.key === "low" ? 72 : info.key === "moderate" ? 60 : 48;
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

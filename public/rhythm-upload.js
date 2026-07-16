(() => {
  const canvas = document.querySelector("#rhythm-canvas");
  const ctx = canvas.getContext("2d");
  const audio = document.querySelector("#song-audio");
  const fileInput = document.querySelector("#song-file");
  const startButton = document.querySelector("#start-game");
  const pauseButton = document.querySelector("#pause");
  const panel = document.querySelector("#upload-panel");
  const difficulty = document.querySelector("#difficulty");
  const scoreLabel = document.querySelector("#score");
  const comboLabel = document.querySelector("#combo");
  const songName = document.querySelector("#song-name");
  const fileStatus = document.querySelector("#file-status");
  const judgement = document.querySelector("#judgement");
  const colors = ["#4fc3f7", "#ff9acb", "#70d6a8", "#b89cff"];
  const defaultKeys = ["d", "f", "j", "k"];
  let keys = [...defaultKeys];
  try {
    const savedKeys = JSON.parse(localStorage.getItem("drift-rhythm-keys"));
    if (Array.isArray(savedKeys) && savedKeys.length === 4 && savedKeys.every((key) => /^[a-z0-9]$/.test(key))) keys = savedKeys;
  } catch {}
  const keyButtons = [...document.querySelectorAll(".key-bind")];
  const keyStatus = document.querySelector("#key-status");
  const resetKeys = document.querySelector("#reset-keys");
  let remappingLane = null;
  const travelTime = 1.8;
  let fileUrl = null;
  let notes = [];
  let particles = [];
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let playing = false;
  let animation = null;
  let seed = 1;
  let beatCandidates = [];
  let analysisToken = 0;
  let analysedDuration = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function updateKeyLabels() {
    keyButtons.forEach((button, lane) => { button.textContent = keys[lane].toUpperCase(); });
  }

  function saveKeys() {
    localStorage.setItem("drift-rhythm-keys", JSON.stringify(keys));
    updateKeyLabels();
  }

  function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  function hash(text) { let value = 2166136261; for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619); return value >>> 0; }

  async function analyseBeats(file, token) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("Audio analysis is not supported in this browser.");
    const audioContext = new AudioContextClass();
    try {
      const buffer = await audioContext.decodeAudioData(await file.arrayBuffer());
      if (token !== analysisToken) return;
      const channelA = buffer.getChannelData(0);
      const channelB = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : channelA;
      const hop = 1024;
      const envelope = [];
      const brightness = [];
      for (let offset = 0; offset + hop < buffer.length; offset += hop) {
        let power = 0;
        let movement = 0;
        let previous = (channelA[offset] + channelB[offset]) * .5;
        for (let index = offset; index < offset + hop; index += 2) {
          const sample = (channelA[index] + channelB[index]) * .5;
          power += sample * sample;
          movement += Math.abs(sample - previous);
          previous = sample;
        }
        envelope.push(Math.sqrt(power / (hop / 2)));
        brightness.push(movement / (hop / 2));
      }

      const novelty = envelope.map((energy, index) => {
        let local = 0;
        let count = 0;
        for (let back = Math.max(0, index - 16); back < index; back++) { local += envelope[back]; count += 1; }
        local /= Math.max(count, 1);
        return Math.max(0, energy - local * 1.08) + Math.max(0, energy - (envelope[index - 1] || 0)) * .65;
      });
      const strengths = novelty.filter((value) => value > 0).sort((a, b) => a - b);
      const floor = strengths[Math.floor(strengths.length * .48)] || 0;
      beatCandidates = [];
      for (let index = 2; index < novelty.length - 2; index++) {
        if (novelty[index] < floor || novelty[index] < novelty[index - 1] || novelty[index] < novelty[index + 1]) continue;
        beatCandidates.push({
          time: index * hop / buffer.sampleRate,
          strength: novelty[index],
          brightness: brightness[index],
        });
      }
      if (beatCandidates.length < 8) throw new Error("Not enough musical peaks were detected. Try another song.");
      analysedDuration = buffer.duration;
      const minutes = Math.floor(buffer.duration / 60);
      const seconds = Math.floor(buffer.duration % 60).toString().padStart(2, "0");
      createChart();
      fileStatus.textContent = `${file.name} · ${minutes}:${seconds} · ${notes.length} synced notes`;
      startButton.disabled = false;
      startButton.textContent = "Start beat-synced rhythm";
      panel.querySelector("h1").textContent = "Song ready";
      panel.querySelector("p").textContent = "Each falling bar reaches the white line when its detected beat plays.";
    } finally {
      await audioContext.close();
    }
  }

  function createChart() {
    const minimumGaps = { easy: .58, normal: .36, hard: .22 };
    const percentiles = { easy: .68, normal: .42, hard: .18 };
    const strengths = beatCandidates.map((beat) => beat.strength).sort((a, b) => a - b);
    const threshold = strengths[Math.floor(strengths.length * percentiles[difficulty.value])] || 0;
    seed = hash(`${fileInput.files[0]?.name || "song"}-${difficulty.value}`);
    notes = [];
    let previousTime = -10;
    for (const beat of beatCandidates) {
      if (beat.strength < threshold || beat.time - previousTime < minimumGaps[difficulty.value]) continue;
      const lane = Math.abs(Math.floor(beat.brightness * 10000 + random() * 4)) % 4;
      notes.push({ time: beat.time, lane, strength: beat.strength, hit: false, missed: false });
      if (difficulty.value === "hard" && beat.strength > threshold * 2.15) notes.push({ time: beat.time, lane: (lane + 2) % 4, strength: beat.strength, hit: false, missed: false });
      previousTime = beat.time;
    }
  }

  function roundedRect(x, y, width, height, radius) {
    ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fill();
  }

  function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const laneWidth = width / 4;
    const hitY = height - 78;
    const topY = 20;
    const current = audio.currentTime || 0;
    const background = ctx.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, "#5c377f"); background.addColorStop(.55, "#39295f"); background.addColorStop(1, "#161429");
    ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);

    for (let lane = 0; lane < 4; lane++) {
      const laneGradient = ctx.createLinearGradient(0, 0, 0, height);
      laneGradient.addColorStop(0, `${colors[lane]}18`); laneGradient.addColorStop(1, `${colors[lane]}42`);
      ctx.fillStyle = laneGradient; ctx.fillRect(lane * laneWidth + 2, 0, laneWidth - 4, height);
      ctx.strokeStyle = "#ffffff20"; ctx.lineWidth = 1; ctx.strokeRect(lane * laneWidth, 0, laneWidth, height);
      ctx.fillStyle = "#ffffffd8"; ctx.font = "700 14px Segoe UI"; ctx.textAlign = "center"; ctx.fillText(keys[lane].toUpperCase(), lane * laneWidth + laneWidth / 2, hitY + 43);
    }
    ctx.fillStyle = "#ffffff"; ctx.shadowBlur = 18; ctx.shadowColor = "#ffffff"; ctx.fillRect(0, hitY, width, 4); ctx.shadowBlur = 0;

    const strongestNote = notes.reduce((maximum, item) => Math.max(maximum, item.strength || 0), 0) || 1;
    for (const note of notes) {
      if (note.hit || note.missed) continue;
      if (current - note.time > 0.24) { note.missed = true; combo = 0; updateStats(); showJudgement("Miss", "#ff91b5"); continue; }
      const y = hitY - ((note.time - current) / travelTime) * (hitY - topY);
      if (y < -45 || y > height + 30) continue;
      const x = note.lane * laneWidth + 9;
      const noteHeight = 28 + Math.min((note.strength || 0) / strongestNote, 1) * 12;
      const gradient = ctx.createLinearGradient(x, y, x, y + noteHeight);
      gradient.addColorStop(0, "#fff"); gradient.addColorStop(.18, colors[note.lane]); gradient.addColorStop(1, `${colors[note.lane]}b8`);
      ctx.fillStyle = gradient; ctx.shadowBlur = 18; ctx.shadowColor = colors[note.lane]; roundedRect(x, y, laneWidth - 18, noteHeight, 12); ctx.shadowBlur = 0;
    }

    particles = particles.filter((particle) => particle.life > 0);
    for (const particle of particles) { particle.y -= 1.4; particle.life -= .035; ctx.globalAlpha = Math.max(particle.life, 0); ctx.fillStyle = particle.color; ctx.font = "20px serif"; ctx.fillText("♥", particle.x, particle.y); }
    ctx.globalAlpha = 1;
    if (playing || !audio.paused) animation = requestAnimationFrame(draw);
  }

  function updateStats() { scoreLabel.textContent = String(score).padStart(6, "0"); comboLabel.textContent = combo; }
  function showJudgement(text, color) { judgement.textContent = text; judgement.style.color = color; judgement.classList.remove("show"); void judgement.offsetWidth; judgement.classList.add("show"); }

  function hitLane(lane) {
    if (!playing || audio.paused) return;
    const current = audio.currentTime;
    let candidate = null; let distance = Infinity;
    for (const note of notes) {
      if (note.lane !== lane || note.hit || note.missed) continue;
      const diff = Math.abs(note.time - current);
      if (diff < distance) { distance = diff; candidate = note; }
    }
    if (!candidate || distance > .25) { combo = 0; updateStats(); showJudgement("Miss", "#ff91b5"); return; }
    candidate.hit = true; combo += 1; maxCombo = Math.max(maxCombo, combo);
    let points = 400; let label = "Good";
    if (distance <= .075) { points = 1000; label = "Perfect"; } else if (distance <= .15) { points = 700; label = "Great"; }
    score += Math.round(points * (1 + Math.min(combo, 50) / 100)); updateStats(); showJudgement(label, colors[lane]);
    const laneWidth = canvas.clientWidth / 4;
    for (let index = 0; index < 5; index++) particles.push({ x: lane * laneWidth + laneWidth / 2 + (Math.random() - .5) * 55, y: canvas.clientHeight - 85, life: 1, color: colors[lane] });
  }

  function startGame() {
    createChart(); score = 0; combo = 0; maxCombo = 0; updateStats(); audio.currentTime = 0; panel.classList.add("hidden"); pauseButton.disabled = false; pauseButton.textContent = "Pause";
    audio.play().then(() => { playing = true; cancelAnimationFrame(animation); draw(); }).catch(() => { panel.classList.remove("hidden"); fileStatus.textContent = "Press Start again to allow audio"; });
  }

  function finishGame() {
    playing = false; pauseButton.disabled = true; panel.classList.remove("hidden");
    panel.querySelector("h1").textContent = "Song complete"; panel.querySelector("p").textContent = `Score ${score.toLocaleString()} · Best combo ${maxCombo}`; startButton.textContent = "Play again";
  }

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0]; if (!file) return;
    if (fileUrl) URL.revokeObjectURL(fileUrl); fileUrl = URL.createObjectURL(file); audio.src = fileUrl;
    const token = ++analysisToken;
    beatCandidates = [];
    analysedDuration = 0;
    songName.textContent = file.name; fileStatus.textContent = "Analysing beats and energy…"; startButton.disabled = true;
    panel.querySelector("h1").textContent = "Listening for the beat";
    panel.querySelector("p").textContent = "This local analysis may take a moment for a long song.";
    try { await analyseBeats(file, token); }
    catch (error) {
      if (token !== analysisToken) return;
      fileStatus.textContent = error.message || "This song could not be analysed.";
      panel.querySelector("h1").textContent = "Try another song";
      panel.querySelector("p").textContent = "MP3, WAV and OGG files work best for beat detection.";
    }
  });
  difficulty.addEventListener("change", () => {
    if (!beatCandidates.length || !analysedDuration) return;
    createChart();
    fileStatus.textContent = `${fileInput.files[0].name} · ${notes.length} synced notes ready`;
  });
  startButton.addEventListener("click", startGame);
  pauseButton.addEventListener("click", () => { if (audio.paused) { audio.play(); playing = true; pauseButton.textContent = "Pause"; draw(); } else { audio.pause(); playing = false; pauseButton.textContent = "Continue"; } });
  audio.addEventListener("ended", finishGame);
  keyButtons.forEach((button, lane) => button.addEventListener("click", () => {
    remappingLane = lane;
    keyButtons.forEach((item) => item.classList.remove("listening"));
    button.classList.add("listening");
    keyStatus.textContent = `Press a letter or number for lane ${lane + 1}.`;
  }));
  resetKeys.addEventListener("click", () => {
    keys = [...defaultKeys]; remappingLane = null; saveKeys();
    keyButtons.forEach((button) => button.classList.remove("listening"));
    keyStatus.textContent = "Keys reset to D F J K.";
  });
  window.addEventListener("keydown", (event) => {
    const pressed = event.key.toLowerCase();
    if (remappingLane !== null) {
      event.preventDefault();
      if (!/^[a-z0-9]$/.test(pressed)) { keyStatus.textContent = "Please press one letter or number."; return; }
      const duplicateLane = keys.indexOf(pressed);
      if (duplicateLane >= 0 && duplicateLane !== remappingLane) keys[duplicateLane] = keys[remappingLane];
      keys[remappingLane] = pressed;
      remappingLane = null; saveKeys();
      keyButtons.forEach((button) => button.classList.remove("listening"));
      keyStatus.textContent = `Saved: ${keys.map((key) => key.toUpperCase()).join(" · ")}`;
      return;
    }
    const lane = keys.indexOf(pressed); if (lane >= 0) { event.preventDefault(); hitLane(lane); }
  });
  canvas.addEventListener("pointerdown", (event) => { const rect = canvas.getBoundingClientRect(); hitLane(Math.max(0, Math.min(3, Math.floor((event.clientX - rect.left) / (rect.width / 4))))); });
  window.addEventListener("resize", resize); updateKeyLabels(); resize(); draw();
})();

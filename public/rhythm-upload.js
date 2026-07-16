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
  const keys = ["d", "f", "j", "k"];
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

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  function hash(text) { let value = 2166136261; for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619); return value >>> 0; }

  function createChart() {
    const intervals = { easy: 0.76, normal: 0.54, hard: 0.38 };
    const interval = intervals[difficulty.value];
    seed = hash(`${fileInput.files[0]?.name || "song"}-${difficulty.value}`);
    notes = [];
    for (let time = 1.8, index = 0; time < Math.max(audio.duration - 0.5, 2); time += interval, index++) {
      const lane = Math.floor(random() * 4);
      notes.push({ time, lane, hit: false, missed: false });
      if (difficulty.value === "hard" && index % 12 === 8) notes.push({ time, lane: (lane + 2) % 4, hit: false, missed: false });
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

    for (const note of notes) {
      if (note.hit || note.missed) continue;
      if (current - note.time > 0.24) { note.missed = true; combo = 0; updateStats(); showJudgement("Miss", "#ff91b5"); continue; }
      const y = hitY - ((note.time - current) / travelTime) * (hitY - topY);
      if (y < -45 || y > height + 30) continue;
      const x = note.lane * laneWidth + 9;
      const gradient = ctx.createLinearGradient(x, y, x, y + 32);
      gradient.addColorStop(0, "#fff"); gradient.addColorStop(.18, colors[note.lane]); gradient.addColorStop(1, `${colors[note.lane]}b8`);
      ctx.fillStyle = gradient; ctx.shadowBlur = 18; ctx.shadowColor = colors[note.lane]; roundedRect(x, y, laneWidth - 18, 31, 12); ctx.shadowBlur = 0;
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

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0]; if (!file) return;
    if (fileUrl) URL.revokeObjectURL(fileUrl); fileUrl = URL.createObjectURL(file); audio.src = fileUrl;
    songName.textContent = file.name; fileStatus.textContent = "Reading song…"; startButton.disabled = true;
    audio.addEventListener("loadedmetadata", () => { const minutes = Math.floor(audio.duration / 60); const seconds = Math.floor(audio.duration % 60).toString().padStart(2, "0"); fileStatus.textContent = `${file.name} · ${minutes}:${seconds}`; startButton.disabled = false; panel.querySelector("h1").textContent = "Song ready"; panel.querySelector("p").textContent = "The chart will be generated locally when you press Start."; }, { once: true });
  });
  startButton.addEventListener("click", startGame);
  pauseButton.addEventListener("click", () => { if (audio.paused) { audio.play(); playing = true; pauseButton.textContent = "Pause"; draw(); } else { audio.pause(); playing = false; pauseButton.textContent = "Continue"; } });
  audio.addEventListener("ended", finishGame);
  window.addEventListener("keydown", (event) => { const lane = keys.indexOf(event.key.toLowerCase()); if (lane >= 0) { event.preventDefault(); hitLane(lane); } });
  canvas.addEventListener("pointerdown", (event) => { const rect = canvas.getBoundingClientRect(); hitLane(Math.max(0, Math.min(3, Math.floor((event.clientX - rect.left) / (rect.width / 4))))); });
  window.addEventListener("resize", resize); resize(); draw();
})();

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
  let travelTime = 1.8;
  let detectedBpm = 0;
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
  let pendingSlide = null;
  const activeHolds = new Map();
  const laneFlashes = [0, 0, 0, 0];

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
      const tempoBins = new Map();
      for (let index = 1; index < beatCandidates.length; index++) {
        let gap = beatCandidates[index].time - beatCandidates[index - 1].time;
        if (gap < .18 || gap > 1.5) continue;
        while (gap > .78) gap /= 2;
        while (gap < .32) gap *= 2;
        const bin = Math.round(gap / .02) * .02;
        tempoBins.set(bin, (tempoBins.get(bin) || 0) + beatCandidates[index].strength);
      }
      let beatInterval = .5;
      let strongestTempo = -1;
      for (const [interval, strength] of tempoBins) {
        if (strength > strongestTempo) { strongestTempo = strength; beatInterval = interval; }
      }
      detectedBpm = Math.round(60 / beatInterval);
      travelTime = Math.max(1.15, Math.min(2.45, beatInterval * 4));
      analysedDuration = buffer.duration;
      const minutes = Math.floor(buffer.duration / 60);
      const seconds = Math.floor(buffer.duration % 60).toString().padStart(2, "0");
      createChart();
      fileStatus.textContent = `${file.name} · ${minutes}:${seconds} · ${detectedBpm} BPM · ${notes.length} synced notes`;
      startButton.disabled = false;
      startButton.textContent = "Start beat-synced rhythm";
      panel.querySelector("h1").textContent = "Song ready";
      panel.querySelector("p").textContent = "Tap short notes, hold long beams, and follow slide arrows in time with the song.";
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
    const selectedBeats = [];
    let previousTime = -10;
    for (const beat of beatCandidates) {
      if (beat.strength < threshold || beat.time - previousTime < minimumGaps[difficulty.value]) continue;
      selectedBeats.push(beat);
      previousTime = beat.time;
    }
    for (let index = 0; index < selectedBeats.length; index++) {
      const beat = selectedBeats[index];
      const lane = Math.abs(Math.floor(beat.brightness * 10000 + random() * 4)) % 4;
      const nextGap = (selectedBeats[index + 1]?.time || beat.time + 2) - beat.time;
      const typeRoll = random();
      let type = "tap";
      let duration = 0;
      let targetLane = lane;
      if (typeRoll > .87 && nextGap > .48) { type = "hold"; duration = Math.min(Math.max(nextGap * .82, .46), 1.25); }
      else if (typeRoll > .72 && index < selectedBeats.length - 1) { type = "slide"; targetLane = (lane + 1 + Math.floor(random() * 3)) % 4; }
      notes.push({ time: beat.time, lane, targetLane, type, duration, strength: beat.strength, hit: false, missed: false, started: false });
      if (difficulty.value === "hard" && type === "tap" && beat.strength > threshold * 2.15) notes.push({ time: beat.time, lane: (lane + 2) % 4, targetLane: (lane + 2) % 4, type: "tap", duration: 0, strength: beat.strength, hit: false, missed: false, started: false });
    }
  }

  function roundedRect(x, y, width, height, radius) {
    ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fill();
  }

  function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const hitY = height - 68;
    const topY = 38;
    const current = audio.currentTime || 0;
    const leftTop = width * .36;
    const rightTop = width * .64;
    const leftBottom = width * .045;
    const rightBottom = width * .955;
    const laneBounds = (lane, y) => {
      const progress = Math.max(0, Math.min(1, (y - topY) / (hitY - topY)));
      const left = leftTop + (leftBottom - leftTop) * progress;
      const right = rightTop + (rightBottom - rightTop) * progress;
      const laneWidth = (right - left) / 4;
      return { x: left + lane * laneWidth, width: laneWidth };
    };

    const background = ctx.createRadialGradient(width / 2, topY, 10, width / 2, height / 2, width * .8);
    background.addColorStop(0, "#244b70"); background.addColorStop(.38, "#121830"); background.addColorStop(1, "#070713");
    ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
    const leftBurst = ctx.createLinearGradient(0, 0, leftBottom, height);
    leftBurst.addColorStop(0, "#ffb24a14"); leftBurst.addColorStop(.55, "#ff5c283f"); leftBurst.addColorStop(1, "#ff44b326");
    ctx.fillStyle = leftBurst; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(leftTop, topY); ctx.lineTo(leftBottom, hitY); ctx.lineTo(0, height); ctx.fill();
    const rightBurst = ctx.createLinearGradient(width, 0, rightBottom, height);
    rightBurst.addColorStop(0, "#8f6bff12"); rightBurst.addColorStop(.55, "#ff3ccf38"); rightBurst.addColorStop(1, "#36cfff28");
    ctx.fillStyle = rightBurst; ctx.beginPath(); ctx.moveTo(width, 0); ctx.lineTo(rightTop, topY); ctx.lineTo(rightBottom, hitY); ctx.lineTo(width, height); ctx.fill();
    for (let star = 0; star < 55; star++) {
      const x = (star * 97 + 31) % Math.max(width, 1); const y = (star * 61 + 17) % Math.max(hitY, 1);
      ctx.globalAlpha = .22 + (star % 4) * .16; ctx.fillStyle = star % 3 ? "#fff" : "#68e5ff"; ctx.fillRect(x, y, star % 5 === 0 ? 2 : 1, star % 5 === 0 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#060812dc"; ctx.beginPath(); ctx.moveTo(leftTop, topY); ctx.lineTo(rightTop, topY); ctx.lineTo(rightBottom, hitY); ctx.lineTo(leftBottom, hitY); ctx.closePath(); ctx.fill();

    for (let lane = 0; lane < 4; lane++) {
      const top = laneBounds(lane, topY); const bottom = laneBounds(lane, hitY);
      const laneGradient = ctx.createLinearGradient(0, topY, 0, hitY);
      laneGradient.addColorStop(0, `${colors[lane]}0c`); laneGradient.addColorStop(1, `${colors[lane]}38`);
      ctx.fillStyle = laneGradient; ctx.beginPath(); ctx.moveTo(top.x + 1, topY); ctx.lineTo(top.x + top.width - 1, topY); ctx.lineTo(bottom.x + bottom.width - 3, hitY); ctx.lineTo(bottom.x + 3, hitY); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#bcecff32"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(top.x, topY); ctx.lineTo(bottom.x, hitY); ctx.stroke();
      const flashing = laneFlashes[lane] > Date.now();
      ctx.fillStyle = flashing ? "#ffffff" : "#101527"; ctx.shadowBlur = flashing ? 42 : 18; ctx.shadowColor = colors[lane]; roundedRect(bottom.x + 6, hitY + 9, bottom.width - 12, 38, 18); ctx.shadowBlur = 0;
      ctx.strokeStyle = colors[lane]; ctx.lineWidth = flashing ? 4 : 2; ctx.strokeRect(bottom.x + 12, hitY + 15, bottom.width - 24, 26);
      ctx.fillStyle = flashing ? colors[lane] : "#e9fbff"; ctx.font = "900 15px Segoe UI"; ctx.textAlign = "center"; ctx.fillText(keys[lane].toUpperCase(), bottom.x + bottom.width / 2, hitY + 35);
    }
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.shadowBlur = 22; ctx.shadowColor = "#63ddff"; ctx.beginPath(); ctx.moveTo(leftBottom, hitY); ctx.lineTo(rightBottom, hitY); ctx.stroke(); ctx.shadowBlur = 0;

    const strongestNote = notes.reduce((maximum, item) => Math.max(maximum, item.strength || 0), 0) || 1;
    for (const note of notes) {
      if (note.hit || note.missed) continue;
      if (note.type === "hold" && note.started && current >= note.time + note.duration) { activeHolds.delete(note.lane); completeHit(note, note.lane, 0, "Hold!"); continue; }
      if (note.started && note.type === "slide" && current - note.time > .55) { note.missed = true; pendingSlide = null; registerMiss("Missing"); continue; }
      if (!note.started && current - note.time > 0.24) { note.missed = true; registerMiss("Missing"); continue; }
      const y = hitY - ((note.time - current) / travelTime) * (hitY - topY);
      const holdTailY = note.type === "hold" ? hitY - (((note.time + note.duration) - current) / travelTime) * (hitY - topY) : y;
      if (note.type === "hold") {
        if (holdTailY > height + 30 || y < -45) continue;
      } else if (y < -45 || y > height + 30) continue;
      const bounds = laneBounds(note.lane, Math.max(topY, Math.min(hitY, y)));
      const x = bounds.x + Math.max(5, bounds.width * .08);
      const noteHeight = 28 + Math.min((note.strength || 0) / strongestNote, 1) * 12;
      if (note.type === "hold") {
        const holdBottom = Math.min(y + noteHeight, hitY + noteHeight);
        const holdTop = Math.max(topY - noteHeight, Math.min(holdTailY, holdBottom - noteHeight));
        const holdHeight = Math.max(noteHeight, holdBottom - holdTop);
        const holdBounds = laneBounds(note.lane, Math.max(topY, Math.min(hitY, holdBottom)));
        const holdWidth = holdBounds.width * .84;
        const holdX = holdBounds.x + (holdBounds.width - holdWidth) / 2;
        const holdGradient = ctx.createLinearGradient(holdX, holdTop, holdX, holdBottom);
        holdGradient.addColorStop(0, `${colors[note.lane]}a8`); holdGradient.addColorStop(.72, colors[note.lane]); holdGradient.addColorStop(1, "#ffffff");
        ctx.fillStyle = holdGradient; ctx.shadowBlur = 24; ctx.shadowColor = colors[note.lane]; roundedRect(holdX, holdTop, holdWidth, holdHeight, 16); ctx.shadowBlur = 0;
        if (note.started) laneFlashes[note.lane] = Date.now() + 80;
        continue;
      }
      const noteWidth = note.type === "slide" ? bounds.width * .54 : bounds.width * .84;
      const noteX = note.type === "slide" ? bounds.x + (bounds.width - noteWidth) / 2 : x;
      const noteY = y - noteHeight / 2;
      const gradient = ctx.createLinearGradient(x, noteY, x, noteY + noteHeight);
      gradient.addColorStop(0, "#fff"); gradient.addColorStop(.18, colors[note.lane]); gradient.addColorStop(1, `${colors[note.lane]}b8`);
      ctx.fillStyle = gradient; ctx.shadowBlur = 22; ctx.shadowColor = colors[note.lane]; roundedRect(noteX, noteY, noteWidth, noteHeight, note.type === "slide" ? 18 : 12); ctx.shadowBlur = 0;
    }

    particles = particles.filter((particle) => particle.life > 0);
    for (const particle of particles) { particle.y -= 1.4; particle.life -= .035; ctx.globalAlpha = Math.max(particle.life, 0); ctx.fillStyle = particle.color; ctx.font = "20px serif"; ctx.fillText("♥", particle.x, particle.y); }
    ctx.globalAlpha = 1;
    if (playing || !audio.paused) animation = requestAnimationFrame(draw);
  }

  function updateStats() { scoreLabel.textContent = String(score).padStart(6, "0"); comboLabel.textContent = combo; }
  function showJudgement(text, color) { judgement.textContent = text; judgement.style.color = color; judgement.classList.remove("show"); void judgement.offsetWidth; judgement.classList.add("show"); }

  function registerMiss(label) {
    combo = 0;
    updateStats(); showJudgement(label, "#ff6b9e");
  }

  function completeHit(note, lane, distance, forcedLabel = "") {
    note.hit = true; note.started = true; combo += 1; maxCombo = Math.max(maxCombo, combo);
    let points = 400; let label = forcedLabel || "Good";
    if (!forcedLabel && distance <= .075) { points = 1000; label = "Perfect"; } else if (!forcedLabel && distance <= .15) { points = 700; label = "Great"; }
    if (forcedLabel) points = 900;
    score += Math.round(points * (1 + Math.min(combo, 50) / 100)); laneFlashes[lane] = Date.now() + 180; updateStats(); showJudgement(label, colors[lane]);
    const trackLeft = canvas.clientWidth * .045; const trackWidth = canvas.clientWidth * .91; const laneWidth = trackWidth / 4;
    for (let index = 0; index < 9; index++) particles.push({ x: trackLeft + lane * laneWidth + laneWidth / 2 + (Math.random() - .5) * 75, y: canvas.clientHeight - 72, life: 1, color: colors[lane] });
  }

  function hitLane(lane) {
    if (!playing || audio.paused) return;
    const current = audio.currentTime;
    laneFlashes[lane] = Date.now() + 100;
    if (pendingSlide && !pendingSlide.hit && !pendingSlide.missed) {
      if (lane === pendingSlide.targetLane && current - pendingSlide.time <= .55) {
        const slide = pendingSlide; pendingSlide = null; completeHit(slide, lane, slide.initialDistance || 0, "Slide!");
      } else if (lane !== pendingSlide.lane) registerMiss("Offbeat");
      return;
    }
    let candidate = null; let distance = Infinity;
    for (const note of notes) {
      if (note.lane !== lane || note.hit || note.missed || note.started) continue;
      const diff = Math.abs(note.time - current);
      if (diff < distance) { distance = diff; candidate = note; }
    }
    if (!candidate || distance > .25) { registerMiss("Offbeat"); return; }
    if (candidate.type === "hold") {
      candidate.started = true; candidate.initialDistance = distance; activeHolds.set(lane, candidate); showJudgement("Hold", colors[lane]); return;
    }
    if (candidate.type === "slide") {
      candidate.started = true; candidate.initialDistance = distance; pendingSlide = candidate; showJudgement(`Slide → ${keys[candidate.targetLane].toUpperCase()}`, colors[lane]); return;
    }
    completeHit(candidate, lane, distance);
  }

  function releaseLane(lane) {
    const note = activeHolds.get(lane); if (!note) return;
    activeHolds.delete(lane);
    if (audio.currentTime >= note.time + note.duration - .12) completeHit(note, lane, note.initialDistance || 0, "Hold!");
    else { note.missed = true; registerMiss("Offbeat"); }
  }

  function startGame() {
    createChart(); score = 0; combo = 0; maxCombo = 0; pendingSlide = null; activeHolds.clear(); laneFlashes.fill(0); updateStats(); audio.currentTime = 0; panel.classList.add("hidden"); pauseButton.disabled = false; pauseButton.textContent = "Pause";
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
    detectedBpm = 0;
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
    fileStatus.textContent = `${fileInput.files[0].name} · ${detectedBpm} BPM · ${notes.length} synced notes ready`;
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
    const lane = keys.indexOf(pressed); if (lane >= 0) { event.preventDefault(); if (!event.repeat) hitLane(lane); }
  });
  window.addEventListener("keyup", (event) => { const lane = keys.indexOf(event.key.toLowerCase()); if (lane >= 0) releaseLane(lane); });
  let pointerLane = null;
  function laneFromPointer(event) { const rect = canvas.getBoundingClientRect(); const left = rect.width * .045; const trackWidth = rect.width * .91; return Math.max(0, Math.min(3, Math.floor(((event.clientX - rect.left) - left) / (trackWidth / 4)))); }
  canvas.addEventListener("pointerdown", (event) => { pointerLane = laneFromPointer(event); canvas.setPointerCapture?.(event.pointerId); hitLane(pointerLane); });
  canvas.addEventListener("pointermove", (event) => { if (pointerLane === null || !event.buttons) return; const nextLane = laneFromPointer(event); if (nextLane !== pointerLane) { pointerLane = nextLane; hitLane(nextLane); } });
  canvas.addEventListener("pointerup", () => { if (pointerLane !== null) releaseLane(pointerLane); pointerLane = null; });
  window.addEventListener("resize", resize); updateKeyLabels(); resize(); draw();
})();

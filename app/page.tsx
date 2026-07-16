"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CheckIn = { id: number; level: number; label: string; time: string };

type AudioNodeLike = { connect: (destination: unknown) => AudioNodeLike; dispose: () => void };
type GainNodeLike = AudioNodeLike & { toDestination: () => GainNodeLike };
type SynthLike = AudioNodeLike & { triggerAttackRelease: (note: string, duration: string, time: number | undefined, velocity: number) => void };
type LoopLike = { start: (time: number) => LoopLike; dispose: () => void };
type ToneRuntime = {
  start: () => Promise<void>;
  Gain: new (gain: number) => GainNodeLike;
  Reverb: new (options: { decay: number; wet: number }) => AudioNodeLike;
  PolySynth: new (synth: unknown, options: object) => SynthLike;
  Synth: unknown;
  Loop: new (callback: (time: number) => void, interval: string) => LoopLike;
  getTransport: () => { bpm: { value: number }; start: () => void };
};

declare global {
  interface Window { Tone?: ToneRuntime }
}

async function waitForTone() {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (window.Tone) return window.Tone;
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  return null;
}

const puzzleImages = [
  { name: "Misty lake", url: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd4297?auto=format&fit=crop&w=900&q=85" },
  { name: "Forest light", url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=85" },
  { name: "Soft coast", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=85" },
];

const videos = [
  { title: "5-minute guided breathing", length: "5 min", id: "inpok4MKVLM", tone: "peach" },
  { title: "Calm your mind meditation", length: "10 min", id: "O-6f5wQXSu8", tone: "blue" },
];

function stressInfo(level: number) {
  if (level <= 3) return { key: "low", label: "Light & steady", note: "You have room for a little energising focus.", color: "#2f7d63", game: "Focus Sprint" };
  if (level <= 7) return { key: "moderate", label: "A little stretched", note: "Let’s gently redirect your attention.", color: "#b86b37", game: "Hidden Object Room" };
  return { key: "high", label: "Feeling overloaded", note: "No rush. Let the music hold your attention for a while.", color: "#6a5d9d", game: "Bemuse Rhythm Game" };
}

function shuffle(size = 9) {
  const values = Array.from({ length: size }, (_, i) => i);
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

function FocusGame() {
  const [score, setScore] = useState(0);
  const [seconds, setSeconds] = useState(20);
  const [running, setRunning] = useState(false);
  const [spot, setSpot] = useState({ x: 50, y: 48 });

  useEffect(() => {
    if (!running || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearInterval(timer);
  }, [running, seconds]);

  function tap() {
    if (!running) return;
    setScore((s) => s + 1);
    setSpot({ x: 12 + Math.random() * 76, y: 14 + Math.random() * 68 });
  }

  function reset() {
    setScore(0); setSeconds(20); setRunning(true); setSpot({ x: 50, y: 48 });
  }

  return (
    <div className="game-shell focus-game">
      <div className="game-top"><span>Tap the drifting orb</span><strong>{seconds}s · {score} hits</strong></div>
      <div className="focus-field">
        {running && seconds > 0 ? <button className="focus-orb" style={{ left: `${spot.x}%`, top: `${spot.y}%` }} onClick={tap} aria-label="Tap the moving orb" /> :
          <div className="game-message"><span>{score ? `${score} gentle wins` : "Ready when you are"}</span><button onClick={reset}>{score ? "Play again" : "Start 20 seconds"}</button></div>}
      </div>
    </div>
  );
}

function FindGame() {
  const [round, setRound] = useState(0);
  const [found, setFound] = useState(false);
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
  const hiddenAt = useMemo(() => round % objects.length, [round]);
  const target = objects[hiddenAt];
  function next() { setFound(false); setRound((r) => r + 1); }
  return (
    <div className="game-shell find-game">
      <div className="game-top"><span>Find the {target.name} hidden in the room</span><strong>Round {round + 1}</strong></div>
      <div className="room-scene">
        <div className="room-ceiling" />
        <div className="room-side room-side-left" />
        <div className="room-side room-side-right" />
        <div className="room-floor-lines"><i /><i /><i /><i /><i /></div>
        <div className="room-stairs"><i /><i /><i /><i /><i /><i /></div>
        <div className="room-bookcase"><i /><i /><i /><i /><span /><span /><span /></div>
        <div className="room-coat-rack"><i /><i /><i /></div>
        <div className="room-curtain curtain-left" /><div className="room-curtain curtain-right" />
        <div className="room-window"><span /><span /></div>
        <div className="room-frame">☁</div>
        <div className="room-pictures"><i>✦</i><i>❧</i></div>
        <div className="room-shelf"><i /><i /><i /></div>
        <div className="room-clock"><i /></div>
        <div className="room-cabinet"><i /><i /><span /><span /></div>
        <div className="room-desk"><div className="room-monitor">◒</div><i /><i /></div>
        <div className="room-boxes"><i /><i /><i /></div>
        <div className="room-papers">▱ ▰ ▱</div>
        <div className="room-suitcase">▥</div>
        <div className="room-lamp"><i /></div>
        <div className="room-sofa"><span /><span /></div>
        <div className="room-table" />
        <div className="room-ottoman" />
        <div className="room-basket">⌁</div>
        <div className="room-rug" />
        <div className="room-plant">♧</div>
        {objects.map((item, i) => <button key={item.name} type="button" onClick={() => i === hiddenAt && setFound(true)} aria-label={item.name} className={`room-object ${item.position}${found && i === hiddenAt ? " found" : ""}`}>{item.icon}</button>)}
        {found && <div className="found-message"><strong>You found it!</strong><span>One small detail brought you into the moment.</span><button onClick={next}>Explore a new room</button></div>}
      </div>
    </div>
  );
}

function BreathingGame() {
  const phases = [
    { key: "inhale", label: "Breathe in", duration: 4 },
    { key: "hold", label: "Hold gently", duration: 2 },
    { key: "exhale", label: "Breathe out", duration: 6 },
  ];
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [seconds, setSeconds] = useState(phases[0].duration);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const phase = phases[phaseIndex];

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      if (seconds > 1) { setSeconds((value) => value - 1); return; }
      const next = (phaseIndex + 1) % phases.length;
      if (next === 0) setCycles((value) => value + 1);
      setPhaseIndex(next);
      setSeconds(phases[next].duration);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [running, seconds, phaseIndex]);

  function reset() {
    setRunning(false); setPhaseIndex(0); setSeconds(phases[0].duration); setCycles(0);
  }

  return (
    <div className="game-shell breathing-game">
      <div className="game-top"><span>Follow the circle at your own pace</span><strong>{cycles} {cycles === 1 ? "cycle" : "cycles"}</strong></div>
      <div className={`breathing-field phase-${phase.key}`}>
        <div className="breath-rings"><i /><i /><div className="breath-orb"><span aria-live="polite">{phase.label}</span><strong>{seconds}</strong></div></div>
        <div className="breath-guide"><span><b>4</b> inhale</span><span><b>2</b> hold</span><span><b>6</b> exhale</span></div>
        <div className="breath-controls"><button type="button" onClick={() => setRunning((value) => !value)}>{running ? "Pause" : cycles ? "Continue" : "Begin breathing"}</button><button type="button" className="breath-reset" onClick={reset}>Reset</button></div>
      </div>
    </div>
  );
}

function RhythmGame() {
  const pads = [
    { note: "C4", label: "Rain", symbol: "●" },
    { note: "E4", label: "Glow", symbol: "◆" },
    { note: "G4", label: "Wave", symbol: "≈" },
    { note: "C5", label: "Star", symbol: "✦" },
  ];
  const [sequence, setSequence] = useState([0, 2, 1]);
  const [input, setInput] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const [message, setMessage] = useState("Listen, then echo the pattern");
  const rhythmAudio = useRef<{ synth: SynthLike; gain: GainNodeLike } | null>(null);

  useEffect(() => () => { rhythmAudio.current?.synth.dispose(); rhythmAudio.current?.gain.dispose(); }, []);

  async function soundPad(index: number) {
    const Tone = await waitForTone();
    if (!Tone) return;
    await Tone.start();
    if (!rhythmAudio.current) {
      const gain = new Tone.Gain(0.2).toDestination();
      const synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.03, release: 0.7 } }).connect(gain);
      rhythmAudio.current = { synth, gain };
    }
    rhythmAudio.current.synth.triggerAttackRelease(pads[index].note, "8n", undefined, 0.65);
  }

  async function playPattern(pattern = sequence) {
    if (playing) return;
    setPlaying(true); setInput([]); setMessage("Listen closely…");
    for (const pad of pattern) {
      setActive(pad); void soundPad(pad);
      await new Promise((resolve) => window.setTimeout(resolve, 460));
      setActive(null);
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    }
    setPlaying(false); setMessage("Your turn — repeat the rhythm");
  }

  function choosePad(index: number) {
    if (playing) return;
    setActive(index); void soundPad(index); window.setTimeout(() => setActive(null), 220);
    const nextInput = [...input, index];
    if (sequence[nextInput.length - 1] !== index) {
      setInput([]); setMessage("Almost — listen once more");
      window.setTimeout(() => void playPattern(sequence), 750);
      return;
    }
    if (nextInput.length === sequence.length) {
      const nextSequence = [...sequence, (sequence.length * 3 + round) % pads.length];
      setInput([]); setSequence(nextSequence); setRound((value) => value + 1); setMessage("Beautiful timing! Adding one beat…");
      window.setTimeout(() => void playPattern(nextSequence), 850);
      return;
    }
    setInput(nextInput); setMessage(`${nextInput.length} of ${sequence.length} beats matched`);
  }

  return (
    <div className="game-shell rhythm-game">
      <div className="game-top"><span>Listen and repeat the gentle pattern</span><strong>Round {round}</strong></div>
      <div className="rhythm-field">
        <div className="rhythm-status" aria-live="polite"><strong>{message}</strong><span>{sequence.length} beat pattern</span></div>
        <div className="rhythm-pads">{pads.map((pad, index) => <button type="button" key={pad.label} className={`rhythm-pad pad-${index}${active === index ? " active" : ""}`} onClick={() => choosePad(index)} disabled={playing} aria-label={`${pad.label} tone`}><b>{pad.symbol}</b><span>{pad.label}</span></button>)}</div>
        <button type="button" className="rhythm-play" onClick={() => void playPattern()} disabled={playing}>{playing ? "Playing pattern…" : input.length ? "Hear pattern again" : "Play the rhythm"}</button>
      </div>
    </div>
  );
}

function BemuseGame() {
  return (
    <div className="game-shell bemuse-game">
      <div className="game-top"><span>Open-source browser rhythm game</span><strong>Powered by Bemuse</strong></div>
      <div className="bemuse-frame-wrap">
        <iframe src="https://bemuse.ninja/" title="Bemuse rhythm game" allow="autoplay; fullscreen; gamepad" allowFullScreen />
      </div>
      <div className="bemuse-actions"><div><strong>Bemuse — beat☆music☆sequence</strong><span>Best experienced in Google Chrome. Select a song, then follow the falling notes with your keyboard.</span></div><div><a href="https://bemuse.ninja/" target="_blank" rel="noreferrer">Open full screen ↗</a><a className="bemuse-source" href="https://github.com/bemusic/bemuse" target="_blank" rel="noreferrer">Source · AGPL-3.0</a></div></div>
    </div>
  );
}

function PuzzleGame() {
  const [tiles, setTiles] = useState(() => shuffle());
  const [selected, setSelected] = useState<number | null>(null);
  const [image, setImage] = useState(0);
  const solved = tiles.every((tile, i) => tile === i);

  function choose(index: number) {
    if (selected === null) { setSelected(index); return; }
    const next = [...tiles];
    [next[selected], next[index]] = [next[index], next[selected]];
    setTiles(next); setSelected(null);
  }

  return (
    <div className="game-shell puzzle-game">
      <div className="game-top"><span>Tap two pieces to swap them</span><button className="text-button" onClick={() => { setTiles(shuffle()); setSelected(null); }}>Shuffle</button></div>
      <div className="puzzle-layout">
        <div className="puzzle-board" aria-label="3 by 3 jigsaw puzzle">
          {tiles.map((tile, index) => <button key={index} className={selected === index ? "selected" : ""} onClick={() => choose(index)} aria-label={`Puzzle piece ${tile + 1}`} style={{ backgroundImage: `url(${puzzleImages[image].url})`, backgroundPosition: `${(tile % 3) * 50}% ${Math.floor(tile / 3) * 50}%` }} />)}
          {solved && <div className="solved-message">Beautifully done <span>Take one slow breath.</span></div>}
        </div>
        <div className="scene-picker"><span>Choose a scene</span>{puzzleImages.map((item, i) => <button key={item.name} className={image === i ? "active" : ""} onClick={() => { setImage(i); setTiles(shuffle()); }}><img src={item.url} alt="" /><span>{item.name}</span></button>)}</div>
      </div>
    </div>
  );
}

export default function Home() {
  const [stress, setStress] = useState(5);
  const [soundOn, setSoundOn] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [saved, setSaved] = useState(false);
  const soundRef = useRef<{ dispose: () => void } | null>(null);
  const info = stressInfo(stress);

  useEffect(() => {
    const stored = localStorage.getItem("drift-checkins");
    if (stored) { try { setCheckIns(JSON.parse(stored)); } catch { /* ignore invalid local data */ } }
  }, []);

  useEffect(() => {
    if (!soundOn) return;
    let cancelled = false;
    async function beginSound() {
      const Tone = await waitForTone();
      if (!Tone) { setSoundOn(false); return; }
      await Tone.start();
      if (cancelled) return;
      soundRef.current?.dispose();
      const gain = new Tone.Gain(0.16).toDestination();
      const reverb = new Tone.Reverb({ decay: info.key === "high" ? 8 : 4, wet: 0.7 }).connect(gain);
      const synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: info.key === "low" ? "triangle" : info.key === "moderate" ? "sine" : "sine" }, envelope: { attack: info.key === "low" ? 0.8 : info.key === "moderate" ? 2.2 : 3.8, release: info.key === "high" ? 7 : 4 } }).connect(reverb);
      const notes = info.key === "low" ? ["C4", "E4", "G4", "C5", "G4", "E4"] : info.key === "moderate" ? ["A3", "C4", "E4", "G4", "E4", "C4"] : ["F3", "C4", "A3", "G3"];
      let step = 0;
      const duration = info.key === "low" ? "4n" : info.key === "moderate" ? "2n" : "1m";
      const interval = info.key === "low" ? "4n" : info.key === "moderate" ? "2n" : "1m";
      const loop = new Tone.Loop((time) => { synth.triggerAttackRelease(notes[step++ % notes.length], duration, time, info.key === "high" ? 0.42 : 0.52); }, interval).start(0);
      Tone.getTransport().bpm.value = info.key === "low" ? 78 : info.key === "moderate" ? 60 : 44;
      Tone.getTransport().start();
      soundRef.current = { dispose: () => { loop.dispose(); synth.dispose(); reverb.dispose(); gain.dispose(); } };
    }
    beginSound();
    return () => { cancelled = true; soundRef.current?.dispose(); soundRef.current = null; };
  }, [soundOn, info.key]);

  function toggleSound() {
    if (soundOn) { soundRef.current?.dispose(); soundRef.current = null; }
    setSoundOn((value) => !value);
  }

  function saveCheckIn() {
    const entry = { id: Date.now(), level: stress, label: info.label, time: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }) };
    const next = [...checkIns, entry].slice(-7);
    setCheckIns(next); localStorage.setItem("drift-checkins", JSON.stringify(next));
    setSaved(true); window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <main className={`app theme-${info.key}`}>
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <nav><a className="brand" href="#top" aria-label="Drift home"><span>◌</span> drift</a><div className="nav-actions"><a className="progress-link" href="/progress.html">Progress</a><button className={soundOn ? "sound active" : "sound"} onClick={toggleSound} aria-pressed={soundOn}><span>{soundOn ? "◖))" : "◖"}</span>{soundOn ? "Sound on" : "Sound off"}</button></div></nav>

      <section id="top" className="hero">
        <div className="eyebrow">A tiny pause, just for you</div>
        <h1>How are you feeling<br /><em>right now?</em></h1>
        <p>No judgement. Slide to where you are and we’ll shape a small moment of relief around you.</p>
        <div className="checkin-card">
          <div className="status-row"><div><span className="status-dot" /><strong>{info.label}</strong><small>{info.note}</small></div><div className="level"><strong>{stress}</strong><span>/ 10</span></div></div>
          <div className="slider-wrap"><input aria-label="Current stress level" type="range" min="1" max="10" value={stress} onChange={(e) => setStress(Number(e.target.value))} style={{ "--progress": `${(stress - 1) / 9 * 100}%` } as React.CSSProperties} /><div className="slider-labels"><span>Calm</span><span>Balanced</span><span>Overwhelmed</span></div></div>
          <button className="primary" onClick={saveCheckIn}>{saved ? "Check-in saved ✓" : "Save today’s check-in"}</button>
        </div>
      </section>

      <section className="game-section">
        <div className="section-intro"><div><span className="section-number">01</span><div><div className="eyebrow">Your mindful diversion</div><h2>{info.game}</h2></div></div><p>{info.key === "low" ? "A playful burst to channel your energy into one simple target." : info.key === "moderate" ? "Let busy thoughts soften while you search a cosy room for one tiny object." : "Choose a song and redirect your attention into Bemuse’s full keyboard rhythm experience."}</p></div>
        {info.key === "low" ? <FocusGame /> : info.key === "moderate" ? <FindGame /> : <BemuseGame />}
      </section>

      <section className="video-section">
        <div className="section-intro"><div><span className="section-number">02</span><div><div className="eyebrow">Stay a little longer</div><h2>Press play, let go</h2></div></div><p>Choose a guided pause or a quiet backdrop. Whatever feels easiest is enough.</p></div>
        <div className="video-grid">{videos.map((video) => <article className={`video-card ${video.tone}`} key={video.id}><div className="video-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0`} title={video.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div><div><span>{video.length}</span><h3>{video.title}</h3></div></article>)}</div>
      </section>

      <footer><a className="brand" href="#top"><span>◌</span> drift</a><p>A softer place to land, one moment at a time.</p><small>Not a substitute for professional mental health support.</small></footer>
    </main>
  );
}

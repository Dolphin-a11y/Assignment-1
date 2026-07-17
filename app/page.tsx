"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CheckIn = { id: number; level: number; label: string; time: string };
type StressKey = "low" | "balanced" | "moderate" | "high";
type GameOption = { id: string; title: string; description: string };

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

function stressInfo(level: number): { key: StressKey; label: string; note: string; color: string } {
  if (level <= 2) return { key: "low", label: "Calm & steady", note: "Enjoy a thoughtful game at an unhurried pace.", color: "#2f5141" };
  if (level <= 5) return { key: "balanced", label: "Balanced & open", note: "A tactile challenge can keep your mind gently engaged.", color: "#4f8069" };
  if (level <= 7) return { key: "moderate", label: "A little stretched", note: "Let’s gently redirect your attention.", color: "#b86b37" };
  return { key: "high", label: "Feeling overloaded", note: "No rush. Follow a simple rhythm or calming pattern.", color: "#6a5d9d" };
}

const gameCatalog: Record<StressKey, GameOption[]> = {
  low: [
    { id: "calm-chess", title: "Calm 3D Chess", description: "Play with the gentle AI or invite a friend into a quiet chess room." },
    { id: "calm-focus", title: "Drifting Focus", description: "Follow a softly moving orb for a short, playful attention break." },
    { id: "calm-memory", title: "Garden Memory", description: "Match peaceful symbols and let your attention settle naturally." },
  ],
  balanced: [
    { id: "balanced-jigsaw", title: "Your 3D Jigsaw", description: "Build a tactile puzzle from a Drift scene or an image of your own." },
    { id: "balanced-swap", title: "Picture Pieces", description: "Swap image tiles until the calming scene becomes whole again." },
    { id: "balanced-memory", title: "Gentle Pairs", description: "Turn over cards and find the matching nature pairs." },
  ],
  moderate: [
    { id: "moderate-hidden", title: "Hidden Object Room", description: "Search a detailed 3D room for one small object at a time." },
    { id: "moderate-focus", title: "Focus Sprint", description: "Channel busy thoughts into a simple twenty-second challenge." },
    { id: "moderate-puzzle", title: "Quick Picture Puzzle", description: "Redirect your attention by rebuilding a small scenic puzzle." },
  ],
  high: [
    { id: "high-song", title: "Your Song Rhythm", description: "Upload a favourite song and follow its rhythm using your keyboard." },
    { id: "high-breathe", title: "Guided Breathing", description: "Follow a slow inhale, gentle hold, and longer exhale." },
    { id: "high-echo", title: "Gentle Rhythm Echo", description: "Listen to a soft musical pattern and repeat it one beat at a time." },
  ],
};

function pickGame(key: StressKey, avoid?: string) {
  const options = gameCatalog[key];
  const choices = options.filter((option) => option.id !== avoid);
  return choices[Math.floor(Math.random() * choices.length)] || options[0];
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

function CustomSongRhythmGame() {
  return (
    <div className="game-shell custom-rhythm-game">
        <div className="game-top"><span>Play notes with computer keys — not the mouse</span><strong>Keyboard-only gameplay</strong></div>
        <iframe className="custom-rhythm-frame" src="/rhythm-upload.html?v=keyboard-only-v13" title="Upload your own song rhythm game" allow="autoplay" />
    </div>
  );
}

function Jigsaw3DGame() {
  return (
    <div className="game-shell jigsaw-3d-game">
      <div className="game-top"><span>Choose the ocean image or upload your own</span><strong>3D jigsaw puzzle</strong></div>
      <iframe className="jigsaw-frame" src="/jigsaw-3d.html?v=2" title="Upload an image and play a 3D jigsaw puzzle" />
    </div>
  );
}

function CalmChessGame() {
  return (
    <div className="game-shell calm-chess-game">
      <div className="game-top"><span>Play with AI or create a room for a friend</span><strong>Calm chess your way</strong></div>
      <iframe className="chess-frame" src="/chess-room.html?v=12" title="3D AI and two-player chess" />
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

function MemoryMatchGame() {
  const symbols = ["☘", "☀", "☁", "✿", "❋", "◌"];
  const makeCards = () => shuffle(12).map((position) => ({ id: position, symbol: symbols[position % symbols.length] }));
  const [cards, setCards] = useState(makeCards);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);

  function reset() { setCards(makeCards()); setOpen([]); setMatched([]); }

  function turn(index: number) {
    if (open.length === 2 || open.includes(index) || matched.includes(cards[index].symbol)) return;
    const next = [...open, index];
    setOpen(next);
    if (next.length === 2) {
      if (cards[next[0]].symbol === cards[next[1]].symbol) {
        window.setTimeout(() => { setMatched((items) => [...items, cards[next[0]].symbol]); setOpen([]); }, 420);
      } else window.setTimeout(() => setOpen([]), 720);
    }
  }

  return (
    <div className="game-shell memory-game">
      <div className="game-top"><span>Find all six peaceful pairs</span><button className="text-button" onClick={reset}>New cards</button></div>
      <div className="memory-field">
        <div className="memory-grid">{cards.map((card, index) => {
          const visible = open.includes(index) || matched.includes(card.symbol);
          return <button type="button" key={card.id} className={visible ? "revealed" : ""} onClick={() => turn(index)} aria-label={visible ? card.symbol : `Hidden card ${index + 1}`}><span>{visible ? card.symbol : "?"}</span></button>;
        })}</div>
        {matched.length === symbols.length && <div className="memory-complete"><strong>All pairs found</strong><span>A small moment of steady focus.</span><button onClick={reset}>Play again</button></div>}
      </div>
    </div>
  );
}

function GeneratedGame({ id }: { id: string }) {
  if (id === "calm-chess") return <CalmChessGame />;
  if (id === "calm-focus" || id === "moderate-focus") return <FocusGame />;
  if (id === "calm-memory" || id === "balanced-memory") return <MemoryMatchGame />;
  if (id === "balanced-jigsaw") return <Jigsaw3DGame />;
  if (id === "balanced-swap" || id === "moderate-puzzle") return <PuzzleGame />;
  if (id === "moderate-hidden") return <FindGame />;
  if (id === "high-breathe") return <BreathingGame />;
  if (id === "high-echo") return <RhythmGame />;
  return <CustomSongRhythmGame />;
}

export default function Home() {
  const [stress, setStress] = useState(5);
  const [soundOn, setSoundOn] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [saved, setSaved] = useState(false);
  const [gameId, setGameId] = useState("balanced-jigsaw");
  const soundRef = useRef<{ dispose: () => void } | null>(null);
  const info = stressInfo(stress);
  const currentGame = gameCatalog[info.key].find((game) => game.id === gameId) || gameCatalog[info.key][0];

  useEffect(() => {
    const stored = localStorage.getItem("drift-checkins");
    if (stored) { try { setCheckIns(JSON.parse(stored)); } catch { /* ignore invalid local data */ } }
  }, []);

  useEffect(() => {
    const storageKey = `drift-last-game-${info.key}`;
    const previous = sessionStorage.getItem(storageKey) || undefined;
    const next = pickGame(info.key, previous);
    setGameId(next.id);
    sessionStorage.setItem(storageKey, next.id);
  }, [info.key]);

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
      const middleStress = info.key === "balanced" || info.key === "moderate";
      const synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: info.key === "low" ? "triangle" : "sine" }, envelope: { attack: info.key === "low" ? 0.8 : middleStress ? 2.2 : 3.8, release: info.key === "high" ? 7 : 4 } }).connect(reverb);
      const notes = info.key === "low" ? ["C4", "E4", "G4", "C5", "G4", "E4"] : middleStress ? ["A3", "C4", "E4", "G4", "E4", "C4"] : ["F3", "C4", "A3", "G3"];
      let step = 0;
      const duration = info.key === "low" ? "4n" : middleStress ? "2n" : "1m";
      const interval = info.key === "low" ? "4n" : middleStress ? "2n" : "1m";
      const loop = new Tone.Loop((time) => { synth.triggerAttackRelease(notes[step++ % notes.length], duration, time, info.key === "high" ? 0.42 : 0.52); }, interval).start(0);
      Tone.getTransport().bpm.value = info.key === "low" ? 78 : middleStress ? 60 : 44;
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

  function generateAnotherGame() {
    const next = pickGame(info.key, currentGame.id);
    setGameId(next.id);
    sessionStorage.setItem(`drift-last-game-${info.key}`, next.id);
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
          <div className="slider-wrap"><input aria-label="Current stress level" type="range" min="1" max="10" value={stress} onChange={(e) => setStress(Number(e.target.value))} style={{ "--progress": `${(stress - 1) / 9 * 100}%` } as React.CSSProperties} /><div className="slider-labels"><span>Calm</span><span>Balanced</span><span>Moderate</span><span>Overwhelmed</span></div></div>
          <button className="primary" onClick={saveCheckIn}>{saved ? "Check-in saved ✓" : "Save today’s check-in"}</button>
        </div>
      </section>

      <section className="game-section">
        <div className="section-intro"><div><span className="section-number">01</span><div><div className="eyebrow">Generated for {info.label}</div><h2>{currentGame.title}</h2></div></div><p>{currentGame.description}</p></div>
        <div className="game-generator"><div><span>{gameCatalog[info.key].length} games in this stress category</span><strong>A different choice is generated when you reload.</strong></div><button type="button" onClick={generateAnotherGame}>Generate another game <span aria-hidden="true">↻</span></button></div>
        <GeneratedGame key={currentGame.id} id={currentGame.id} />
      </section>

      <section className="video-section">
        <div className="section-intro"><div><span className="section-number">02</span><div><div className="eyebrow">Stay a little longer</div><h2>Press play, let go</h2></div></div><p>Choose a guided pause or a quiet backdrop. Whatever feels easiest is enough.</p></div>
        <div className="video-grid">{videos.map((video) => <article className={`video-card ${video.tone}`} key={video.id}><div className="video-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0`} title={video.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div><div><span>{video.length}</span><h3>{video.title}</h3></div></article>)}</div>
      </section>

      <footer><a className="brand" href="#top"><span>◌</span> drift</a><p>A softer place to land, one moment at a time.</p><small>Not a substitute for professional mental health support.</small></footer>
    </main>
  );
}

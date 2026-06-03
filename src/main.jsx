import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AudioLines,
  CirclePause,
  CirclePlay,
  ListMusic,
  Music,
  Palette,
  Plus,
  SkipBack,
  SkipForward,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';
import * as THREE from 'three';
import './styles.css';

const themes = [
  {
    id: 'aurora',
    name: 'Aurora',
    primary: '#52f7d2',
    secondary: '#ff4f9a',
    accent: '#ffd166',
    background: '#07090d',
  },
  {
    id: 'ember',
    name: 'Ember',
    primary: '#ff6b35',
    secondary: '#f7c59f',
    accent: '#1dd3b0',
    background: '#0d0a08',
  },
  {
    id: 'prism',
    name: 'Prism',
    primary: '#7bf1a8',
    secondary: '#ff70a6',
    accent: '#70d6ff',
    background: '#090b18',
  },
  {
    id: 'mono',
    name: 'Signal',
    primary: '#ffffff',
    secondary: '#7a8b99',
    accent: '#00c2a8',
    background: '#050607',
  },
];

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

function makeSampleTrack() {
  return {
    id: 'demo-tone',
    name: 'Synth Pulse Demo',
    artist: 'Generated tone',
    source: 'demo',
  };
}

function Visualizer({ audioRef, analyserRef, theme, mode, isPlaying }) {
  const mountRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const themeRef = useRef(theme);
  const modeRef = useRef(mode);
  const playingRef = useRef(isPlaying);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const mount = mountRef.current;
    const overlay = canvasRef.current;
    if (!mount || !overlay) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1000);
    camera.position.set(0, 0, 28);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const bars = [];
    const barCount = 96;
    const geometry = new THREE.BoxGeometry(0.28, 1, 0.58);
    for (let i = 0; i < barCount; i += 1) {
      const material = new THREE.MeshStandardMaterial({
        color: theme.primary,
        emissive: theme.primary,
        emissiveIntensity: 0.28,
        roughness: 0.38,
        metalness: 0.3,
      });
      const mesh = new THREE.Mesh(geometry, material);
      const angle = (i / barCount) * Math.PI * 2;
      mesh.position.set(Math.cos(angle) * 9, Math.sin(angle) * 9, 0);
      mesh.rotation.z = angle;
      group.add(mesh);
      bars.push(mesh);
    }

    const ringGeometry = new THREE.TorusGeometry(7.2, 0.035, 10, 180);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: theme.accent,
      transparent: true,
      opacity: 0.85,
    });
    const rings = [0, 1, 2].map((index) => {
      const ring = new THREE.Mesh(ringGeometry, ringMaterial.clone());
      ring.scale.setScalar(1 + index * 0.22);
      ring.rotation.x = index * 0.7;
      ring.rotation.y = index * 0.4;
      scene.add(ring);
      return ring;
    });

    const particlesGeometry = new THREE.BufferGeometry();
    const particleCount = 420;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      const radius = 8 + Math.random() * 16;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 18;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particlesGeometry,
      new THREE.PointsMaterial({
        color: theme.secondary,
        size: 0.08,
        transparent: true,
        opacity: 0.62,
      }),
    );
    scene.add(particles);

    scene.add(new THREE.AmbientLight(0xffffff, 0.56));
    const light = new THREE.PointLight(0xffffff, 36, 100);
    light.position.set(0, 0, 14);
    scene.add(light);

    const ctx = overlay.getContext('2d');
    const data = new Uint8Array(128);

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      overlay.width = Math.floor(width * renderer.getPixelRatio());
      overlay.height = Math.floor(height * renderer.getPixelRatio());
      overlay.style.width = `${width}px`;
      overlay.style.height = `${height}px`;
      ctx.setTransform(renderer.getPixelRatio(), 0, 0, renderer.getPixelRatio(), 0, 0);
    };

    const drawBarsCanvas = (freqs, average, colors, width, height, centerX, centerY, maxRadius) => {
      const points = 128;
      for (let layer = 0; layer < 3; layer += 1) {
        ctx.beginPath();
        for (let i = 0; i <= points; i += 1) {
          const value = freqs[i % freqs.length] / 255;
          const angle = (i / points) * Math.PI * 2;
          const radius = maxRadius * (0.3 + layer * 0.18) + value * (46 + layer * 20);
          const wobble = Math.sin(performance.now() / 700 + i * 0.18 + layer) * (7 + average * 15);
          const x = centerX + Math.cos(angle) * (radius + wobble);
          const y = centerY + Math.sin(angle) * (radius + wobble);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = layer === 0 ? colors.primary : layer === 1 ? colors.secondary : colors.accent;
        ctx.lineWidth = 1.5 + average * 4;
        ctx.globalAlpha = 0.24 + layer * 0.14;
        ctx.stroke();
      }

      ctx.globalAlpha = 0.14 + average * 0.22;
      ctx.fillStyle = colors.primary;
      for (let i = 0; i < 56; i += 1) {
        const value = freqs[(i * 3) % freqs.length] / 255;
        const x = (i / 56) * width;
        const h = value * height * 0.3;
        ctx.fillRect(x, height - h, Math.max(3, width / 120), h);
      }
    };

    const drawTunnelCanvas = (freqs, average, colors, width, height, centerX, centerY, maxRadius) => {
      const time = performance.now();
      const points = 160;

      for (let ribbon = 0; ribbon < 5; ribbon += 1) {
        ctx.beginPath();
        for (let i = 0; i <= points; i += 1) {
          const value = freqs[(i + ribbon * 13) % freqs.length] / 255;
          const angle = (i / points) * Math.PI * 2 + time / 3600 + ribbon * 0.28;
          const baseRadius = maxRadius * (0.2 + ribbon * 0.13);
          const wave = Math.sin(i * 0.09 + time / 520 + ribbon) * (14 + average * 24);
          const pulse = value * (22 + ribbon * 8);
          const x = centerX + Math.cos(angle) * (baseRadius + wave + pulse);
          const y = centerY + Math.sin(angle) * (baseRadius + wave + pulse);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = ribbon % 3 === 0 ? colors.accent : ribbon % 3 === 1 ? colors.primary : colors.secondary;
        ctx.lineWidth = 1.4 + ribbon * 0.45 + average * 3.5;
        ctx.globalAlpha = 0.12 + ribbon * 0.055 + average * 0.22;
        ctx.stroke();
      }

      ctx.globalAlpha = 0.16 + average * 0.28;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 28; i += 1) {
        const value = freqs[(i * 5) % freqs.length] / 255;
        const angle = (i / 28) * Math.PI * 2 - time / 4200;
        const inner = maxRadius * (0.18 + value * 0.12);
        const outer = maxRadius * (0.72 + value * 0.18);
        ctx.strokeStyle = i % 2 === 0 ? colors.primary : colors.secondary;
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner);
        ctx.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer);
        ctx.stroke();
      }
    };

    const drawCanvas = (freqs, average, colors) => {
      const rect = overlay.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(width, height) * 0.42;
      if (modeRef.current === 'tunnel') {
        drawTunnelCanvas(freqs, average, colors, width, height, centerX, centerY, maxRadius);
      } else {
        drawBarsCanvas(freqs, average, colors, width, height, centerX, centerY, maxRadius);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const analyser = analyserRef.current;
      if (analyser) {
        if (data.length !== analyser.frequencyBinCount) {
          analyser.getByteFrequencyData(data);
        } else {
          analyser.getByteFrequencyData(data);
        }
      } else {
        for (let i = 0; i < data.length; i += 1) {
          data[i] = playingRef.current
            ? 100 + Math.sin(performance.now() / 200 + i * 0.22) * 70
            : 28 + Math.sin(performance.now() / 900 + i * 0.1) * 12;
        }
      }

      const colors = themeRef.current;
      const isTunnel = modeRef.current === 'tunnel';
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) sum += data[i];
      const average = sum / data.length / 255;
      group.rotation.z += isTunnel ? 0.006 + average * 0.009 : 0.003 + average * 0.014;
      group.rotation.x = isTunnel ? Math.sin(performance.now() / 3000) * 0.22 : Math.sin(performance.now() / 2600) * 0.12;
      particles.rotation.z -= isTunnel ? 0.0025 + average * 0.006 : 0.0015 + average * 0.004;
      particles.position.z = isTunnel ? -2 + Math.sin(performance.now() / 1200) * (0.8 + average * 1.8) : 0;
      particles.material.color.set(colors.secondary);
      particles.material.size = isTunnel ? 0.11 + average * 0.22 : 0.06 + average * 0.12;

      bars.forEach((bar, index) => {
        const value = data[index % data.length] / 255;
        const angle = (index / bars.length) * Math.PI * 2;
        if (isTunnel) {
          const orbit = angle + performance.now() / 2600;
          const lane = index % 3;
          const radius = 5.5 + lane * 1.45 + value * 2.8;
          const z = Math.sin(performance.now() / 720 + index * 0.18) * (2.4 + average * 4);
          bar.position.set(Math.cos(orbit) * radius, Math.sin(orbit) * radius, z);
          bar.rotation.z = orbit + Math.PI / 2;
          bar.rotation.x = Math.sin(performance.now() / 1100 + index) * 0.35;
          bar.scale.set(0.6 + value * 0.9, 0.8 + value * 4.6, 0.75);
        } else {
          bar.position.set(Math.cos(angle) * 9, Math.sin(angle) * 9, value * 3);
          bar.rotation.z = angle;
          bar.rotation.x = 0;
          bar.scale.set(1, 0.8 + value * 9, 1);
        }
        bar.material.color.set(index % 3 === 0 ? colors.primary : index % 3 === 1 ? colors.secondary : colors.accent);
        bar.material.emissive.set(bar.material.color);
        bar.material.emissiveIntensity = 0.18 + value * (isTunnel ? 1.45 : 0.95);
      });

      rings.forEach((ring, index) => {
        ring.material.color.set(index === 0 ? colors.accent : index === 1 ? colors.primary : colors.secondary);
        ring.material.opacity = isTunnel ? 0.2 + average * 0.46 : 0.18 + average * 0.54;
        ring.rotation.z -= (isTunnel ? 0.006 : 0.004) + index * 0.002 + average * 0.01;
        ring.rotation.x = isTunnel ? index * 0.18 : index * 0.7;
        ring.rotation.y = isTunnel ? Math.sin(performance.now() / 1800 + index) * 0.32 : index * 0.4;
        ring.position.z = isTunnel ? -index * 1.2 + Math.sin(performance.now() / 900 + index) * 1.4 : 0;
        ring.scale.setScalar(isTunnel ? 0.74 + index * 0.2 + average * 0.42 : 0.9 + index * 0.26 + average * 0.38);
      });

      renderer.render(scene, camera);
      drawCanvas(data, average, colors);
    };

    resize();
    window.addEventListener('resize', resize);
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      mount.removeChild(renderer.domElement);
      geometry.dispose();
      ringGeometry.dispose();
      particlesGeometry.dispose();
      bars.forEach((bar) => bar.material.dispose());
      rings.forEach((ring) => ring.material.dispose());
      particles.material.dispose();
      renderer.dispose();
    };
  }, [analyserRef]);

  return (
    <div className="visualizer" ref={mountRef}>
      <canvas ref={canvasRef} className="visualizerOverlay" />
    </div>
  );
}

function App() {
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const objectUrlsRef = useRef([]);
  const oscillatorRef = useRef(null);
  const demoGainRef = useRef(null);

  const [playlist, setPlaylist] = useState([makeSampleTrack()]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [themeId, setThemeId] = useState('aurora');
  const [mode, setMode] = useState('bars');
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const theme = useMemo(() => themes.find((item) => item.id === themeId) || themes[0], [themeId]);
  const currentTrack = playlist[currentIndex] || playlist[0];

  useEffect(() => {
    document.documentElement.style.setProperty('--primary', theme.primary);
    document.documentElement.style.setProperty('--secondary', theme.secondary);
    document.documentElement.style.setProperty('--accent', theme.accent);
    document.documentElement.style.setProperty('--page-bg', theme.background);
  }, [theme]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    if (demoGainRef.current) demoGainRef.current.gain.value = volume * 0.32;
  }, [volume]);

  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    if (oscillatorRef.current) oscillatorRef.current.stop();
    if (audioContextRef.current) audioContextRef.current.close();
  }, []);

  const ensureAudioGraph = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.82;
      analyserRef.current.connect(audioContextRef.current.destination);
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    if (audioRef.current && !mediaSourceRef.current) {
      mediaSourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      mediaSourceRef.current.connect(analyserRef.current);
    }
  };

  const stopDemoTone = () => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current = null;
      demoGainRef.current = null;
    }
  };

  const startDemoTone = async () => {
    await ensureAudioGraph();
    stopDemoTone();
    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 92;
    gain.gain.value = volume * 0.32;
    oscillator.connect(gain);
    gain.connect(analyserRef.current);
    oscillator.start();
    oscillatorRef.current = oscillator;
    demoGainRef.current = gain;
  };

  const playTrack = async (index = currentIndex) => {
    const track = playlist[index];
    if (!track) return;
    setCurrentIndex(index);
    await ensureAudioGraph();
    if (track.source === 'demo') {
      if (audioRef.current) audioRef.current.pause();
      await startDemoTone();
      setIsPlaying(true);
      return;
    }
    stopDemoTone();
    if (audioRef.current.src !== track.url) {
      audioRef.current.src = track.url;
      audioRef.current.load();
    }
    await audioRef.current.play();
    setIsPlaying(true);
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      if (currentTrack?.source === 'demo') stopDemoTone();
      else audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    await playTrack(currentIndex);
  };

  const nextTrack = () => {
    const next = (currentIndex + 1) % playlist.length;
    playTrack(next);
  };

  const previousTrack = () => {
    const previous = (currentIndex - 1 + playlist.length) % playlist.length;
    playTrack(previous);
  };

  const handleFiles = (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('audio/'));
    if (!files.length) return;
    const tracks = files.map((file) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.push(url);
      return {
        id: `${file.name}-${file.lastModified}-${file.size}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        artist: `${Math.round(file.size / 1024 / 1024)} MB upload`,
        url,
        source: 'file',
      };
    });
    setPlaylist((items) => [...items.filter((item) => item.source !== 'demo'), ...tracks]);
    setCurrentIndex((index) => (playlist[index]?.source === 'demo' ? 0 : index));
    event.target.value = '';
  };

  const removeTrack = (id) => {
    setPlaylist((items) => {
      const next = items.filter((track) => track.id !== id);
      return next.length ? next : [makeSampleTrack()];
    });
    setCurrentIndex(0);
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setProgress(audio.currentTime || 0);
    setDuration(audio.duration || 0);
  };

  const seek = (event) => {
    const audio = audioRef.current;
    const value = Number(event.target.value);
    if (audio && currentTrack?.source !== 'demo') {
      audio.currentTime = value;
    }
    setProgress(value);
  };

  return (
    <main className="appShell">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onEnded={nextTrack}
      />
      <Visualizer
        audioRef={audioRef}
        analyserRef={analyserRef}
        theme={theme}
        mode={mode}
        isPlaying={isPlaying}
      />

      <section className="topBar" aria-label="Music visualizer controls">
        <div className="brand">
          <div className="brandIcon"><AudioLines size={22} /></div>
          <div>
            <h1>Music Visualizer</h1>
            <p>{currentTrack?.name || 'No track loaded'}</p>
          </div>
        </div>

        <div className="uploadGroup">
          <input ref={fileInputRef} className="hiddenInput" type="file" accept="audio/*" multiple onChange={handleFiles} />
          <button className="primaryButton" type="button" onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} />
            Upload
          </button>
        </div>
      </section>

      <section className="controlDeck">
        <div className="nowPlaying">
          <Music size={18} />
          <div>
            <span>{currentTrack?.name || 'No selection'}</span>
            <small>{currentTrack?.artist || 'Add audio files to begin'}</small>
          </div>
        </div>

        <div className="transport">
          <button type="button" className="iconButton" onClick={previousTrack} aria-label="Previous track">
            <SkipBack size={20} />
          </button>
          <button type="button" className="playButton" onClick={togglePlayback} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <CirclePause size={36} /> : <CirclePlay size={36} />}
          </button>
          <button type="button" className="iconButton" onClick={nextTrack} aria-label="Next track">
            <SkipForward size={20} />
          </button>
        </div>

        <div className="timeline">
          <span>{currentTrack?.source === 'demo' ? 'Live' : formatTime(progress)}</span>
          <input
            type="range"
            min="0"
            max={Math.max(duration, 1)}
            value={Math.min(progress, Math.max(duration, 1))}
            onChange={seek}
            disabled={currentTrack?.source === 'demo'}
            aria-label="Seek track"
          />
          <span>{currentTrack?.source === 'demo' ? 'Tone' : formatTime(duration)}</span>
        </div>

        <div className="volume">
          <Volume2 size={18} />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            aria-label="Volume"
          />
        </div>
      </section>

      <aside className="sidePanel">
        <div className="panelHeader">
          <ListMusic size={18} />
          <h2>Playlist</h2>
          <button type="button" className="smallIconButton" onClick={() => fileInputRef.current?.click()} aria-label="Add tracks">
            <Plus size={16} />
          </button>
        </div>
        <div className="trackList">
          {playlist.map((track, index) => (
            <button
              type="button"
              className={`trackItem ${index === currentIndex ? 'active' : ''}`}
              key={track.id}
              onClick={() => playTrack(index)}
            >
              <span>{track.name}</span>
              <small>{track.artist}</small>
              {track.source !== 'demo' && (
                <span
                  className="removeTrack"
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeTrack(track.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') removeTrack(track.id);
                  }}
                  aria-label={`Remove ${track.name}`}
                >
                  <Trash2 size={14} />
                </span>
              )}
            </button>
          ))}
        </div>
      </aside>

      <aside className="themePanel">
        <div className="panelHeader">
          <Palette size={18} />
          <h2>Themes</h2>
        </div>
        <div className="themeGrid">
          {themes.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`themeButton ${item.id === themeId ? 'active' : ''}`}
              onClick={() => setThemeId(item.id)}
            >
              <span className="swatches">
                <i style={{ background: item.primary }} />
                <i style={{ background: item.secondary }} />
                <i style={{ background: item.accent }} />
              </span>
              {item.name}
            </button>
          ))}
        </div>

        <div className="modeBlock">
          <div className="panelHeader compact">
            <Sparkles size={18} />
            <h2>Effects</h2>
          </div>
          <div className="segmented">
            <button type="button" className={mode === 'bars' ? 'active' : ''} onClick={() => setMode('bars')}>Bars</button>
            <button type="button" className={mode === 'tunnel' ? 'active' : ''} onClick={() => setMode('tunnel')}>Tunnel</button>
          </div>
        </div>
      </aside>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);

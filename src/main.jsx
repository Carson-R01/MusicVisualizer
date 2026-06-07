import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AudioLines,
  CirclePause,
  CirclePlay,
  Download,
  Drum,
  Grid3X3,
  ListMusic,
  Maximize2,
  Music,
  Palette,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  SkipBack,
  SkipForward,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';
import * as THREE from 'three';
import * as Tone from 'tone';
import lameAllSource from 'lamejs/lame.all.js?raw';
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

const sampleSpectrum = (freqs, index, total) => {
  const ratio = total <= 1 ? 0 : index / (total - 1);
  const curvedRatio = Math.pow(ratio, 1.22);
  const bin = Math.floor(6 + curvedRatio * Math.max(1, freqs.length - 12));
  const previous = freqs[Math.max(0, bin - 2)] || 0;
  const current = freqs[bin] || 0;
  const next = freqs[Math.min(freqs.length - 1, bin + 2)] || 0;
  const smoothed = (previous + current * 2 + next) / 4;
  return Math.pow(smoothed / 255, 0.86);
};

function makeSampleTrack() {
  return {
    id: 'demo-tone',
    name: 'Synth Pulse Demo',
    artist: 'Generated tone',
    source: 'demo',
  };
}

const stepCount = 16;

const drumPattern = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
const backbeatPattern = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];
const hatPattern = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
const melodicPattern = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0];
const sparsePattern = [1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0];

const instrumentLibrary = [
  { id: 'kick', name: 'Kick', category: 'Drums', color: '#ff6b35', defaultVolume: 0.9, engine: 'kick', pattern: drumPattern },
  { id: 'deepkick', name: 'Deep Kick', category: 'Drums', color: '#ff7f50', defaultVolume: 0.86, engine: 'kick', pattern: drumPattern },
  { id: 'snare', name: 'Snare', category: 'Drums', color: '#ffd166', defaultVolume: 0.72, engine: 'snare', pattern: backbeatPattern },
  { id: 'rim', name: 'Rimshot', category: 'Drums', color: '#ffbd59', defaultVolume: 0.54, engine: 'rim', pattern: backbeatPattern },
  { id: 'clap', name: 'Clap', category: 'Drums', color: '#ff4f9a', defaultVolume: 0.62, engine: 'clap', pattern: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0] },
  { id: 'snap', name: 'Snap', category: 'Drums', color: '#ff70a6', defaultVolume: 0.42, engine: 'rim', pattern: backbeatPattern },
  { id: 'hat', name: 'Hat', category: 'Drums', color: '#52f7d2', defaultVolume: 0.46, engine: 'hat', pattern: hatPattern },
  { id: 'openhat', name: 'Open Hat', category: 'Drums', color: '#6fffe0', defaultVolume: 0.38, engine: 'openhat', pattern: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0] },
  { id: 'ride', name: 'Ride', category: 'Drums', color: '#a7fff0', defaultVolume: 0.36, engine: 'openhat', pattern: hatPattern },
  { id: 'shaker', name: 'Shaker', category: 'Percussion', color: '#9df7d7', defaultVolume: 0.34, engine: 'shaker', pattern: hatPattern },
  { id: 'tambourine', name: 'Tambourine', category: 'Percussion', color: '#baffdc', defaultVolume: 0.36, engine: 'shaker', pattern: hatPattern },
  { id: 'crash', name: 'Crash', category: 'Percussion', color: '#f7e36f', defaultVolume: 0.42, engine: 'crash', pattern: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: 'tom', name: 'Tom', category: 'Percussion', color: '#f59f62', defaultVolume: 0.58, engine: 'tom', pattern: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0] },
  { id: 'conga', name: 'Conga', category: 'Percussion', color: '#e9a06f', defaultVolume: 0.48, engine: 'perc', pattern: [0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0] },
  { id: 'perc', name: 'Perc', category: 'Percussion', color: '#f3c178', defaultVolume: 0.48, engine: 'perc', pattern: [0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0] },
  { id: '808', name: '808 Bass', category: 'Bass', color: '#ff884d', defaultVolume: 0.76, engine: 'kick', pattern: melodicPattern },
  { id: 'bass', name: 'Bass', category: 'Bass', color: '#70d6ff', defaultVolume: 0.66, engine: 'bass', pattern: melodicPattern },
  { id: 'subbass', name: 'Sub Bass', category: 'Bass', color: '#4cc9f0', defaultVolume: 0.68, engine: 'subbass', pattern: melodicPattern },
  { id: 'acidbass', name: 'Acid Bass', category: 'Bass', color: '#89f0ff', defaultVolume: 0.56, engine: 'acidbass', pattern: melodicPattern },
  { id: 'reese', name: 'Reese Bass', category: 'Bass', color: '#56cfe1', defaultVolume: 0.58, engine: 'acidbass', pattern: melodicPattern },
  { id: 'lead', name: 'Lead', category: 'Synths', color: '#c9f31d', defaultVolume: 0.48, engine: 'lead', pattern: [0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0] },
  { id: 'supersaw', name: 'Supersaw', category: 'Synths', color: '#d7ff36', defaultVolume: 0.46, engine: 'pad', pattern: sparsePattern },
  { id: 'pluck', name: 'Synth Pluck', category: 'Synths', color: '#d6ff6b', defaultVolume: 0.48, engine: 'pluck', pattern: sparsePattern },
  { id: 'arp', name: 'Arp', category: 'Synths', color: '#e9ff70', defaultVolume: 0.44, engine: 'arp', pattern: hatPattern },
  { id: 'pad', name: 'Pad', category: 'Synths', color: '#9bdbff', defaultVolume: 0.42, engine: 'pad', pattern: sparsePattern },
  { id: 'drone', name: 'Drone', category: 'Synths', color: '#89c2d9', defaultVolume: 0.34, engine: 'pad', pattern: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: 'keys', name: 'Keys', category: 'Keys', color: '#f6f7c4', defaultVolume: 0.54, engine: 'keys', pattern: sparsePattern },
  { id: 'piano', name: 'Piano', category: 'Keys', color: '#f8f9fa', defaultVolume: 0.56, engine: 'piano', pattern: sparsePattern },
  { id: 'epiano', name: 'Electric Piano', category: 'Keys', color: '#fff3b0', defaultVolume: 0.52, engine: 'keys', pattern: sparsePattern },
  { id: 'organ', name: 'Organ', category: 'Keys', color: '#caffbf', defaultVolume: 0.5, engine: 'organ', pattern: sparsePattern },
  { id: 'bell', name: 'Bell', category: 'Mallets', color: '#bde0fe', defaultVolume: 0.46, engine: 'bell', pattern: sparsePattern },
  { id: 'vibes', name: 'Vibes', category: 'Mallets', color: '#a2d2ff', defaultVolume: 0.44, engine: 'bell', pattern: sparsePattern },
  { id: 'marimba', name: 'Marimba', category: 'Mallets', color: '#ffc8dd', defaultVolume: 0.5, engine: 'marimba', pattern: sparsePattern },
  { id: 'xylophone', name: 'Xylophone', category: 'Mallets', color: '#ffcad4', defaultVolume: 0.48, engine: 'marimba', pattern: sparsePattern },
  { id: 'guitar', name: 'Guitar', category: 'Guitars', color: '#b892ff', defaultVolume: 0.58, engine: 'guitar', pattern: sparsePattern },
  { id: 'mutedguitar', name: 'Muted Guitar', category: 'Guitars', color: '#a78bfa', defaultVolume: 0.5, engine: 'mutedguitar', pattern: hatPattern },
  { id: 'harp', name: 'Harp', category: 'Guitars', color: '#c8b6ff', defaultVolume: 0.48, engine: 'guitar', pattern: sparsePattern },
  { id: 'strings', name: 'Strings', category: 'Orchestral', color: '#ffafcc', defaultVolume: 0.46, engine: 'strings', pattern: sparsePattern },
  { id: 'violin', name: 'Violin', category: 'Orchestral', color: '#ffb3c6', defaultVolume: 0.42, engine: 'strings', pattern: sparsePattern },
  { id: 'cello', name: 'Cello', category: 'Orchestral', color: '#c9184a', defaultVolume: 0.44, engine: 'strings', pattern: sparsePattern },
  { id: 'brass', name: 'Brass', category: 'Orchestral', color: '#ffcf70', defaultVolume: 0.5, engine: 'brass', pattern: sparsePattern },
  { id: 'trumpet', name: 'Trumpet', category: 'Orchestral', color: '#ffd60a', defaultVolume: 0.46, engine: 'brass', pattern: sparsePattern },
  { id: 'flute', name: 'Flute', category: 'Winds', color: '#caf0f8', defaultVolume: 0.44, engine: 'flute', pattern: sparsePattern },
  { id: 'sax', name: 'Sax', category: 'Winds', color: '#f4a261', defaultVolume: 0.48, engine: 'sax', pattern: sparsePattern },
  { id: 'clarinet', name: 'Clarinet', category: 'Winds', color: '#90e0ef', defaultVolume: 0.42, engine: 'flute', pattern: sparsePattern },
  { id: 'choir', name: 'Choir', category: 'Vocals', color: '#d0bfff', defaultVolume: 0.42, engine: 'choir', pattern: sparsePattern },
  { id: 'vocalpad', name: 'Vocal Pad', category: 'Vocals', color: '#e0b1ff', defaultVolume: 0.38, engine: 'choir', pattern: sparsePattern },
  { id: 'fx', name: 'Noise FX', category: 'FX', color: '#adb5bd', defaultVolume: 0.36, engine: 'fx', pattern: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] },
  { id: 'riser', name: 'Riser', category: 'FX', color: '#ced4da', defaultVolume: 0.34, engine: 'fx', pattern: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: 'impact', name: 'Impact', category: 'FX', color: '#dee2e6', defaultVolume: 0.42, engine: 'crash', pattern: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
];

const instrumentCategories = [...new Set(instrumentLibrary.map((instrument) => instrument.category))];

const pianoRollNotes = {
  kick: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  deepkick: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  808: ['C2', 'A#1', 'G1', 'F1', 'D#1', 'C1'],
  snare: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  rim: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  clap: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  snap: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  hat: ['C6', 'A#5', 'G5', 'F5', 'D#5', 'C5', 'A#4', 'G4'],
  openhat: ['C6', 'A#5', 'G5', 'F5', 'D#5', 'C5', 'A#4', 'G4'],
  ride: ['C6', 'A#5', 'G5', 'F5', 'D#5', 'C5', 'A#4', 'G4'],
  shaker: ['C6', 'A#5', 'G5', 'F5', 'D#5', 'C5', 'A#4', 'G4'],
  tambourine: ['C6', 'A#5', 'G5', 'F5', 'D#5', 'C5', 'A#4', 'G4'],
  crash: ['C6', 'A#5', 'G5', 'F5', 'D#5', 'C5', 'A#4', 'G4'],
  tom: ['C4', 'A#3', 'G3', 'F3', 'D#3', 'C3', 'A#2', 'G2'],
  conga: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  perc: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  bass: ['C2', 'A#1', 'G1', 'F1', 'D#1', 'C1'],
  subbass: ['C2', 'A#1', 'G1', 'F1', 'D#1', 'C1'],
  acidbass: ['C2', 'A#1', 'G1', 'F1', 'D#1', 'C1'],
  reese: ['C2', 'A#1', 'G1', 'F1', 'D#1', 'C1'],
  lead: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  supersaw: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  pluck: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  arp: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  pad: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  drone: ['C4', 'A#3', 'G3', 'F3', 'D#3', 'C3', 'A#2', 'G2'],
  keys: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  piano: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3', 'F3', 'D#3', 'C3'],
  epiano: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3', 'F3', 'D#3', 'C3'],
  organ: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  bell: ['C6', 'A#5', 'G5', 'F5', 'D#5', 'C5', 'A#4', 'G4'],
  vibes: ['C6', 'A#5', 'G5', 'F5', 'D#5', 'C5', 'A#4', 'G4'],
  marimba: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  xylophone: ['C6', 'A#5', 'G5', 'F5', 'D#5', 'C5', 'A#4', 'G4'],
  guitar: ['C4', 'A#3', 'G3', 'F3', 'D#3', 'C3', 'A#2', 'G2', 'F2'],
  mutedguitar: ['C4', 'A#3', 'G3', 'F3', 'D#3', 'C3', 'A#2', 'G2', 'F2'],
  harp: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3', 'F3'],
  strings: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  violin: ['C6', 'A#5', 'G5', 'F5', 'D#5', 'C5', 'A#4', 'G4'],
  cello: ['C4', 'A#3', 'G3', 'F3', 'D#3', 'C3', 'A#2', 'G2'],
  brass: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  trumpet: ['C6', 'A#5', 'G5', 'F5', 'D#5', 'C5', 'A#4', 'G4'],
  flute: ['C6', 'A#5', 'G5', 'F5', 'D#5', 'C5', 'A#4', 'G4'],
  sax: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  clarinet: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  choir: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  vocalpad: ['C5', 'A#4', 'G4', 'F4', 'D#4', 'C4', 'A#3', 'G3'],
  fx: ['C6', 'A#5', 'G5', 'F5', 'D#5', 'C5', 'A#4', 'G4'],
  riser: ['C6', 'A#5', 'G5', 'F5', 'D#5', 'C5', 'A#4', 'G4'],
  impact: ['C6', 'A#5', 'G5', 'F5', 'D#5', 'C5', 'A#4', 'G4'],
};

const noteLengthOptions = [0.5, 1, 1.5, 2, 4];
const clampNoteLength = (length) => Math.max(0.5, Math.min(4, Math.round(length * 2) / 2));
const getNoteDurationSeconds = (note, stepDuration) => clampNoteLength(note.length || 1) * stepDuration;
const getNotePitch = (note) => (typeof note === 'string' ? note : note.pitch);
const createNoteEvent = (pitch, length = 1) => ({ pitch, length });

const getInstrument = (instrumentId) => instrumentLibrary.find((instrument) => instrument.id === instrumentId) || instrumentLibrary[0];
const getTrackEngine = (track) => getInstrument(track.instrumentId).engine || track.instrumentId;
const isMelodicInstrument = (instrumentId) => Boolean(pianoRollNotes[instrumentId]);
const getDefaultNoteLength = (instrumentId) => {
  const engine = getInstrument(instrumentId).engine;
  if (['pad', 'strings', 'choir', 'organ'].includes(engine)) return 4;
  if (['bass', 'subbass', 'acidbass', 'guitar'].includes(engine)) return 2;
  if (['hat', 'openhat', 'shaker', 'crash', 'snare', 'clap', 'rim', 'perc'].includes(engine)) return 0.5;
  return 1;
};
const createDefaultNoteGrid = (instrumentId, pattern) => {
  const notes = pianoRollNotes[instrumentId] || [];
  return Array.from({ length: stepCount }, (_, step) => {
    if (!pattern[step] || !isMelodicInstrument(instrumentId)) return [];
    if (instrumentId === 'guitar') {
      return (step % 8 === 0 ? ['C3', 'D#3', 'G3'] : ['F2', 'G#2', 'C3']).map((note) => createNoteEvent(note, 2));
    }
    return [notes[step % Math.max(1, notes.length)]].filter(Boolean).map((note) => createNoteEvent(note, getDefaultNoteLength(instrumentId)));
  });
};

const createTrack = (instrumentId, index = 0) => {
  const instrument = getInstrument(instrumentId);
  return {
    id: `${instrument.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    instrumentId: instrument.id,
    name: `${instrument.name} ${index + 1}`,
    pattern: [...instrument.pattern],
    notes: createDefaultNoteGrid(instrument.id, instrument.pattern),
    muted: false,
    volume: instrument.defaultVolume,
  };
};

const createDefaultTracks = () => ['kick', 'snare', 'hat', 'bass', 'guitar'].map((instrumentId, index) => createTrack(instrumentId, index));

function createBeatInstruments() {
  const limiter = new Tone.Limiter(-1).toDestination();
  const compressor = new Tone.Compressor(-18, 3).connect(limiter);

  return {
    output: compressor,
    limiter,
    kick: new Tone.MembraneSynth({
      pitchDecay: 0.045,
      octaves: 7,
      envelope: { attack: 0.001, decay: 0.32, sustain: 0.02, release: 0.55 },
    }).connect(compressor),
    tom: new Tone.MembraneSynth({
      pitchDecay: 0.024,
      octaves: 3.2,
      envelope: { attack: 0.002, decay: 0.26, sustain: 0.04, release: 0.28 },
    }).connect(compressor),
    snare: new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.16, sustain: 0 },
    }).connect(compressor),
    clap: new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.004, decay: 0.22, sustain: 0 },
    }).connect(compressor),
    hat: new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.045, sustain: 0, release: 0.015 },
    }).connect(compressor),
    openhat: new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.08 },
    }).connect(compressor),
    crash: new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.004, decay: 0.85, sustain: 0, release: 0.2 },
    }).connect(compressor),
    perc: new Tone.MembraneSynth({
      pitchDecay: 0.01,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.13, sustain: 0, release: 0.08 },
    }).connect(compressor),
    bass: new Tone.MonoSynth({
      oscillator: { type: 'square' },
      filter: { Q: 1, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.01, decay: 0.16, sustain: 0.18, release: 0.12 },
      filterEnvelope: { attack: 0.01, decay: 0.18, sustain: 0.25, release: 0.1, baseFrequency: 80, octaves: 2.2 },
    }).connect(compressor),
    subbass: new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.008, decay: 0.12, sustain: 0.7, release: 0.18 },
    }).connect(compressor),
    acidbass: new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: { Q: 7, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.006, decay: 0.12, sustain: 0.25, release: 0.1 },
      filterEnvelope: { attack: 0.005, decay: 0.16, sustain: 0.12, release: 0.12, baseFrequency: 120, octaves: 3.5 },
    }).connect(compressor),
    lead: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.004, decay: 0.12, sustain: 0.2, release: 0.18 },
    }).connect(compressor),
    pluck: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square' },
      envelope: { attack: 0.002, decay: 0.16, sustain: 0.05, release: 0.08 },
    }).connect(compressor),
    arp: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.002, decay: 0.08, sustain: 0.08, release: 0.08 },
    }).connect(compressor),
    pad: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsawtooth', count: 3, spread: 18 },
      envelope: { attack: 0.35, decay: 0.25, sustain: 0.75, release: 0.7 },
    }).connect(compressor),
    keys: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.22, sustain: 0.24, release: 0.28 },
    }).connect(compressor),
    piano: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.004, decay: 0.34, sustain: 0.08, release: 0.32 },
    }).connect(compressor),
    organ: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square' },
      envelope: { attack: 0.015, decay: 0.04, sustain: 0.88, release: 0.16 },
    }).connect(compressor),
    bell: new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 2.6,
      modulationIndex: 7,
      envelope: { attack: 0.002, decay: 0.85, sustain: 0, release: 0.25 },
      modulationEnvelope: { attack: 0.002, decay: 0.45, sustain: 0, release: 0.15 },
    }).connect(compressor),
    marimba: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.002, decay: 0.22, sustain: 0.02, release: 0.12 },
    }).connect(compressor),
    guitar: new Tone.PluckSynth({
      attackNoise: 0.7,
      dampening: 3400,
      resonance: 0.82,
    }).connect(compressor),
    mutedguitar: new Tone.PluckSynth({
      attackNoise: 0.45,
      dampening: 5200,
      resonance: 0.62,
    }).connect(compressor),
    strings: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.24, decay: 0.2, sustain: 0.7, release: 0.58 },
    }).connect(compressor),
    brass: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.06, decay: 0.18, sustain: 0.56, release: 0.22 },
    }).connect(compressor),
    flute: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.05, decay: 0.08, sustain: 0.62, release: 0.18 },
    }).connect(compressor),
    sax: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsawtooth', count: 2, spread: 8 },
      envelope: { attack: 0.035, decay: 0.12, sustain: 0.48, release: 0.2 },
    }).connect(compressor),
    choir: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsine', count: 4, spread: 25 },
      envelope: { attack: 0.32, decay: 0.2, sustain: 0.74, release: 0.75 },
    }).connect(compressor),
    fx: new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.02, decay: 1.1, sustain: 0, release: 0.3 },
    }).connect(compressor),
  };
}

function triggerBeatSound(instruments, track, step, time, stepDuration) {
  const velocity = track.volume;
  const stepNotes = track.notes[step] || [];
  const engine = getTrackEngine(track);
  if (engine === 'kick') {
    stepNotes.forEach((note, index) => instruments.kick.triggerAttackRelease(getNotePitch(note), getNoteDurationSeconds(note, stepDuration), time + index * 0.002, velocity));
  }
  if (engine === 'snare' && stepNotes.length) instruments.snare.triggerAttackRelease('16n', time, velocity);
  if (engine === 'rim' && stepNotes.length) instruments.snare.triggerAttackRelease('32n', time, velocity * 0.62);
  if (engine === 'clap' && stepNotes.length) instruments.clap.triggerAttackRelease('16n', time, velocity * 0.8);
  if (engine === 'hat' && stepNotes.length) instruments.hat.triggerAttackRelease('32n', time, velocity * 0.58);
  if (engine === 'openhat' && stepNotes.length) instruments.openhat.triggerAttackRelease('8n', time, velocity * 0.52);
  if (engine === 'shaker' && stepNotes.length) instruments.hat.triggerAttackRelease('32n', time, velocity * 0.34);
  if (engine === 'crash' && stepNotes.length) instruments.crash.triggerAttackRelease('2n', time, velocity * 0.5);
  if (engine === 'tom') {
    stepNotes.forEach((note, index) => instruments.tom.triggerAttackRelease(getNotePitch(note), '8n', time + index * 0.002, velocity * 0.72));
  }
  if (engine === 'perc') {
    stepNotes.forEach((note, index) => instruments.perc.triggerAttackRelease(getNotePitch(note), '16n', time + index * 0.002, velocity * 0.58));
  }
  if (engine === 'bass' || engine === 'subbass' || engine === 'acidbass') {
    const bassNote = stepNotes[0];
    if (bassNote) instruments[engine].triggerAttackRelease(getNotePitch(bassNote), getNoteDurationSeconds(bassNote, stepDuration), time, velocity * 0.82);
  }
  if (['lead', 'pluck', 'arp', 'pad', 'keys', 'piano', 'organ', 'bell', 'marimba', 'strings', 'brass', 'flute', 'sax', 'choir'].includes(engine)) {
    stepNotes.forEach((note, index) => {
      instruments[engine].triggerAttackRelease(getNotePitch(note), getNoteDurationSeconds(note, stepDuration), time + index * 0.001, velocity * 0.55);
    });
  }
  if (engine === 'guitar' || engine === 'mutedguitar') {
    stepNotes.forEach((note, index) => {
      instruments[engine].triggerAttack(getNotePitch(note), time + index * 0.015, velocity * 0.64);
    });
  }
  if (engine === 'fx' && stepNotes.length) instruments.fx.triggerAttackRelease('2n', time, velocity * 0.45);
}

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const audioBufferToWavBlob = (audioBuffer) => {
  const channelCount = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const frameCount = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + frameCount * blockAlign);
  const view = new DataView(buffer);

  const writeString = (offset, value) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + frameCount * blockAlign, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, frameCount * blockAlign, true);

  let offset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
};

const floatToInt16 = (samples) => {
  const output = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
};

let cachedMp3Encoder = null;

const getMp3Encoder = () => {
  if (!cachedMp3Encoder) {
    const module = { exports: {} };
    const exports = module.exports;
    const loadEncoder = new Function('module', 'exports', `${lameAllSource}; module.exports = lamejs;`);
    loadEncoder(module, exports);
    cachedMp3Encoder = module.exports.Mp3Encoder;
  }
  return cachedMp3Encoder;
};

const audioBufferToMp3Blob = (audioBuffer) => {
  const left = floatToInt16(audioBuffer.getChannelData(0));
  const right = floatToInt16(audioBuffer.getChannelData(Math.min(1, audioBuffer.numberOfChannels - 1)));
  const Mp3Encoder = getMp3Encoder();
  const encoder = new Mp3Encoder(2, audioBuffer.sampleRate, 192);
  const chunks = [];
  const sampleBlockSize = 1152;

  for (let i = 0; i < left.length; i += sampleBlockSize) {
    const leftChunk = left.subarray(i, i + sampleBlockSize);
    const rightChunk = right.subarray(i, i + sampleBlockSize);
    const encoded = encoder.encodeBuffer(leftChunk, rightChunk);
    if (encoded.length) chunks.push(encoded);
  }

  const flushed = encoder.flush();
  if (flushed.length) chunks.push(flushed);
  return new Blob(chunks, { type: 'audio/mpeg' });
};

const renderBeatOffline = async (tracks, bpm) => {
  const stepDuration = 60 / bpm / 4;
  const repetitions = 4;
  const patternDuration = stepDuration * stepCount;
  const renderDuration = patternDuration * repetitions + 1.2;

  return Tone.Offline(() => {
    const instruments = createBeatInstruments();
    for (let repeat = 0; repeat < repetitions; repeat += 1) {
      for (let step = 0; step < stepCount; step += 1) {
        const time = repeat * patternDuration + step * stepDuration;
        tracks.forEach((track, trackIndex) => {
          if (track.pattern[step] && !track.muted) {
            triggerBeatSound(instruments, track, step, time + trackIndex * 0.001, stepDuration);
          }
        });
      }
    }
  }, renderDuration);
};

function BeatMaker({ onBack }) {
  const [tracks, setTracks] = useState(createDefaultTracks);
  const [bpm, setBpm] = useState(128);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isDropActive, setIsDropActive] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [exportStatus, setExportStatus] = useState('');
  const tracksRef = useRef(tracks);
  const instrumentsRef = useRef(null);
  const sequenceRef = useRef(null);
  const stepRef = useRef(0);

  useEffect(() => {
    tracksRef.current = tracks;
    if (!selectedTrackId && tracks.length) setSelectedTrackId(tracks[0].id);
    if (selectedTrackId && !tracks.some((track) => track.id === selectedTrackId)) {
      setSelectedTrackId(tracks[0]?.id || null);
    }
  }, [selectedTrackId, tracks]);

  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  useEffect(() => () => {
    Tone.Transport.stop();
    if (sequenceRef.current) Tone.Transport.clear(sequenceRef.current);
    if (instrumentsRef.current) {
      Object.values(instrumentsRef.current).forEach((node) => node.dispose?.());
    }
  }, []);

  const ensureBeatEngine = async () => {
    await Tone.start();
    Tone.Transport.bpm.value = bpm;
    if (!instrumentsRef.current) instrumentsRef.current = createBeatInstruments();
    if (!sequenceRef.current) {
      sequenceRef.current = Tone.Transport.scheduleRepeat((time) => {
        const step = stepRef.current;
        const stepDuration = 60 / Tone.Transport.bpm.value / 4;
        tracksRef.current.forEach((track, trackIndex) => {
          if (track.pattern[step] && !track.muted) {
            triggerBeatSound(instrumentsRef.current, track, step, time + trackIndex * 0.001, stepDuration);
          }
        });
        Tone.Draw.schedule(() => setCurrentStep(step), time);
        stepRef.current = (step + 1) % stepCount;
      }, '16n');
    }
  };

  const addTrack = (instrumentId) => {
    const newTrack = createTrack(instrumentId, tracksRef.current.length);
    setTracks((current) => [...current, newTrack]);
    setSelectedTrackId(newTrack.id);
  };

  const handleDropInstrument = (event) => {
    event.preventDefault();
    const instrumentId = event.dataTransfer.getData('instrument-id');
    if (instrumentId) addTrack(instrumentId);
    setIsDropActive(false);
  };

  const toggleStep = (trackId, step) => {
    setTracks((current) => current.map((track) => (
      track.id === trackId
        ? {
            ...track,
            pattern: track.pattern.map((value, index) => (index === step ? Number(!value) : value)),
            notes: isMelodicInstrument(track.instrumentId)
              ? track.notes.map((notes, index) => {
                  if (index !== step) return notes;
                  if (notes.length) return [];
                  return [pianoRollNotes[track.instrumentId]?.[0]].filter(Boolean).map((pitch) => createNoteEvent(pitch));
                })
              : track.notes,
          }
        : track
    )));
  };

  const togglePianoNote = (trackId, step, note) => {
    setTracks((current) => current.map((track) => (
      track.id === trackId
        ? {
            ...track,
            notes: track.notes.map((notes, index) => {
              if (index !== step) return notes;
              return notes.some((item) => getNotePitch(item) === note)
                ? notes.filter((item) => getNotePitch(item) !== note)
                : [...notes, createNoteEvent(note)];
            }),
            pattern: track.pattern.map((value, index) => {
              if (index !== step) return value;
              const nextNotes = track.notes[step].some((item) => getNotePitch(item) === note)
                ? track.notes[step].filter((item) => getNotePitch(item) !== note)
                : [...track.notes[step], createNoteEvent(note)];
              return Number(nextNotes.length > 0);
            }),
          }
        : track
    )));
  };

  const setNoteLength = (trackId, step, pitch, length) => {
    setTracks((current) => current.map((track) => (
      track.id === trackId
        ? {
            ...track,
            notes: track.notes.map((notes, index) => {
              if (index !== step) return notes;
              return notes.map((note) => {
                if (getNotePitch(note) !== pitch) return note;
                return { ...note, length: clampNoteLength(length) };
              });
            }),
          }
        : track
    )));
  };

  const startNoteResize = (event, trackId, step, pitch, currentLength) => {
    event.preventDefault();
    event.stopPropagation();
    const cell = event.currentTarget.closest('.pianoCell');
    const cellWidth = cell?.getBoundingClientRect().width || 1;
    const startX = event.clientX;
    const initialLength = currentLength || 1;

    const handlePointerMove = (moveEvent) => {
      const deltaSteps = (moveEvent.clientX - startX) / cellWidth;
      setNoteLength(trackId, step, pitch, initialLength + deltaSteps);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      Tone.Transport.stop();
      setIsPlaying(false);
      setCurrentStep(-1);
      stepRef.current = 0;
      return;
    }
    await ensureBeatEngine();
    Tone.Transport.start();
    setIsPlaying(true);
  };

  const exportBeat = async (format) => {
    setExportStatus(`Rendering ${format.toUpperCase()}...`);
    try {
      await Tone.start();
      const rendered = await renderBeatOffline(tracksRef.current, bpm);
      const blob = format === 'mp3' ? audioBufferToMp3Blob(rendered) : audioBufferToWavBlob(rendered);
      downloadBlob(blob, `beat-maker-loop.${format}`);
      setExportStatus(`Downloaded ${format.toUpperCase()}`);
      window.setTimeout(() => setExportStatus(''), 1800);
    } catch (error) {
      console.error(error);
      setExportStatus('Export failed');
    }
  };

  const clearPattern = () => {
    setTracks((current) => current.map((track) => ({
      ...track,
      pattern: Array(stepCount).fill(0),
      notes: Array.from({ length: stepCount }, () => []),
    })));
  };

  const resetPattern = () => {
    const defaultTracks = createDefaultTracks();
    setTracks(defaultTracks);
    setSelectedTrackId(defaultTracks[0]?.id || null);
  };

  const updateTrack = (trackId, updater) => {
    setTracks((current) => current.map((track) => (
      track.id === trackId ? updater(track) : track
    )));
  };

  const selectedTrack = tracks.find((track) => track.id === selectedTrackId) || tracks[0];
  const selectedInstrument = selectedTrack ? getInstrument(selectedTrack.instrumentId) : null;

  return (
    <main className="beatMakerShell">
      <section className="beatTopbar">
        <div className="beatBrand">
          <div className="beatLogo"><Drum size={22} /></div>
          <div>
            <h1>Beat Maker</h1>
            <p>Channel rack sequencer</p>
          </div>
        </div>
        <div className="beatActions">
          <button type="button" className="beatGhostButton" onClick={onBack}>
            <AudioLines size={18} />
            Visualizer
          </button>
          <button type="button" className="beatGhostButton" onClick={() => exportBeat('wav')} disabled={Boolean(exportStatus)}>
            <Download size={18} />
            WAV
          </button>
          <button type="button" className="beatGhostButton" onClick={() => exportBeat('mp3')} disabled={Boolean(exportStatus)}>
            <Download size={18} />
            MP3
          </button>
          <button type="button" className="beatPrimaryButton" onClick={togglePlayback}>
            {isPlaying ? <CirclePause size={20} /> : <CirclePlay size={20} />}
            {isPlaying ? 'Stop' : 'Play'}
          </button>
        </div>
      </section>

      <section className="beatTransportPanel">
        <div className="transportBlock">
          <Grid3X3 size={18} />
          <span>{tracks.length} tracks</span>
        </div>
        <label className="bpmControl">
          <span>BPM</span>
          <input
            type="number"
            min="60"
            max="190"
            value={bpm}
            onChange={(event) => setBpm(Math.max(60, Math.min(190, Number(event.target.value) || 120)))}
          />
        </label>
        <input
          className="bpmSlider"
          type="range"
          min="60"
          max="190"
          value={bpm}
          onChange={(event) => setBpm(Number(event.target.value))}
          aria-label="BPM"
        />
        <button type="button" className="beatIconTextButton" onClick={resetPattern}>
          <RotateCcw size={17} />
          Reset
        </button>
        <button type="button" className="beatIconTextButton" onClick={clearPattern}>
          <Trash2 size={17} />
          Clear
        </button>
        <span className="exportStatus">{exportStatus}</span>
      </section>

      <section className="instrumentBrowser">
        <div className="browserHeader">
          <Plus size={18} />
          <h2>Instruments</h2>
        </div>
        <div className="instrumentList">
          {instrumentCategories.map((category) => (
            <div className="instrumentCategory" key={category}>
              <div className="instrumentCategoryHeader">
                <span>{category}</span>
                <small>{instrumentLibrary.filter((instrument) => instrument.category === category).length}</small>
              </div>
              {instrumentLibrary
                .filter((instrument) => instrument.category === category)
                .map((instrument) => (
                  <button
                    key={instrument.id}
                    type="button"
                    className="instrumentTile"
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData('instrument-id', instrument.id)}
                    onClick={() => addTrack(instrument.id)}
                  >
                    <span style={{ background: instrument.color }} />
                    <strong>{instrument.name}</strong>
                    <small>{instrument.engine}</small>
                  </button>
                ))}
            </div>
          ))}
        </div>
      </section>

      <section
        className={`trackEditor ${isDropActive ? 'dropActive' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDropActive(true);
        }}
        onDragLeave={() => setIsDropActive(false)}
        onDrop={handleDropInstrument}
      >
        {selectedTrack && selectedInstrument ? (
          <>
            <div className="trackEditorHeader">
              <div className="editorTitle">
                <span style={{ background: selectedInstrument.color }} />
                <div>
                  <h2>{selectedTrack.name}</h2>
                  <p>{selectedInstrument.name} pattern</p>
                </div>
              </div>
              <div className="editorMix">
                <label>
                  <Volume2 size={16} />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selectedTrack.volume}
                    onChange={(event) => updateTrack(selectedTrack.id, (track) => ({ ...track, volume: Number(event.target.value) }))}
                    aria-label={`${selectedTrack.name} volume`}
                  />
                </label>
                <button
                  type="button"
                  className={selectedTrack.muted ? 'muted' : ''}
                  onClick={() => updateTrack(selectedTrack.id, (track) => ({ ...track, muted: !track.muted }))}
                >
                  {selectedTrack.muted ? 'Muted' : 'On'}
                </button>
              </div>
            </div>
            <div className="pianoRollFrame">
              <div className="pianoRoll">
                <div className="pianoRollHeader">
                  <div />
                  {Array.from({ length: stepCount }, (_, step) => (
                    <span key={step} className={currentStep === step ? 'playingStep' : ''}>{step + 1}</span>
                  ))}
                </div>
                {(pianoRollNotes[selectedTrack.instrumentId] || []).map((note) => (
                  <div className="pianoRollRow" key={note}>
                    <div className={`pianoKey ${note.includes('#') ? 'black' : ''}`}>{note}</div>
                    {Array.from({ length: stepCount }, (_, step) => {
                      const noteEvent = selectedTrack.notes[step]?.find((item) => getNotePitch(item) === note);
                      const active = Boolean(noteEvent);
                      const noteLength = noteEvent?.length || 1;
                      return (
                        <button
                          key={step}
                          type="button"
                          className={`pianoCell ${active ? 'active' : ''} ${currentStep === step ? 'current' : ''}`}
                          style={active ? { '--step-color': selectedInstrument.color, '--note-span': noteLength } : undefined}
                          onClick={(event) => {
                            if (event.target.closest('.noteResizeHandle')) return;
                            togglePianoNote(selectedTrack.id, step, note);
                          }}
                          aria-label={`${selectedTrack.name} ${note} step ${step + 1}`}
                        >
                          {active ? (
                            <span>
                              {note}
                              <i
                                role="button"
                                tabIndex={0}
                                className="noteResizeHandle"
                                onPointerDown={(event) => startNoteResize(event, selectedTrack.id, step, note, noteLength)}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setNoteLength(
                                      selectedTrack.id,
                                      step,
                                      note,
                                      noteLength + (event.key === 'ArrowRight' ? 0.5 : -0.5),
                                    );
                                  }
                                }}
                                aria-label={`Resize ${note} length`}
                              />
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="emptyTrackEditor">
            <Drum size={24} />
            <span>Drop an instrument here</span>
          </div>
        )}
      </section>

      <section
        className={`channelRack ${isDropActive ? 'dropActive' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDropActive(true);
        }}
        onDragLeave={() => setIsDropActive(false)}
        onDrop={handleDropInstrument}
      >
        <div className="rackHeader">
          <div>Playlist rack</div>
          {Array.from({ length: stepCount }, (_, step) => (
            <span key={step} className={currentStep === step ? 'playingStep' : ''}>{step + 1}</span>
          ))}
        </div>
        {tracks.map((track) => {
          const instrument = getInstrument(track.instrumentId);
          return (
          <div
            className={`channelRow ${selectedTrackId === track.id ? 'selected' : ''}`}
            key={track.id}
            onClick={() => setSelectedTrackId(track.id)}
          >
            <div className="channelName">
              <span style={{ background: instrument.color }} />
              <input
                value={track.name}
                onChange={(event) => setTracks((current) => current.map((item) => (
                  item.id === track.id ? { ...item, name: event.target.value } : item
                )))}
                onClick={(event) => event.stopPropagation()}
                aria-label={`${track.name} name`}
              />
            </div>
            {Array.from({ length: stepCount }, (_, step) => (
              <button
                key={step}
                type="button"
                className={`stepPad ${(isMelodicInstrument(track.instrumentId) ? track.notes[step]?.length : track.pattern[step]) ? 'active' : ''} ${currentStep === step ? 'current' : ''}`}
                style={(isMelodicInstrument(track.instrumentId) ? track.notes[step]?.length : track.pattern[step]) ? { '--step-color': instrument.color } : undefined}
                onClick={() => toggleStep(track.id, step)}
                aria-label={`${track.name} step ${step + 1}`}
              />
            ))}
          </div>
          );
        })}
      </section>

      <section className="beatMixer">
        <div className="mixerHeader">
          <SlidersHorizontal size={18} />
          <h2>Mixer</h2>
        </div>
        <div className="mixerStrips">
          {tracks.map((track) => {
            const instrument = getInstrument(track.instrumentId);
            return (
            <div className="mixerStrip" key={track.id}>
              <span className="stripColor" style={{ background: instrument.color }} />
              <strong>{track.name}</strong>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={track.volume}
                onChange={(event) => setTracks((current) => current.map((item) => (
                  item.id === track.id ? { ...item, volume: Number(event.target.value) } : item
                )))}
                aria-label={`${track.name} volume`}
              />
              <button
                type="button"
                className={track.muted ? 'muted' : ''}
                onClick={() => setTracks((current) => current.map((item) => (
                  item.id === track.id ? { ...item, muted: !item.muted } : item
                )))}
              >
                {track.muted ? 'Muted' : 'On'}
              </button>
              <button
                type="button"
                className="removeTrackButton"
                onClick={() => setTracks((current) => current.filter((item) => item.id !== track.id))}
                aria-label={`Remove ${track.name}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Visualizer({ audioRef, analyserRef, theme, mode, isPlaying }) {
  const mountRef = useRef(null);
  const canvasRef = useRef(null);
  const bottomCanvasRef = useRef(null);
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
    const bottomOverlay = bottomCanvasRef.current;
    if (!mount || !overlay || !bottomOverlay) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1000);
    camera.position.set(0, 0, 28);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'visualizerScene';
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);
    const motionSeeds = {
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      tilt: Math.random() * 1000,
    };

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
    const barSeeds = bars.map(() => Math.random() * 1000);

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
    const bottomCtx = bottomOverlay.getContext('2d');
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

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      bottomOverlay.width = Math.floor(viewportWidth * renderer.getPixelRatio());
      bottomOverlay.height = Math.floor(viewportHeight * renderer.getPixelRatio());
      bottomOverlay.style.width = `${viewportWidth}px`;
      bottomOverlay.style.height = `${viewportHeight}px`;
      bottomCtx.setTransform(renderer.getPixelRatio(), 0, 0, renderer.getPixelRatio(), 0, 0);
    };

    const drawBottomSpectrum = (freqs, average, colors) => {
      const rect = bottomOverlay.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const pointCount = 260;
      const baseY = height;
      const maxBandHeight = Math.min(height * 0.18, 170);
      const time = performance.now();
      const audioEnergy = Math.min(1, Math.pow(average * 2.2, 0.78));
      const waveHeight = maxBandHeight * (0.28 + audioEnergy * 0.72);
      const phase = time / 950;

      bottomCtx.clearRect(0, 0, width, height);
      bottomCtx.save();
      bottomCtx.beginPath();
      bottomCtx.rect(0, baseY - maxBandHeight, width, maxBandHeight);
      bottomCtx.clip();
      bottomCtx.globalCompositeOperation = 'lighter';
      bottomCtx.globalAlpha = 0.2 + average * 0.24;
      bottomCtx.lineJoin = 'round';
      bottomCtx.lineCap = 'round';

      const gradient = bottomCtx.createLinearGradient(0, height - maxBandHeight, 0, height);
      gradient.addColorStop(0, colors.primary);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      bottomCtx.fillStyle = gradient;

      bottomCtx.beginPath();
      bottomCtx.moveTo(0, baseY);
      for (let i = 0; i <= pointCount; i += 1) {
        const x = (i / pointCount) * width;
        const normalizedX = x / width;
        const wave =
          Math.sin(normalizedX * Math.PI * 2.2 + phase) * 0.42 +
          Math.sin(normalizedX * Math.PI * 4.4 - phase * 0.74) * 0.24 +
          Math.sin(normalizedX * Math.PI * 7.1 + phase * 1.35) * 0.12;
        const y = Math.max(baseY - maxBandHeight, baseY - 24 - waveHeight * (0.55 + wave));
        bottomCtx.lineTo(x, y);
      }
      bottomCtx.lineTo(width, baseY);
      bottomCtx.closePath();
      bottomCtx.fill();

      bottomCtx.globalAlpha = 0.34 + average * 0.28;
      bottomCtx.strokeStyle = colors.primary;
      bottomCtx.lineWidth = 2;
      bottomCtx.stroke();
      bottomCtx.globalAlpha = 1;
      bottomCtx.globalCompositeOperation = 'source-over';
      bottomCtx.restore();
    };

    const drawBarsCanvas = (freqs, average, colors, width, height, centerX, centerY, maxRadius) => {
      const points = 128;
      const connectorRadius = maxRadius * 0.68;

      ctx.globalAlpha = 0.34 + average * 0.22;
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 7 + average * 7;
      ctx.beginPath();
      ctx.arc(centerX, centerY, connectorRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 0.22 + average * 0.18;
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 2.5 + average * 4;
      ctx.beginPath();
      ctx.arc(centerX, centerY, connectorRadius + 18 + average * 18, 0, Math.PI * 2);
      ctx.stroke();

      for (let layer = 0; layer < 3; layer += 1) {
        ctx.beginPath();
        for (let i = 0; i <= points; i += 1) {
          const value = Math.pow(average, 0.72);
          const time = performance.now();
          const angle = (i / points) * Math.PI * 2 + time / (1800 + layer * 420);
          const radius = maxRadius * (0.28 + layer * 0.17) + value * (64 + layer * 26);
          const wobble =
            Math.sin(time / 420 + i * 0.12 + layer * 1.7) * (8 + average * 24) +
            Math.cos(time / 760 + i * 0.21 + layer) * (5 + average * 16);
          const orbitX = Math.sin(time / 1350 + layer) * (10 + average * 22);
          const orbitY = Math.cos(time / 1500 + layer * 1.4) * (8 + average * 18);
          const x = centerX + orbitX + Math.cos(angle) * (radius + wobble);
          const y = centerY + orbitY + Math.sin(angle) * (radius + wobble);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = layer === 0 ? colors.primary : layer === 1 ? colors.secondary : colors.accent;
        ctx.lineWidth = 1.5 + average * 4;
        ctx.globalAlpha = 0.24 + layer * 0.14;
        ctx.stroke();
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
      drawBottomSpectrum(freqs, average, colors);
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
      let pulseSum = 0;
      const pulseStart = 6;
      const pulseEnd = Math.min(data.length, 42);
      for (let i = pulseStart; i < pulseEnd; i += 1) {
        pulseSum += data[i];
      }
      const focusedEnergy = pulseSum / Math.max(1, pulseEnd - pulseStart) / 255;
      const audioPulse = Math.min(0.42, Math.pow(Math.max(average * 1.35, focusedEnergy * 1.55), 0.88));
      const time = performance.now();
      group.position.x = isTunnel ? 0 : Math.sin(time / 2400 + motionSeeds.x) * 0.8;
      group.position.y = isTunnel ? 0 : Math.cos(time / 3100 + motionSeeds.y) * 0.65;
      group.rotation.z += isTunnel ? 0.006 + average * 0.009 : 0.0026;
      group.rotation.x = isTunnel ? Math.sin(time / 3000) * 0.22 : Math.sin(time / 2800 + motionSeeds.tilt) * 0.1;
      group.rotation.y = isTunnel ? 0 : Math.cos(time / 3600 + motionSeeds.tilt) * 0.08;
      particles.rotation.z -= isTunnel ? 0.0025 + average * 0.006 : 0.0015 + average * 0.004;
      particles.position.z = isTunnel ? -2 + Math.sin(time / 1200) * (0.8 + average * 1.8) : 0;
      particles.material.color.set(colors.secondary);
      particles.material.size = isTunnel ? 0.12 + audioPulse * 0.16 : 0.06 + audioPulse * 0.12;

      bars.forEach((bar, index) => {
        const value = audioPulse;
        const angle = (index / bars.length) * Math.PI * 2;
        const seed = barSeeds[index];
        if (isTunnel) {
          const orbit = angle + time / 2600 + Math.sin(time / 1400 + seed) * 0.12;
          const lane = index % 3;
          const randomOffset = Math.sin(time / 760 + seed) * 0.7 + Math.cos(time / 1350 + seed * 1.6) * 0.4;
          const scale = 3.1 + value * 2.1;
          const radius = 5.8 + lane * 1.35 + randomOffset + value * 0.8;
          const z = Math.sin(time / 720 + seed) * 3.8 + Math.cos(time / 1500 + seed) * 1.2;
          bar.position.set(Math.cos(orbit) * radius, Math.sin(orbit) * radius, z);
          bar.rotation.z = orbit + Math.PI / 2 + Math.sin(time / 1000 + seed) * 0.09;
          bar.rotation.x = Math.sin(time / 1100 + seed) * 0.28;
          bar.scale.set(0.8, scale, 0.75);
        } else {
          const scale = 3.7 + value * 2.8;
          const baseRadius = 8.1;
          const randomOffset = Math.sin(time / 680 + seed) * 0.55 + Math.cos(time / 1250 + seed * 1.7) * 0.35;
          const radius = baseRadius + scale / 2;
          bar.position.set(Math.cos(angle) * (radius + randomOffset), Math.sin(angle) * (radius + randomOffset), Math.sin(time / 900 + seed) * 0.8 + value * 1.1);
          bar.rotation.z = angle - Math.PI / 2 + Math.sin(time / 1000 + seed) * 0.08;
          bar.rotation.x = Math.cos(time / 1150 + seed) * 0.08;
          bar.scale.set(1, scale, 1);
        }
        bar.material.color.set(index % 3 === 0 ? colors.primary : index % 3 === 1 ? colors.secondary : colors.accent);
        bar.material.emissive.set(bar.material.color);
        bar.material.emissiveIntensity = 0.18 + value * (isTunnel ? 1.45 : 0.95);
      });

      rings.forEach((ring, index) => {
        ring.material.color.set(index === 0 ? colors.accent : index === 1 ? colors.primary : colors.secondary);
        ring.material.opacity = isTunnel ? 0.2 + average * 0.46 : 0.24 + average * 0.62;
        ring.rotation.z -= (isTunnel ? 0.006 : 0.012) + index * 0.004 + average * 0.018;
        ring.rotation.x = isTunnel ? index * 0.18 : index * 0.7 + Math.sin(time / 900 + index) * (0.28 + average * 0.2);
        ring.rotation.y = isTunnel ? Math.sin(time / 1800 + index) * 0.32 : index * 0.4 + Math.cos(time / 1100 + index) * (0.3 + average * 0.22);
        ring.position.z = isTunnel ? -index * 1.2 + Math.sin(performance.now() / 900 + index) * 1.4 : 0;
        ring.position.x = isTunnel ? 0 : Math.sin(time / 1200 + index * 1.8) * (0.6 + average * 0.6);
        ring.position.y = isTunnel ? 0 : Math.cos(time / 1400 + index * 1.5) * (0.5 + average * 0.5);
        ring.scale.setScalar(isTunnel ? 0.74 + index * 0.2 + average * 0.42 : 0.84 + index * 0.27 + average * 0.58);
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
    <>
      <div className="visualizer" ref={mountRef}>
        <canvas ref={canvasRef} className="visualizerOverlay" />
      </div>
      <canvas ref={bottomCanvasRef} className="bottomSpectrum" />
    </>
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
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [activeView, setActiveView] = useState('visualizer');

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

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setIsPresentationMode(false);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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

  const enterPresentationMode = async () => {
    setIsPresentationMode(true);
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        setIsPresentationMode(true);
      }
    }
  };

  const exitPresentationMode = async () => {
    setIsPresentationMode(false);
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    }
  };

  if (activeView === 'beatmaker') {
    return <BeatMaker onBack={() => setActiveView('visualizer')} />;
  }

  return (
    <main
      className={`appShell ${isPresentationMode ? 'presentationMode' : ''}`}
      onClick={isPresentationMode ? exitPresentationMode : undefined}
    >
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
          <button className="beatSwitchButton" type="button" onClick={() => setActiveView('beatmaker')}>
            <Drum size={18} />
            Beat Maker
          </button>
          <button className="iconButton" type="button" onClick={enterPresentationMode} aria-label="Enter fullscreen visualizer">
            <Maximize2 size={18} />
          </button>
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

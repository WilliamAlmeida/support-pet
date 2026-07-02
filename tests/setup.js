// Setup do ambiente jsdom para os testes.
// jsdom não implementa rAF de verdade, matchMedia nem scrollIntoView — stubamos aqui.

import { vi } from 'vitest';

// prefers-reduced-motion controlável por teste (setar ANTES de `new SupportPet`,
// porque a lib captura o valor no construtor).
globalThis.__reducedMotion = false;

window.matchMedia = vi.fn((query) => ({
  matches: query.includes('prefers-reduced-motion') ? globalThis.__reducedMotion : false,
  media: query,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
}));

// Fila de frames controlável: os testes chamam flushFrames(n) para animar.
const frameQueue = [];

window.requestAnimationFrame = (cb) => {
  frameQueue.push(cb);
  return frameQueue.length;
};

window.cancelAnimationFrame = () => {};

let frameTs = 0;

globalThis.flushFrames = (n = 1, dt = 16) => {
  for (let i = 0; i < n; i++) {
    const batch = frameQueue.splice(0);
    if (batch.length === 0) return;
    frameTs += dt;
    batch.forEach((cb) => cb(frameTs));
  }
};

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}

// Helper para criar um alvo "visível" para o tour: jsdom devolve rects zerados,
// então stubamos getBoundingClientRect/getClientRects.
globalThis.makeTarget = (rect = { left: 200, top: 150, width: 120, height: 40 }) => {
  const el = document.createElement('button');
  el.textContent = 'alvo';
  document.body.appendChild(el);

  const full = {
    ...rect,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    x: rect.left,
    y: rect.top,
    toJSON: () => full,
  };

  el.getBoundingClientRect = () => full;
  el.getClientRects = () => [full];

  return el;
};

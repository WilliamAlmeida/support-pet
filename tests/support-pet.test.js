import { afterEach, describe, expect, it, vi } from 'vitest';
import SupportPet from '../src/support-pet.js';

const makePet = (opts = {}) =>
  new SupportPet({ startWalking: false, greeting: null, idleSleep: false, ...opts }).mount();

afterEach(() => {
  document.body.innerHTML = '';
  document.head.querySelectorAll('style[data-support-pet]').forEach((s) => s.remove());
  globalThis.__reducedMotion = false;
});

describe('ciclo de vida', () => {
  it('mount injeta o pet e o painel no DOM; unmount remove o root', () => {
    const pet = makePet();

    expect(document.querySelector('.sp-root')).not.toBeNull();
    expect(document.querySelector('.sp-panel')).not.toBeNull();

    pet.unmount();

    expect(document.querySelector('.sp-root')).toBeNull();
  });

  it('say() exibe o balão com o texto', () => {
    const pet = makePet();

    pet.say('Olá, mundo!');

    const bubble = document.querySelector('.sp-bubble');
    expect(bubble.textContent).toBe('Olá, mundo!');
    expect(bubble.classList.contains('sp-bubble--show')).toBe(true);

    pet.unmount();
  });
});

describe('modo tour (caminhada dirigida)', () => {
  it('walkTo com reduced-motion teleporta e chama onArrive', () => {
    globalThis.__reducedMotion = true;
    const pet = makePet();
    const onArrive = vi.fn();

    pet.walkTo(120, 90, { onArrive });

    expect(onArrive).toHaveBeenCalledTimes(1);
    expect(pet.x).toBe(120);
    expect(pet.y).toBe(90);

    pet.unmount();
  });

  it('walkTo animado avança por frames até chegar', () => {
    const pet = makePet();
    const onArrive = vi.fn();
    pet.x = 0;
    pet.y = 0;

    pet.walkTo(60, 0, { onArrive });
    expect(pet.state).toBe('escorting');
    expect(onArrive).not.toHaveBeenCalled();

    globalThis.flushFrames(30);

    expect(onArrive).toHaveBeenCalledTimes(1);
    expect(pet.x).toBe(60);

    pet.unmount();
  });

  it('walkToElement posiciona ao lado do elemento', () => {
    globalThis.__reducedMotion = true;
    const pet = makePet();
    const target = globalThis.makeTarget({ left: 400, top: 300, width: 100, height: 50 });
    const onArrive = vi.fn();

    pet.walkToElement(target, { side: 'right', gap: 10, onArrive });

    expect(onArrive).toHaveBeenCalledTimes(1);
    expect(pet.x).toBe(510); // right (500) + gap (10)

    pet.unmount();
  });

  it('beginTour bloqueia drag/chat e soneca; endTour volta a andar', () => {
    const pet = makePet();

    pet.beginTour();
    expect(pet.state).toBe('escorting');

    // pointerdown durante o tour é ignorado (não inicia drag nem abre chat)
    pet._onPointerDown({ pointerId: 1, clientX: 10, clientY: 10, button: 0 });
    expect(pet._drag.active).toBe(false);

    // soneca não acontece durante o tour
    pet._sleep();
    expect(pet._asleep).toBe(false);

    pet.endTour();
    expect(pet.state).toBe('walking');

    pet.unmount();
  });

  it('placeAt teleporta com clamp nos limites da viewport', () => {
    const pet = makePet();

    pet.placeAt(-999, -999);

    expect(pet.x).toBeGreaterThanOrEqual(0);
    expect(pet.y).toBeGreaterThanOrEqual(0);

    pet.unmount();
  });
});

describe('markdown seguro', () => {
  it('escapa HTML bruto', () => {
    const pet = makePet();

    const html = pet._md('<script>alert(1)</script>');

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');

    pet.unmount();
  });

  it('não transforma links javascript: em âncoras', () => {
    const pet = makePet();

    // O texto cru permanece (escapado), mas nunca vira âncora clicável.
    const html = pet._md('[clique](javascript:alert(1))');

    expect(html).not.toContain('<a ');
    expect(html).not.toContain('href="javascript:');

    pet.unmount();
  });

  it('renderiza negrito, código e links http', () => {
    const pet = makePet();

    const html = pet._md('**forte** e `code` e [site](https://exemplo.com)');

    expect(html).toContain('<strong>forte</strong>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<a href="https://exemplo.com"');

    pet.unmount();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../src/support-pet.js';
import SupportPetTour from '../src/support-pet-tour.js';

// Reduced-motion nos testes: o pet teleporta (sem rAF) e o settle do passo cai
// para 50ms — controlado com fake timers.
const startTour = (steps, opts = {}) => {
  const tour = new SupportPetTour({ steps, ...opts });
  tour.start();
  vi.advanceTimersByTime(80); // settle do passo (50ms com reduced-motion)
  return tour;
};

beforeEach(() => {
  globalThis.__reducedMotion = true;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
  document.head.querySelectorAll('style[data-support-pet], style[data-support-pet-tour]').forEach((s) => s.remove());
  globalThis.__reducedMotion = false;
});

describe('SupportPetTour', () => {
  it('exige steps no construtor', () => {
    expect(() => new SupportPetTour({})).toThrow(/steps/);
  });

  it('start() renderiza spotlight e card do primeiro passo', () => {
    const target = globalThis.makeTarget();

    const tour = startTour([
      { element: target, title: 'Primeiro', description: 'Passo inicial' },
      { element: target, title: 'Segundo', description: 'Outro passo' },
    ]);

    const card = document.querySelector('.spt-card');
    expect(card).not.toBeNull();
    expect(card.querySelector('.spt-card__title').textContent).toBe('Primeiro');
    expect(card.querySelector('.spt-card__progress').textContent).toBe('1 de 2');
    expect(document.querySelector('.spt-spotlight').classList.contains('spt-spotlight--show')).toBe(true);

    tour.destroy();
  });

  it('next/prev navegam e o último passo mostra o rótulo done', () => {
    const target = globalThis.makeTarget();

    const tour = startTour(
      [
        { element: target, title: 'A', description: '...' },
        { element: target, title: 'B', description: '...', doneText: 'Bora!' },
      ],
      { labels: { next: 'Avançar', prev: 'Voltar', done: 'Fim' } },
    );

    tour.next();
    vi.advanceTimersByTime(80);

    const card = document.querySelector('.spt-card');
    expect(card.querySelector('.spt-card__title').textContent).toBe('B');
    expect(card.querySelector('.spt-card__progress').textContent).toBe('2 de 2');
    expect(card.querySelector('.spt-card__btn--next').textContent).toBe('Bora!'); // doneText do passo
    expect(card.querySelector('.spt-card__btn--prev').textContent).toBe('Voltar');

    tour.prev();
    vi.advanceTimersByTime(80);
    expect(document.querySelector('.spt-card__title').textContent).toBe('A');

    tour.destroy();
  });

  it('pula passos cujo alvo não existe/está invisível', () => {
    const a = globalThis.makeTarget();
    const c = globalThis.makeTarget({ left: 500, top: 400, width: 80, height: 30 });

    const tour = startTour([
      { element: a, title: 'A', description: '...' },
      { element: '#nao-existe', title: 'B', description: '...' },
      { element: c, title: 'C', description: '...' },
    ]);

    tour.next();
    vi.advanceTimersByTime(80);

    expect(document.querySelector('.spt-card__title').textContent).toBe('C');
    expect(document.querySelector('.spt-card__progress').textContent).toBe('3 de 3');

    tour.destroy();
  });

  it('Esc fecha o tour, remove o DOM e chama onClose (não onFinish)', () => {
    const target = globalThis.makeTarget();
    const onClose = vi.fn();
    const onFinish = vi.fn();

    startTour([{ element: target, title: 'A', description: '...' }], { onClose, onFinish });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(document.querySelector('.spt-card')).toBeNull();
    expect(document.querySelector('.spt-overlay')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('concluir no último passo chama onFinish e o pet volta a passear', () => {
    const target = globalThis.makeTarget();
    const onFinish = vi.fn();

    const tour = startTour([{ element: target, title: 'A', description: '...' }], { onFinish });
    const pet = tour.pet;

    document.querySelector('.spt-card__btn--next').click();

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(pet.state).toBe('walking');
  });

  it('onNext substitui o avanço automático (quem avança é o callback)', () => {
    const target = globalThis.makeTarget();
    const onNext = vi.fn();

    const tour = startTour([
      { element: target, title: 'A', description: '...', onNext },
      { element: target, title: 'B', description: '...' },
    ]);

    document.querySelector('.spt-card__btn--next').click();

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onNext.mock.calls[0][2]).toBe(tour); // recebe o tour para chamar tour.next()
    expect(document.querySelector('.spt-card__progress').textContent).toBe('1 de 2'); // não avançou

    onNext.mock.calls[0][2].next();
    vi.advanceTimersByTime(80);
    expect(document.querySelector('.spt-card__progress').textContent).toBe('2 de 2');

    tour.destroy();
  });

  it('reutiliza uma instância de SupportPet fornecida', () => {
    const target = globalThis.makeTarget();
    const pet = new window.SupportPet({ startWalking: false, greeting: null }).mount();

    const tour = startTour([{ element: target, title: 'A', description: '...' }], { pet });

    expect(tour.pet).toBe(pet);
    expect(pet.state).toBe('escorting');

    tour.destroy();
    expect(pet.state).toBe('walking');
    pet.unmount();
  });
});

/*!
 * SupportPetTour — tour guiado com o mascote SupportPet.
 * Módulo opcional: o pet caminha até cada elemento da página e "apresenta"
 * o passo num card ancorado, com spotlight escurecendo o resto da tela.
 * Vanilla JS, zero dependências. Requer support-pet.js carregado antes.
 *
 * Uso rápido:
 *   const tour = new SupportPetTour({
 *     steps: [
 *       { element: '#menu', title: 'Menu', description: 'Tudo começa aqui.' },
 *       { element: '#novo', title: 'Criar', description: 'Clique para criar.', side: 'left' },
 *     ],
 *   });
 *   tour.start();
 *
 * Formato de passo:
 *   {
 *     element: '#seletor' | Element,   // alvo do passo (re-consultado a cada exibição)
 *     title: 'Título',
 *     description: 'Texto (aceita HTML)',
 *     side: 'bottom' | 'top' | 'left' | 'right',   // lado preferido do card (padrão bottom)
 *     align: 'start' | 'center' | 'end',           // alinhamento no lado (padrão start)
 *     doneText: 'Abrir cadastro',      // rótulo do botão no ÚLTIMO passo (padrão labels.done)
 *     onNext: (el, step, tour) => {},  // se definido, o botão Próximo NÃO avança sozinho:
 *   }                                  //   o callback decide (ex.: abre um drawer e chama tour.next())
 *
 * Opções do construtor:
 *   pet          -> instância de SupportPet a reutilizar; se omitido, cria uma própria
 *   steps        -> array de passos (obrigatório)
 *   stagePadding -> respiro do spotlight ao redor do alvo (padrão 10)
 *   labels       -> { next: 'Próximo', prev: 'Anterior', done: 'Concluir' }
 *   onFinish     -> chamado quando o tour termina no último passo
 *   onClose      -> chamado quando o tour é fechado antes do fim (Esc, X, clique-fora)
 *
 * API: tour.start(index?) / tour.next() / tour.prev() / tour.destroy()
 * Teclado: Esc fecha, ←/→ navegam. Clique fora do card também fecha.
 * Mobile (<640px): o card vira bottom-sheet. Passos com alvo ausente são pulados.
 * Com prefers-reduced-motion, o pet teleporta em vez de caminhar.
 */
(function (global) {
  'use strict';

  const VIEWPORT_MARGIN = 12;
  const CARD_OFFSET = 14;
  const MOBILE_BREAKPOINT = 640;

  let STYLE_INJECTED = false;

  const injectStyles = () => {
    if (STYLE_INJECTED) return;
    const css = `
.spt-overlay{position:fixed;inset:0;background:transparent;}
.spt-spotlight{position:fixed;border-radius:10px;box-shadow:0 0 0 100vmax rgba(15,23,42,.55);
  pointer-events:none;opacity:0;transition:all .3s ease;}
.spt-spotlight--show{opacity:1;}
.spt-card{position:fixed;width:300px;max-width:calc(100vw - 16px);background:#fff;color:#2c3e50;
  border:2px solid #7ec8e3;border-radius:16px;padding:14px 16px 12px;
  box-shadow:0 18px 50px rgba(44,62,80,.28);
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  opacity:0;transform:translateY(6px) scale(.97);pointer-events:none;
  transition:opacity .22s ease,transform .22s ease;}
.spt-card--show{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}
.spt-card__close{position:absolute;top:8px;right:8px;width:24px;height:24px;border:none;
  border-radius:8px;background:#eef4f7;color:#567;font-size:15px;line-height:1;cursor:pointer;
  display:flex;align-items:center;justify-content:center;}
.spt-card__close:hover{background:#dce8ee;}
.spt-card__title{font-weight:700;font-size:15px;padding-right:26px;margin-bottom:4px;}
.spt-card__description{font-size:13px;line-height:1.45;color:#4a5f70;}
.spt-card__footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:12px;}
.spt-card__progress{font-size:11px;color:#8aa0ad;white-space:nowrap;}
.spt-card__buttons{display:flex;gap:6px;}
.spt-card__btn{border:none;border-radius:10px;padding:7px 13px;font-size:13px;font-weight:600;
  cursor:pointer;font-family:inherit;}
.spt-card__btn--prev{background:#eef4f7;color:#34495e;}
.spt-card__btn--prev:hover{background:#dce8ee;}
.spt-card__btn--next{background:#34495e;color:#fff;}
.spt-card__btn--next:hover{background:#2c3e50;}
@media (prefers-color-scheme: dark){
  .spt-card{background:#1d232a;color:#e2e8f0;border-color:#3b6b80;}
  .spt-card__description{color:#9fb3c0;}
  .spt-card__close,.spt-card__btn--prev{background:#2a323c;color:#cbd5e1;}
  .spt-card__btn--next{background:#7ec8e3;color:#0f3a4a;}
}
@media (max-width: 640px){
  .spt-card{border-radius:14px;}
}
@media (prefers-reduced-motion: reduce){
  .spt-spotlight,.spt-card{transition:none;}
}`;
    const tag = document.createElement('style');
    tag.setAttribute('data-support-pet-tour', '');
    tag.textContent = css;
    document.head.appendChild(tag);
    STYLE_INJECTED = true;
  };

  const isVisible = (element) => {
    if (!element) return false;
    const styles = global.getComputedStyle(element);
    return styles.display !== 'none' && styles.visibility !== 'hidden' && element.getClientRects().length > 0;
  };

  const prefersReducedMotion = () =>
    global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  class SupportPetTour {
    constructor(opts = {}) {
      if (!Array.isArray(opts.steps) || opts.steps.length === 0) {
        throw new Error('[SupportPetTour] opts.steps é obrigatório (array de passos).');
      }
      this.steps = opts.steps;
      this.stagePadding = opts.stagePadding == null ? 10 : opts.stagePadding;
      this.labels = Object.assign({ next: 'Próximo', prev: 'Anterior', done: 'Concluir' }, opts.labels || {});
      this.onFinish = opts.onFinish || null;
      this.onClose = opts.onClose || null;

      this.pet = opts.pet || null;   // criado lazy no start() se não fornecido
      this._ownPet = !opts.pet;

      this.index = -1;
      this.active = false;
      this._destroyed = false;
      this._stepToken = 0;           // invalida callbacks assíncronos de passos anteriores
      this._repositionRaf = null;
      this._currentEl = null;
      this._overlay = null;
      this._spotlight = null;
      this._card = null;

      this._onKeydown = this._onKeydown.bind(this);
      this._reposition = this._reposition.bind(this);
    }

    /* ---------- API pública ---------- */

    start(index = 0) {
      if (this._destroyed || this.active) return this;
      injectStyles();
      this._ensurePet().beginTour();
      this._buildDom();
      this.active = true;
      global.addEventListener('resize', this._reposition);
      global.addEventListener('scroll', this._reposition, true);
      document.addEventListener('keydown', this._onKeydown);
      this._showStep(index, 1);
      return this;
    }

    next() {
      if (!this.active) return this;
      if (this.index >= this.steps.length - 1) {
        this._end(true);
        return this;
      }
      this._showStep(this.index + 1, 1);
      return this;
    }

    prev() {
      if (!this.active || this.index <= 0) return this;
      this._showStep(this.index - 1, -1);
      return this;
    }

    /** Fecha o tour (equivale a Esc/clique-fora). O pet volta a passear. */
    destroy() {
      this._end(false);
      return this;
    }

    /* ---------- internos ---------- */

    _ensurePet() {
      if (!this.pet) {
        const SupportPet = global.SupportPet;
        if (!SupportPet) {
          throw new Error('[SupportPetTour] SupportPet não encontrado — carregue support-pet.js antes.');
        }
        // Pet padrão compartilhado entre tours: iniciar vários tours (ou reiniciar
        // o mesmo) não deve criar um mascote novo a cada vez.
        const cached = SupportPetTour._defaultPet;
        if (!cached || !cached._mounted || !document.body.contains(cached.root)) {
          SupportPetTour._defaultPet = new SupportPet({ startWalking: false, greeting: null, llmHandler: null }).mount();
        }
        this.pet = SupportPetTour._defaultPet;
      }
      return this.pet;
    }

    _zIndexes() {
      const base = (this.pet && this.pet.cfg.zIndex) || 2147483000;
      return { overlay: base - 20, spotlight: base - 10, card: base + 10 };
    }

    _buildDom() {
      const z = this._zIndexes();

      this._overlay = document.createElement('div');
      this._overlay.className = 'spt-overlay';
      this._overlay.style.zIndex = z.overlay;
      this._overlay.addEventListener('click', () => this._end(false));

      this._spotlight = document.createElement('div');
      this._spotlight.className = 'spt-spotlight';
      this._spotlight.style.zIndex = z.spotlight;

      this._card = document.createElement('div');
      this._card.className = 'spt-card';
      this._card.style.zIndex = z.card;

      document.body.appendChild(this._overlay);
      document.body.appendChild(this._spotlight);
      document.body.appendChild(this._card);
    }

    _renderCard(step, i) {
      const isLast = i === this.steps.length - 1;
      const nextLabel = isLast ? (step.doneText || this.labels.done) : this.labels.next;
      const card = this._card;

      card.innerHTML = '';

      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'spt-card__close';
      close.setAttribute('aria-label', 'Fechar tour');
      close.innerHTML = '&times;';
      close.addEventListener('click', () => this._end(false));

      const title = document.createElement('div');
      title.className = 'spt-card__title';
      title.textContent = step.title || '';

      const description = document.createElement('div');
      description.className = 'spt-card__description';
      description.innerHTML = step.description || '';

      const footer = document.createElement('div');
      footer.className = 'spt-card__footer';

      const progress = document.createElement('span');
      progress.className = 'spt-card__progress';
      progress.textContent = (i + 1) + ' de ' + this.steps.length;

      const buttons = document.createElement('div');
      buttons.className = 'spt-card__buttons';

      if (i > 0) {
        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'spt-card__btn spt-card__btn--prev';
        prevBtn.textContent = this.labels.prev;
        prevBtn.addEventListener('click', () => this.prev());
        buttons.appendChild(prevBtn);
      }

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'spt-card__btn spt-card__btn--next';
      nextBtn.textContent = nextLabel;
      nextBtn.addEventListener('click', () => this._handleNext());
      buttons.appendChild(nextBtn);

      footer.appendChild(progress);
      footer.appendChild(buttons);
      card.appendChild(close);
      card.appendChild(title);
      card.appendChild(description);
      card.appendChild(footer);
    }

    /* ---------- layout ---------- */

    _positionSpotlight(rect) {
      const pad = this.stagePadding;
      const s = this._spotlight.style;
      s.left = (rect.left - pad) + 'px';
      s.top = (rect.top - pad) + 'px';
      s.width = (rect.width + pad * 2) + 'px';
      s.height = (rect.height + pad * 2) + 'px';
    }

    _cardPosition(rect, step) {
      const vw = global.innerWidth;
      const vh = global.innerHeight;
      const cw = this._card.offsetWidth;
      const ch = this._card.offsetHeight;
      const pad = this.stagePadding + CARD_OFFSET;

      if (vw < MOBILE_BREAKPOINT) {
        return { left: 8, top: vh - ch - 8, mobile: true };
      }

      const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

      const alignFor = (side) => {
        const align = step.align || 'start';
        if (side === 'left' || side === 'right') {
          if (align === 'center') return rect.top + rect.height / 2 - ch / 2;
          if (align === 'end') return rect.bottom - ch;
          return rect.top;
        }
        if (align === 'center') return rect.left + rect.width / 2 - cw / 2;
        if (align === 'end') return rect.right - cw;
        return rect.left;
      };

      const positions = {
        left: () => ({ left: rect.left - cw - pad, top: alignFor('left') }),
        right: () => ({ left: rect.right + pad, top: alignFor('right') }),
        top: () => ({ left: alignFor('top'), top: rect.top - ch - pad }),
        bottom: () => ({ left: alignFor('bottom'), top: rect.bottom + pad }),
      };

      const fits = (pos) =>
        pos.left >= VIEWPORT_MARGIN && pos.top >= VIEWPORT_MARGIN
        && pos.left + cw <= vw - VIEWPORT_MARGIN && pos.top + ch <= vh - VIEWPORT_MARGIN;

      const preferred = step.side || 'bottom';
      const order = [preferred].concat(['bottom', 'right', 'left', 'top'].filter((s) => s !== preferred));

      for (const side of order) {
        const pos = positions[side]();
        if (fits(pos)) return pos;
      }

      const fallback = positions[preferred]();
      return {
        left: clamp(fallback.left, VIEWPORT_MARGIN, vw - cw - VIEWPORT_MARGIN),
        top: clamp(fallback.top, VIEWPORT_MARGIN, vh - ch - VIEWPORT_MARGIN),
      };
    }

    _petPositionFor(cardPos) {
      // O pet "espia" por cima do canto superior-direito do card.
      const size = this.pet.cfg.size;
      const cw = this._card.offsetWidth;

      if (cardPos.mobile) {
        return { x: cardPos.left + 8, y: cardPos.top - size + 12 };
      }

      return { x: cardPos.left + cw - size * 0.9, y: cardPos.top - size + 14 };
    }

    _layoutStep(walk) {
      if (!this.active || !this._currentEl) return;

      const rect = this._currentEl.getBoundingClientRect();
      this._positionSpotlight(rect);

      const pos = this._cardPosition(rect, this.steps[this.index] || {});
      this._card.style.left = pos.left + 'px';
      this._card.style.top = pos.top + 'px';
      this._card.style.width = pos.mobile ? (global.innerWidth - 16) + 'px' : '';

      const petPos = this._petPositionFor(pos);
      const token = this._stepToken;

      if (walk) {
        this._card.classList.remove('spt-card--show');
        this.pet.walkTo(petPos.x, petPos.y, {
          onArrive: () => {
            if (!this.active || token !== this._stepToken) return;
            this._card.classList.add('spt-card--show');
          },
        });
      } else {
        this.pet.placeAt(petPos.x, petPos.y);
      }
    }

    _reposition() {
      if (!this.active || this._repositionRaf) return;
      this._repositionRaf = requestAnimationFrame(() => {
        this._repositionRaf = null;
        this._layoutStep(false);
      });
    }

    /* ---------- navegação ---------- */

    _findStepElement(i) {
      const step = this.steps[i];
      if (!step) return null;
      const el = typeof step.element === 'string' ? document.querySelector(step.element) : step.element;
      return el && isVisible(el) ? el : null;
    }

    // Se o alvo sumiu (UI condicional/re-render), pula na direção dada.
    _resolveStepIndex(from, direction) {
      let i = from;
      while (i >= 0 && i < this.steps.length) {
        if (this._findStepElement(i)) return i;
        i += direction;
      }
      return -1;
    }

    _showStep(target, direction) {
      if (!this.active && this.index !== -1) return;

      const resolved = this._resolveStepIndex(target, direction);
      if (resolved === -1) {
        this._end(false);
        return;
      }

      this.index = resolved;
      this._stepToken += 1;
      const token = this._stepToken;
      this._currentEl = this._findStepElement(this.index);
      this._card.classList.remove('spt-card--show');

      this._currentEl.scrollIntoView({
        block: 'center',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });

      setTimeout(() => {
        if (!this.active || token !== this._stepToken) return;

        this._currentEl = this._findStepElement(this.index) || this._currentEl;
        this._renderCard(this.steps[this.index], this.index);
        this._spotlight.classList.add('spt-spotlight--show');
        this._layoutStep(true);
      }, prefersReducedMotion() ? 50 : 320);
    }

    _handleNext() {
      const step = this.steps[this.index];

      if (step && typeof step.onNext === 'function') {
        // Quem decide avançar é o callback (ex.: abre um drawer e chama tour.next()).
        step.onNext(this._currentEl, step, this);
        return;
      }

      this.next();
    }

    _onKeydown(event) {
      if (!this.active) return;
      if (event.key === 'Escape') this._end(false);
      if (event.key === 'ArrowRight') this._handleNext();
      if (event.key === 'ArrowLeft') this.prev();
    }

    _end(finished) {
      if (this._destroyed || !this.active) {
        if (!this._destroyed) this._destroyed = true;
        return;
      }
      this.active = false;
      this._destroyed = true;
      this._stepToken += 1;
      cancelAnimationFrame(this._repositionRaf);
      global.removeEventListener('resize', this._reposition);
      global.removeEventListener('scroll', this._reposition, true);
      document.removeEventListener('keydown', this._onKeydown);
      if (this._overlay) this._overlay.remove();
      if (this._spotlight) this._spotlight.remove();
      if (this._card) this._card.remove();
      if (this.pet) this.pet.endTour();
      if (finished && typeof this.onFinish === 'function') this.onFinish();
      if (!finished && typeof this.onClose === 'function') this.onClose();
    }
  }

  // export UMD-ish
  global.SupportPetTour = SupportPetTour;
  if (typeof module !== 'undefined' && module.exports) module.exports = SupportPetTour;

})(typeof window !== 'undefined' ? window : this);

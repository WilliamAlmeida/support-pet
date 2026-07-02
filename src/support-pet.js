/*!
 * SupportPet — pet de suporte flutuante com chat via LLM.
 * Vanilla JS, zero dependências. (c) you.
 *
 * Uso rápido:
 *   const pet = new SupportPet({
 *     name: 'Doc',
 *     llmHandler: async (text, history) => '...resposta...'
 *   });
 *   pet.mount();
 *
 * API pública:
 *   pet.say(text, { duration })  -> balão de reação (sem LLM), enquanto anda
 *   pet.ask(text)                -> invoca + manda 'text' do usuário pra LLM e responde
 *   pet.summon()                 -> voa pro canto e abre o chat
 *   pet.dismiss()                -> fecha o chat e volta a andar
 *   pet.clearHistory({ greeting })-> limpa a conversa e a tela (re-mostra saudação se aberto)
 *   pet.react(type, opts)        -> reação/emote: jump, nod, shake, spin, wobble, dizzy,
 *                                   sad, hearts, confetti (aliases: happy/yes/no/love/celebrate)
 *   pet.setLLMHandler(fn)        -> troca o handler em runtime
 *   pet.mount(parent) / pet.unmount()
 *
 * Modo tour (caminhada dirigida — base p/ tours guiados, ver support-pet-tour.js):
 *   pet.beginTour()              -> entra no modo tour: para o passeio e desliga
 *                                   chat/drag/soneca (o pet fica "profissional")
 *   pet.endTour()                -> sai do modo tour e volta a passear
 *   pet.walkTo(x, y, { onArrive })          -> caminha até a coordenada e avisa ao chegar
 *   pet.walkToElement(el, { side, gap, onArrive }) -> caminha até a lateral de um elemento
 *   pet.placeAt(x, y)            -> teleporte instantâneo (reancoragem em scroll/resize)
 *   (com prefers-reduced-motion, walkTo/walkToElement teleportam)
 *
 * Arraste o pet (mouse/toque) e solte onde quiser — ele segue andando dali.
 * Tocar/clicar no pet alterna o chat: abre se estiver andando, fecha se já aberto.
 * Modo de resposta: opts.responseMode = 'instant' (padrão) ou 'stream'.
 *   - 'stream' + llmStreamHandler(text, history, onToken)  -> streaming real (tokens)
 *   - 'stream' só com llmHandler                            -> efeito máquina de escrever
 *
 * Eventos (dispare de qualquer botão/lugar do site):
 *   window.dispatchEvent(new CustomEvent('petbot:say',     { detail: { text, duration } }))
 *   window.dispatchEvent(new CustomEvent('petbot:ask',     { detail: { text } }))
 *   window.dispatchEvent(new CustomEvent('petbot:summon'))
 *   window.dispatchEvent(new CustomEvent('petbot:dismiss'))
 *   window.dispatchEvent(new CustomEvent('petbot:clear'))
 *   window.dispatchEvent(new CustomEvent('petbot:react', { detail: { type: 'hearts' } }))
 *   (os nomes dos eventos são configuráveis em opts.events)
 *
 * Markdown: respostas do bot renderizam markdown básico (negrito, itálico, código,
 *   listas e links). Desligue com opts.markdown = false.
 *
 * Segundo plano (opts.detachWhileThinking): ao processar, fecha o chat e o pet volta
 *   a andar; quando a resposta chega, ele NÃO reabre sozinho — mostra um balão avisando
 *   e a pessoa toca nele pra ver. opts.detachAfter = ms (0 = sempre; >0 = só se demorar).
 *
 * Vida própria: as pupilas seguem o cursor (opts.eyeTracking), o pet cochila quando
 *   ocioso mostrando 💤 (opts.idleSleep / idleSleepAfter), e a carinha muda de expressão
 *   conforme a reação (feliz/preocupada). pet.sleep() / pet.wake() controlam manualmente.
 */
(function (global) {
  'use strict';

  const DEFAULT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="sp-svg">
  <g class="sp-body">
    <path d="M32 8 C18 8 11 19 11 31 C11 45 20 56 32 56 C44 56 53 45 53 31 C53 19 46 8 32 8 Z" fill="#7ec8e3"/>
    <circle cx="20" cy="12" r="4" fill="#7ec8e3"/>
    <circle cx="44" cy="12" r="4" fill="#7ec8e3"/>
    <path d="M14 40 C18 52 26 56 32 56 C38 56 46 52 50 40 C44 44 38 45 32 45 C26 45 20 44 14 40 Z" fill="#ffffff"/>
    <path d="M32 45 L30 56 L34 56 Z" fill="#e3eef2"/>
    <path d="M26 41 L32 47 L30 41 Z" fill="#ffffff" stroke="#d4dde0" stroke-width="0.8"/>
    <path d="M38 41 L32 47 L34 41 Z" fill="#ffffff" stroke="#d4dde0" stroke-width="0.8"/>
    <circle cx="19" cy="36" r="3.5" fill="#f4a9b8"/>
    <circle cx="45" cy="36" r="3.5" fill="#f4a9b8"/>
    <circle cx="25" cy="29" r="6.5" fill="#ffffff" stroke="#34495e" stroke-width="2"/>
    <circle cx="39" cy="29" r="6.5" fill="#ffffff" stroke="#34495e" stroke-width="2"/>
    <line x1="31.5" y1="29" x2="32.5" y2="29" stroke="#34495e" stroke-width="2"/>
    <g class="sp-eyes-open">
      <g class="sp-pupils">
        <circle cx="25" cy="29" r="2.4" fill="#2c3e50"/>
        <circle cx="39" cy="29" r="2.4" fill="#2c3e50"/>
        <circle cx="25.8" cy="28.2" r="0.8" fill="#ffffff"/>
        <circle cx="39.8" cy="28.2" r="0.8" fill="#ffffff"/>
      </g>
    </g>
    <g class="sp-eyes-closed">
      <path d="M22 29.5 Q25 31.5 28 29.5" fill="none" stroke="#2c3e50" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M36 29.5 Q39 31.5 42 29.5" fill="none" stroke="#2c3e50" stroke-width="1.6" stroke-linecap="round"/>
    </g>
    <g class="sp-brows">
      <path d="M21.5 23.5 L28 22" stroke="#34495e" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M42.5 23.5 L36 22" stroke="#34495e" stroke-width="1.6" stroke-linecap="round"/>
    </g>
    <path class="sp-mouth sp-mouth--neutral" d="M29 38 Q32 41 35 38" fill="none" stroke="#2c3e50" stroke-width="1.6" stroke-linecap="round"/>
    <path class="sp-mouth sp-mouth--happy" d="M28 37.5 Q32 43.5 36 37.5" fill="none" stroke="#2c3e50" stroke-width="1.6" stroke-linecap="round"/>
    <path class="sp-mouth sp-mouth--worried" d="M29 40 Q32 37 35 40" fill="none" stroke="#2c3e50" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M27 47 Q26 53 32 53 Q38 53 37 47" fill="none" stroke="#34495e" stroke-width="1.6"/>
    <circle cx="32" cy="53.5" r="2.2" fill="#bdc3c7" stroke="#34495e" stroke-width="1"/>
  </g>
</svg>`;

  const DEFAULTS = {
    name: 'Doc',
    svg: null,                 // string SVG custom; null = built-in
    size: 72,                  // px (lado do pet)
    walkSpeed: 55,             // px/seg
    edgeMargin: 18,            // distância das bordas
    pauseRange: [800, 2600],   // ms parado entre caminhadas
    corner: 'bottom-right',    // canto de docking p/ chat
    greeting: 'Oi! Sou o Doc 🩺 Me clica que eu te ajudo.',
    placeholder: 'Escreva sua dúvida...',
    sendLabel: 'Enviar',
    zIndex: 2147483000,
    startWalking: true,
    respectReducedMotion: true,
    // texto/typing
    typingLabel: '…',
    markdown: true,            // renderiza markdown básico nas respostas do bot
    responseMode: 'instant',   // 'instant' (texto de uma vez) | 'stream' (revela aos poucos)
    streamSpeed: 18,           // ms por passo no modo stream client-side
    llmHandler: null,          // async (text, history) => string
    llmStreamHandler: null,    // async (text, history, onToken) => void|string  (streaming real)
    // "trabalhar em segundo plano": ao pensar, fecha o chat e avisa quando a resposta chega
    detachWhileThinking: false,
    detachAfter: 0,            // ms; 0 = destaca ao enviar; >0 = só destaca se demorar mais que isso
    thinkingBubble: 'Já tô analisando… 🔍',
    answerBubble: 'Tenho sua resposta! Toque em mim 👆',
    autoReactions: true,       // reage sozinho (responder, soltar arraste etc.)
    eyeTracking: true,         // pupilas seguem o cursor (mouse/caneta)
    idleSleep: true,           // cochila quando ocioso
    idleSleepAfter: 15000,     // ms parado sem interação até dormir
    sleepSymbol: '💤',
    // nomes de evento (customizáveis p/ evitar conflito)
    events: {
      say: 'petbot:say',
      ask: 'petbot:ask',
      summon: 'petbot:summon',
      dismiss: 'petbot:dismiss',
      clear: 'petbot:clear',
      react: 'petbot:react',
    },
    // callbacks de ciclo de vida (opcionais)
    onSummon: null,
    onDismiss: null,
    onUserMessage: null,       // (text) => void
    onReply: null,             // (text) => void
  };

  let STYLE_INJECTED = false;

  class SupportPet {
    constructor(opts = {}) {
      this.cfg = Object.assign({}, DEFAULTS, opts);
      this.cfg.events = Object.assign({}, DEFAULTS.events, opts.events || {});
      this.state = 'idle';     // idle | walking | summoning | chatting
      this.x = 0; this.y = 0;  // canto sup-esq do pet (fixed)
      this.target = null;
      this.pauseUntil = 0;
      this.dir = 1;            // 1 = direita, -1 = esquerda
      this.history = [];       // [{role:'user'|'assistant', text}]
      this._pending = false;   // tem resposta esperando ser aberta
      this._thinking = false;  // processando em segundo plano
      this._raf = null;
      this._lastTs = 0;
      this._bubbleTimer = null;
      this._mounted = false;
      this._reduced = this.cfg.respectReducedMotion &&
        global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // bind
      this._tick = this._tick.bind(this);
      this._escortTick = this._escortTick.bind(this);
      this._onResize = this._onResize.bind(this);
      this._onPointerDown = this._onPointerDown.bind(this);
      this._onPointerMove = this._onPointerMove.bind(this);
      this._onPointerUp = this._onPointerUp.bind(this);
      this._onWinMove = this._onWinMove.bind(this);
      this._evtHandlers = {};
      this._drag = { active: false, id: null, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 };
      this._dragThresh = 6; // px p/ diferenciar clique de arraste
      this._asleep = false;
      this._lastActivity = 0;
      this._touring = false;   // modo tour: caminhada dirigida, sem chat/drag/soneca
      this._escort = null;     // { x, y, onArrive } destino dirigido atual
    }

    /* ---------- ciclo de vida ---------- */

    mount(parent) {
      if (this._mounted) return this;
      this.parent = parent || document.body;
      this._injectStyles();
      this._buildDOM();
      this._bindEvents();
      // posição inicial: meio-baixo da tela
      const b = this._bounds();
      this.x = b.minX + (b.maxX - b.minX) * 0.5;
      this.y = b.maxY;
      this._applyTransform(false);
      this._mounted = true;
      this._lastActivity = performance.now();
      if (this.cfg.idleSleep) {
        this._idleTimer = setInterval(() => {
          if (this._asleep || this.state !== 'walking') return;
          if (performance.now() - this._lastActivity >= this.cfg.idleSleepAfter) this._sleep();
        }, 1500);
      }
      if (this.cfg.startWalking && !this._reduced) this._startWalk();
      else this.state = 'walking';
      if (this.cfg.greeting) this.say(this.cfg.greeting, { duration: 4200 });
      return this;
    }

    unmount() {
      if (!this._mounted) return;
      cancelAnimationFrame(this._raf);
      clearInterval(this._idleTimer);
      clearInterval(this._zzzTimer);
      global.removeEventListener('resize', this._onResize);
      global.removeEventListener('pointermove', this._onWinMove);
      for (const [name, fn] of Object.entries(this._evtHandlers)) {
        global.removeEventListener(name, fn);
      }
      this.root && this.root.remove();
      this._mounted = false;
    }

    /* ---------- API pública ---------- */

    say(text, opts = {}) {
      if (!this._mounted || !text) return this;
      this._noteActivity();
      const dur = opts.duration || Math.min(6000, 1800 + text.length * 45);
      this.bubble.textContent = text;
      this.bubble.classList.remove('sp-bubble--notify');
      this.bubble.classList.add('sp-bubble--show');
      clearTimeout(this._bubbleTimer);
      this._bubbleTimer = setTimeout(() => {
        this.bubble.classList.remove('sp-bubble--show');
      }, dur);
      return this;
    }

    summon() {
      if (!this._mounted) return this;
      this._noteActivity();
      if (this.state === 'chatting' || this.state === 'summoning') return this;
      this._stopWalk();
      this.state = 'summoning';
      clearTimeout(this._bubbleTimer);
      this.bubble.classList.remove('sp-bubble--show');
      const dock = this._dockPos();
      this.dir = (dock.x >= this.x) ? 1 : -1;
      this._faceSprite();
      // voo com transição CSS
      this.root.classList.add('sp-flying');
      this.x = dock.x; this.y = dock.y;
      this._applyTransform(true);
      let opened = false;
      const open = () => {
        if (opened) return;
        opened = true;
        this.root.classList.remove('sp-flying');
        this.root.removeEventListener('transitionend', open);
        this._openChat();
      };
      if (this._reduced) { open(); }
      else {
        this.root.addEventListener('transitionend', open);
        setTimeout(open, 950); // fallback caso transitionend não dispare
      }
      return this;
    }

    dismiss() {
      if (!this._mounted) return this;
      this.panel.classList.remove('sp-panel--open');
      this.state = 'walking';
      if (typeof this.cfg.onDismiss === 'function') this.cfg.onDismiss();
      if (!this._reduced) this._startWalk();
      return this;
    }

    /** Força uma pergunta do usuário à LLM (invoca o chat se preciso). */
    ask(text) {
      if (!this._mounted || !text) return this;
      const run = () => this._submit(text);
      // segundo plano imediato: não precisa abrir o chat, ele vai destacar de qualquer jeito
      if (this.cfg.detachWhileThinking && (this.cfg.detachAfter | 0) === 0 && this.state !== 'chatting') {
        run();
        return this;
      }
      if (this.state !== 'chatting') {
        // abre e dispara após o chat montar
        this.summon();
        // espera o painel abrir
        const t = setInterval(() => {
          if (this.state === 'chatting') { clearInterval(t); run(); }
        }, 80);
        setTimeout(() => clearInterval(t), 4000);
      } else {
        run();
      }
      return this;
    }

    setLLMHandler(fn) { this.cfg.llmHandler = fn; return this; }

    /** Limpa a conversa (memória + tela). opts.greeting=false p/ não re-exibir a saudação. */
    clearHistory(opts = {}) {
      this.history = [];
      clearTimeout(this._twTimer);
      if (this.msgsEl) this.msgsEl.innerHTML = '';
      if (opts.greeting !== false && this.cfg.greeting && this.state === 'chatting') {
        this._appendMsg('bot', this.cfg.greeting);
      }
      return this;
    }

    /** Dispara uma reação/emote. tipos: jump, nod, shake, spin, wobble, dizzy, sad,
     *  hearts, confetti (aliases: happy, yes, no, excited, love, celebrate). */
    react(type = 'jump', opts = {}) {
      if (!this._mounted) return this;
      this._noteActivity();
      const alias = { happy: 'jump', yes: 'nod', no: 'shake', excited: 'wobble',
        love: 'hearts', celebrate: 'confetti', party: 'confetti' };
      const key = alias[String(type).toLowerCase()] || String(type).toLowerCase();
      if (['jump', 'wobble', 'spin', 'hearts', 'confetti'].indexOf(key) >= 0) this._expr('happy');
      else if (['shake', 'sad', 'dizzy'].indexOf(key) >= 0) this._expr('worried');
      if (key === 'hearts') { this._emit(opts.symbol || '💗', opts.count || 5); this._emote('jump'); return this; }
      if (key === 'confetti') { this._confetti(opts.count || 16); this._emote('jump'); return this; }
      this._emote(key);
      return this;
    }

    _emote(name) {
      const el = this.emote;
      if (!el) return;
      Array.from(el.classList).forEach((c) => { if (c.indexOf('sp-emote--') === 0) el.classList.remove(c); });
      void el.offsetWidth; // reflow p/ reiniciar a animação se repetida
      const cls = 'sp-emote--' + name;
      el.classList.add(cls);
      clearTimeout(this._emoteTimer);
      const end = () => { el.classList.remove(cls); el.removeEventListener('animationend', end); };
      el.addEventListener('animationend', end);
      this._emoteTimer = setTimeout(end, 1600);
    }

    _emit(symbol, n) {
      if (!this.root) return;
      for (let i = 0; i < n; i++) {
        const s = document.createElement('span');
        s.className = 'sp-particle';
        s.textContent = symbol;
        s.style.left = (22 + Math.random() * 56) + '%';
        s.style.setProperty('--dx', (Math.random() * 40 - 20) + 'px');
        s.style.animationDelay = (Math.random() * 180) + 'ms';
        this.root.appendChild(s);
        setTimeout(() => s.remove(), 1450);
      }
    }

    _confetti(n) {
      if (!this.root) return;
      const colors = ['#7ec8e3', '#f4a9b8', '#34495e', '#ffd36b', '#8fd9a8'];
      for (let i = 0; i < n; i++) {
        const c = document.createElement('span');
        c.className = 'sp-confetti';
        c.style.background = colors[i % colors.length];
        c.style.left = (40 + Math.random() * 20) + '%';
        c.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
        c.style.setProperty('--rot', (Math.random() * 360) + 'deg');
        c.style.animationDelay = (Math.random() * 120) + 'ms';
        this.root.appendChild(c);
        setTimeout(() => c.remove(), 1350);
      }
    }

    /* ---------- olhar, sono e expressão ---------- */

    _onWinMove(e) {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      this._noteActivity();
      this._eyeTrack(e.clientX, e.clientY);
    }

    _eyeTrack(cx, cy) {
      if (!this._pupils || this._asleep || this._reduced || !this.cfg.eyeTracking) return;
      const s = this.cfg.size;
      const px = this.x + s / 2, py = this.y + s / 2;
      let dx = cx - px, dy = cy - py;
      const d = Math.hypot(dx, dy) || 1;
      const max = 1.8; // unidades do viewBox
      dx = (dx / d) * max; dy = (dy / d) * max;
      if (this.dir === -1) dx = -dx; // compensa o flip horizontal
      this._pupils.setAttribute('transform', 'translate(' + dx.toFixed(2) + ' ' + dy.toFixed(2) + ')');
    }

    _noteActivity() {
      this._lastActivity = performance.now();
      if (this._asleep) this._wake();
    }

    _sleep() {
      if (this._touring) return; // sem soneca no meio do tour
      if (this._asleep || this.state !== 'walking') return;
      this._asleep = true;
      this.root.classList.add('sp-asleep');
      this._stopWalk();
      if (this._pupils) this._pupils.setAttribute('transform', 'translate(0 0)');
      if (!this._reduced && this.cfg.sleepSymbol) {
        this._emit(this.cfg.sleepSymbol, 1);
        this._zzzTimer = setInterval(() => {
          if (this._asleep) this._emit(this.cfg.sleepSymbol, 1); else clearInterval(this._zzzTimer);
        }, 2400);
      }
    }

    _wake() {
      if (!this._asleep) return;
      this._asleep = false;
      this.root.classList.remove('sp-asleep');
      clearInterval(this._zzzTimer);
      if (this.state === 'walking' && !this._reduced) this._startWalk();
    }

    /** Define a expressão temporariamente: 'happy' | 'worried' | 'neutral'. */
    _expr(name, dur = 1400) {
      if (!this.root) return;
      this.root.classList.remove('sp-expr-happy', 'sp-expr-worried');
      clearTimeout(this._exprTimer);
      if (name && name !== 'neutral') {
        this.root.classList.add('sp-expr-' + name);
        this._exprTimer = setTimeout(() => this.root.classList.remove('sp-expr-' + name), dur);
      }
    }

    /** Força a soneca (público). */
    sleep() { if (this.state === 'walking') this._sleep(); return this; }
    /** Acorda o pet (público). */
    wake() { this._wake(); return this; }

    /* ---------- modo tour (caminhada dirigida) ---------- */

    /** Entra no modo tour: para o random-walk e desliga chat/drag/soneca. */
    beginTour() {
      if (!this._mounted) return this;
      this._touring = true;
      this._wake();
      this._stopWalk();
      cancelAnimationFrame(this._raf);
      this._escort = null;
      this.state = 'escorting';
      this.panel.classList.remove('sp-panel--open');
      clearTimeout(this._bubbleTimer);
      this.bubble.classList.remove('sp-bubble--show', 'sp-bubble--notify');
      return this;
    }

    /** Sai do modo tour e volta a passear. */
    endTour() {
      if (!this._mounted) return this;
      this._touring = false;
      this._escort = null;
      cancelAnimationFrame(this._raf);
      this.state = 'walking';
      if (!this._reduced) this._startWalk();
      return this;
    }

    /** Teleporte instantâneo (reancoragem durante scroll/resize de um tour). */
    placeAt(x, y) {
      if (!this._mounted) return this;
      const b = this._bounds();
      this.x = Math.min(Math.max(x, b.minX), b.maxX);
      this.y = Math.min(Math.max(y, b.minY), b.maxY);
      this._applyTransform();
      return this;
    }

    /** Caminha até (x, y) e chama onArrive ao chegar. Com reduced-motion, teleporta. */
    walkTo(x, y, { onArrive = null } = {}) {
      if (!this._mounted) return this;
      const b = this._bounds();
      const tx = Math.min(Math.max(x, b.minX), b.maxX);
      const ty = Math.min(Math.max(y, b.minY), b.maxY);
      this._wake();
      this._stopWalk();
      cancelAnimationFrame(this._raf);
      this.state = 'escorting';
      clearTimeout(this._bubbleTimer);
      this.bubble.classList.remove('sp-bubble--show');
      if (this._reduced) {
        this.x = tx; this.y = ty;
        this._applyTransform();
        if (onArrive) onArrive();
        return this;
      }
      this.dir = (tx >= this.x) ? 1 : -1;
      this._faceSprite();
      this._escort = { x: tx, y: ty, onArrive };
      this.root.classList.add('sp-walking');
      this._lastTs = 0;
      this._raf = requestAnimationFrame(this._escortTick);
      return this;
    }

    /** Caminha até a lateral de um elemento da página (side: left|right|top|bottom). */
    walkToElement(el, { side = 'left', gap = 14, onArrive = null } = {}) {
      if (!el || !this._mounted) return this;
      const r = el.getBoundingClientRect();
      const s = this.cfg.size;
      let x, y;
      switch (side) {
        case 'right': x = r.right + gap; y = r.top + r.height / 2 - s / 2; break;
        case 'top': x = r.left + r.width / 2 - s / 2; y = r.top - s - gap; break;
        case 'bottom': x = r.left + r.width / 2 - s / 2; y = r.bottom + gap; break;
        default: x = r.left - s - gap; y = r.top + r.height / 2 - s / 2; break;
      }
      return this.walkTo(x, y, { onArrive });
    }

    _escortTick(ts) {
      if (this.state !== 'escorting' || !this._escort) return;
      if (!this._lastTs) this._lastTs = ts;
      const dt = Math.min(0.05, (ts - this._lastTs) / 1000);
      this._lastTs = ts;

      const t = this._escort;
      const dx = t.x - this.x, dy = t.y - this.y;
      const dist = Math.hypot(dx, dy);
      // No tour o pet anda mais rápido que no passeio para não atrasar o usuário.
      const step = Math.max(this.cfg.walkSpeed * 4, 300) * dt;

      if (dist <= step || dist < 1) {
        this.x = t.x; this.y = t.y;
        this._applyTransform();
        this.root.classList.remove('sp-walking');
        const cb = t.onArrive;
        this._escort = null;
        if (cb) cb();
        return;
      }

      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
      const nd = dx < 0 ? -1 : 1;
      if (nd !== this.dir) { this.dir = nd; this._faceSprite(); }
      this._applyTransform();
      this._raf = requestAnimationFrame(this._escortTick);
    }

    /* ---------- estilos ---------- */

    _injectStyles() {
      if (STYLE_INJECTED) return;
      const css = `
.sp-root{position:fixed;top:0;left:0;width:var(--sp-size);height:var(--sp-size);
  z-index:var(--sp-z);cursor:grab;will-change:transform;touch-action:none;
  outline:none;-webkit-tap-highlight-color:transparent;
  -webkit-user-select:none;user-select:none;
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;}
.sp-root:focus{outline:none;}
.sp-root:focus-visible{outline:2px solid #34495e;outline-offset:3px;border-radius:16px;}
.sp-root.sp-dragging{cursor:grabbing;}
.sp-root.sp-dragging .sp-svg{filter:drop-shadow(0 10px 13px rgba(44,62,80,.3));}
.sp-root.sp-flying{transition:transform .85s cubic-bezier(.34,1.2,.4,1);}
.sp-sprite{width:100%;height:100%;transform-origin:center;transition:transform .2s ease;}
.sp-sprite.sp-flip{transform:scaleX(-1);}
.sp-svg{width:100%;height:100%;display:block;overflow:visible;filter:drop-shadow(0 4px 6px rgba(44,62,80,.18));}
@keyframes sp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.5px)}}
@keyframes sp-bop{0%,100%{transform:translateY(0)}25%{transform:translateY(-3px)}50%{transform:translateY(0)}75%{transform:translateY(-2px)}}
@keyframes sp-blink-open{0%,90%,100%{opacity:1}93%,97%{opacity:0}}
@keyframes sp-blink-closed{0%,90%,100%{opacity:0}93%,97%{opacity:1}}
.sp-body{animation:sp-float 3.2s ease-in-out infinite;transform-origin:center;}
.sp-root.sp-walking .sp-body{animation:sp-bop .55s ease-in-out infinite;}
.sp-eyes-open{animation:sp-blink-open 4.5s ease-in-out infinite;}
.sp-eyes-closed{opacity:0;animation:sp-blink-closed 4.5s ease-in-out infinite;}
.sp-bubble{position:absolute;left:50%;bottom:calc(100% + 8px);transform:translate(-50%,6px) scale(.92);
  background:#fff;color:#2c3e50;border:2px solid #7ec8e3;border-radius:14px;
  padding:8px 12px;font-size:13px;line-height:1.35;max-width:230px;width:max-content;
  box-shadow:0 6px 18px rgba(44,62,80,.18);opacity:0;pointer-events:none;
  transition:opacity .22s ease,transform .22s ease;text-align:center;}
.sp-bubble::after{content:"";position:absolute;left:50%;top:100%;transform:translateX(-50%);
  border:7px solid transparent;border-top-color:#7ec8e3;}
.sp-bubble--show{opacity:1;transform:translate(-50%,0) scale(1);}
.sp-bubble--notify{border-color:#34495e;color:#2c3e50;font-weight:600;
  animation:sp-notify 1.5s ease-in-out infinite;}
.sp-bubble--notify::after{border-top-color:#34495e;}
@keyframes sp-notify{
  0%,100%{transform:translate(-50%,0) scale(1);}
  50%{transform:translate(-50%,-3px) scale(1.05);}
}
/* painel de chat */
.sp-panel{position:fixed;z-index:calc(var(--sp-z) + 1);width:330px;max-width:calc(100vw - 24px);
  height:430px;max-height:calc(100vh - 120px);background:#fff;border-radius:18px;
  border:1px solid #e3eef2;box-shadow:0 18px 50px rgba(44,62,80,.28);
  display:flex;flex-direction:column;overflow:hidden;opacity:0;pointer-events:none;
  transform:translateY(12px) scale(.97);transform-origin:bottom right;
  transition:opacity .25s ease,transform .25s ease;
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;}
.sp-panel--open{opacity:1;pointer-events:auto;transform:translateY(0) scale(1);}
.sp-head{display:flex;align-items:center;gap:10px;padding:12px 14px;
  background:#7ec8e3;color:#fff;}
.sp-head-ava{width:30px;height:30px;border-radius:50%;background:#fff;flex:0 0 auto;
  display:flex;align-items:center;justify-content:center;overflow:visible;}
.sp-head-ava svg{width:26px;height:26px;}
.sp-head-name{font-weight:700;font-size:15px;flex:1;}
.sp-head-x{background:rgba(255,255,255,.25);border:none;color:#fff;width:26px;height:26px;
  border-radius:8px;cursor:pointer;font-size:16px;line-height:1;display:flex;
  align-items:center;justify-content:center;}
.sp-head-x:hover{background:rgba(255,255,255,.4);}
.sp-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;
  background:#f6fbfd;}
.sp-msg{max-width:80%;padding:9px 13px;border-radius:14px;font-size:14px;line-height:1.4;
  white-space:pre-wrap;word-wrap:break-word;}
.sp-msg--bot{align-self:flex-start;background:#fff;color:#2c3e50;border:1px solid #e3eef2;
  border-bottom-left-radius:4px;}
.sp-msg--user{align-self:flex-end;background:#7ec8e3;color:#0f3a4a;
  border-bottom-right-radius:4px;}
.sp-msg--typing{color:#7a93a3;font-style:italic;}
.sp-msg--stream::after{content:"\\258B";margin-left:1px;color:#9bb2bf;
  animation:sp-caret 1s steps(1) infinite;}
@keyframes sp-caret{50%{opacity:0}}
.sp-msg p{margin:0 0 6px;}
.sp-msg p:last-child{margin-bottom:0;}
.sp-msg ul,.sp-msg ol{margin:5px 0;padding-left:20px;}
.sp-msg li{margin:2px 0;}
.sp-msg strong{font-weight:700;}
.sp-msg a{color:#2b8fb3;text-decoration:underline;word-break:break-word;}
.sp-msg--user a{color:#0f3a4a;}
.sp-msg code{background:#eef4f7;border:1px solid #e0eaef;border-radius:5px;padding:1px 5px;
  font-size:.92em;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;}
.sp-msg pre{background:#0f2b38;color:#e6f1f5;border-radius:10px;padding:10px 12px;
  overflow-x:auto;margin:6px 0;}
.sp-msg pre code{background:none;border:none;padding:0;color:inherit;font-size:.86em;
  white-space:pre;}
.sp-form{display:flex;gap:8px;padding:12px;border-top:1px solid #eef4f7;background:#fff;}
.sp-input{flex:1;border:1px solid #cfe3ec;border-radius:12px;padding:10px 12px;font-size:14px;
  outline:none;font-family:inherit;color:#2c3e50;}
.sp-input:focus{border-color:#7ec8e3;box-shadow:0 0 0 3px rgba(126,200,227,.25);}
.sp-send{background:#34495e;color:#fff;border:none;border-radius:12px;padding:0 16px;
  font-size:14px;font-weight:600;cursor:pointer;}
.sp-send:hover{background:#2c3e50;}
.sp-send:disabled{opacity:.5;cursor:default;}
.sp-emote{width:100%;height:100%;transform-origin:50% 82%;}
.sp-mouth--happy,.sp-mouth--worried,.sp-brows{opacity:0;}
.sp-mouth,.sp-brows{transition:opacity .15s ease;}
.sp-root.sp-expr-happy .sp-mouth--neutral{opacity:0;}
.sp-root.sp-expr-happy .sp-mouth--happy{opacity:1;}
.sp-root.sp-expr-worried .sp-mouth--neutral{opacity:0;}
.sp-root.sp-expr-worried .sp-mouth--worried{opacity:1;}
.sp-root.sp-expr-worried .sp-brows{opacity:1;}
.sp-root.sp-asleep .sp-body{animation:none;}
.sp-root.sp-asleep .sp-eyes-open{opacity:0!important;animation:none;}
.sp-root.sp-asleep .sp-eyes-closed{opacity:1!important;animation:none;}
.sp-emote--jump{animation:sp-r-jump .7s ease;}
.sp-emote--land{animation:sp-r-land .36s ease;}
.sp-emote--nod{animation:sp-r-nod .8s ease;}
.sp-emote--shake{animation:sp-r-shake .6s ease;}
.sp-emote--wobble{animation:sp-r-wobble .7s ease;}
.sp-emote--sad{animation:sp-r-sad 1s ease;}
.sp-emote--spin{animation:sp-r-spin .7s ease-in-out;transform-origin:50% 50%;}
.sp-emote--dizzy{animation:sp-r-dizzy 1s ease-in-out;transform-origin:50% 50%;}
@keyframes sp-r-jump{0%{transform:translateY(0)}30%{transform:translateY(-15px) scaleX(.95) scaleY(1.08)}
  55%{transform:translateY(0) scaleX(1.1) scaleY(.9)}72%{transform:translateY(-5px) scale(1)}100%{transform:translateY(0)}}
@keyframes sp-r-land{0%{transform:translateY(-7px)}50%{transform:translateY(0) scaleX(1.12) scaleY(.86)}100%{transform:none}}
@keyframes sp-r-nod{0%,100%{transform:translateY(0)}20%{transform:translateY(5px)}40%{transform:translateY(0)}60%{transform:translateY(5px)}80%{transform:translateY(0)}}
@keyframes sp-r-shake{0%,100%{transform:rotate(0)}15%{transform:rotate(-10deg)}30%{transform:rotate(9deg)}45%{transform:rotate(-7deg)}60%{transform:rotate(5deg)}75%{transform:rotate(-3deg)}}
@keyframes sp-r-wobble{0%,100%{transform:none}15%{transform:translateX(-6px) rotate(-5deg)}30%{transform:translateX(5px) rotate(4deg)}45%{transform:translateX(-4px) rotate(-3deg)}60%{transform:translateX(3px) rotate(2deg)}}
@keyframes sp-r-sad{0%{transform:translateY(0)}40%{transform:translateY(4px) scaleY(.94)}100%{transform:translateY(0)}}
@keyframes sp-r-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes sp-r-dizzy{0%{transform:rotate(0) scale(1)}50%{transform:rotate(360deg) scale(.92)}100%{transform:rotate(720deg) scale(1)}}
.sp-particle{position:absolute;bottom:52%;left:50%;font-size:16px;pointer-events:none;
  will-change:transform,opacity;animation:sp-particle 1.2s ease-out forwards;}
@keyframes sp-particle{0%{opacity:0;transform:translate(-50%,0) scale(.6)}
  20%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--dx,0px)),-48px) scale(1.1)}}
.sp-confetti{position:absolute;top:28%;left:50%;width:7px;height:9px;border-radius:2px;
  pointer-events:none;will-change:transform,opacity;animation:sp-confetti 1.1s ease-out forwards;}
@keyframes sp-confetti{0%{opacity:1;transform:translate(-50%,0) rotate(0)}
  100%{opacity:0;transform:translate(calc(-50% + var(--dx,0px)),50px) rotate(var(--rot,180deg))}}
@media (prefers-reduced-motion: reduce){
  .sp-body,.sp-eyes-open,.sp-eyes-closed,.sp-emote{animation:none!important;}
  .sp-particle,.sp-confetti{display:none!important;}
  .sp-root.sp-flying{transition:transform .3s linear;}
}`;
      const tag = document.createElement('style');
      tag.setAttribute('data-support-pet', '');
      tag.textContent = css;
      document.head.appendChild(tag);
      STYLE_INJECTED = true;
    }

    /* ---------- DOM ---------- */

    _buildDOM() {
      const svg = this.cfg.svg || DEFAULT_SVG;

      const root = document.createElement('div');
      root.className = 'sp-root';
      root.style.setProperty('--sp-size', this.cfg.size + 'px');
      root.style.setProperty('--sp-z', this.cfg.zIndex);
      root.setAttribute('role', 'button');
      root.setAttribute('aria-label', 'Falar com ' + this.cfg.name);
      root.setAttribute('tabindex', '0');

      const sprite = document.createElement('div');
      sprite.className = 'sp-sprite';
      const emote = document.createElement('div');
      emote.className = 'sp-emote';
      emote.innerHTML = svg;
      sprite.appendChild(emote);

      const bubble = document.createElement('div');
      bubble.className = 'sp-bubble';

      root.appendChild(bubble);
      root.appendChild(sprite);
      this.parent.appendChild(root);

      // painel de chat
      const panel = document.createElement('div');
      panel.className = 'sp-panel';
      panel.style.setProperty('--sp-z', this.cfg.zIndex);
      panel.innerHTML = `
        <div class="sp-head">
          <span class="sp-head-ava">${svg}</span>
          <span class="sp-head-name"></span>
          <button class="sp-head-x" aria-label="Fechar">&times;</button>
        </div>
        <div class="sp-msgs" role="log" aria-live="polite"></div>
        <form class="sp-form">
          <input class="sp-input" type="text" autocomplete="off" />
          <button class="sp-send" type="submit"></button>
        </form>`;
      this.parent.appendChild(panel);

      this.root = root;
      this.sprite = sprite;
      this.emote = emote;
      this._pupils = emote.querySelector('.sp-pupils');
      this.bubble = bubble;
      this.panel = panel;
      this.msgsEl = panel.querySelector('.sp-msgs');
      this.formEl = panel.querySelector('.sp-form');
      this.inputEl = panel.querySelector('.sp-input');
      this.sendEl = panel.querySelector('.sp-send');
      panel.querySelector('.sp-head-name').textContent = this.cfg.name;
      this.inputEl.placeholder = this.cfg.placeholder;
      this.sendEl.textContent = this.cfg.sendLabel;
    }

    _bindEvents() {
      this.root.addEventListener('pointerdown', this._onPointerDown);
      this.root.addEventListener('keydown', (e) => {
        if (this._touring) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._noteActivity();
          if (this.state === 'chatting') this.dismiss(); else this.summon();
        }
      });
      global.addEventListener('pointermove', this._onWinMove, { passive: true });
      this.panel.querySelector('.sp-head-x').addEventListener('click', () => this.dismiss());
      this.formEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = this.inputEl.value.trim();
        if (v) { this.inputEl.value = ''; this._submit(v); }
      });
      global.addEventListener('resize', this._onResize);

      // eventos externos (dispatch de qualquer botão do site)
      const E = this.cfg.events;
      const map = {
        [E.say]: (ev) => this.say(ev.detail && ev.detail.text, ev.detail || {}),
        [E.ask]: (ev) => this.ask(ev.detail && ev.detail.text),
        [E.summon]: () => this.summon(),
        [E.dismiss]: () => this.dismiss(),
        [E.clear]: (ev) => this.clearHistory(ev.detail || {}),
        [E.react]: (ev) => this.react((ev.detail && ev.detail.type) || 'jump', ev.detail || {}),
      };
      for (const [name, fn] of Object.entries(map)) {
        this._evtHandlers[name] = fn;
        global.addEventListener(name, fn);
      }
    }

    /* ---------- caminhada ---------- */

    _bounds() {
      const m = this.cfg.edgeMargin, s = this.cfg.size;
      return {
        minX: m, minY: m,
        maxX: Math.max(m, global.innerWidth - s - m),
        maxY: Math.max(m, global.innerHeight - s - m),
      };
    }

    _dockPos() {
      const m = this.cfg.edgeMargin, s = this.cfg.size;
      return { x: global.innerWidth - s - m, y: global.innerHeight - s - m };
    }

    _startWalk() {
      this.state = 'walking';
      this.pauseUntil = 0;
      this.root.classList.add('sp-walking');
      this._pickTarget();
      this._lastTs = 0;
      cancelAnimationFrame(this._raf);
      this._raf = requestAnimationFrame(this._tick);
    }

    _stopWalk() {
      cancelAnimationFrame(this._raf);
      this.root.classList.remove('sp-walking');
    }

    _pickTarget() {
      const b = this._bounds();
      this.target = {
        x: b.minX + Math.random() * (b.maxX - b.minX),
        y: b.minY + Math.random() * (b.maxY - b.minY),
      };
    }

    _tick(ts) {
      if (this.state !== 'walking') return;
      if (!this._lastTs) this._lastTs = ts;
      const dt = Math.min(0.05, (ts - this._lastTs) / 1000);
      this._lastTs = ts;

      const now = performance.now();
      if (now < this.pauseUntil) {
        this.root.classList.remove('sp-walking');
        this._raf = requestAnimationFrame(this._tick);
        return;
      }
      this.root.classList.add('sp-walking');

      const t = this.target;
      const dx = t.x - this.x, dy = t.y - this.y;
      const dist = Math.hypot(dx, dy);
      const step = this.cfg.walkSpeed * dt;

      if (dist <= step || dist < 1) {
        this.x = t.x; this.y = t.y;
        this._applyTransform(false);
        const [a, bb] = this.cfg.pauseRange;
        this.pauseUntil = now + a + Math.random() * (bb - a);
        this._pickTarget();
      } else {
        this.x += (dx / dist) * step;
        this.y += (dy / dist) * step;
        const nd = dx < 0 ? -1 : 1;
        if (nd !== this.dir) { this.dir = nd; this._faceSprite(); }
        this._applyTransform(false);
      }
      this._raf = requestAnimationFrame(this._tick);
    }

    _applyTransform() {
      this.root.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
    }

    _faceSprite() {
      // sprite olha p/ direção do movimento (1 = direita = sem flip)
      this.sprite.classList.toggle('sp-flip', this.dir === -1);
    }

    _onResize() {
      const b = this._bounds();
      this.x = Math.min(Math.max(this.x, b.minX), b.maxX);
      this.y = Math.min(Math.max(this.y, b.minY), b.maxY);
      if (this.state === 'chatting') { const d = this._dockPos(); this.x = d.x; this.y = d.y; }
      this._applyTransform();
      this._positionPanel();
    }

    /* ---------- drag & drop (mouse + touch + caneta) ---------- */

    _onPointerDown(e) {
      this._noteActivity();
      if (this._touring) return; // durante o tour o pet não arrasta nem abre chat
      if (this.state !== 'walking' && this.state !== 'chatting') return; // livre OU chat aberto
      if (e.button != null && e.button !== 0) return; // só botão principal
      const d = this._drag;
      d.active = true; d.moved = false; d.id = e.pointerId;
      d.sx = e.clientX; d.sy = e.clientY;
      d.ox = e.clientX - this.x; d.oy = e.clientY - this.y;
      try { this.root.setPointerCapture(e.pointerId); } catch (_) {}
      this.root.addEventListener('pointermove', this._onPointerMove);
      this.root.addEventListener('pointerup', this._onPointerUp);
      this.root.addEventListener('pointercancel', this._onPointerUp);
    }

    _onPointerMove(e) {
      const d = this._drag;
      if (!d.active || e.pointerId !== d.id) return;
      const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
      if (!d.moved && Math.hypot(dx, dy) < this._dragThresh) return;
      if (this.state === 'chatting') { d.moved = true; return; } // chat aberto: não arrasta, só cancela o tap
      if (!d.moved) {                                 // virou arraste
        d.moved = true;
        this._stopWalk();
        this.root.classList.remove('sp-walking');
        this.root.classList.add('sp-dragging');
        clearTimeout(this._bubbleTimer);
        this.bubble.classList.remove('sp-bubble--show');
      }
      const b = this._bounds();
      this.x = Math.min(Math.max(e.clientX - d.ox, b.minX), b.maxX);
      this.y = Math.min(Math.max(e.clientY - d.oy, b.minY), b.maxY);
      const nd = dx < 0 ? -1 : (dx > 0 ? 1 : this.dir);
      if (nd !== this.dir) { this.dir = nd; this._faceSprite(); }
      this._applyTransform();
    }

    _onPointerUp(e) {
      const d = this._drag;
      if (!d.active || e.pointerId !== d.id) return;
      d.active = false;
      try { this.root.releasePointerCapture(e.pointerId); } catch (_) {}
      this.root.removeEventListener('pointermove', this._onPointerMove);
      this.root.removeEventListener('pointerup', this._onPointerUp);
      this.root.removeEventListener('pointercancel', this._onPointerUp);
      this.root.classList.remove('sp-dragging');
      if (d.moved) {
        // soltou em algum lugar: continua andando a partir daqui
        if (this.cfg.autoReactions) this._emote('land');
        if (this.state === 'walking' && !this._reduced) this._startWalk();
        // re-exibe a notificação/aviso que o arraste escondeu
        if (this._pending) this._notify(this.cfg.answerBubble, { sticky: true, pulse: true });
        else if (this._thinking && this.cfg.thinkingBubble) this._notify(this.cfg.thinkingBubble, { sticky: true });
      } else if (e.type !== 'pointercancel') {
        // toque limpo: alterna o chat (abre se andando, fecha se aberto)
        if (this.state === 'chatting') this.dismiss();
        else this.summon();
      }
    }

    /* ---------- chat ---------- */

    _openChat() {
      this.state = 'chatting';
      this._pending = false;
      clearTimeout(this._bubbleTimer);
      this.bubble.classList.remove('sp-bubble--show', 'sp-bubble--notify');
      this._positionPanel();
      this.panel.classList.add('sp-panel--open');
      if (this.msgsEl.children.length === 0 && this.cfg.greeting) {
        this._appendMsg('bot', this.cfg.greeting);
      }
      this.msgsEl.scrollTop = this.msgsEl.scrollHeight;
      setTimeout(() => this.inputEl.focus(), 60);
      if (typeof this.cfg.onSummon === 'function') this.cfg.onSummon();
    }

    _positionPanel() {
      const s = this.cfg.size, m = this.cfg.edgeMargin;
      // painel acima do pet, alinhado à direita
      this.panel.style.right = m + 'px';
      this.panel.style.bottom = (m + s + 10) + 'px';
      this.panel.style.left = 'auto';
      this.panel.style.top = 'auto';
    }

    _appendMsg(role, text) {
      const el = document.createElement('div');
      el.className = 'sp-msg ' + (role === 'user' ? 'sp-msg--user' : 'sp-msg--bot');
      if (role !== 'user' && this.cfg.markdown) el.innerHTML = this._md(text);
      else el.textContent = text;
      this.msgsEl.appendChild(el);
      this.msgsEl.scrollTop = this.msgsEl.scrollHeight;
      return el;
    }

    async _submit(text) {
      this._noteActivity();
      this._appendMsg('user', text);
      this.history.push({ role: 'user', text });
      if (typeof this.cfg.onUserMessage === 'function') this.cfg.onUserMessage(text);

      const hasStream = typeof this.cfg.llmStreamHandler === 'function';
      const handler = this.cfg.llmHandler;
      if (!hasStream && typeof handler !== 'function') {
        this._appendMsg('bot', '⚙️ Configure um `llmHandler` para eu responder de verdade.');
        return;
      }

      this.sendEl.disabled = true;
      const bubble = this._appendMsg('bot', this.cfg.typingLabel);
      bubble.classList.add('sp-msg--typing');
      const hist = this.history.slice();
      const stream = this.cfg.responseMode === 'stream';
      const render = (s) => {
        if (this.cfg.markdown) bubble.innerHTML = this._md(s);
        else bubble.textContent = s;
      };

      const detach = !!this.cfg.detachWhileThinking;
      const detachAfter = Math.max(0, this.cfg.detachAfter | 0);

      // resolve a resposta COMPLETA, sem render ao vivo (usado no modo segundo plano)
      const fetchFull = async () => {
        if (hasStream) {
          let acc = '';
          const ret = await this.cfg.llmStreamHandler(text, hist, (c) => { if (c != null) acc += String(c); });
          if (!acc && ret != null) acc = String(ret);
          return acc;
        }
        return String((await handler(text, hist)) ?? '');
      };

      try {
        if (detach) {
          // ---- modo "trabalha em segundo plano" ----
          let detached = false;
          const goBg = () => {
            if (detached) return;
            detached = true;
            this._thinking = true;
            if (this.state === 'chatting') this.dismiss();
            if (this.cfg.thinkingBubble) this._notify(this.cfg.thinkingBubble, { sticky: true });
          };
          const replyP = fetchFull();
          if (detachAfter === 0) goBg();
          else {
            const t = setTimeout(goBg, detachAfter);
            replyP.then(() => clearTimeout(t), () => clearTimeout(t));
          }

          const out = (await replyP).trim() || '…';
          this._thinking = false;
          bubble.classList.remove('sp-msg--typing');
          render(out);
          this.history.push({ role: 'assistant', text: out });
          if (typeof this.cfg.onReply === 'function') this.cfg.onReply(out);

          if (this.state !== 'chatting') {
            // não auto-reabre: avisa que a resposta chegou
            this._pending = true;
            this._notify(this.cfg.answerBubble, { sticky: true, pulse: true });
            if (this.cfg.autoReactions) this.react('jump');
          } else {
            this.msgsEl.scrollTop = this.msgsEl.scrollHeight;
            if (this.cfg.autoReactions) this.react('nod');
          }
        } else {
          // ---- comportamento inline (instant / stream / máquina de escrever) ----
          let out = '';
          if (stream && hasStream) {
            bubble.classList.remove('sp-msg--typing');
            bubble.classList.add('sp-msg--stream');
            render('');
            const onToken = (chunk) => {
              if (chunk == null) return;
              out += String(chunk);
              render(out);
              this.msgsEl.scrollTop = this.msgsEl.scrollHeight;
            };
            const ret = await this.cfg.llmStreamHandler(text, hist, onToken);
            if (!out && ret != null) out = String(ret);
            bubble.classList.remove('sp-msg--stream');
            out = out.trim() || '…';
            render(out);
          } else if (stream) {
            const reply = await handler(text, hist);
            out = (reply == null ? '' : String(reply)).trim() || '…';
            bubble.classList.remove('sp-msg--typing');
            bubble.classList.add('sp-msg--stream');
            render('');
            await this._typewriter(bubble, out, this.cfg.streamSpeed);
            bubble.classList.remove('sp-msg--stream');
          } else {
            const reply = await handler(text, hist);
            out = (reply == null ? '' : String(reply)).trim() || '…';
            bubble.classList.remove('sp-msg--typing');
            render(out);
          }
          this.msgsEl.scrollTop = this.msgsEl.scrollHeight;
          this.history.push({ role: 'assistant', text: out });
          if (typeof this.cfg.onReply === 'function') this.cfg.onReply(out);
          if (this.cfg.autoReactions) this.react('nod');
        }
      } catch (err) {
        this._thinking = false;
        bubble.classList.remove('sp-msg--typing', 'sp-msg--stream');
        bubble.textContent = '😕 Não consegui responder agora. Tenta de novo?';
        if (detach && this.state !== 'chatting') {
          this._pending = true;
          this._notify('😕 Algo deu errado. Toque pra ver.', { sticky: true, pulse: true });
        }
        if (this.cfg.autoReactions) this.react('sad');
        console.error('[SupportPet] handler error:', err);
      } finally {
        this.sendEl.disabled = false;
        if (this.state === 'chatting') this.inputEl.focus();
      }
    }

    /** Balão por cima do pet. opts: { sticky, pulse, duration }. Usa texto puro. */
    _notify(text, opts = {}) {
      if (!text) return this;
      clearTimeout(this._bubbleTimer);
      this.bubble.textContent = text;
      this.bubble.classList.toggle('sp-bubble--notify', !!opts.pulse);
      this.bubble.classList.add('sp-bubble--show');
      if (!opts.sticky) {
        const dur = opts.duration || 3000;
        this._bubbleTimer = setTimeout(() => {
          this.bubble.classList.remove('sp-bubble--show', 'sp-bubble--notify');
        }, dur);
      }
      return this;
    }

    /** Revela `text` no elemento aos poucos (efeito streaming client-side). */
    _typewriter(el, text, speed) {
      return new Promise((resolve) => {
        let i = 0;
        const step = Math.max(1, Math.round(text.length / 220)); // textos longos saem mais rápido
        const set = this.cfg.markdown
          ? (s) => { el.innerHTML = this._md(s); }
          : (s) => { el.textContent = s; };
        const tick = () => {
          i = Math.min(text.length, i + step);
          set(text.slice(0, i));
          this.msgsEl.scrollTop = this.msgsEl.scrollHeight;
          if (i < text.length) this._twTimer = setTimeout(tick, speed);
          else resolve();
        };
        tick();
      });
    }

    /** Markdown básico e seguro -> HTML. Escapa tudo antes de formatar. */
    _md(raw) {
      const esc = (s) => s.replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
      ));
      const inline = (s) => s
        .replace(/`([^`]+)`/g, (m, c) => '<code>' + c + '</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*/g, '$1<em>$2</em>')
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
          (m, t, u) => '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + t + '</a>');

      // 1) extrai blocos de código cercados (```), substitui por marcadores
      const blocks = [];
      let text = String(raw == null ? '' : raw).replace(
        /```[\w-]*\n?([\s\S]*?)```/g,
        (m, code) => { blocks.push(esc(code.replace(/\n+$/, ''))); return '\u0000' + (blocks.length - 1) + '\u0000'; }
      );
      // 2) escapa o restante
      text = esc(text);

      // 3) processa por linhas (listas, parágrafos, blocos de código)
      const lines = text.split('\n');
      const out = [];
      let para = [], list = null;
      const flushPara = () => { if (para.length) { out.push('<p>' + para.join('<br>') + '</p>'); para = []; } };
      const closeList = () => { if (list) { out.push('</' + list + '>'); list = null; } };

      for (const ln of lines) {
        const ph = ln.match(/^\u0000(\d+)\u0000$/);
        if (ph) { flushPara(); closeList(); out.push('<pre><code>' + blocks[+ph[1]] + '</code></pre>'); continue; }
        const ul = ln.match(/^\s*[-*]\s+(.*)$/);
        const ol = ln.match(/^\s*\d+\.\s+(.*)$/);
        if (ul) { flushPara(); if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; } out.push('<li>' + inline(ul[1]) + '</li>'); continue; }
        if (ol) { flushPara(); if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; } out.push('<li>' + inline(ol[1]) + '</li>'); continue; }
        if (ln.trim() === '') { flushPara(); closeList(); continue; }
        closeList(); para.push(inline(ln));
      }
      flushPara(); closeList();
      return out.join('');
    }
  }

  // export UMD-ish
  global.SupportPet = SupportPet;
  if (typeof module !== 'undefined' && module.exports) module.exports = SupportPet;

})(typeof window !== 'undefined' ? window : this);

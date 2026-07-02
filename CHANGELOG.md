# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.
O formato segue, de forma simplificada, o [Keep a Changelog](https://keepachangelog.com/pt-BR/).

## [1.1.0] - 2026-07-02

### Adicionado
- **Modo tour no core**: `beginTour()` / `endTour()` (pausa passeio, chat, drag e soneca),
  `walkTo(x, y, { onArrive })`, `walkToElement(el, { side, gap, onArrive })` e `placeAt(x, y)` —
  caminhada dirigida com callback de chegada; com `prefers-reduced-motion`, teleporta.
- **Novo módulo opcional `support-pet-tour.js`** (`SupportPetTour`): tour guiado completo —
  o pet caminha até cada elemento, card ancorado com título/descrição/progresso/botões,
  spotlight escurecendo o resto, teclado (Esc/←/→), clique-fora fecha, passos com alvo
  ausente são pulados, bottom-sheet no mobile, reancoragem em scroll/resize, `onNext`
  por passo para fluxos que abrem drawers/menus, `onFinish`/`onClose`, CSS injetado em
  runtime com dark mode via `prefers-color-scheme`.
- Exemplo `examples/tour.html` demonstrando o tour (scroll automático, `onNext`, reinício).
- Testes (Vitest + jsdom) para o core e o tour, e CI no GitHub Actions (test + build).

### Alterado
- `examples/demo.html` agora carrega `../src/support-pet.js` em vez de uma cópia inline da lib.
- Build gera dois artefatos: `dist/support-pet.min.js` e `dist/support-pet-tour.min.js`.
- README (EN/PT): seção "Tour guiado", API do modo tour e tamanhos reais do bundle
  (core ~37 KB min / ~11 KB gzip; tour ~12 KB min / ~4 KB gzip).

### Corrigido
- Metadados do `package.json` (autor, repositório, homepage) que estavam com placeholders;
  adicionado o campo `exports` (`support-pet` e `support-pet/tour`).

## [1.0.0] - 2026-06-27

### Adicionado
- Pet flutuante que anda sozinho pela tela (loop com `requestAnimationFrame`).
- Chat acoplável: clique invoca o pet ao canto e abre o painel; clicar de novo fecha.
- Integração com LLM via `llmHandler` (texto pronto) ou `llmStreamHandler` (streaming real).
- Modos de resposta `instant` e `stream` (streaming real ou efeito máquina de escrever).
- Renderização de **Markdown** seguro nas respostas (escapa HTML, bloqueia `javascript:`).
- Drag & drop com Pointer Events (mouse, toque e caneta).
- Modo "segundo plano" (`detachWhileThinking`) com limiar `detachAfter`: o pet processa
  andando e avisa por balão quando a resposta chega, sem reabrir sozinho.
- Reações/emotes: `jump`, `nod`, `shake`, `spin`, `wobble`, `dizzy`, `sad`, `hearts`,
  `confetti` (com aliases) e reações automáticas.
- Vida própria: olhos seguem o cursor, soneca com 💤 ao ficar ocioso, e expressões
  de rosto (feliz/preocupada) por estado.
- Limpeza de histórico (`clearHistory` / evento `petbot:clear`).
- API de eventos globais: `petbot:say`, `petbot:ask`, `petbot:summon`, `petbot:dismiss`,
  `petbot:clear`, `petbot:react`.
- Respeito a `prefers-reduced-motion`.

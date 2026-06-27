# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.
O formato segue, de forma simplificada, o [Keep a Changelog](https://keepachangelog.com/pt-BR/).

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

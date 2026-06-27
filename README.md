<div align="center">

# 🩺 SupportPet

**Um pet de suporte flutuante para o seu site.**
Ele anda pela tela, abre um chat com sua LLM, reage, dorme e segue o cursor.

Vanilla JS · zero dependências · ~12 KB minificado

</div>

---

## ✨ O que ele faz

- **Anda sozinho** pela tela e vira para o lado em que se move.
- **Vira chat com um clique**: voa até o canto e abre o painel; clicar de novo fecha.
- **Conversa com sua LLM** através de um handler que você pluga (texto pronto ou streaming real).
- **Renderiza Markdown** seguro nas respostas (negrito, listas, código, links).
- **Arrasta e solta**: posicione o pet onde quiser (mouse, toque ou caneta).
- **Modo "segundo plano"**: ao demorar, ele volta a andar e te avisa por balão quando a resposta fica pronta — sem reabrir sozinho.
- **Reações e emotes**: pulo, giro, "sim/não", corações, confete e mais.
- **Vida própria**: os olhos seguem o cursor, ele cochila quando ocioso (💤) e muda de expressão (feliz/preocupada).
- **Acessível**: navegável por teclado e respeita `prefers-reduced-motion`.

---

## 🚀 Começando

### 1. Inclua a biblioteca

```html
<script src="src/support-pet.js"></script>
<!-- ou a versão minificada -->
<script src="dist/support-pet.min.js"></script>
```

### 2. Inicialize

```html
<script>
  const pet = new SupportPet({
    name: 'Doc',
    greeting: 'Oi! Posso ajudar? 🩺',
    llmHandler: async (text, history) => {
      // chame SEU backend aqui (veja a seção de segurança)
      const res = await fetch('/api/suporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history })
      });
      return (await res.json()).reply;
    }
  });
  pet.mount();
</script>
```

Pronto. Abra `examples/demo.html` para ver tudo funcionando (com LLM simulado), ou `examples/basic.html` para o mínimo.

---

## ⚙️ Opções

Todas as opções são passadas no construtor: `new SupportPet({ ... })`.

| Opção | Padrão | Descrição |
|---|---|---|
| `name` | `'Doc'` | Nome exibido no chat. |
| `svg` | `null` | SVG customizado do personagem (string). `null` usa o embutido. |
| `size` | `72` | Lado do pet, em px. |
| `walkSpeed` | `55` | Velocidade da caminhada (px/s). |
| `edgeMargin` | `18` | Distância mínima das bordas. |
| `pauseRange` | `[800, 2600]` | Faixa (ms) de pausa entre caminhadas. |
| `corner` | `'bottom-right'` | Canto onde acopla o chat. |
| `greeting` | `'Oi! Sou o Doc…'` | Mensagem inicial. |
| `placeholder` | `'Escreva sua dúvida...'` | Placeholder do input. |
| `markdown` | `true` | Renderiza Markdown nas respostas do bot. |
| `responseMode` | `'instant'` | `'instant'` (texto de uma vez) ou `'stream'`. |
| `streamSpeed` | `18` | Velocidade (ms/passo) do efeito máquina de escrever. |
| `llmHandler` | `null` | `async (text, history) => string`. |
| `llmStreamHandler` | `null` | `async (text, history, onToken) => void` (streaming real). |
| `detachWhileThinking` | `false` | Trabalha em segundo plano enquanto pensa. |
| `detachAfter` | `0` | ms até destacar (`0` = sempre; `>0` = só se demorar). |
| `thinkingBubble` | `'Já tô analisando… 🔍'` | Balão durante o processamento. |
| `answerBubble` | `'Tenho sua resposta!…'` | Balão de aviso quando a resposta chega. |
| `autoReactions` | `true` | Reações automáticas (responder, soltar arraste…). |
| `eyeTracking` | `true` | Pupilas seguem o cursor (mouse/caneta). |
| `idleSleep` | `true` | Cochila quando ocioso. |
| `idleSleepAfter` | `15000` | ms parado sem interação até dormir. |
| `sleepSymbol` | `'💤'` | Símbolo emitido durante o sono. |
| `startWalking` | `true` | Começa andando ao montar. |
| `respectReducedMotion` | `true` | Reduz animações se o usuário pediu. |
| `zIndex` | `2147483000` | z-index do widget. |
| `events` | *(ver abaixo)* | Nomes dos eventos globais. |
| `onSummon` / `onDismiss` | `null` | Callbacks de abrir/fechar o chat. |
| `onUserMessage` / `onReply` | `null` | Callbacks de mensagem do usuário / resposta. |

---

## 🧩 API

```js
pet.mount(parent?)          // injeta no DOM e começa a andar
pet.unmount()               // remove tudo
pet.summon()                // voa ao canto e abre o chat
pet.dismiss()               // fecha o chat e volta a andar
pet.say(text, { duration }) // balão de fala (sem LLM)
pet.ask(text)               // injeta uma pergunta do usuário e processa na LLM
pet.react(type, opts)       // dispara uma reação/emote (ver abaixo)
pet.sleep() / pet.wake()    // controla a soneca manualmente
pet.clearHistory({ greeting }) // limpa a conversa (memória + tela)
pet.setLLMHandler(fn)       // troca o handler em runtime
```

### Reações disponíveis

`jump` · `nod` · `shake` · `spin` · `wobble` · `dizzy` · `sad` · `hearts` · `confetti`
Aliases: `happy` → jump, `yes` → nod, `no` → shake, `excited` → wobble, `love` → hearts, `celebrate` → confetti.

```js
pet.react('hearts', { count: 6 });
pet.react('confetti');
```

---

## 📡 Eventos globais

Acione o pet de qualquer lugar do site, sem referência direta ao objeto:

```js
window.dispatchEvent(new CustomEvent('petbot:say',     { detail: { text: 'Promoção!' } }));
window.dispatchEvent(new CustomEvent('petbot:ask',     { detail: { text: 'Qual o preço?' } }));
window.dispatchEvent(new CustomEvent('petbot:react',   { detail: { type: 'confetti' } }));
window.dispatchEvent(new CustomEvent('petbot:summon'));
window.dispatchEvent(new CustomEvent('petbot:dismiss'));
window.dispatchEvent(new CustomEvent('petbot:clear'));
```

Os nomes são configuráveis via `opts.events`.

---

## 🌊 Streaming real

```js
const pet = new SupportPet({
  responseMode: 'stream',
  llmStreamHandler: async (text, history, onToken) => {
    const res = await fetch('/api/suporte/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history })
    });
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      onToken(dec.decode(value, { stream: true })); // ajuste ao formato do seu stream
    }
  }
});
```

Sem `llmStreamHandler`, o modo `stream` faz um efeito máquina de escrever sobre o texto retornado pelo `llmHandler`.

---

## 🔒 Segurança

- **Nunca coloque a API key da LLM no front-end.** O `llmHandler` deve chamar **seu backend**, que conversa com a LLM e devolve apenas o texto. Caso contrário, a chave fica exposta no navegador.
- O Markdown é **escapado antes** de formatar: HTML vindo da LLM ou do usuário não é injetado, e links só viram `<a>` se forem `http(s):` ou `mailto:` (bloqueia `javascript:`).

---

## 🌐 Compatibilidade

Navegadores modernos com suporte a Pointer Events e CSS custom properties (Chrome, Firefox, Safari, Edge). Funciona em desktop e mobile.

---

## 📄 Licença

[MIT](LICENSE) — use à vontade. Lembre-se de preencher seu nome na licença e no `package.json`.

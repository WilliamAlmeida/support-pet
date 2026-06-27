<div align="center">

# 🩺 SupportPet

**A floating support pet for your website.**
It walks around the screen, opens a chat powered by your LLM, reacts, sleeps, and follows the cursor.

Vanilla JS · zero dependencies · ~12 KB minified

**English** · [Português](README.pt-br.md)

</div>

---

## ✨ Features

- **Walks on its own** across the screen and faces the direction it moves.
- **Becomes a chat on click**: flies to the corner and opens the panel; click again to close.
- **Talks to your LLM** through a handler you plug in (full text or real streaming).
- **Renders safe Markdown** in replies (bold, lists, code, links).
- **Drag & drop**: place the pet anywhere (mouse, touch, or pen).
- **Background mode**: when a reply takes a while, the pet goes back to walking and notifies you with a bubble once the answer is ready — without reopening on its own.
- **Reactions and emotes**: jump, spin, yes/no, hearts, confetti, and more.
- **A life of its own**: the eyes follow the cursor, it naps when idle (💤), and changes expression (happy/worried).
- **Accessible**: keyboard-navigable and respects `prefers-reduced-motion`.

---

## 🚀 Getting started

### 1. Include the library

```html
<script src="src/support-pet.js"></script>
<!-- or the minified build -->
<script src="dist/support-pet.min.js"></script>
```

### 2. Initialize

```html
<script>
  const pet = new SupportPet({
    name: 'Doc',
    greeting: 'Hi! How can I help? 🩺',
    llmHandler: async (text, history) => {
      // call YOUR backend here (see the security section)
      const res = await fetch('/api/support', {
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

That's it. Open `examples/demo.html` to see everything in action (with a mocked LLM), or `examples/basic.html` for the bare minimum.

---

## ⚙️ Options

All options are passed to the constructor: `new SupportPet({ ... })`.

| Option | Default | Description |
|---|---|---|
| `name` | `'Doc'` | Name shown in the chat. |
| `svg` | `null` | Custom character SVG (string). `null` uses the built-in one. |
| `size` | `72` | Pet side length, in px. |
| `walkSpeed` | `55` | Walking speed (px/s). |
| `edgeMargin` | `18` | Minimum distance from the edges. |
| `pauseRange` | `[800, 2600]` | Pause range (ms) between walks. |
| `corner` | `'bottom-right'` | Corner where the chat docks. |
| `greeting` | `'Hi! …'` | Initial message. |
| `placeholder` | `'Type your question...'` | Input placeholder. |
| `markdown` | `true` | Render Markdown in bot replies. |
| `responseMode` | `'instant'` | `'instant'` (all at once) or `'stream'`. |
| `streamSpeed` | `18` | Typewriter speed (ms/step). |
| `llmHandler` | `null` | `async (text, history) => string`. |
| `llmStreamHandler` | `null` | `async (text, history, onToken) => void` (real streaming). |
| `detachWhileThinking` | `false` | Work in the background while thinking. |
| `detachAfter` | `0` | ms before detaching (`0` = always; `>0` = only if slow). |
| `thinkingBubble` | `'…'` | Bubble shown while processing. |
| `answerBubble` | `'…'` | Bubble shown when the answer is ready. |
| `autoReactions` | `true` | Automatic reactions (reply, drop after drag…). |
| `eyeTracking` | `true` | Pupils follow the cursor (mouse/pen). |
| `idleSleep` | `true` | Naps when idle. |
| `idleSleepAfter` | `15000` | ms idle without interaction before sleeping. |
| `sleepSymbol` | `'💤'` | Symbol emitted while sleeping. |
| `startWalking` | `true` | Start walking on mount. |
| `respectReducedMotion` | `true` | Reduce animation if the user asked for it. |
| `zIndex` | `2147483000` | Widget z-index. |
| `events` | *(see below)* | Global event names. |
| `onSummon` / `onDismiss` | `null` | Open/close chat callbacks. |
| `onUserMessage` / `onReply` | `null` | User message / reply callbacks. |

---

## 🧩 API

```js
pet.mount(parent?)          // inject into the DOM and start walking
pet.unmount()               // remove everything
pet.summon()                // fly to the corner and open the chat
pet.dismiss()               // close the chat and resume walking
pet.say(text, { duration }) // speech bubble (no LLM)
pet.ask(text)               // inject a user question and process it through the LLM
pet.react(type, opts)       // trigger a reaction/emote (see below)
pet.sleep() / pet.wake()    // control the nap manually
pet.clearHistory({ greeting }) // clear the conversation (memory + screen)
pet.setLLMHandler(fn)       // swap the handler at runtime
```

### Available reactions

`jump` · `nod` · `shake` · `spin` · `wobble` · `dizzy` · `sad` · `hearts` · `confetti`
Aliases: `happy` → jump, `yes` → nod, `no` → shake, `excited` → wobble, `love` → hearts, `celebrate` → confetti.

```js
pet.react('hearts', { count: 6 });
pet.react('confetti');
```

---

## 📡 Global events

Trigger the pet from anywhere on your site, without a direct reference to the object:

```js
window.dispatchEvent(new CustomEvent('petbot:say',     { detail: { text: 'On sale!' } }));
window.dispatchEvent(new CustomEvent('petbot:ask',     { detail: { text: 'How much is it?' } }));
window.dispatchEvent(new CustomEvent('petbot:react',   { detail: { type: 'confetti' } }));
window.dispatchEvent(new CustomEvent('petbot:summon'));
window.dispatchEvent(new CustomEvent('petbot:dismiss'));
window.dispatchEvent(new CustomEvent('petbot:clear'));
```

Event names are configurable via `opts.events`.

---

## 🌊 Real streaming

```js
const pet = new SupportPet({
  responseMode: 'stream',
  llmStreamHandler: async (text, history, onToken) => {
    const res = await fetch('/api/support/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history })
    });
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      onToken(dec.decode(value, { stream: true })); // adapt to your stream format
    }
  }
});
```

Without `llmStreamHandler`, the `stream` mode applies a typewriter effect to the text returned by `llmHandler`.

---

## 🔒 Security

- **Never put your LLM API key in the front-end.** The `llmHandler` should call **your backend**, which talks to the LLM and returns only the text. Otherwise the key is exposed in the browser.
- Markdown is **escaped before** formatting: HTML coming from the LLM or the user is not injected, and links only become `<a>` if they are `http(s):` or `mailto:` (it blocks `javascript:`).

---

## 🌐 Browser support

Modern browsers with Pointer Events and CSS custom properties (Chrome, Firefox, Safari, Edge). Works on desktop and mobile.

---

## 📄 License

[MIT](LICENSE) — use it freely. Remember to fill in your name in the license and in `package.json`.

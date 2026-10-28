(() => {
  if (document.getElementById("ai-chat-widget")) return;

  // ---- Styles ----
  const style = document.createElement("style");
  style.textContent = `
#ai-chat-toggle {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg,#00d4ff,#7c4dff);
  color: white;
  font-size: 20px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  z-index: 999998;
  box-shadow: 0 10px 30px rgba(0,212,255,0.5);
  transition: all 0.3s;
  user-select: none;
}
#ai-chat-toggle:active { cursor: grabbing; }

#ai-chat-widget {
  position: fixed;
  bottom: 100px;
  right: 24px;
  width: 360px;
  height: 480px;
  background: #0f0f1a;
  color: #e0e0ff;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.7);
  display: none;
  flex-direction: column;
  font-family: system-ui,-apple-system,sans-serif;
  z-index: 999999;
  overflow: hidden;
  border: 1px solid #333366;
}

#ai-chat-header {
  padding: 14px 18px;
  background: linear-gradient(to right,#1a1a3a,#2a1a4a);
  font-size: 16px;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
}

#ai-chat-title { cursor: pointer; flex: 1; text-align: center; }

#ai-chat-close, #clear-btn {
  cursor: pointer;
  font-size: 18px;
  color: #aaa;
  opacity: 0.8;
  margin: 0 6px;
}
#ai-chat-close:hover, #clear-btn:hover {
  opacity: 1;
  color: #fff;
}

#ai-chat-messages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background: #0a0a14;
  font-size: 14px;
  display: flex;
  flex-direction: column;
}

.ai-msg {
  margin: 10px 0;
  padding: 10px 14px;
  border-radius: 14px;
  max-width: 85%;
  opacity: 0;
  transform: translateY(10px);
  transition: 0.3s;
  white-space: pre-wrap;
}
.ai-msg.visible { opacity: 1; transform: none; }

.user { background: #004080; align-self: flex-end; }
.bot { background: #1e1e38; align-self: flex-start; }

#ai-chat-input {
  display: flex;
  border-top: 1px solid #222;
  padding: 12px;
  background: #111;
}

.input-field {
  flex: 1;
  padding: 12px;
  background: #1a1a2e;
  border: none;
  border-radius: 12px;
  color: #eee;
}

.send-btn {
  padding: 12px 18px;
  background: linear-gradient(90deg,#00d4ff,#7c4dff);
  border: none;
  border-radius: 12px;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

#ai-thinking {
  display: none;
  text-align: center;
  padding: 6px;
  color: #888;
  font-style: italic;
}
`;
  document.head.appendChild(style);

  window.MathJax = window.MathJax || {
    tex: {
      inlineMath: [["\\(", "\\)"]],
      displayMath: [["\\[", "\\]"]]
    }
  };
  const mathScript = document.createElement("script");
  mathScript.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js";
  mathScript.async = true;
  const mathReady = new Promise(resolve => {
    mathScript.onload = resolve;
    mathScript.onerror = resolve;
    document.head.appendChild(mathScript);
  });

  // ---- Load Puter API ----
  const script = document.createElement("script");
  script.src = "https://js.puter.com/v2/";
  script.onload = initChat;
  document.head.appendChild(script);

  function initChat() {
    if (typeof puter === "undefined") return;

    let currentModel = "gpt-5";

    // ---- Toggle button ----
    const toggle = document.createElement("div");
    toggle.id = "ai-chat-toggle";
    toggle.textContent = "AI";
    document.body.appendChild(toggle);

    // ---- Chat UI ----
    const widget = document.createElement("div");
    widget.id = "ai-chat-widget";
    widget.innerHTML = `
      <div id="ai-chat-header">
        <span id="clear-btn">🗑</span>
        <span id="ai-chat-title">AI Assistant</span>
        <span id="ai-chat-close">×</span>
      </div>
      <div id="ai-chat-messages"></div>
      <div id="ai-thinking">AI is thinking…</div>
      <div id="ai-chat-input">
        <input class="input-field" placeholder="Ask anything…" />
        <button class="send-btn">Send</button>
      </div>
    `;
    document.body.appendChild(widget);

    const msgs = widget.querySelector("#ai-chat-messages");
    const input = widget.querySelector(".input-field");
    const btn = widget.querySelector(".send-btn");
    const thinking = widget.querySelector("#ai-thinking");

    function format(text) {
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
        .replace(/\n/g, "<br>");
    }

    function add(text, cls, label = "") {
      const d = document.createElement("div");
      d.className = "ai-msg " + cls;
      d.innerHTML = (label ? `<strong>${label}</strong> ` : "") + format(text);
      msgs.appendChild(d);
      setTimeout(() => d.classList.add("visible"), 10);
      msgs.scrollTop = msgs.scrollHeight;
      mathReady.then(() => window.MathJax?.typesetPromise?.([d]).catch(() => {}));
    }

    async function ask(q) {
      try {
        return await puter.ai.chat(q, { model: currentModel });
      } catch (e) {
        return "Error: " + (e.message || "Unknown");
      }
    }

    async function send() {
      const t = input.value.trim();
      if (!t) return;

      input.value = "";
      add(t, "user", "You:");

      const modelCommand = t.match(/^\/model(?:\s+([\s\S]*))?$/i);
      if (modelCommand) {
        const requestedModel = (modelCommand[1] || "").trim();
        if (requestedModel) {
          currentModel = requestedModel;
          add(`Model changed to **${currentModel}**.`, "bot");
        } else {
          add(`Current model: **${currentModel}**. Use **/model model-name** to change it.`, "bot");
        }
        return;
      }

      btn.disabled = true;
      thinking.style.display = "block";

      const r = await ask(t);

      thinking.style.display = "none";
      add(r, "bot", "AI:");

      btn.disabled = false;
    }

    btn.onclick = send;
    input.onkeydown = e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    };

    // ---- Toggle logic ----
    toggle.onclick = () => {
      widget.style.display = "flex";
      toggle.style.display = "none";
    };

    widget.querySelector("#ai-chat-close").onclick = () => {
      widget.style.display = "none";
      toggle.style.display = "flex";
    };

    widget.querySelector("#clear-btn").onclick = () => {
      msgs.innerHTML = "";
    };

    add(`Using model: **${currentModel}**`, "bot");
  }
})();
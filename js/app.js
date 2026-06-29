// app.js — VisionAI frontend logic

const dropZone = document.getElementById("drop-zone");
const previewImg = document.getElementById("preview-img");
const fileInput = document.getElementById("file-input");
const chatMessages = document.getElementById("chat-messages");
const emptyChat = document.getElementById("empty-chat");
const textarea = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const statImages = document.getElementById("stat-images");
const statQueries = document.getElementById("stat-queries");

let currentImageBase64 = null;
let currentImageMime = null;
let conversationHistory = [];
let isLoading = false;
let imagesAnalyzed = 0;
let queriesRun = 0;

// ─── Image Loading ─────────────────────────────────────────────────────────

function loadImageFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const mimeMap = { "image/jpeg": "image/jpeg", "image/jpg": "image/jpeg", "image/png": "image/png", "image/gif": "image/gif", "image/webp": "image/webp" };
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    currentImageBase64 = dataUrl.split(",")[1];
    currentImageMime = mimeMap[file.type] || "image/jpeg";
    previewImg.src = dataUrl;
    dropZone.classList.add("has-image");
    conversationHistory = [];
    imagesAnalyzed++;
    statImages.textContent = imagesAnalyzed;
    clearMessages();
    addSystemMessage(`Image loaded: ${file.name}. Ask me anything about it!`);
    updateSendBtn();
  };
  reader.readAsDataURL(file);
}

// ─── Drop Zone ─────────────────────────────────────────────────────────────

dropZone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => loadImageFile(e.target.files[0]));

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  loadImageFile(e.dataTransfer.files[0]);
});

// Global drag-and-drop
document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("drop", (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file?.type.startsWith("image/")) loadImageFile(file);
});

// ─── Quick Actions ──────────────────────────────────────────────────────────

document.querySelectorAll(".quick-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const prompt = btn.dataset.prompt;
    if (prompt && !isLoading) {
      textarea.value = prompt;
      sendMessage();
    }
  });
});

// ─── Chat ───────────────────────────────────────────────────────────────────

function clearMessages() {
  chatMessages.innerHTML = "";
  emptyChat.style.display = "none";
}

function addSystemMessage(text) {
  clearMessages();
  const el = document.createElement("div");
  el.className = "msg assistant";
  el.innerHTML = `
    <div class="msg-av">
      <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
    </div>
    <div class="bubble"><span>${text}</span></div>
  `;
  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addMessage(role, text) {
  if (emptyChat) emptyChat.style.display = "none";
  const el = document.createElement("div");
  el.className = `msg ${role}`;

  const isUser = role === "user";
  const iconSvg = isUser
    ? `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`
    : `<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`;

  el.innerHTML = `
    <div class="msg-av">${iconSvg}</div>
    <div class="bubble"><span style="white-space:pre-wrap">${escapeHtml(text)}</span></div>
  `;
  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return el;
}

function addTyping() {
  if (emptyChat) emptyChat.style.display = "none";
  const el = document.createElement("div");
  el.className = "msg assistant";
  el.id = "typing-msg";
  el.innerHTML = `
    <div class="msg-av">
      <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
    </div>
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return el;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function updateSendBtn() {
  sendBtn.disabled = isLoading || !textarea.value.trim() || !currentImageBase64;
  document.querySelectorAll(".quick-btn").forEach((b) => (b.disabled = isLoading || !currentImageBase64));
}

textarea.addEventListener("input", () => {
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 100) + "px";
  updateSendBtn();
});

textarea.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);

async function sendMessage() {
  const text = textarea.value.trim();
  if (!text || !currentImageBase64 || isLoading) return;

  textarea.value = "";
  textarea.style.height = "auto";
  isLoading = true;
  updateSendBtn();

  addMessage("user", text);

  const userContent = [
    { type: "image", source: { type: "base64", media_type: currentImageMime, data: currentImageBase64 } },
    { type: "text", text },
  ];

  // Only include image on first message of a conversation
  const historyEntry = conversationHistory.length === 0
    ? { role: "user", content: userContent }
    : { role: "user", content: [{ type: "text", text }] };

  conversationHistory.push(historyEntry);

  const typingEl = addTyping();

  try {
    // Rebuild messages with image only on first turn
    const messages = conversationHistory.map((m, i) => {
      if (i === 0 && currentImageBase64) return m;
      return { role: m.role, content: typeof m.content === "string" ? m.content : m.content.filter(b => b.type === "text").map(b => b.text).join("") };
    });

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: "You are VisionAI, an expert image analysis assistant. Analyze images thoroughly and answer questions about their content with clarity and detail. Be concise but comprehensive. Format long lists with line breaks. Never refuse to describe what you see.",
        messages,
      }),
    });

    const data = await response.json();
    typingEl.remove();

    if (data.error) {
      addMessage("assistant", `Error: ${data.error}`);
    } else {
      const reply = data.content?.map((b) => b.text || "").join("\n").trim() || "I couldn't analyze that image.";
      addMessage("assistant", reply);
      conversationHistory.push({ role: "assistant", content: [{ type: "text", text: reply }] });
      queriesRun++;
      statQueries.textContent = queriesRun;
    }
  } catch (err) {
    typingEl.remove();
    addMessage("assistant", "Connection error. Make sure the server is running.");
  }

  isLoading = false;
  updateSendBtn();
}

// Init
updateSendBtn();

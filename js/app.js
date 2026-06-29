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

// ─── Demo Dataset ────────────────────────────────────────────────────────────
const DEMO_SAMPLES = [
  {
    label: "Street Scene",
    emoji: "🏙️",
    url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80",
    prompt: "Describe what you see in this city scene. What objects, people, and activities are visible?"
  },
  {
    label: "Nature",
    emoji: "🌿",
    url: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80",
    prompt: "Analyze this nature scene. What plants, animals, or natural elements can you identify?"
  },
  {
    label: "Food",
    emoji: "🍜",
    url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80",
    prompt: "What food is this? Describe it in detail including ingredients you can spot."
  },
  {
    label: "Dashboard/UI",
    emoji: "📊",
    url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
    prompt: "Analyze this data visualization. What trends or insights can you extract?"
  },
  {
    label: "Architecture",
    emoji: "🏛️",
    url: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800&q=80",
    prompt: "Describe this building's architectural style, features, and estimated era."
  },
  {
    label: "Animal",
    emoji: "🐾",
    url: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=800&q=80",
    prompt: "Identify this animal and describe its features, breed if applicable, and behavior."
  }
];

function loadDemoSample(sample) {
  clearMessages();
  conversationHistory = [];
  addThinkingMsg("Loading demo image...");

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    currentImageBase64 = dataUrl.split(",")[1];
    currentImageMime = "image/jpeg";
    previewImg.src = dataUrl;
    dropZone.classList.add("has-image");
    imagesAnalyzed++;
    statImages.textContent = imagesAnalyzed;
    document.getElementById("chat-input").disabled = false;

    clearMessages();
    addSystemMessage(`Demo loaded: <strong>${sample.label}</strong> — asking AI now...`);
    updateSendBtn();

    // Auto-ask the demo prompt
    setTimeout(() => {
      textarea.value = sample.prompt;
      sendMessage();
    }, 500);
  };
  img.onerror = () => {
    clearMessages();
    addSystemMessage("Could not load demo image. Please upload your own image instead.");
  };
  img.src = sample.url;
}

// ─── Image Loading ────────────────────────────────────────────────────────────
function getMediaType(file) {
  const map = { "image/jpeg": "image/jpeg", "image/jpg": "image/jpeg", "image/png": "image/png", "image/gif": "image/gif", "image/webp": "image/webp" };
  return map[file.type] || "image/jpeg";
}

function loadImageFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    currentImageBase64 = dataUrl.split(",")[1];
    currentImageMime = getMediaType(file);
    previewImg.src = dataUrl;
    dropZone.classList.add("has-image");
    conversationHistory = [];
    imagesAnalyzed++;
    statImages.textContent = imagesAnalyzed;
    clearMessages();
    addSystemMessage(`Image loaded: <strong>${file.name}</strong>. Ask me anything about it!`);
    document.getElementById("chat-input").disabled = false;
    updateSendBtn();
  };
  reader.readAsDataURL(file);
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────
dropZone.addEventListener("click", () => { if (!dropZone.classList.contains("has-image")) fileInput.click(); });
fileInput.addEventListener("change", (e) => loadImageFile(e.target.files[0]));
dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("dragover"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", (e) => { e.preventDefault(); dropZone.classList.remove("dragover"); loadImageFile(e.dataTransfer.files[0]); });
document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("drop", (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) loadImageFile(f); });

// ─── Quick Actions ─────────────────────────────────────────────────────────────
document.querySelectorAll(".quick-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const prompt = btn.dataset.prompt;
    if (prompt && !isLoading) { textarea.value = prompt; sendMessage(); }
  });
});

// ─── Demo buttons ──────────────────────────────────────────────────────────────
document.querySelectorAll(".demo-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const idx = parseInt(btn.dataset.index);
    loadDemoSample(DEMO_SAMPLES[idx]);
  });
});

// ─── Chat ──────────────────────────────────────────────────────────────────────
function clearMessages() {
  chatMessages.innerHTML = "";
  if (emptyChat) emptyChat.style.display = "none";
}

function addThinkingMsg(text) {
  clearMessages();
  const el = document.createElement("div");
  el.className = "msg assistant";
  el.innerHTML = `<div class="msg-av"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
    <div class="bubble" style="color:var(--text-muted);font-style:italic">${text}</div>`;
  chatMessages.appendChild(el);
}

function addSystemMessage(html) {
  clearMessages();
  const el = document.createElement("div");
  el.className = "msg assistant";
  el.innerHTML = `<div class="msg-av"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
    <div class="bubble"><span>${html}</span></div>`;
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
  el.innerHTML = `<div class="msg-av">${iconSvg}</div><div class="bubble"><span style="white-space:pre-wrap">${escapeHtml(text)}</span></div>`;
  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return el;
}

function addTyping() {
  if (emptyChat) emptyChat.style.display = "none";
  const el = document.createElement("div");
  el.className = "msg assistant";
  el.id = "typing-msg";
  el.innerHTML = `<div class="msg-av"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
    <div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
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
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!sendBtn.disabled) sendMessage(); }
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

  
    ? { role: "user", content: userContent }
    : { role: "user", content: [{ type: "text", text }] };
const historyEntry = { role: "user", content: userContent };
  conversationHistory.push(historyEntry);
  const typingEl = addTyping();

  try {
    const messages = conversationHistory.map((m, i) => {
      if (i === 0 && currentImageBase64) return m;
      return { role: m.role, content: typeof m.content === "string" ? m.content : m.content.filter(b => b.type === "text").map(b => b.text).join("") };
    });

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
  imageBase64: currentImageBase64,
  imageMime: currentImageMime,
  prompt: text,
}),
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
    addMessage("assistant", "Error: " + (err.message || JSON.stringify(err)));
  }
  isLoading = false;
  updateSendBtn();
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Init
updateSendBtn();

const MAX_PROMPT_TOKENS = 4096;
let maxPromptChars = 20000;

const form = document.querySelector("#generationForm");
const promptInput = document.querySelector("#prompt");
const promptCounter = document.querySelector("#promptCounter");
const sizeSelect = document.querySelector("#size");
const generateButton = document.querySelector("#generateButton");
const clearButton = document.querySelector("#clearButton");
const modelName = document.querySelector("#modelName");
const docsLink = document.querySelector("#docsLink");
const statusPill = document.querySelector("#statusPill");
const emptyState = document.querySelector("#emptyState");
const resultGrid = document.querySelector("#resultGrid");
const rawPanel = document.querySelector("#rawPanel");
const rawResponse = document.querySelector("#rawResponse");

function estimateTokens(text) {
  let asciiChars = 0;
  let tokens = 0;

  for (const char of text) {
    if (/\s/.test(char)) {
      if (asciiChars > 0) {
        tokens += Math.max(1, Math.ceil(asciiChars / 4));
        asciiChars = 0;
      }
      continue;
    }

    if (/^[\x00-\x7F]$/.test(char)) {
      asciiChars += 1;
    } else {
      if (asciiChars > 0) {
        tokens += Math.max(1, Math.ceil(asciiChars / 4));
        asciiChars = 0;
      }
      tokens += 1;
    }
  }

  if (asciiChars > 0) {
    tokens += Math.max(1, Math.ceil(asciiChars / 4));
  }

  return tokens;
}

function setStatus(text, mode = "idle") {
  statusPill.textContent = text;
  statusPill.dataset.mode = mode;
}

function setBusy(isBusy) {
  generateButton.disabled = isBusy;
  generateButton.querySelector("span:last-child").textContent = isBusy ? "生成中..." : "生成图片";
}

function setEmptyState(message, mode = "idle") {
  emptyState.hidden = false;
  emptyState.replaceChildren();

  const mark = document.createElement("div");
  mark.className = mode === "loading" ? "loader" : "preview-mark";
  if (mode === "error") {
    mark.classList.add("warning");
  }

  const text = document.createElement("p");
  text.textContent = message;

  emptyState.append(mark, text);
}

function updatePromptCounter() {
  const tokenCount = estimateTokens(promptInput.value);
  const isOverLimit = tokenCount > MAX_PROMPT_TOKENS;

  promptCounter.textContent = `${tokenCount} / ${MAX_PROMPT_TOKENS} token`;
  promptCounter.dataset.mode = isOverLimit ? "error" : "idle";
  promptInput.dataset.mode = isOverLimit ? "error" : "idle";

  return { tokenCount, isOverLimit };
}

function renderError(message) {
  setEmptyState(message, "error");
  resultGrid.replaceChildren();
  rawPanel.hidden = true;
  setStatus("失败", "error");
}

function renderResults(payload) {
  emptyState.hidden = true;
  resultGrid.replaceChildren();

  payload.urls.forEach((url, index) => {
    const item = document.createElement("article");
    item.className = "result-item";

    const image = document.createElement("img");
    image.src = url;
    image.alt = `Generated image ${index + 1}`;
    image.loading = "lazy";

    const meta = document.createElement("div");
    meta.className = "result-meta";

    const openLink = document.createElement("a");
    openLink.href = url;
    openLink.target = "_blank";
    openLink.rel = "noreferrer";
    openLink.textContent = "打开图片";

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.dataset.url = url;
    copyButton.textContent = "复制 URL";

    meta.append(openLink, copyButton);
    item.append(image, meta);
    resultGrid.appendChild(item);
  });

  rawPanel.hidden = false;
  rawResponse.textContent = JSON.stringify(payload.raw, null, 2);
  setStatus("完成", "success");
}

async function loadConfig() {
  const response = await fetch("/api/config");
  const config = await response.json();

  modelName.textContent = config.model;
  docsLink.href = config.docs_url;

  if (config.prompt_max_tokens) {
    promptCounter.textContent = `0 / ${config.prompt_max_tokens} token`;
  }
  if (config.prompt_max_chars) {
    maxPromptChars = config.prompt_max_chars;
    promptInput.maxLength = config.prompt_max_chars;
  }

  sizeSelect.replaceChildren();
  config.sizes.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    sizeSelect.appendChild(option);
  });

  sizeSelect.value = "2752x1536";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const prompt = promptInput.value.trim();
  const size = sizeSelect.value;
  const { isOverLimit } = updatePromptCounter();

  if (!prompt) {
    renderError("图像描述文本不能为空。");
    return;
  }

  if (isOverLimit) {
    renderError("图像描述文本已超过 4096 token，请缩短后再生成。");
    return;
  }

  if (prompt.length > maxPromptChars) {
    renderError(`图像描述文本已超过 ${maxPromptChars} 字符，请缩短后再生成。`);
    return;
  }

  setBusy(true);
  setStatus("请求中", "loading");
  setEmptyState("正在等待 SenseNova 返回图片 URL。", "loading");
  resultGrid.replaceChildren();
  rawPanel.hidden = true;

  try {
    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, size, n: 1 }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "请求失败");
    }
    renderResults(data);
  } catch (error) {
    renderError(error.message);
  } finally {
    setBusy(false);
  }
});

promptInput.addEventListener("input", updatePromptCounter);

resultGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-url]");
  if (!button) return;

  await navigator.clipboard.writeText(button.dataset.url);
  button.textContent = "已复制";
  setTimeout(() => {
    button.textContent = "复制 URL";
  }, 1200);
});

clearButton.addEventListener("click", () => {
  promptInput.value = "";
  updatePromptCounter();
  promptInput.focus();
  setStatus("待生成");
});

loadConfig()
  .then(updatePromptCounter)
  .catch((error) => {
    renderError(error.message);
  });

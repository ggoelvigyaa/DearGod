const qaList = document.getElementById("qa-list");
const statusList = document.getElementById("status-list");
const marketResults = document.getElementById("market-results");
const slideList = document.getElementById("slide-list");
const chatLog = document.getElementById("chat-log");

const qaTemplates = [
  "Who is the primary customer segment?",
  "How does the company make money?",
  "What is the core differentiator versus competitors?",
];

const statusTemplates = [
  "Recent funding or revenue milestones",
  "Hiring velocity or key leadership changes",
  "Customer sentiment signals",
];

const marketTemplates = [
  {
    title: "Market growth",
    detail: "Projected CAGR of 12% driven by digital transformation spending.",
  },
  {
    title: "Competitive moves",
    detail: "Two incumbents launched AI copilots within the last quarter.",
  },
  {
    title: "Regulatory signals",
    detail: "New privacy compliance deadlines expected this year.",
  },
];

const slideTemplates = [
  "Objective & success metrics",
  "Business model overview",
  "Market dynamics snapshot",
  "Public status signals",
  "Visible challenges & expansion",
  "Brainstorming prompts & next steps",
];

const chatPrompts = [
  "What assumptions must hold true to reach the objective?",
  "Which market dynamics pose the greatest threat?",
  "Where can we create leverage quickly?",
];

function createInputGroup(labelText, placeholder) {
  const wrapper = document.createElement("div");
  const label = document.createElement("label");
  const input = document.createElement("input");

  label.textContent = labelText;
  input.type = "text";
  input.placeholder = placeholder;

  wrapper.className = "qa-item";
  wrapper.append(label, input);

  return wrapper;
}

function addQAItem(prompt) {
  const item = document.createElement("div");
  item.className = "qa-item";

  const question = document.createElement("label");
  question.textContent = "Question";
  const questionInput = document.createElement("input");
  questionInput.type = "text";
  questionInput.value = prompt || "";
  questionInput.placeholder = "Ask a question about the business model";

  const answer = document.createElement("label");
  answer.textContent = "Answer";
  const answerInput = document.createElement("input");
  answerInput.type = "text";
  answerInput.placeholder = "Capture the response";

  item.append(question, questionInput, answer, answerInput);
  qaList.appendChild(item);
}

function addStatusItem(prompt) {
  const item = document.createElement("div");
  item.className = "status-item";

  const label = document.createElement("label");
  label.textContent = "Status layer";
  const input = document.createElement("input");
  input.type = "text";
  input.value = prompt || "";
  input.placeholder = "Describe a publicly visible signal";

  item.append(label, input);
  statusList.appendChild(item);
}

function renderMarketInsights() {
  marketResults.innerHTML = "";
  marketTemplates.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("h4");
    title.textContent = item.title;

    const detail = document.createElement("p");
    detail.textContent = item.detail;
    detail.className = "muted";

    card.append(title, detail);
    marketResults.appendChild(card);
  });
}

function renderSlides() {
  slideList.innerHTML = "";
  slideTemplates.forEach((slide) => {
    const item = document.createElement("li");
    item.textContent = slide;
    slideList.appendChild(item);
  });
}

function appendChatBubble(message, role) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = message;
  chatLog.appendChild(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function seedChat() {
  chatLog.innerHTML = "";
  chatPrompts.forEach((prompt) => appendChatBubble(prompt, "system"));
}

function handleSendChat() {
  const input = document.getElementById("chat-message");
  const message = input.value.trim();
  if (!message) return;

  appendChatBubble(message, "user");
  appendChatBubble("Noted. Capture team ideas around this prompt.", "system");
  input.value = "";
}

function seedDefaults() {
  qaList.innerHTML = "";
  statusList.innerHTML = "";

  qaTemplates.forEach((prompt) => addQAItem(prompt));
  statusTemplates.forEach((prompt) => addStatusItem(prompt));
  renderMarketInsights();
  renderSlides();
  seedChat();
}

seedDefaults();

document.getElementById("add-question").addEventListener("click", () => addQAItem(""));
document.getElementById("add-status").addEventListener("click", () => addStatusItem(""));
document.getElementById("fetch-market").addEventListener("click", renderMarketInsights);
document.getElementById("generate-session").addEventListener("click", () => {
  renderSlides();
  seedChat();
});

document.getElementById("send-chat").addEventListener("click", handleSendChat);
document.getElementById("chat-message").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleSendChat();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const toggleButton = document.querySelector(".chatbot-toggle");
  const windowEl = document.querySelector(".chatbot-window");
  const closeButton = document.querySelector(".chatbot-close");
  const labelEl = document.querySelector(".chatbot-label");
  const labelCloseButton = document.querySelector(".chatbot-label-close");
  const form = document.getElementById("chatbot-form");
  const input = document.getElementById("chatbot-input");
  const messagesEl = document.getElementById("chatbot-messages");

  if (!toggleButton || !windowEl || !form || !input || !messagesEl) {
    return;
  }

  const hideLabel = () => {
    if (labelEl) {
      labelEl.classList.add("chatbot-label-hidden");
    }
  };

  const openChat = () => {
    windowEl.classList.add("is-open");
    windowEl.setAttribute("aria-hidden", "false");
    hideLabel();
    setTimeout(() => input.focus(), 80);
  };

  const closeChat = () => {
    windowEl.classList.remove("is-open");
    windowEl.setAttribute("aria-hidden", "true");
  };

  toggleButton.addEventListener("click", () => {
    const isOpen = windowEl.classList.contains("is-open");
    if (isOpen) {
      closeChat();
    } else {
      openChat();
    }
  });

  if (labelEl) {
    labelEl.addEventListener("click", () => {
      openChat();
    });
  }

  if (labelCloseButton) {
    labelCloseButton.addEventListener("click", (event) => {
      event.stopPropagation();
      hideLabel();
    });
  }

  closeButton.addEventListener("click", () => {
    closeChat();
  });

  const appendMessage = (text, type = "bot") => {
    const message = document.createElement("div");
    message.className = `message message-${type}`;
    message.innerHTML = text;
    messagesEl.appendChild(message);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const fakeFeeLookup = (question) => {
    const q = question.toLowerCase();

    if (q.includes("fundamentals") || q.includes("fundamentals certificate")) {
      return (
        "For the <strong>Fundamentals Certificate in Early Childhood Care and Education</strong>, " +
        "the test fee is around <strong>SGD 2,500 – 3,000</strong>. " +
        "This amount is <em>purely fictional for development</em> and does not reflect real AIC fees."
      );
    }

    if (q.includes("higher certificate") || q.includes("infant care")) {
      return (
        "For the <strong>WSQ Higher Certificate in Infant Care</strong>, " +
        "this demo uses a placeholder fee range of <strong>SGD 3,000 – 3,800</strong>. " +
        "Please confirm actual fees with the official admissions team."
      );
    }

    if (q.includes("professional diploma") || q.includes("professional diploma in early childhood")) {
      return (
        "For the <strong>WSQ Professional Diploma in Early Childhood Care &amp; Education</strong>, " +
        "the prototype suggests a fee range of <strong>SGD 9,000 – 11,000</strong>. " +
        "These numbers are for testing only and are not official."
      );
    }

    if (q.includes("bachelor") || q.includes("degree") || q.includes("ba (honours)")) {
      return (
        "For the <strong>Bachelor of Arts (Honours) Early Childhood Studies</strong>, " +
        "this test assistant uses a fictional annual fee of around <strong>SGD 18,000 – 22,000</strong>. " +
        "Always refer to the official website or admissions office for real pricing."
      );
    }

    if (q.includes("fee") || q.includes("price") || q.includes("tuition")) {
      return (
        "I can help with <strong>illustrative fee ranges</strong> for test purposes. " +
        "Try asking something like:<br>" +
        "• “What is the fee for the Fundamentals Certificate?”<br>" +
        "• “How much is the Professional Diploma in Early Childhood?”<br>" +
        "<br>All values I provide here are <em>demo-only</em> and not official."
      );
    }

    return (
      "This is a <strong>prototype chatbot</strong> focused on programmes and fee examples. " +
      "You can ask about:<br>" +
      "• Fundamentals Certificate in Early Childhood Care and Education<br>" +
      "• WSQ Higher Certificate in Infant Care<br>" +
      "• WSQ Professional Diploma in Early Childhood Care &amp; Education<br>" +
      "• Bachelor of Arts (Honours) Early Childhood Studies<br>" +
      "<br>In the real version, this logic will be powered by an OpenAI model " +
      "using accurate data from the official AIC site."
    );
  };

  // Vercel 使用 /api/chat（Node），勿改为 chat.php
  const apiUrl = window.AIC_CHAT_API_URL || "api/chat";

  const callChatApi = async (text) => {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.reply || "Request failed");
    return data.reply || "No reply.";
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    appendMessage(text, "user");
    input.value = "";

    const thinkingId = "thinking-" + Date.now();
    appendMessage('<span id="' + thinkingId + '">Thinking…</span>', "bot");

    try {
      const replyHtml = await callChatApi(text);
      const thinkingEl = document.getElementById(thinkingId);
      if (thinkingEl) thinkingEl.closest(".message").remove();
      appendMessage(replyHtml, "bot");
    } catch (err) {
      const thinkingEl = document.getElementById(thinkingId);
      if (thinkingEl) thinkingEl.closest(".message").remove();
      appendMessage("Sorry, the assistant is unavailable. Please try again or contact us directly.", "bot");
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value;
    sendMessage(text);
  });
});


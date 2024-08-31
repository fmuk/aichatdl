const SUPPORTED_URLS = ['chat.openai.com', 'claude.ai', 'poe.com'];

chrome.action.onClicked.addListener((tab) => {
  if (SUPPORTED_URLS.some(url => tab.url.includes(url))) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractConversation,
    });
  }
});

function extractConversation() {
  const platform = detectPlatform();
  const messages = extractMessages(platform);
  
  if (messages.length > 0) {
    const content = formatConversation(platform, messages);
    downloadConversation(content);
  } else {
    alert("No conversation found or extraction failed.");
  }
}

function detectPlatform() {
  if (document.querySelector('div.font-claude-message')) return 'claude';
  if (document.querySelector('div.group\\/conversation-turn')) return 'chatgpt';
  if (document.querySelector('div.ChatMessagesView_messagePair__ZEXUz')) return 'poe';
  return 'unknown';
}

function extractMessages(platform) {
  switch (platform) {
    case 'chatgpt':
      return extractChatGPTConversation();
    case 'claude':
      return extractClaudeConversation();
    case 'poe':
      return extractPoeConversation();
    default:
      return [];
  }
}

function extractChatGPTConversation() {
  const messages = [];
  const containers = document.querySelectorAll('div.group\\/conversation-turn');

  containers.forEach(container => {
    const speaker = container.classList.contains('agent-turn') ? "AI" : "User";
    const contentDiv = container.querySelector('div.whitespace-pre-wrap.markdown');
    
    if (contentDiv) {
      const text = contentDiv.textContent.trim().replace(/\s+/g, ' ');
      if (text.length > 1) messages.push([speaker, text]);
    }
  });

  return messages;
}

function extractClaudeConversation() {
  const messages = [];
  const containers = document.querySelectorAll('div.font-user-message, div.font-claude-message');

  containers.forEach(container => {
    const speaker = container.classList.contains('font-user-message') ? "User" : "AI";
    let content = container.textContent.trim();
    
    if (speaker === "AI") {
      const contentDiv = container.querySelector('div');
      content = contentDiv ? contentDiv.textContent.trim() : "";
    }

    const text = content.replace(/\s+/g, ' ');
    if (text.length > 1) messages.push([speaker, text]);
  });

  return messages;
}

function extractPoeConversation() {
  const messages = [];
  const containers = document.querySelectorAll('div.ChatMessagesView_messagePair__ZEXUz');

  containers.forEach(container => {
    const userMessage = container.querySelector('div.ChatMessage_rightSideMessageWrapper__r0roB');
    if (userMessage) {
      const content = userMessage.querySelector('div.Markdown_markdownContainer__Tz3HQ');
      if (content) {
        const text = content.textContent.trim().replace(/\s+/g, ' ');
        if (text.length > 1) messages.push(["User", text]);
      }
    }

    const aiMessages = Array.from(container.querySelectorAll('div.ChatMessage_messageWrapper__4Ugd6'))
      .filter(msg => !msg.classList.contains('ChatMessage_rightSideMessageWrapper__r0roB'));

    aiMessages.forEach(aiMessage => {
      const content = aiMessage.querySelector('div.Markdown_markdownContainer__Tz3HQ');
      if (content) {
        const text = content.textContent.trim().replace(/\s+/g, ' ');
        if (text.length > 1) messages.push(["AI", text]);
      }
    });
  });

  return messages;
}

function formatConversation(platform, messages) {
  let content = `Conversation extracted from ${window.location.href}\n`;
  content += `Platform: ${platform}\n\n`;
  messages.forEach(([speaker, text]) => {
    content += `${speaker}: ${text}\n\n`;
  });
  return content;
}

function downloadConversation(content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `conversation_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

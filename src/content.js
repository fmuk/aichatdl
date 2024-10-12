const browserAPI = typeof chrome !== 'undefined' ? chrome : browser;

const PLATFORMS = {
  CLAUDE: 'Claude',
  CHATGPT: 'ChatGPT',
  POE: 'Poe',
  UNKNOWN: 'Unknown'
};

const FORMAT_HANDLERS = {
  markdown: {
    convert: htmlToMarkdown,
    fileExtension: 'md',
    formatMetadata: (url, platform) => `# Conversation extracted from ${url}\n**Platform:** ${platform}\n**Format:** markdown\n\n`,
    formatMessage: (speaker, text) => `## ${speaker}:\n${text}\n\n`
  },
  html: {
    convert: simplifyHtml,
    fileExtension: 'html',
    formatMetadata: (url, platform) => `<h1>Conversation extracted from ${url}</h1><p><strong>Platform:</strong> ${platform}</p><p><strong>Format:</strong> html</p>`,
    formatMessage: (speaker, text) => `<h2>${speaker}:</h2><div>${text}</div>`
  },
  plaintext: {
    convert: htmlToPlaintext,
    fileExtension: 'txt',
    formatMetadata: (url, platform) => `Conversation extracted from ${url}\nPlatform: ${platform}\nFormat: plaintext\n\n`,
    formatMessage: (speaker, text) => `${speaker}:\n${text}\n\n`
  }
};

function extractConversation(format) {
  const logs = [];
  const log = message => {
    console.log(message);
    logs.push(message);
  };

  try {
    const platform = detectPlatform();
    log(`Platform detected: ${platform}`);
    log(`Format selected: ${format}`);
    
    const messages = extractConversationFromPlatform(platform, format);
    
    if (messages.length > 0) {
      const content = formatConversation(platform, messages, format);
      const downloadStatus = downloadConversation(content, format);
      return { platform, messageCount: messages.length, downloadInitiated: true, logs };
    } else {
      return { error: "No messages found in the conversation.", logs };
    }
  } catch (error) {
    return { error: `Extraction failed: ${error.message}`, logs };
  }
}

function detectPlatform() {
  if (document.querySelector('div.font-claude-message')) return PLATFORMS.CLAUDE;
  if (window.location.hostname === 'chatgpt.com') return PLATFORMS.CHATGPT;
  if (document.querySelector('div.ChatMessagesView_messagePair__ZEXUz')) return PLATFORMS.POE;
  return PLATFORMS.UNKNOWN;
}

function extractConversationFromPlatform(platform, format) {
  const extractors = {
    [PLATFORMS.CHATGPT]: extractChatGPTConversation,
    [PLATFORMS.CLAUDE]: extractClaudeConversation,
    [PLATFORMS.POE]: extractPoeConversation
  };

  return extractors[platform] ? extractors[platform](format) : [];
}

function extractChatGPTConversation(format) {
  return Array.from(document.querySelectorAll('div.group\\/conversation-turn'))
    .map(turn => {
      const speaker = turn.querySelector('.agent-turn') ? "AI" : "User";
      const contentDiv = turn.querySelector('.min-h-8.text-message, .min-h-\\[20px\\].text-message');
      
      if (contentDiv) {
        return [speaker, extractContent(contentDiv, format)];
      }
      return null;
    })
    .filter(message => message && message[1].length > 1);
}

function extractClaudeConversation(format) {
  return Array.from(document.querySelectorAll('div.font-user-message, div.font-claude-message'))
    .map(container => {
      const speaker = container.classList.contains('font-user-message') ? "User" : "AI";
      const contentElement = speaker === "AI" ? container.querySelector('div') : container;
      return [speaker, extractContent(contentElement, format)];
    })
    .filter(([, text]) => text.length > 1);
}

function extractPoeConversation(format) {
  return Array.from(document.querySelectorAll('div.ChatMessagesView_messagePair__ZEXUz'))
    .flatMap(container => {
      const messages = [];
      const userMessage = container.querySelector('div.ChatMessage_rightSideMessageWrapper__r0roB');
      if (userMessage) {
        const content = userMessage.querySelector('div.Markdown_markdownContainer__Tz3HQ');
        if (content) {
          const text = extractContent(content, format);
          if (text.length > 1) messages.push(["User", text]);
        }
      }
      
      const aiMessages = Array.from(container.querySelectorAll('div.ChatMessage_messageWrapper__4Ugd6'))
        .filter(msg => !msg.classList.contains('ChatMessage_rightSideMessageWrapper__r0roB'));
      aiMessages.forEach(aiMessage => {
        const content = aiMessage.querySelector('div.Markdown_markdownContainer__Tz3HQ');
        if (content) {
          const text = extractContent(content, format);
          if (text.length > 1) messages.push(["AI", text]);
        }
      });
      return messages;
    });
}

function extractContent(element, format) {
  return FORMAT_HANDLERS[format].convert(element.innerHTML);
}

function formatConversation(platform, messages, format) {
  const { formatMetadata, formatMessage } = FORMAT_HANDLERS[format];
  let content = formatMetadata(window.location.href, platform);
  messages.forEach(([speaker, text]) => {
    content += formatMessage(speaker, text);
  });
  return content;
}

function downloadConversation(content, format) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `conversation_${new Date().toISOString().replace(/[:.]/g, '-')}.${FORMAT_HANDLERS[format].fileExtension}`;
  a.click();
  URL.revokeObjectURL(url);
  return 'File download initiated';
}

function htmlToMarkdown(html) {
  return html
    .replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, function(match, content) {
      return content.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
    })
    .replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function htmlToPlaintext(html) {
  return html
    .replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, function(match, content) {
      return content.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
    })
    .replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function simplifyHtml(html) {
  return html
    .replace(/<(\w+)\s+[^>]*>/g, '<$1>')
    .replace(/\s+/g, ' ')
    .trim();
}

browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extract") {
    sendResponse(extractConversation(request.format));
  } else if (request.action === "detectPlatform") {
    sendResponse({ platform: detectPlatform() });
  }
});

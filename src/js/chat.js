import { initLanguage, initStars, initMobileNav, getLang } from './utils.js';

let conversationHistory = JSON.parse(sessionStorage.getItem('geetha-chat-history')) || [];

function saveHistory() {
  sessionStorage.setItem('geetha-chat-history', JSON.stringify(conversationHistory));
}

function processModelText(text) {
  return text.replace(/\{BG(\d+\.\d+)\}/g, (match, p1) => {
    const parts = p1.split('.');
    return `<a href="/?ch=${parts[0]}&v=${parts[1]}" target="_parent" style="cursor:pointer;">BG ${p1}</a>`;
  });
}

function renderInitialHistory() {
  if (conversationHistory.length === 0) return;
  
  const messagesDiv = document.getElementById('chat-messages');
  // Clear the static default greeting since we have history
  messagesDiv.innerHTML = '';
  
  conversationHistory.forEach(msg => {
    const bubble = document.createElement('div');
    bubble.className = `message ${msg.role === 'user' ? 'user' : 'bot'}`;
    if (msg.role === 'model') {
      bubble.innerHTML = processModelText(msg.text);
    } else {
      bubble.textContent = msg.text;
    }
    messagesDiv.appendChild(bubble);
  });
  
  setTimeout(() => messagesDiv.scrollTop = messagesDiv.scrollHeight, 100);
}

async function sendMessage(text) {
  const messagesDiv = document.getElementById('chat-messages');
  const typingIndicator = document.getElementById('typing-indicator');
  const input = document.getElementById('chat-input');
  const submitBtn = document.getElementById('chat-submit');

  // Add User Message
  conversationHistory.push({ role: 'user', text });
  saveHistory();
  
  const userMsgBubble = document.createElement('div');
  userMsgBubble.className = 'message user';
  userMsgBubble.textContent = text;
  messagesDiv.appendChild(userMsgBubble);
  
  // Clear input
  input.value = '';
  input.disabled = true;
  submitBtn.disabled = true;
  
  // Show typing
  typingIndicator.style.display = 'block';
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversationHistory })
    });

    const data = await res.json();
    
    if (data.error) throw new Error(data.error);

    conversationHistory.push({ role: 'model', text: data.text });
    saveHistory();

    const botMsgBubble = document.createElement('div');
    botMsgBubble.className = 'message bot';
    botMsgBubble.innerHTML = processModelText(data.text);
    messagesDiv.appendChild(botMsgBubble);

  } catch (err) {
    console.error('Chat Error:', err);
    conversationHistory.pop(); // Remove user msg from history state if failed
    saveHistory();
    
    const errMsgBubble = document.createElement('div');
    errMsgBubble.className = 'message bot';
    errMsgBubble.style.color = '#f88';
    errMsgBubble.textContent = "I'm having trouble connecting to the scriptures right now. Please try again in a moment.";
    messagesDiv.appendChild(errMsgBubble);
  } finally {
    typingIndicator.style.display = 'none';
    input.disabled = false;
    submitBtn.disabled = false;
    input.focus();
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
}

document.getElementById('chat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = document.getElementById('chat-input').value.trim();
  if (text) {
    sendMessage(text);
  }
});

// Init
initLanguage();
initStars();
initMobileNav();
renderInitialHistory();

// Handle Floating Widget Minimal View
if (window.location.search.includes('minimal=true')) {
  const nav = document.querySelector('.nav');
  const header = document.querySelector('.page-header');
  const footer = document.querySelector('footer');
  const chatContainer = document.querySelector('.chat-container');
  if (nav) nav.style.display = 'none';
  if (header) header.style.display = 'none';
  if (footer) footer.style.display = 'none';
  if (chatContainer) {
    chatContainer.style.height = '100vh';
    chatContainer.style.borderRadius = '0';
    chatContainer.style.border = 'none';
  }
  document.body.style.padding = '0';
  document.body.style.margin = '0';
}

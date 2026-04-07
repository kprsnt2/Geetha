import { initLanguage, initStars, initMobileNav, getLang } from './utils.js';

let conversationHistory = [];

async function sendMessage(text) {
  const messagesDiv = document.getElementById('chat-messages');
  const typingIndicator = document.getElementById('typing-indicator');
  const input = document.getElementById('chat-input');
  const submitBtn = document.getElementById('chat-submit');

  // Add User Message
  conversationHistory.push({ role: 'user', text });
  
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
    
    // Parse shloka links e.g. {BG2.14}
    let htmlText = data.text;
    htmlText = htmlText.replace(/\{BG(\d+\.\d+)\}/g, (match, p1) => {
      const parts = p1.split('.');
      return `<a href="/?ch=${parts[0]}&v=${parts[1]}" target="_parent" style="cursor:pointer;">BG ${p1}</a>`;
    });

    const botMsgBubble = document.createElement('div');
    botMsgBubble.className = 'message bot';
    botMsgBubble.innerHTML = htmlText;
    messagesDiv.appendChild(botMsgBubble);

  } catch (err) {
    console.error('Chat Error:', err);
    conversationHistory.pop(); // Remove user msg from history state if failed
    
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

// Handle Floating Widget Minimal View
if (window.location.search.includes('minimal=true')) {
  document.querySelector('.nav').style.display = 'none';
  document.querySelector('.header').style.display = 'none';
  document.querySelector('footer').style.display = 'none';
  document.querySelector('.chat-container').style.height = '100vh';
  document.querySelector('.chat-container').style.borderRadius = '0';
  document.querySelector('.chat-container').style.border = 'none';
  document.body.style.padding = '0';
  document.body.style.margin = '0';
}

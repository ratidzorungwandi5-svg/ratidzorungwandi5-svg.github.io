const themeToggle = document.querySelector('.theme-toggle');
const root = document.documentElement;
const mobileButton = document.querySelector('.mobile-menu-button');
const siteNav = document.querySelector('.site-nav');
const contactForm = document.getElementById('contact-form');
const formMessage = document.getElementById('form-message');
const chatForm = document.getElementById('chat-form');
const chatWindow = document.getElementById('chat-window');
const chatInput = document.getElementById('chat-input');

const chatResponses = [
  {
    triggers: ['bitcoin', 'btc', 'crypto', 'digital asset'],
    response: 'Bitcoin can play a role in long-term portfolios as a diversified digital asset. For most investors, it makes sense to allocate only a portion of capital, understand volatility, and keep a long-term horizon rather than trade daily.'
  },
  {
    triggers: ['nyse', 'nasdaq', 'lse', 'tsx', 'hkex', 'sse', 'stock exchange', 'exchange', 'global market'],
    response: 'Major stock exchanges each have their own strengths. NYSE and NASDAQ are home to U.S. large caps, LSE serves global blue chips, TSX leads in resources, and HKEX connects investors to Asia. A diversified global view helps balance opportunity and risk.'
  },
  {
    triggers: ['black business', 'black-owned', 'black businesses', 'community business'],
    response: 'Supporting Black-owned businesses is an important long-term investment in economic equity. Look for founders with strong vision, sustainable revenue, and opportunities for growth while also connecting capital with mentorship and market access.'
  },
  {
    triggers: ['long term', 'long-term', 'horizon', 'patient'],
    response: 'Long-term investing means focusing on growth over years, not weeks. Keep a plan, rebalance when needed, invest in quality assets, and avoid making emotional decisions based on short-term market swings.'
  },
  {
    triggers: ['portfolio', 'diversify', 'diversification', 'allocate'],
    response: 'A resilient portfolio blends equities, cash flow businesses, ETFs, and growth assets like bitcoin. Diversification across markets and industries helps reduce risk while preserving long-term upside.'
  },
  {
    triggers: ['advice', 'recommend', 'should i'],
    response: 'I provide general investing ideas. For personalized financial advice, speak with a licensed advisor who can evaluate your goals, time horizon, and risk tolerance.'
  }
];

const appendChatMessage = (role, text) => {
  if (!chatWindow) return;
  const message = document.createElement('div');
  message.className = `chat-message ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = `<p>${text}</p>`;
  message.appendChild(bubble);
  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
};

const getChatResponse = (message) => {
  const normalized = message.toLowerCase();
  for (const item of chatResponses) {
    if (item.triggers.some((trigger) => normalized.includes(trigger))) {
      return item.response;
    }
  }
  return 'That is a great question. For long-term investing, focus on your goals, stay diversified, and keep learning. You can ask me about bitcoin, global exchanges, or investing in Black-owned businesses.';
};

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const isLight = root.classList.toggle('light-theme');
    themeToggle.textContent = isLight ? '☀️' : '🌙';
  });
}

if (mobileButton) {
  mobileButton.addEventListener('click', () => {
    if (!siteNav) return;
    const expanded = siteNav.classList.toggle('open');
    mobileButton.setAttribute('aria-expanded', String(expanded));
  });
}

siteNav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    if (!siteNav.classList.contains('open')) return;
    siteNav.classList.remove('open');
    mobileButton?.setAttribute('aria-expanded', 'false');
  });
});

if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!formMessage) return;

    formMessage.textContent = 'Thanks! Your message has been received. We’ll reply shortly.';
    formMessage.classList.add('visible');
    contactForm.reset();

    window.setTimeout(() => {
      formMessage.classList.remove('visible');
    }, 7000);
  });
}

if (chatForm) {
  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!chatInput || !chatInput.value.trim()) return;

    const userText = chatInput.value.trim();
    appendChatMessage('user', userText);
    chatInput.value = '';

    window.setTimeout(() => {
      const response = getChatResponse(userText);
      appendChatMessage('bot', response);
    }, 450);
  });
}

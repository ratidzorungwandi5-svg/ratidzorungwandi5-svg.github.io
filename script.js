const themeToggle = document.querySelector('.theme-toggle');
const root = document.documentElement;
const mobileButton = document.querySelector('.mobile-menu-button');
const siteNav = document.querySelector('.site-nav');
const contactForm = document.getElementById('contact-form');
const formMessage = document.getElementById('form-message');
const chatForm = document.getElementById('chat-form');
const chatWindow = document.getElementById('chat-window');
const chatInput = document.getElementById('chat-input');
const explainerVideo = document.getElementById('explainer-video');
const videoLinks = document.querySelectorAll('a[href="#video"]');

videoLinks.forEach((link) => {
  link.addEventListener('click', () => {
    if (!explainerVideo) return;
    window.setTimeout(() => {
      explainerVideo.play().catch(() => {
        // Autoplay may be blocked without user interaction, but click should allow play in most browsers.
      });
    }, 150);
  });
});

const responseRules = [
  {
    patterns: [/bitcoin|btc|crypto|digital asset/i],
    response: 'Bitcoin can be a long-term allocation in a diversified portfolio. It is volatile, so many long-term investors limit exposure, keep secure storage, and treat it as part of an innovation + inflation hedge strategy rather than a core income asset.'
  },
  {
    patterns: [/nyse|nasdaq|lse|tsx|hkex|sse|stock exchange|stock market|exchange|market/i],
    response: 'Different exchanges represent different geographies and sectors. NYSE and NASDAQ are U.S. heavyweights, LSE is strong in international blue chips, TSX has energy and resources, and HKEX provides access to Asia. A global market view helps you balance growth with diversification.'
  },
  {
    patterns: [/black[- ]?owned|black business|black businesses|black entrepreneur|black entrepreneurs/i],
    response: 'Investing in Black-owned businesses is an important way to support financial inclusion and economic growth. Evaluate companies on their revenue model, leadership, scalability, and how capital will be used to build durable value for both the business and the community.'
  },
  {
    patterns: [/business|company|startup|valuation|cash flow|earnings|revenue|profit|management/i],
    response: 'When evaluating a business, look for durable revenue, a strong competitive moat, efficient cash flow, and a leadership team that understands execution. Good businesses often have repeat customers, disciplined margins, and a plan to reinvest profits smartly.'
  },
  {
    patterns: [/diversify|diversification|portfolio|allocation|balance/i],
    response: 'A diversified portfolio blends multiple asset types: stocks, bonds, real assets, alternatives, and business stakes. Diversification helps reduce concentration risk and gives you options when one market segment underperforms.'
  },
  {
    patterns: [/long[- ]?term|horizon|patient|years|decades/i],
    response: 'Long-term investing means focusing on a multi-year horizon, not daily price moves. It is about compounding growth, maintaining discipline through volatility, and making allocations that can weather multiple economic cycles.'
  },
  {
    patterns: [/risk|volatility|drawdown|loss|downside/i],
    response: 'Risk management begins with position sizing, cash reserves, and understanding your own tolerance. It also means using diversified holdings and avoiding overconfidence in any single company or asset class.'
  },
  {
    patterns: [/retirement|401k|ira|pension|savings/i],
    response: 'For retirement investing, prioritize low-cost diversified funds, consistent contributions, and a gradual shift to more stable assets as you approach your goal. Tax-advantaged accounts can also improve your long-term returns.'
  },
  {
    patterns: [/why|how|what|when|should/i],
    response: 'Great question. For long-term investing, start by defining your goals, understanding your tolerance for volatility, and choosing assets that fit your time horizon. Ask me for specifics on bitcoin, global exchanges, business investing, or portfolio strategy.'
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
  const normalized = message.trim();

  if (!normalized) {
    return 'Please ask a question about investing, markets, or business strategy so I can help.';
  }

  const matches = responseRules.filter((rule) => rule.patterns.some((pattern) => pattern.test(normalized)));

  if (matches.length === 0) {
    return 'That is a great question. For long-term investing, focus on your goals, stay diversified, and keep learning. Ask me about bitcoin, global markets, business investing, or portfolio construction.';
  }

  const response = matches.map((rule) => rule.response);
  return [...new Set(response)].join(' ');
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

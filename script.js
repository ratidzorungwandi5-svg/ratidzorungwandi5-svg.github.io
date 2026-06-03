const themeToggle = document.querySelector('.theme-toggle');
const root = document.documentElement;
const mobileButton = document.querySelector('.mobile-menu-button');
const siteNav = document.querySelector('.site-nav');
const contactForm = document.getElementById('contact-form');
const formMessage = document.getElementById('form-message');
const chatForm = document.getElementById('chat-form');
const chatWindow = document.getElementById('chat-window');
const chatInput = document.getElementById('chat-input');
const stockRefreshButton = document.getElementById('stock-refresh');
const stockDownloadButton = document.getElementById('stock-download');
const stockBoardBody = document.getElementById('stock-prices-body');
const stockLastUpdated = document.getElementById('stock-last-updated');
const stockChangeLog = document.getElementById('stock-change-log');

const stockSymbols = ['IBM', 'JPM', 'DIS', 'KO', 'CAT', 'MCD', 'XOM', 'VZ', 'GE', 'BA', 'CVS', 'PFE', 'PG', 'T', 'AXP', 'HD'];
const previousStockPrices = {};
const stockHistory = {};
const latestStockData = {};

const parseStooqCsv = (csvText) => {
  const lines = csvText.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const close = parseFloat(values[6]);
    const open = parseFloat(values[3]);
    return {
      symbol: values[0].replace('.US', ''),
      date: values[1],
      time: values[2],
      open: Number.isNaN(open) ? null : open,
      price: Number.isNaN(close) ? null : close
    };
  });
};

const formatChange = (current, previous) => {
  if (previous == null || current == null) return '—';
  const delta = current - previous;
  const sign = delta > 0 ? '+' : delta < 0 ? '-' : '';
  return `${sign}${Math.abs(delta).toFixed(2)}`;
};

const formatDelta = (delta) => {
  if (delta == null) return '—';
  const sign = delta > 0 ? '+' : delta < 0 ? '-' : '';
  return `${sign}$${Math.abs(delta).toFixed(2)}`;
};

const formatDeltaClass = (delta) => {
  if (delta == null) return 'no-change';
  return delta > 0 ? 'price-up' : delta < 0 ? 'price-down' : 'no-change';
};

const computeDelta = (symbol, intervalMs, currentPrice) => {
  const history = stockHistory[symbol] || [];
  if (currentPrice == null || history.length === 0) return null;

  const now = Date.now();
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const snapshot = history[i];
    if (now - snapshot.time >= intervalMs) {
      return currentPrice - snapshot.price;
    }
  }
  return null;
};

const appendStockChange = (row, previous) => {
  if (!stockChangeLog || previous == null || row.price == null || row.price === previous) return;

  const delta = row.price - previous;
  const direction = delta > 0 ? '▲' : '▼';
  const className = delta > 0 ? 'stock-change-up' : 'stock-change-down';

  const entry = document.createElement('li');
  entry.className = `stock-change-item ${className}`;
  entry.innerHTML = `<span><strong>${row.symbol}</strong> ${direction} ${Math.abs(delta).toFixed(2)} to $${row.price.toFixed(2)}</span><span>${row.time || 'now'}</span>`;

  if (stockChangeLog.children.length === 1 && stockChangeLog.children[0].textContent?.includes('No changes yet')) {
    stockChangeLog.innerHTML = '';
  }

  stockChangeLog.prepend(entry);
  while (stockChangeLog.childElementCount > 8) {
    stockChangeLog.removeChild(stockChangeLog.lastChild);
  }
};

const updateStockBoard = (rows) => {
  if (!stockBoardBody || !stockLastUpdated) return;

  const now = Date.now();
  const tableRows = rows.map((row) => {
    const previous = previousStockPrices[row.symbol];
    if (row.price != null) {
      stockHistory[row.symbol] = [...(stockHistory[row.symbol] || []), { price: row.price, time: now }];
      stockHistory[row.symbol] = stockHistory[row.symbol].filter((snapshot) => now - snapshot.time <= 24 * 60 * 60 * 1000);
      latestStockData[row.symbol] = { price: row.price, open: row.open };
    }

    const delta1s = row.price != null ? computeDelta(row.symbol, 1000, row.price) : null;
    const delta1m = row.price != null ? computeDelta(row.symbol, 60 * 1000, row.price) : null;
    const delta1h = row.price != null ? computeDelta(row.symbol, 60 * 60 * 1000, row.price) : null;
    const delta1d = row.price != null && row.open != null ? row.price - row.open : null;

    const delta1sClass = formatDeltaClass(delta1s);
    const delta1mClass = formatDeltaClass(delta1m);
    const delta1hClass = formatDeltaClass(delta1h);
    const delta1dClass = formatDeltaClass(delta1d);

    if (row.price != null) {
      appendStockChange(row, previous);
      previousStockPrices[row.symbol] = row.price;
    }

    return `
      <tr data-symbol="${row.symbol}">
        <td>${row.symbol}</td>
        <td>${row.price != null ? `$${row.price.toFixed(2)}` : 'N/A'}</td>
        <td class="delta-cell delta-1s ${delta1sClass}">${formatDelta(delta1s)}</td>
        <td class="delta-cell delta-1m ${delta1mClass}">${formatDelta(delta1m)}</td>
        <td class="delta-cell delta-1h ${delta1hClass}">${formatDelta(delta1h)}</td>
        <td class="delta-cell delta-1d ${delta1dClass}">${formatDelta(delta1d)}</td>
        <td>${row.time || '—'}</td>
      </tr>
    `;
  }).join('');

  stockBoardBody.innerHTML = tableRows || '<tr><td colspan="7">No data available.</td></tr>';
  stockLastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
};

const updateStockDeltas = () => {
  if (!stockBoardBody) return;

  stockBoardBody.querySelectorAll('tr[data-symbol]').forEach((row) => {
    const symbol = row.dataset.symbol;
    const latest = latestStockData[symbol];
    if (!latest || latest.price == null) return;

    const delta1s = computeDelta(symbol, 1000, latest.price);
    const delta1m = computeDelta(symbol, 60 * 1000, latest.price);
    const delta1h = computeDelta(symbol, 60 * 60 * 1000, latest.price);
    const delta1d = latest.open != null ? latest.price - latest.open : null;

    const cells = {
      sec: row.querySelector('.delta-1s'),
      min: row.querySelector('.delta-1m'),
      hour: row.querySelector('.delta-1h'),
      day: row.querySelector('.delta-1d')
    };

    if (cells.sec) {
      cells.sec.textContent = formatDelta(delta1s);
      cells.sec.className = `delta-cell delta-1s ${formatDeltaClass(delta1s)}`;
    }
    if (cells.min) {
      cells.min.textContent = formatDelta(delta1m);
      cells.min.className = `delta-cell delta-1m ${formatDeltaClass(delta1m)}`;
    }
    if (cells.hour) {
      cells.hour.textContent = formatDelta(delta1h);
      cells.hour.className = `delta-cell delta-1h ${formatDeltaClass(delta1h)}`;
    }
    if (cells.day) {
      cells.day.textContent = formatDelta(delta1d);
      cells.day.className = `delta-cell delta-1d ${formatDeltaClass(delta1d)}`;
    }
  });
};

const fetchStockPrices = async () => {
  if (!stockBoardBody || !stockLastUpdated) return;

  const symbolQuery = stockSymbols.map((symbol) => `${symbol.toLowerCase()}.us`).join(',');
  const url = `https://stooq.com/q/l/?s=${symbolQuery}&f=sd2t2ohlcv&h&e=csv`;

  const responseText = await fetch(url)
    .then((response) => response.text())
    .catch(() => '');

  const results = parseStooqCsv(responseText);
  updateStockBoard(results);
};

const definitions = {
  calculus: 'Calculus is the branch of mathematics that studies change and accumulation. It includes derivatives for rates of change and integrals for total accumulation over time.',
  derivative: 'A derivative measures how a function changes as its input changes. It is often used to find slopes, optimization points, and instantaneous rates.',
  integral: 'An integral represents accumulated quantity, such as area under a curve or total growth from a rate. It is the reverse operation of differentiation.',
  limit: 'A limit describes how a function behaves as the input approaches a particular value. It is essential for defining continuity and derivatives.',
  atom: 'An atom is the smallest unit of a chemical element that retains its properties. It consists of protons, neutrons, and electrons.',
  molecule: 'A molecule is a group of atoms bonded together to form a stable chemical structure. Molecules make up compounds and most materials around us.',
  stoichiometry: 'Stoichiometry is the quantitative study of reactants and products in chemical reactions. It helps calculate how much of each substance is needed or produced.',
  'periodic table': 'The periodic table organizes all known chemical elements by atomic number and properties. It reveals patterns in element behavior and reactivity.',
  force: 'In physics, a force is any interaction that changes an object’s motion. Common forces include gravity, friction, tension, and electromagnetic forces.',
  energy: 'Energy is the ability to do work or cause change. It can appear as kinetic energy, potential energy, thermal energy, and more.',
  momentum: 'Momentum is the product of an object’s mass and velocity. It is conserved in isolated systems, making it a key concept in collisions and motion.',
  quantum: 'Quantum mechanics studies the behavior of particles at the smallest scales, where energy levels are discrete and classical physics no longer suffices.',
  relativity: 'Relativity, developed by Einstein, explains how time, space, and gravity are linked. It includes both special relativity and general relativity.',
  bitcoin: 'Bitcoin is a digital currency and store of value that operates on a distributed blockchain. It is known for volatility, decentralized control, and a limited supply.',
  portfolio: 'A portfolio is a collection of investments such as stocks, bonds, real assets, and alternatives. It should reflect your goals, risk tolerance, and time horizon.',
  diversification: 'Diversification spreads risk by holding different assets that respond differently to market conditions. It helps protect a portfolio from concentrated losses.',
  'black-owned business': 'A Black-owned business is a company founded, owned, or controlled by Black entrepreneurs. Supporting these businesses helps drive economic equity and community growth.'
};

const responseRules = [
  {
    patterns: [/bitcoin|btc|crypto|digital asset/i],
    response: 'Bitcoin can be a long-term allocation in a diversified portfolio. It is volatile, so many investors limit exposure, keep secure storage, and treat it as part of an innovation and inflation hedge strategy rather than a core income asset.'
  },
  {
    patterns: [/nyse|nasdaq|lse|tsx|hkex|sse|stock exchange|stock market|exchange|market/i],
    response: 'Different exchanges represent different geographies and sectors. NYSE and NASDAQ are U.S. heavyweights, LSE is strong in international blue chips, TSX has energy and resources, and HKEX provides access to Asia. A global market view helps balance growth and diversification.'
  },
  {
    patterns: [/black[- ]?owned|black business|black businesses|black entrepreneur|black entrepreneurs/i],
    response: 'Investing in  businesses can support inclusion and community wealth. Evaluate the business model, leadership, runway, and how capital will be used to build durable value.'
  },
  {
    patterns: [/business|company|startup|valuation|cash flow|earnings|revenue|profit|management/i],
    response: 'When evaluating a business, look for steady revenue, scalable operations, strong leadership, and efficient cash flow. A healthy long-term strategy balances growth with resilience.'
  },
  {
    patterns: [/diversify|diversification|portfolio|allocation|balance/i],
    response: 'A diversified portfolio combines multiple asset types so one market’s weakness does not dominate your returns. Good diversification includes stocks, bonds, real assets, and alternative investments.'
  },
  {
    patterns: [/long[- ]?term|horizon|patient|years|decades/i],
    response: 'Long-term investing focuses on multi-year growth rather than short-term noise. It is about compounding, disciplined decision-making, and staying committed through different market cycles.'
  },
  {
    patterns: [/risk|volatility|drawdown|loss|downside/i],
    response: 'Risk management includes position sizing, diversification, and understanding your own tolerance. It also means keeping cash for opportunities and avoiding overconcentration in any single asset.'
  },
  {
    patterns: [/retirement|401k|ira|pension|savings/i],
    response: 'For retirement planning, consider low-cost diversified funds, regular contributions, and a gradual shift to more stable assets as you approach your goal. Tax-advantaged accounts can boost your long-term returns.'
  },
  {
    patterns: [/math|calculus|algebra|geometry|trigonometry|derivative|integral|limit|equation|function/i],
    response: 'In mathematics, it helps to break problems into clear steps. Start with definitions, identify the relationships in the equation, and apply the right techniques for calculus, algebra, or geometry. I can explain key concepts like derivatives, integrals, and limits.'
  },
  {
    patterns: [/chemistry|atom|molecule|reaction|stoichiometry|periodic table|acid|base|compound|solution/i],
    response: 'Chemistry describes how atoms and molecules interact to form new substances. Think of reactions as rearrangements of atoms, energy changes as the driver, and the periodic table as the map of element behavior.'
  },
  {
    patterns: [/physics|force|energy|momentum|gravity|quantum|relativity|motion|thermodynamics|electricity|magnetism/i],
    response: 'Physics explains how the universe moves and transfers energy. Core ideas include force, energy, momentum, and conservation laws, while modern physics connects these ideas to quantum and relativistic phenomena.'
  },
  {
    patterns: [/define|definition|meaning|what does .* mean|what is .*|explain .*|describe .*/i],
    response: 'Ask me to define a term or explain a concept, and I will give you a clear, concise answer across investing, math, science, or business topics.'
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

const findDefinition = (message) => {
  const lower = message.toLowerCase();
  for (const term in definitions) {
    if (lower.includes(term)) {
      return definitions[term];
    }
  }
  return null;
};

const getChatResponse = (message) => {
  const normalized = message.trim();

  if (!normalized) {
    return 'Please ask a question about investing, math, science, or business so I can help.';
  }

  const defineMatch = normalized.match(/\b(define|what is|explain|describe|meaning of)\b/i);
  if (defineMatch) {
    const definition = findDefinition(normalized);
    if (definition) {
      return definition;
    }
  }

  const matches = responseRules.filter((rule) => rule.patterns.some((pattern) => pattern.test(normalized)));

  if (matches.length > 0) {
    const response = matches.map((rule) => rule.response);
    return [...new Set(response)].join(' ');
  }

  return 'That is a strong question. I can help explain complex ideas in calculus, chemistry, physics, investing, or business strategy. Please give me a specific topic or problem, and I will offer practical guidance.';
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

if (stockRefreshButton) {
  stockRefreshButton.addEventListener('click', fetchStockPrices);
}

if (stockDownloadButton) {
  stockDownloadButton.addEventListener('click', () => {
    const csvRows = ['Symbol,Price,1s Δ,1m Δ,1h Δ,Day Δ,Time'];
    const rows = stockBoardBody.querySelectorAll('tr');
    rows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      if (cells.length === 7) {
        const symbol = cells[0].textContent.trim();
        const price = cells[1].textContent.trim();
        const delta1s = cells[2].textContent.trim();
        const delta1m = cells[3].textContent.trim();
        const delta1h = cells[4].textContent.trim();
        const delta1d = cells[5].textContent.trim();
        const time = cells[6].textContent.trim();
        csvRows.push(`"${symbol}","${price}","${delta1s}","${delta1m}","${delta1h}","${delta1d}","${time}"`);
      }
    });
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `NYSE-prices-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

// Live Trades System
const tradesFeed = document.getElementById('trades-feed');
const tradesVolume = document.getElementById('trades-volume');
const tradesCount = document.getElementById('trades-count');
const tradesAvg = document.getElementById('trades-avg');

let tradeHistory = [];
let totalVolume = 0;
let totalTrades = 0;

const generateTrade = () => {
  const symbols = stockSymbols;
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const isLarge = Math.random() > 0.75;
  const quantity = isLarge 
    ? Math.floor(Math.random() * 5000) + 2500 
    : Math.floor(Math.random() * 1000) + 100;
  
  const latest = latestStockData[symbol] || { price: 150 };
  const basePrice = latest.price || 150;
  const priceVariation = (Math.random() - 0.5) * 2;
  const price = Math.max(basePrice + priceVariation, 0.01);
  
  const tradeValue = quantity * price;
  const action = Math.random() > 0.48 ? 'buy' : 'sell';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  return {
    symbol,
    quantity,
    price,
    tradeValue,
    action,
    time,
    timestamp: Date.now()
  };
};

const addTradeToFeed = (trade) => {
  const tradeElement = document.createElement('div');
  tradeElement.className = `trade-item ${trade.action}`;
  
  tradeElement.innerHTML = `
    <div class="trade-info">
      <div class="trade-header">
        <span class="trade-symbol">${trade.symbol}</span>
        <span class="trade-action ${trade.action}">${trade.action.toUpperCase()}</span>
      </div>
      <div class="trade-details">
        <span>
          Qty
          <strong>${trade.quantity.toLocaleString()}</strong>
        </span>
        <span>
          @
          <strong>$${trade.price.toFixed(2)}</strong>
        </span>
      </div>
    </div>
    <div>
      <div class="trade-price">$${trade.tradeValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
      <div class="trade-qty">${trade.time}</div>
    </div>
  `;
  
  if (tradesFeed.querySelector('.trade-placeholder')) {
    tradesFeed.innerHTML = '';
  }
  
  tradesFeed.insertBefore(tradeElement, tradesFeed.firstChild);
  
  while (tradesFeed.children.length > 12) {
    tradesFeed.removeChild(tradesFeed.lastChild);
  }
};

const updateTradeStats = (trade) => {
  totalTrades += 1;
  totalVolume += trade.tradeValue;
  tradeHistory.push(trade);
  
  const avgTradeSize = totalVolume / totalTrades;
  
  tradesVolume.textContent = '$' + (totalVolume / 1000000).toFixed(2) + 'M';
  tradesCount.textContent = totalTrades.toLocaleString();
  tradesAvg.textContent = '$' + avgTradeSize.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const generateNewTrade = () => {
  const trade = generateTrade();
  addTradeToFeed(trade);
  updateTradeStats(trade);
};

// Start generating trades at regular intervals
if (tradesFeed) {
  generateNewTrade();
  setInterval(generateNewTrade, 2500);
  
  for (let i = 0; i < 5; i++) {
    setTimeout(() => generateNewTrade(), i * 500);
  }
}

// Register service worker for PWA offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .catch((error) => console.log('Service Worker registration failed:', error));
  });
}

fetchStockPrices();
setInterval(fetchStockPrices, 10000);
setInterval(updateStockDeltas, 1000);

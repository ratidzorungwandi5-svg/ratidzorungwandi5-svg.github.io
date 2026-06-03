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
  gravity: 'Gravity is a fundamental force of attraction between all objects with mass. It is described by Newton\'s law of universal gravitation.',
  velocity: 'Velocity is the rate of change of an object\'s position, including both speed and direction.',
  acceleration: 'Acceleration is the rate of change of velocity. It occurs when speed, direction, or both change.',
  'kinetic energy': 'Kinetic energy is the energy an object possesses due to its motion, calculated as (1/2)mv².',
  'potential energy': 'Potential energy is stored energy due to an object\'s position or state, such as gravitational or elastic potential energy.',
  wave: 'A wave is a disturbance that travels through space or a medium, carrying energy from one place to another.',
  wavelength: 'Wavelength is the distance between consecutive crests or troughs in a wave.',
  frequency: 'Frequency is the number of complete waves passing a point per unit time, measured in hertz.',
  amplitude: 'Amplitude is the maximum displacement of a wave from its equilibrium position.',
  sound: 'Sound is a mechanical wave that travels through a medium and can be perceived by the human ear.',
  light: 'Light is electromagnetic radiation visible to the human eye, traveling at approximately 299,792,458 meters per second.',
  reflection: 'Reflection is the bouncing back of light, sound, or other waves from a surface.',
  refraction: 'Refraction is the bending of light or other waves when passing from one medium to another.',
  'newton\'s first law': 'An object in motion stays in motion, and an object at rest stays at rest, unless acted on by an external force.',
  'newton\'s second law': 'The force applied to an object equals the object\'s mass times its acceleration (F = ma).',
  'newton\'s third law': 'For every action, there is an equal and opposite reaction.',
  thermodynamics: 'Thermodynamics is the study of heat, temperature, and their relationship to energy and work.',
  entropy: 'Entropy is a measure of disorder or randomness in a system. It tends to increase in isolated systems.',
  electricity: 'Electricity is the flow of electrons through a conductor, creating a current that can do work.',
  magnetism: 'Magnetism is the force exerted by magnetic fields, often created by moving electrons or permanent magnets.',
  'electric field': 'An electric field is the region around a charged particle where it exerts a force on other charged particles.',
  'magnetic field': 'A magnetic field is the region around a magnet or moving charge where magnetic forces are exerted.',
  'atomic nucleus': 'The atomic nucleus is the dense, positively charged center of an atom, containing protons and neutrons.',
  photon: 'A photon is a particle of light or electromagnetic radiation with energy proportional to its frequency.',
  electron: 'An electron is a negatively charged subatomic particle that orbits the nucleus of an atom.',
  proton: 'A proton is a positively charged subatomic particle found in the nucleus of an atom.',
  neutron: 'A neutron is a neutral (uncharged) subatomic particle found in the nucleus of an atom.',
  cell: 'A cell is the basic unit of life, containing cytoplasm, a nucleus, and organelles. All living organisms are made of cells.',
  mitochondria: 'Mitochondria are organelles that generate energy for the cell through cellular respiration.',
  chloroplast: 'Chloroplasts are organelles in plant cells that conduct photosynthesis to produce glucose and oxygen.',
  nucleus: 'The nucleus is the membrane-bound organelle containing the cell\'s DNA and controlling cellular activities.',
  ribosome: 'Ribosomes are organelles where proteins are synthesized based on instructions from mRNA.',
  'endoplasmic reticulum': 'The endoplasmic reticulum is a network of membranes involved in protein and lipid synthesis.',
  'golgi apparatus': 'The Golgi apparatus modifies, packages, and ships proteins from the endoplasmic reticulum.',
  dna: 'DNA (deoxyribonucleic acid) is the molecule that carries genetic instructions for life in all living organisms.',
  rna: 'RNA (ribonucleic acid) is a molecule that helps transfer genetic information and participate in protein synthesis.',
  gene: 'A gene is a segment of DNA that codes for a specific protein or trait.',
  chromosome: 'A chromosome is a structure of DNA and proteins that carries genes and genetic information.',
  allele: 'An allele is a variant form of a gene that produces different traits.',
  'genetic code': 'The genetic code is the system by which DNA sequences are translated into amino acids during protein synthesis.',
  'photosynthesis': 'Photosynthesis is the process where plants convert light energy into chemical energy stored in glucose.',
  'respiration': 'Cellular respiration is the process where cells break down glucose to release energy in the form of ATP.',
  'atp': 'ATP (adenosine triphosphate) is the primary energy currency of cells.',
  metabolism: 'Metabolism is the set of chemical reactions that occur in organisms to maintain life.',
  enzyme: 'An enzyme is a protein that acts as a biological catalyst to speed up chemical reactions in cells.',
  protein: 'A protein is a large organic molecule made of amino acids, serving functions like structure, enzymes, and signaling.',
  'amino acid': 'An amino acid is an organic compound that serves as a building block for proteins.',
  lipid: 'A lipid is a hydrophobic organic molecule including fats, oils, and cholesterol.',
  carbohydrate: 'A carbohydrate is an organic molecule made of carbon, hydrogen, and oxygen, serving as energy and structure.',
  evolution: 'Evolution is the change in organisms over time through natural selection and genetic variation.',
  'natural selection': 'Natural selection is the process where organisms with beneficial traits are more likely to survive and reproduce.',
  'speciation': 'Speciation is the evolutionary process by which new species arise from existing species.',
  organism: 'An organism is a living individual made of cells that can grow, reproduce, and respond to their environment.',
  tissue: 'A tissue is a group of similar cells that work together to perform a specific function.',
  organ: 'An organ is a structure made of different tissues working together to perform a specific function.',
  'ecosystem': 'An ecosystem is a community of organisms and the physical environment they inhabit.',
  'fermentation': 'Fermentation is an anaerobic process that breaks down glucose without oxygen to produce energy.',
  osmosis: 'Osmosis is the movement of water across a semipermeable membrane from areas of high water concentration to low.',
  diffusion: 'Diffusion is the movement of particles from areas of high concentration to low concentration.',
  noun: 'A noun is a word that represents a person, place, thing, or idea.',
  verb: 'A verb is a word that shows an action, occurrence, or state of being.',
  adjective: 'An adjective is a word that modifies or describes a noun.',
  adverb: 'An adverb is a word that modifies a verb, adjective, or another adverb, often describing how something happens.',
  pronoun: 'A pronoun is a word used in place of a noun, such as he, she, it, or they.',
  preposition: 'A preposition is a word that shows the relationship between a noun and other words in a sentence.',
  conjunction: 'A conjunction is a word that connects words, phrases, or clauses, such as and, but, or.',
  metaphor: 'A metaphor is a figure of speech that compares two different things by saying one is the other.',
  simile: 'A simile is a figure of speech that compares two things using like or as.',
  idiom: 'An idiom is a phrase or expression whose meaning cannot be understood from the individual words alone.',
  alliteration: 'Alliteration is the repetition of the same beginning sound in words close to each other.',
  onomatopoeia: 'Onomatopoeia is a word that imitates the sound it represents, like buzz or hiss.',
  oxymoron: 'An oxymoron is a figure of speech that combines contradictory terms, like bittersweet.',
  pun: 'A pun is a play on words that uses multiple meanings or similar-sounding words for humor.',
  protagonist: 'The protagonist is the main character in a story.',
  antagonist: 'The antagonist is the character or force opposing the protagonist.',
  plot: 'A plot is the sequence of events that make up a story.',
  theme: 'A theme is the main idea or message of a story.',
  tone: 'The tone of a piece of writing is the author\'s attitude toward the subject.',
  mood: 'The mood is the feeling or atmosphere a piece of writing creates for the reader.',
  irony: 'Irony is when the opposite of what is expected actually happens, or what is said differs from what is meant.',
  symbolism: 'Symbolism is the use of symbols to represent ideas or qualities.',
  hola: 'Hola means hello in Spanish.',
  adios: 'Adiós means goodbye in Spanish.',
  gracias: 'Gracias means thank you in Spanish.',
  'por favor': 'Por favor means please in Spanish.',
  'de nada': 'De nada means you\'re welcome in Spanish.',
  si: 'Sí means yes in Spanish.',
  no: 'No means no in Spanish.',
  bien: 'Bien means well or good in Spanish.',
  mal: 'Mal means bad or poorly in Spanish.',
  agua: 'Agua means water in Spanish.',
  comida: 'Comida means food in Spanish.',
  amigo: 'Amigo means friend in Spanish.',
  familia: 'Familia means family in Spanish.',
  casa: 'Casa means house in Spanish.',
  libro: 'Libro means book in Spanish.',
  escuela: 'Escuela means school in Spanish.',
  profesor: 'Profesor means teacher in Spanish.',
  estudiante: 'Estudiante means student in Spanish.',
  dia: 'Día means day in Spanish.',
  noche: 'Noche means night in Spanish.',
  tiempo: 'Tiempo means time or weather in Spanish.',
  numero: 'Número means number in Spanish.',
  color: 'Color means color in Spanish.',
  trabajo: 'Trabajo means work or job in Spanish.',
  dinero: 'Dinero means money in Spanish.',
  algebra: 'Algebra is the branch of mathematics dealing with symbols and their operations. It involves solving equations, working with polynomials, and manipulating expressions.',
  geometry: 'Geometry studies shapes, sizes, and properties of figures in space. It covers points, lines, planes, angles, triangles, circles, and three-dimensional solids.',
  trigonometry: 'Trigonometry studies relationships between sides and angles in triangles. Key functions include sine, cosine, and tangent.',
  matrix: 'A matrix is a rectangular array of numbers arranged in rows and columns. Matrices are used to solve systems of equations and represent transformations.',
  equation: 'An equation is a mathematical statement that two expressions are equal, separated by an equals sign. Solving equations finds the values that make them true.',
  variable: 'A variable is a symbol (usually a letter) that represents an unknown number in an equation or expression.',
  coefficient: 'A coefficient is a number that multiplies a variable in an algebraic expression or equation.',
  polynomial: 'A polynomial is an expression made of variables and constants combined using addition, subtraction, and multiplication.',
  exponent: 'An exponent is a number that tells how many times a base number is multiplied by itself.',
  logarithm: 'A logarithm is the inverse of an exponent. If b^x = a, then log_b(a) = x.',
  probability: 'Probability measures the likelihood of an event occurring, expressed as a number between 0 and 1.',
  statistics: 'Statistics is the branch of mathematics that collects, analyzes, and interprets data.',
  mean: 'The mean is the average of a set of numbers, calculated by summing all values and dividing by the count.',
  median: 'The median is the middle value in a sorted list of numbers.',
  mode: 'The mode is the value that appears most frequently in a dataset.',
  vector: 'A vector is a quantity with both magnitude and direction, often represented as an arrow.',
  scalar: 'A scalar is a quantity with only magnitude, no direction.',
  sequence: 'A sequence is an ordered list of numbers following a specific pattern or rule.',
  series: 'A series is the sum of the terms in a sequence.',
  element: 'An element is a pure substance made of only one type of atom, characterized by its atomic number.',
  compound: 'A compound is a substance made of two or more elements chemically bonded in a fixed ratio.',
  isotope: 'An isotope is a variant of an element with the same number of protons but different numbers of neutrons.',
  ion: 'An ion is an atom or molecule with a net electric charge, having gained or lost electrons.',
  cation: 'A cation is an ion with a positive charge, formed when an atom loses electrons.',
  anion: 'An anion is an ion with a negative charge, formed when an atom gains electrons.',
  oxidation: 'Oxidation is a chemical process where a substance loses electrons, often involving a reaction with oxygen.',
  reduction: 'Reduction is a chemical process where a substance gains electrons.',
  acid: 'An acid is a substance that donates protons (H+) in solution, has a pH less than 7, and tastes sour.',
  base: 'A base is a substance that accepts protons in solution, has a pH greater than 7, and feels slippery.',
  salt: 'A salt is an ionic compound formed from the reaction of an acid and a base.',
  'ph scale': 'The pH scale measures acidity or basicity of a substance from 0 to 14, with 7 being neutral.',
  catalyst: 'A catalyst is a substance that speeds up a chemical reaction without being consumed in the process.',
  reactant: 'A reactant is a substance that participates in and is consumed during a chemical reaction.',
  product: 'A product is a substance produced as a result of a chemical reaction.',
  'equilibrium': 'Chemical equilibrium is the state where forward and reverse reaction rates are equal, and concentrations remain constant.',
  'molar mass': 'Molar mass is the mass of one mole of a substance, expressed in grams per mole.',
  'mole': 'A mole is a unit of measurement equal to Avogadro\'s number (6.022 × 10^23) of particles.',
  'valence': 'Valence is the combining power of an element, relating to how many electrons it can share or transfer.',
  'electron configuration': 'Electron configuration describes the arrangement of electrons around an atom in shells and subshells.',
  'chemical bond': 'A chemical bond is an attraction between atoms that holds them together in molecules or compounds.',
  'ionic bond': 'An ionic bond is formed between charged ions through electrostatic attraction.',
  'covalent bond': 'A covalent bond is formed when atoms share electrons.',
  'hydrogen bond': 'A hydrogen bond is a weak attraction between molecules containing hydrogen and highly electronegative atoms.',
  bitcoin: 'Bitcoin is a digital currency and store of value that operates on a distributed blockchain. It is known for volatility, decentralized control, and a limited supply.',
  portfolio: 'A portfolio is a collection of investments such as stocks, bonds, real assets, and alternatives. It should reflect your goals, risk tolerance, and time horizon.',
  diversification: 'Diversification spreads risk by holding different assets that respond differently to market conditions. It helps protect a portfolio from concentrated losses.',
  'black-owned business': 'A Black-owned business is a company founded, owned, or controlled by Black entrepreneurs. Supporting these businesses helps drive economic equity and community growth.',
  'market cap': 'Market cap (market capitalization) is the total value of a company\'s outstanding stock shares.',
  'p/e ratio': 'The P/E ratio (price-to-earnings) compares a company\'s stock price to its earnings per share.',
  'roi': 'ROI (return on investment) measures the profit made on an investment as a percentage of the initial investment.',
  'interest rate': 'An interest rate is the percentage charged or earned on borrowed or saved money.',
  'dividend': 'A dividend is a portion of company profits distributed to shareholders.',
  'ipo': 'An IPO (initial public offering) is when a company first sells its stock to the public.',
  'bull market': 'A bull market is a prolonged period when stock prices are rising and investor confidence is high.',
  'bear market': 'A bear market is a prolonged period when stock prices are falling and investor confidence is low.',
  'volatility': 'Volatility measures how much an asset\'s price fluctuates over time.'
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
    patterns: [/calculus|derivative|integral|limit|continuous/i],
    response: 'Calculus studies change and accumulation. Derivatives measure rates of change (slopes), integrals calculate accumulated quantities (areas), and limits describe behavior approaching values. These concepts are fundamental to physics, engineering, and economics.'
  },
  {
    patterns: [/algebra|polynomial|equation|variable|solve/i],
    response: 'Algebra uses symbols and operations to solve problems. You work with variables, manipulate equations, and find unknown values. It\'s the foundation for higher mathematics and essential for physics, chemistry, and engineering.'
  },
  {
    patterns: [/geometry|triangle|circle|angle|shape|area|volume|space/i],
    response: 'Geometry studies shapes, sizes, and properties of figures. It covers points, lines, planes, angles, polygons, circles, and solids. Geometry is crucial for architecture, engineering, physics, and art.'
  },
  {
    patterns: [/trigonometry|sine|cosine|tangent|sin|cos|tan/i],
    response: 'Trigonometry explores relationships between sides and angles in triangles. The primary functions are sine, cosine, and tangent. It\'s used in physics, engineering, astronomy, and navigation.'
  },
  {
    patterns: [/probability|statistics|mean|median|mode|average|distribution/i],
    response: 'Statistics collects and analyzes data. Key measures include mean (average), median (middle value), and mode (most frequent). Understanding distributions helps interpret data and make predictions.'
  },
  {
    patterns: [/bond|ionic|covalent|hydrogen|metallic|chemical bond/i],
    response: 'Chemical bonds hold atoms together. Ionic bonds form between charged ions, covalent bonds involve shared electrons, and hydrogen bonds are weak interactions. Bond type determines compound properties.'
  },
  {
    patterns: [/acid|base|ph|salt|neutral|alkaline|buffer/i],
    response: 'Acids donate protons (pH < 7), bases accept protons (pH > 7), and neutral solutions have pH = 7. Salts form from acid-base reactions. Buffers resist pH changes and are critical in biochemistry.'
  },
  {
    patterns: [/oxidation|reduction|redox|electron transfer/i],
    response: 'Redox reactions involve electron transfer. Oxidation loses electrons, reduction gains electrons. These reactions power batteries, fuel cells, and cellular respiration. They\'re fundamental to energy production.'
  },
  {
    patterns: [/catalyst|enzyme|reaction rate|equilibrium/i],
    response: 'Catalysts speed up reactions without being consumed. Enzymes are biological catalysts. Equilibrium is reached when forward and reverse reactions balance. These concepts control reaction speed and direction.'
  },
  {
    patterns: [/stoichiometry|mole|molar mass|balancing equation/i],
    response: 'Stoichiometry quantifies chemical reactions. A mole equals 6.022 × 10^23 particles. Molar mass is grams per mole. Balancing equations ensures atoms are conserved and lets you calculate reactants and products.'
  },
  {
    patterns: [/dna|rna|gene|chromosome|genetic|inheritance|trait/i],
    response: 'DNA carries genetic instructions. Genes are DNA segments coding for traits. RNA transfers genetic information for protein synthesis. Chromosomes package DNA. Understanding genetics explains inheritance and evolution.'
  },
  {
    patterns: [/photosynthesis|respiration|atp|energy|glucose|metabolism/i],
    response: 'Photosynthesis converts light into chemical energy (glucose). Respiration releases that energy (ATP). ATP powers cellular work. These complementary processes cycle energy through ecosystems and sustain life.'
  },
  {
    patterns: [/protein|amino acid|enzyme|catalyst|structure|function/i],
    response: 'Proteins are amino acid chains. They perform countless functions: structure, catalysts (enzymes), signals, defense. Protein shape determines function. Understanding proteins explains how cells work.'
  },
  {
    patterns: [/evolution|natural selection|mutation|adaptation|speciation|diversity/i],
    response: 'Evolution is organisms changing over time through natural selection. Mutations create variation. Beneficial traits increase reproduction. Evolution explains adaptation, diversity, and life\'s history on Earth.'
  },
  {
    patterns: [/ecology|ecosystem|population|community|organism|environment/i],
    response: 'Ecology studies interactions between organisms and environments. Ecosystems contain communities (populations of species). Energy flows, nutrients cycle. Understanding ecology reveals how life sustains itself on Earth.'
  },
  {
    patterns: [/diffusion|osmosis|transport|membrane|concentration|gradient/i],
    response: 'Diffusion is particle movement from high to low concentration. Osmosis is water movement. Both are passive (no energy needed). Active transport uses energy. These processes move materials across membranes.'
  },
  {
    patterns: [/grammar|noun|verb|adjective|adverb|pronoun|preposition|conjunction/i],
    response: 'Grammar is the language system. Nouns name things, verbs show action, adjectives describe, adverbs modify verbs. Prepositions show relationships, conjunctions connect ideas. Pronouns replace nouns. Mastering grammar improves communication.'
  },
  {
    patterns: [/figure of speech|metaphor|simile|idiom|personification|hyperbole/i],
    response: 'Figures of speech enrich language. Metaphors compare by stating one thing IS another. Similes compare using like/as. Idioms have non-literal meanings. These techniques make writing vivid and engaging.'
  },
  {
    patterns: [/literature|plot|character|theme|setting|conflict|resolution/i],
    response: 'Literature elements create stories. Plot is the sequence of events. Characters drive the story. Theme is the main message. Setting is where and when. Conflict creates tension and resolution provides closure.'
  },
  {
    patterns: [/tone|mood|alliteration|onomatopoeia|symbolism|irony|pun/i],
    response: 'Literary devices add depth. Tone is the author\'s attitude, mood is the reader\'s feeling. Alliteration repeats sounds, onomatopoeia imitates sounds. Symbolism uses objects for ideas. Irony contrasts expectation and reality. Puns play on words.'
  },
  {
    patterns: [/spanish|hola|adios|gracias|por favor|de nada|si|no|bien|mal/i],
    response: 'Spanish basics: Hola (hello), Adiós (goodbye), Gracias (thank you), Por favor (please), De nada (you\'re welcome), Sí (yes), No (no), Bien (well), Mal (bad). These common phrases are essential for basic Spanish communication.'
  },
  {
    patterns: [/spanish|agua|comida|casa|libro|escuela|familia|amigo|tiempo|trabajo/i],
    response: 'Useful Spanish vocabulary: Agua (water), Comida (food), Casa (house), Libro (book), Escuela (school), Familia (family), Amigo (friend), Tiempo (time), Trabajo (work). Learning common nouns helps describe daily life and communicate needs.'
  },
  {
    patterns: [/spanish|learning|conjugation|verb|tense|preterite|present|future/i],
    response: 'Spanish verbs conjugate by tense and subject. Present describes current action, preterite describes past completed actions, future describes upcoming events. Irregular verbs don\'t follow standard patterns. Verbs are key to Spanish communication.'
  },
  {
    patterns: [/how does|how do|how can|how to|way to|method for/i],
    response: 'I can explain processes and methods across many topics. Ask me how something works—whether it\'s photosynthesis, derivatives, Spanish grammar, or investing strategies—and I\'ll break it down into clear steps.'
  },
  {
    patterns: [/difference|between|compare|similar|same/i],
    response: 'I can compare concepts from any field. Ask me the difference between related terms—like metaphor vs. simile, mitochondria vs. chloroplast, or stocks vs. bonds—and I\'ll explain the key distinctions.'
  },
  {
    patterns: [/example|for instance|such as|like/i],
    response: 'I can provide examples to illustrate concepts. Ask for an example of any term or concept from investing, math, science, English, or Spanish, and I\'ll give you a practical, easy-to-understand illustration.'
  },
  {
    patterns: [/define|definition|meaning|what does .* mean|what is .*|explain .*|describe .*/i],
    response: 'I can define terms and explain concepts across investing, math, science, English, Spanish, and business. Ask me to define a specific word or explain a concept, and I\'ll provide a clear, concise answer.'
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

// ===== GAMES SYSTEM =====

// Stock Trader Game
let traderState = { cash: 10000, holdings: {} };

const startStockTraderGame = () => {
  traderState = { cash: 10000, holdings: {} };
  document.getElementById('trader-game').style.display = 'block';
  updateTraderDisplay();
};

const closeStockTraderGame = () => {
  document.getElementById('trader-game').style.display = 'none';
};

const updateTraderDisplay = () => {
  const portfolio = Object.values(traderState.holdings).reduce((sum, h) => sum + h.value, 0);
  const total = traderState.cash + portfolio;
  
  document.getElementById('trader-cash').textContent = '$' + traderState.cash.toLocaleString('en-US', { maximumFractionDigits: 0 });
  document.getElementById('trader-portfolio').textContent = '$' + portfolio.toLocaleString('en-US', { maximumFractionDigits: 0 });
  document.getElementById('trader-total').textContent = '$' + total.toLocaleString('en-US', { maximumFractionDigits: 0 });
  
  const holdingsList = document.getElementById('trader-holdings');
  if (Object.keys(traderState.holdings).length === 0) {
    holdingsList.innerHTML = '<p style="color: var(--muted); text-align: center;">No holdings yet. Buy some stocks!</p>';
    return;
  }
  
  holdingsList.innerHTML = Object.entries(traderState.holdings).map(([symbol, holding]) => `
    <div class="holding">
      <div>
        <strong>${symbol}</strong> - ${holding.shares} shares @ $${holding.pricePerShare.toFixed(2)} = $${holding.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </div>
      <button onclick="sellAllStock('${symbol}')">Sell All</button>
    </div>
  `).join('');
};

const buyStock = () => {
  const symbol = document.getElementById('trader-stock').value;
  const shares = parseInt(document.getElementById('trader-shares').value);
  const price = latestStockData[symbol]?.price || 100 + Math.random() * 50;
  const cost = price * shares;
  
  if (cost > traderState.cash) {
    alert(`Not enough cash! You need $${cost.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);
    return;
  }
  
  traderState.cash -= cost;
  if (!traderState.holdings[symbol]) {
    traderState.holdings[symbol] = { shares: 0, value: 0, pricePerShare: 0 };
  }
  
  const holding = traderState.holdings[symbol];
  holding.shares += shares;
  holding.value += cost;
  holding.pricePerShare = holding.value / holding.shares;
  
  updateTraderDisplay();
  alert(`✅ Bought ${shares} shares of ${symbol}`);
};

const sellStock = () => {
  const symbol = document.getElementById('trader-stock').value;
  const holding = traderState.holdings[symbol];
  
  if (!holding) {
    alert('You don\'t own this stock!');
    return;
  }
  
  const shares = parseInt(document.getElementById('trader-shares').value);
  if (shares > holding.shares) {
    alert(`You only own ${holding.shares} shares`);
    return;
  }
  
  const price = latestStockData[symbol]?.price || 100 + Math.random() * 50;
  const proceeds = price * shares;
  const profitLoss = (price - holding.pricePerShare) * shares;
  
  traderState.cash += proceeds;
  holding.shares -= shares;
  holding.value -= holding.pricePerShare * shares;
  
  if (holding.shares === 0) {
    delete traderState.holdings[symbol];
  }
  
  updateTraderDisplay();
  const profitText = profitLoss >= 0 ? `✅ Profit: $${profitLoss.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `❌ Loss: $${Math.abs(profitLoss).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  alert(`Sold ${shares} shares of ${symbol}\n${profitText}`);
};

const sellAllStock = (symbol) => {
  document.getElementById('trader-stock').value = symbol;
  document.getElementById('trader-shares').value = traderState.holdings[symbol].shares;
  sellStock();
};

// Definition Matcher Game
let matcherState = { matched: 0, selected: null, pairs: [] };

const matcherTerms = [
  { term: 'Photosynthesis', def: 'Process plants use to convert light into glucose' },
  { term: 'Mitochondria', def: 'Cellular organelle that produces energy (ATP)' },
  { term: 'Derivative', def: 'Measure of how a function changes at a point' },
  { term: 'Portfolio', def: 'Collection of investments like stocks and bonds' },
  { term: 'Entropy', def: 'Measure of disorder in a system' },
  { term: 'Bitcoin', def: 'Decentralized digital currency on blockchain' }
];

const startMatcherGame = () => {
  matcherState = { matched: 0, selected: null, pairs: [] };
  const container = document.getElementById('matcher-container');
  const terms = matcherTerms.sort(() => Math.random() - 0.5);
  
  const left = terms.slice(0, 3);
  const right = terms.slice(3);
  
  container.innerHTML = `
    <div class="matcher-group">
      <h4>Terms</h4>
      ${left.map((item, i) => `<div class="matcher-item" onclick="selectMatcher(0, ${i})" id="term-0-${i}">${item.term}</div>`).join('')}
    </div>
    <div class="matcher-group">
      <h4>Definitions</h4>
      ${right.map((item, i) => `<div class="matcher-item" onclick="selectMatcher(1, ${i})" id="def-1-${i}">${item.def}</div>`).join('')}
    </div>
  `;
  
  matcherState.pairs = terms.map((t, i) => [Math.floor(i / 3), i % 3, t]);
  document.getElementById('matcher-game').style.display = 'block';
};

const closeMatcherGame = () => {
  document.getElementById('matcher-game').style.display = 'none';
};

const selectMatcher = (side, index) => {
  const id = `${side === 0 ? 'term' : 'def'}-${side}-${index}`;
  const elem = document.getElementById(id);
  
  if (elem.classList.contains('matched')) return;
  
  if (!matcherState.selected) {
    matcherState.selected = { side, index, elem };
    elem.classList.add('selected');
  } else {
    const other = matcherState.selected;
    if (other.side === side && other.index === index) {
      elem.classList.remove('selected');
      matcherState.selected = null;
      return;
    }
    
    const pair = matcherState.pairs.find(p => p[0] === other.side && p[1] === other.index);
    const otherPair = matcherState.pairs.find(p => p[0] === side && p[1] === index);
    
    if (pair === otherPair) {
      other.elem.classList.remove('selected');
      other.elem.classList.add('matched');
      elem.classList.add('matched');
      matcherState.matched += 1;
      
      if (matcherState.matched === 3) {
        setTimeout(() => alert('🎉 Perfect match! All pairs found!'), 300);
      }
    } else {
      other.elem.classList.remove('selected');
      elem.classList.add('selected');
      matcherState.selected = { side, index, elem };
    }
  }
  
  document.getElementById('matcher-score').textContent = `${matcherState.matched}/6`;
};

// Trivia Game
let triviaState = { score: 0, current: 0, answered: false };

const triviaQuestions = [
  { q: 'What is the smallest unit of life?', a: 'Cell', opts: ['Cell', 'Atom', 'Molecule', 'Gene'] },
  { q: 'Which organelle produces energy?', a: 'Mitochondria', opts: ['Ribosome', 'Mitochondria', 'Nucleus', 'Golgi'] },
  { q: 'What does DNA stand for?', a: 'Deoxyribonucleic Acid', opts: ['Deoxyribonucleic Acid', 'Digital Network Access', 'Data Not Available', 'Direct Neural Array'] },
  { q: 'In physics, what is measured in joules?', a: 'Energy', opts: ['Force', 'Energy', 'Momentum', 'Velocity'] },
  { q: 'What is the pH of a neutral solution?', a: '7', opts: ['0', '7', '14', '10'] },
  { q: 'Bitcoin operates on which technology?', a: 'Blockchain', opts: ['Cloud', 'Blockchain', 'Quantum', 'AI'] },
  { q: 'What does ROI stand for?', a: 'Return on Investment', opts: ['Rate of Interest', 'Return on Investment', 'Risk of Impact', 'Revenue on Income'] },
  { q: 'Which is a figure of speech?', a: 'Metaphor', opts: ['Noun', 'Verb', 'Metaphor', 'Preposition'] },
  { q: 'What does a derivative measure?', a: 'Rate of change', opts: ['Total distance', 'Rate of change', 'Average speed', 'Final value'] },
  { q: 'Spanish word for friend?', a: 'Amigo', opts: ['Hermano', 'Amigo', 'Padre', 'Libro'] }
];

const startTriviaGame = () => {
  triviaState = { score: 0, current: 0, answered: false };
  document.getElementById('trivia-game').style.display = 'block';
  showTriviaQuestion();
};

const closeTriviaGame = () => {
  document.getElementById('trivia-game').style.display = 'none';
};

const showTriviaQuestion = () => {
  if (triviaState.current >= triviaQuestions.length) {
    const container = document.getElementById('trivia-container');
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <h3>Game Over!</h3>
        <p style="font-size: 1.5rem; margin: 1rem 0;">You scored ${triviaState.score} out of ${triviaQuestions.length}</p>
        <p style="color: var(--muted);">${triviaState.score === triviaQuestions.length ? '🌟 Perfect score!' : triviaState.score >= 7 ? '🎉 Great job!' : 'Keep learning!'}</p>
      </div>
    `;
    return;
  }
  
  const q = triviaQuestions[triviaState.current];
  const container = document.getElementById('trivia-container');
  triviaState.answered = false;
  
  container.innerHTML = `
    <div class="trivia-question">
      <h4>${triviaState.current + 1}. ${q.q}</h4>
      <div class="trivia-options">
        ${q.opts.map(opt => `<div class="trivia-option" onclick="answerTrivia('${opt}', '${q.a}')">${opt}</div>`).join('')}
      </div>
    </div>
  `;
};

const answerTrivia = (selected, correct) => {
  if (triviaState.answered) return;
  triviaState.answered = true;
  
  const options = document.querySelectorAll('.trivia-option');
  options.forEach(opt => {
    opt.style.pointerEvents = 'none';
    if (opt.textContent === correct) {
      opt.classList.add('correct');
    } else if (opt.textContent === selected && selected !== correct) {
      opt.classList.add('incorrect');
    }
  });
  
  if (selected === correct) {
    triviaState.score += 1;
  }
  
  document.getElementById('trivia-score').textContent = triviaState.score;
  
  setTimeout(() => {
    triviaState.current += 1;
    showTriviaQuestion();
  }, 1500);
};

// Portfolio Allocator Game
let portfolioState = { allocations: {} };

const startPortfolioGame = () => {
  portfolioState = {
    stocks: 0,
    bonds: 0,
    crypto: 0,
    realestate: 0,
    cash: 0
  };
  
  const container = document.getElementById('portfolio-container');
  container.innerHTML = `
    <div class="allocation-item">
      <div class="allocation-label">📈 Stocks</div>
      <div class="allocation-input"><input type="range" id="stocks" min="0" max="100000" value="0" oninput="updatePortfolioDisplay()"></div>
      <div class="allocation-value">$<span id="stocks-val">0</span></div>
    </div>
    <div class="allocation-item">
      <div class="allocation-label">📊 Bonds</div>
      <div class="allocation-input"><input type="range" id="bonds" min="0" max="100000" value="0" oninput="updatePortfolioDisplay()"></div>
      <div class="allocation-value">$<span id="bonds-val">0</span></div>
    </div>
    <div class="allocation-item">
      <div class="allocation-label">₿ Crypto</div>
      <div class="allocation-input"><input type="range" id="crypto" min="0" max="100000" value="0" oninput="updatePortfolioDisplay()"></div>
      <div class="allocation-value">$<span id="crypto-val">0</span></div>
    </div>
    <div class="allocation-item">
      <div class="allocation-label">🏠 Real Estate</div>
      <div class="allocation-input"><input type="range" id="realestate" min="0" max="100000" value="0" oninput="updatePortfolioDisplay()"></div>
      <div class="allocation-value">$<span id="realestate-val">0</span></div>
    </div>
    <div class="allocation-item">
      <div class="allocation-label">💰 Cash</div>
      <div class="allocation-input"><input type="range" id="cash" min="0" max="100000" value="20000" oninput="updatePortfolioDisplay()"></div>
      <div class="allocation-value">$<span id="cash-val">20000</span></div>
    </div>
  `;
  
  document.getElementById('portfolio-game').style.display = 'block';
  updatePortfolioDisplay();
};

const closePortfolioGame = () => {
  document.getElementById('portfolio-game').style.display = 'none';
};

const updatePortfolioDisplay = () => {
  const stocks = parseInt(document.getElementById('stocks').value);
  const bonds = parseInt(document.getElementById('bonds').value);
  const crypto = parseInt(document.getElementById('crypto').value);
  const realestate = parseInt(document.getElementById('realestate').value);
  const cash = parseInt(document.getElementById('cash').value);
  
  const total = stocks + bonds + crypto + realestate + cash;
  
  document.getElementById('stocks-val').textContent = stocks.toLocaleString();
  document.getElementById('bonds-val').textContent = bonds.toLocaleString();
  document.getElementById('crypto-val').textContent = crypto.toLocaleString();
  document.getElementById('realestate-val').textContent = realestate.toLocaleString();
  document.getElementById('cash-val').textContent = cash.toLocaleString();
  
  document.getElementById('portfolio-total').textContent = `$${total.toLocaleString()} / $100,000`;
  
  if (total === 100000) {
    const stocks_pct = Math.round(stocks / 1000);
    const bonds_pct = Math.round(bonds / 1000);
    const crypto_pct = Math.round(crypto / 1000);
    const re_pct = Math.round(realestate / 1000);
    const cash_pct = Math.round(cash / 1000);
    
    let advice = '';
    if (crypto_pct > 30) advice = '⚠️ Very high crypto exposure—risky!';
    else if (stocks_pct > 60) advice = '📈 Growth-focused portfolio';
    else if (bonds_pct > 40) advice = '🛡️ Conservative, income-focused';
    else if (cash_pct > 30) advice = '💰 Defensive stance with dry powder';
    else advice = '⚖️ Well-diversified portfolio!';
    
    document.getElementById('portfolio-result').innerHTML = `
      <h4>Your Allocation:</h4>
      <p>📈 Stocks: ${stocks_pct}%</p>
      <p>📊 Bonds: ${bonds_pct}%</p>
      <p>₿ Crypto: ${crypto_pct}%</p>
      <p>🏠 Real Estate: ${re_pct}%</p>
      <p>💰 Cash: ${cash_pct}%</p>
      <p style="margin-top: 1rem; font-weight: 600;">${advice}</p>
    `;
  } else {
    document.getElementById('portfolio-result').innerHTML = `<p style="color: var(--muted);">Allocate $${(100000 - total).toLocaleString()} more to complete your portfolio.</p>`;
  }
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

const suits = ["H", "S", "D", "C"];
const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const suitSymbols = { H: "♥", S: "♠", D: "♦", C: "♣" };
const suitColors = { H: "red", S: "black", D: "red", C: "black" };

let gameState = {
  players: [],
  communityCards: [],
  pot: 0,
  currentBet: 0,
  currentPlayerIndex: 0,
  stage: 'preflop',
  deck: [],
  dealerIndex: 0,
  bettingRound: 0
};

function createDeck() {
  const deck = [];
  for (let s of suits) {
    for (let v of values) {
      deck.push({ suit: s, value: v, name: `${v}${s}` });
    }
  }
  return deck;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function createCardElement(card, faceUp = true) {
  const div = document.createElement('div');
  div.className = `card ${faceUp ? suitColors[card.suit] : 'face-down'}`;

  // Helper maps to match filenames in assets folder
  function suitToName(s) {
    switch (s) {
      case 'H': return 'Hearts';
      case 'S': return 'Spades';
      case 'D': return 'Diamonds';
      case 'C': return 'Clubs';
      default: return 'Other';
    }
  }

  function valueToName(v) {
    if (v === 'A') return 'Ace';
    if (v === 'K') return 'King';
    if (v === 'Q') return 'Queen';
    if (v === 'J') return 'Jack';
    return v; // numbers (2-10)
  }

  if (faceUp) {
    const suitName = suitToName(card.suit);
    const valueName = valueToName(card.value);
    const filename = `Suit=${suitName}, Number=${valueName}.png`;
    const img = document.createElement('img');
    img.src = `assets/${filename}`;
    img.alt = `${card.value}${card.suit}`;
    div.appendChild(img);
  } else {
    // Prefer blue back if available
    const backFilename = 'Suit=Other, Number=Back Blue.png';
    const img = document.createElement('img');
    img.src = `assets/${backFilename}`;
    img.alt = 'card back';
    div.appendChild(img);
  }

  return div;
}

function displayCards(containerId, cards, showFaceUp = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = "";
  cards.forEach(card => {
    container.appendChild(createCardElement(card, showFaceUp));
  });
}

function setupPlayerSlots(numPlayers) {
  const opponentContainer = document.getElementById("opponent-slots");
  opponentContainer.innerHTML = "";
  
  const botNames = ["Buck", "Aggie Spirit", "Jack", "Maroon Ace", "12th Man", "Hullabaloo"];
  
  for (let i = 2; i <= numPlayers + 1; i++) {
    const slot = document.createElement("div");
    slot.className = `player-slot pos-${i}`;
    slot.id = `player-${i}`;
    
    slot.innerHTML = `
      <div class="hand" id="player-cards-${i}"></div>
      <div class="player-info">
        <div class="player-name">${botNames[i - 2] || 'Bot ' + (i - 1)}</div>
        <div class="player-chips" id="player-chips-${i}">$1000</div>
        <div class="player-status" id="player-status-${i}"></div>
      </div>
    `;
    
    opponentContainer.appendChild(slot);
  }
}

function updateChips(playerId, amount) {
  if (playerId === 'dealer') {
    const el = document.getElementById('dealer-chips');
    if (el) el.textContent = `$${amount}`; // dealer may not have a chips box
  } else {
    const el = document.getElementById(`player-chips-${playerId}`);
    if (el) el.textContent = `$${amount}`;
  }
}

function updateStatus(playerId, status) {
  let el;
  if (playerId === 'dealer') {
    el = document.getElementById('dealer-status');
  } else {
    el = document.getElementById(`player-status-${playerId}`);
  }

  if (!el) return; // nothing to update for dealer if the element was removed

  el.textContent = status;
  el.className = 'player-status' + (status.includes('Turn') || status.includes('Thinking') ? ' active' : '');
}

function updatePot() {
  document.getElementById('pot-amount').textContent = gameState.pot;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startGame() {
  const numOpponents = parseInt(document.getElementById('num-players').value);
  if (numOpponents < 1 || numOpponents > 6) {
    alert('Please choose 1-6 opponents');
    return;
  }

  document.getElementById('start-game').disabled = true;
  setupPlayerSlots(numOpponents);
  
  // Clear table
  document.getElementById('community-cards').innerHTML = "";
  const dealerCardsEl = document.getElementById('dealer-cards');
  if (dealerCardsEl) dealerCardsEl.innerHTML = "";
  document.getElementById('player-cards-1').innerHTML = "";
  
  // Reset all player slots
  for (let i = 2; i <= 7; i++) {
    const slot = document.getElementById(`player-${i}`);
    if (slot) slot.classList.remove('folded');
  }
  document.getElementById('dealer').classList.remove('folded');
  
  // Initialize players
  gameState.players = [];
  gameState.players.push({ 
    id: 1, 
    chips: 1000, 
    cards: [], 
    currentBet: 0, 
    folded: false, 
    isHuman: true 
  });
  
  for (let i = 2; i <= numOpponents + 1; i++) {
    gameState.players.push({ 
      id: i, 
      chips: 1000, 
      cards: [], 
      currentBet: 0, 
      folded: false, 
      isHuman: false 
    });
  }
  
  // Add dealer
  gameState.dealerIndex = gameState.players.length;
  gameState.players.push({ 
    id: 'dealer', 
    chips: 1000, 
    cards: [], 
    currentBet: 0, 
    folded: false, 
    isHuman: false 
  });
  
  // Deal cards
  gameState.deck = createDeck();
  shuffle(gameState.deck);
  
  let index = 0;
  for (let player of gameState.players) {
    player.cards = [gameState.deck[index++], gameState.deck[index++]];
    const containerId = player.id === 'dealer' ? 'dealer-cards' : `player-cards-${player.id}`;
    // Only display if the container exists in DOM (dealer may not have a container)
    if (document.getElementById(containerId)) {
      displayCards(containerId, player.cards, player.isHuman);
    }
  }
  
  // Community cards
  index++; // burn
  gameState.communityCards = gameState.deck.slice(index, index + 5);
  
  gameState.pot = 0;
  gameState.currentBet = 0;
  gameState.stage = 'preflop';
  gameState.currentPlayerIndex = -1;
  gameState.bettingRound = 0;
  
  document.getElementById('pot-display').classList.remove('hidden');
  updatePot();
  
  await sleep(1000);
  nextTurn();
}

async function nextTurn() {
  const activePlayers = gameState.players.filter(p => !p.folded);
  
  if (activePlayers.length === 1) {
    await declareWinner(activePlayers[0]);
    return;
  }
  
  let startIndex = gameState.currentPlayerIndex;
  do {
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
  } while (gameState.players[gameState.currentPlayerIndex].folded);
  
  const player = gameState.players[gameState.currentPlayerIndex];
  
  // Check if betting round complete
  const allBetsEqual = activePlayers.every(p => 
    p.currentBet === gameState.currentBet || p.chips === 0
  );
  
  if (allBetsEqual && gameState.currentPlayerIndex === 0 && gameState.bettingRound > 0) {
    advanceStage();
    return;
  }
  
  gameState.bettingRound++;
  
  // Clear all statuses
  gameState.players.forEach(p => {
    const id = p.id === 'dealer' ? 'dealer' : p.id;
    if (p !== player) updateStatus(id, '');
  });
  
  if (player.isHuman) {
    showPlayerActions();
  } else {
    await processBotTurn();
  }
}

function showPlayerActions() {
  const player = gameState.players[gameState.currentPlayerIndex];
  updateStatus(player.id, 'Your Turn!');
  
  document.getElementById('action-buttons').classList.remove('hidden');
  document.getElementById('fold-btn').disabled = false;
  
  const callAmount = gameState.currentBet - player.currentBet;
  
  if (callAmount === 0) {
    document.getElementById('check-btn').classList.remove('hidden');
    document.getElementById('call-btn').classList.add('hidden');
  } else {
    document.getElementById('check-btn').classList.add('hidden');
    document.getElementById('call-btn').classList.remove('hidden');
    document.getElementById('call-amount').textContent = Math.min(callAmount, player.chips);
  }
  
  document.getElementById('raise-btn').disabled = player.chips === 0;
}

function hidePlayerActions() {
  document.getElementById('action-buttons').classList.add('hidden');
}

async function processBotTurn() {
  const player = gameState.players[gameState.currentPlayerIndex];
  const playerId = player.id === 'dealer' ? 'dealer' : player.id;
  
  updateStatus(playerId, 'Thinking...');
  await sleep(1200);
  
  const decision = botDecision(player);
  await executeAction(player, decision);
  
  await sleep(800);
  nextTurn();
}

function botDecision(player) {
  const callAmount = gameState.currentBet - player.currentBet;
  const rand = Math.random();
  
  if (callAmount === 0) {
    if (rand < 0.5) {
      return { action: 'check' };
    } else {
      const raiseAmount = Math.floor(Math.random() * 100) + 20;
      return { action: 'raise', amount: Math.min(raiseAmount, player.chips) };
    }
  } else {
    if (rand < 0.25) {
      return { action: 'fold' };
    } else if (rand < 0.75) {
      return { action: 'call', amount: Math.min(callAmount, player.chips) };
    } else {
      const raiseAmount = Math.floor(Math.random() * 100) + 50;
      return { action: 'raise', amount: Math.min(raiseAmount, player.chips) };
    }
  }
}

async function executeAction(player, decision) {
  const playerId = player.id === 'dealer' ? 'dealer' : player.id;
  
  if (decision.action === 'fold') {
    player.folded = true;
    const slotId = player.id === 'dealer' ? 'dealer' : `player-${player.id}`;
    document.getElementById(slotId).classList.add('folded');
    updateStatus(playerId, 'Folded');
  } else if (decision.action === 'check') {
    updateStatus(playerId, 'Checked');
  } else if (decision.action === 'call') {
    const amount = decision.amount;
    player.chips -= amount;
    player.currentBet += amount;
    gameState.pot += amount;
    updateChips(playerId, player.chips);
    updatePot();
    updateStatus(playerId, `Called $${amount}`);
  } else if (decision.action === 'raise') {
    const amount = decision.amount;
    player.chips -= amount;
    player.currentBet += amount;
    gameState.currentBet = player.currentBet;
    gameState.pot += amount;
    updateChips(playerId, player.chips);
    updatePot();
    updateStatus(playerId, `Raised to $${player.currentBet}`);
  }
}

async function advanceStage() {
  // Reset bets for next round
  gameState.players.forEach(p => p.currentBet = 0);
  gameState.currentBet = 0;
  gameState.bettingRound = 0;
  
  if (gameState.stage === 'preflop') {
    gameState.stage = 'flop';
    displayCards('community-cards', gameState.communityCards.slice(0, 3), true);
    await sleep(1500);
  } else if (gameState.stage === 'flop') {
    gameState.stage = 'turn';
    displayCards('community-cards', gameState.communityCards.slice(0, 4), true);
    await sleep(1500);
  } else if (gameState.stage === 'turn') {
    gameState.stage = 'river';
    displayCards('community-cards', gameState.communityCards, true);
    await sleep(1500);
  } else if (gameState.stage === 'river') {
    await showdown();
    return;
  }
  
  gameState.currentPlayerIndex = -1;
  nextTurn();
}

async function showdown() {
  // Reveal all hands
  for (let player of gameState.players) {
    if (!player.folded) {
      const containerId = player.id === 'dealer' ? 'dealer-cards' : `player-cards-${player.id}`;
      if (document.getElementById(containerId)) {
        displayCards(containerId, player.cards, true);
      }
    }
  }
  
  await sleep(2000);
  
  // Simple winner determination (random for demo)
  const activePlayers = gameState.players.filter(p => !p.folded);
  const winner = activePlayers[Math.floor(Math.random() * activePlayers.length)];
  winner.chips += gameState.pot;
  
  const winnerId = winner.id === 'dealer' ? 'dealer' : winner.id;
  const winnerName = winner.id === 'dealer' ? 'Reveille' : winner.isHuman ? 'You' : `Player ${winner.id}`;
  
  updateStatus(winnerId, `Won $${gameState.pot}! 🏆`);
  updateChips(winnerId, winner.chips);
  
  await sleep(1000);
  alert(`${winnerName} won the pot of $${gameState.pot}!`);
  
  // Reset for new game
  document.getElementById('start-game').disabled = false;
  document.getElementById('pot-display').classList.add('hidden');
}

async function declareWinner(winner) {
  winner.chips += gameState.pot;
  
  const winnerId = winner.id === 'dealer' ? 'dealer' : winner.id;
  const winnerName = winner.id === 'dealer' ? 'Reveille' : winner.isHuman ? 'You' : `Player ${winner.id}`;
  
  updateStatus(winnerId, `Won $${gameState.pot}! 🏆`);
  updateChips(winnerId, winner.chips);
  
  await sleep(1000);
  alert(`${winnerName} won the pot of $${gameState.pot}! Everyone else folded.`);
  
  // Reset for new game
  document.getElementById('start-game').disabled = false;
  document.getElementById('pot-display').classList.add('hidden');
}

// Player action buttons
document.getElementById('fold-btn').addEventListener('click', async () => {
  const player = gameState.players[gameState.currentPlayerIndex];
  hidePlayerActions();
  await executeAction(player, { action: 'fold' });
  await sleep(500);
  nextTurn();
});

document.getElementById('check-btn').addEventListener('click', async () => {
  const player = gameState.players[gameState.currentPlayerIndex];
  hidePlayerActions();
  await executeAction(player, { action: 'check' });
  await sleep(500);
  nextTurn();
});

document.getElementById('call-btn').addEventListener('click', async () => {
  const player = gameState.players[gameState.currentPlayerIndex];
  const callAmount = Math.min(gameState.currentBet - player.currentBet, player.chips);
  hidePlayerActions();
  await executeAction(player, { action: 'call', amount: callAmount });
  await sleep(500);
  nextTurn();
});

document.getElementById('raise-btn').addEventListener('click', () => {
  const player = gameState.players[gameState.currentPlayerIndex];
  document.getElementById('action-buttons').classList.add('hidden');
  document.getElementById('bet-controls').classList.remove('hidden');
  
  const slider = document.getElementById('bet-slider');
  const minRaise = gameState.currentBet + 10;
  const maxRaise = player.chips + player.currentBet;
  
  slider.min = minRaise;
  slider.max = maxRaise;
  slider.value = Math.min(minRaise + 50, maxRaise);
  
  updateBetDisplay();
});

document.getElementById('bet-slider').addEventListener('input', updateBetDisplay);

function updateBetDisplay() {
  const amount = parseInt(document.getElementById('bet-slider').value);
  document.getElementById('bet-amount-display').textContent = `$${amount}`;
}

document.getElementById('confirm-bet').addEventListener('click', async () => {
  const player = gameState.players[gameState.currentPlayerIndex];
  const raiseAmount = parseInt(document.getElementById('bet-slider').value) - player.currentBet;
  
  document.getElementById('bet-controls').classList.add('hidden');
  await executeAction(player, { action: 'raise', amount: raiseAmount });
  await sleep(500);
  nextTurn();
});

document.getElementById('cancel-bet').addEventListener('click', () => {
  document.getElementById('bet-controls').classList.add('hidden');
  showPlayerActions();
});

document.getElementById('start-game').addEventListener('click', startGame);
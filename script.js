// script.js (robust version: DOMContentLoaded wrapper + console traces)
// Replace your existing script.js with this file.

document.addEventListener('DOMContentLoaded', () => {
  console.log('script.js loaded');

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
    buttonIndex: 0,
    bettingRound: 0,
    gameInProgress: false
  };

  let handComplete = false;

  // --- Hand Evaluation Constants ---
  const cardValues = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
    "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14
  };

  const handRanks = {
    HIGH_CARD: 1,
    ONE_PAIR: 2,
    TWO_PAIR: 3,
    THREE_OF_A_KIND: 4,
    STRAIGHT: 5,
    FLUSH: 6,
    FULL_HOUSE: 7,
    FOUR_OF_A_KIND: 8,
    STRAIGHT_FLUSH: 9,
    ROYAL_FLUSH: 10
  };

  // ---------- Helpers ----------
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
      return v;
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
    if (!opponentContainer) return;
    opponentContainer.innerHTML = "";

    const botNames = ["Buck", "Aggie Spirit", "Jack", "Maroon Ace", "12th Man", "Hullabaloo"];
    for (let i = 2; i <= numPlayers + 1; i++) {
      const slot = document.createElement("div");
      slot.className = `player-slot pos-${i}`;
      slot.id = `player-${i}`;

      slot.innerHTML = `
        <div class="hand" id="player-cards-${i}"></div>
        <div class="player-info">
          <div class="player-name" id="player-name-${i}">${botNames[i - 2] || 'Bot ' + (i - 1)}</div>
          <div class="player-chips" id="player-chips-${i}">$1000</div>
          <div class="player-status" id="player-status-${i}"></div>
        </div>
      `;

      opponentContainer.appendChild(slot);
    }
  }

  function updateChips(playerId, amount) {
    const el = document.getElementById(`player-chips-${playerId}`);
    if (el) el.textContent = `$${Math.max(0, Number(amount) || 0)}`;
  }

  function updateStatus(playerId, status) {
    let el = document.getElementById(`player-status-${playerId}`);
    if (!el) return;
    el.textContent = status;
    el.className = 'player-status' + (status.includes('Turn') || status.includes('Thinking') ? ' active' : '');
  }

  function updatePot() {
    const el = document.getElementById('pot-amount');
    if (!el) return;
    gameState.pot = Math.max(0, Number(gameState.pot) || 0);
    el.textContent = `${gameState.pot}`;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function safeDeduct(player, requestedAmount) {
    const amt = Math.max(0, Number(requestedAmount) || 0);
    const deduct = Math.min(amt, Math.max(0, player.chips || 0));
    player.chips = Math.max(0, (player.chips || 0) - deduct);
    return deduct;
  }

  // ---------- Core lifecycle ----------
  async function startGame() {
    try {
      const npEl = document.getElementById('num-players');
      if (!npEl) {
        alert('num-players input not found.');
        console.error('num-players input not found.');
        return;
      }

      const numOpponents = parseInt(npEl.value);
      if (isNaN(numOpponents) || numOpponents < 1 || numOpponents > 6) {
        alert('Please choose 1-6 opponents');
        return;
      }

      const startBtn = document.getElementById('start-game');
      if (startBtn) startBtn.disabled = true;
      const stopBtn = document.getElementById('stop-game-btn');
      if (stopBtn) {
        stopBtn.classList.remove('hidden');
        stopBtn.disabled = true;
      }
      const leaveBtn = document.getElementById('leave-table');
      if (leaveBtn) leaveBtn.disabled = false;

      gameState.gameInProgress = true;
      handComplete = false;

      setupPlayerSlots(numOpponents);

      // Initialize players
      gameState.players = [];
      gameState.players.push({
        id: 1,
        chips: 1000,
        cards: [],
        currentBet: 0,
        folded: false,
        isHuman: true,
        handDetails: null,
        hasActed: false
      });
      updateChips(1, 1000);

      for (let i = 2; i <= numOpponents + 1; i++) {
        gameState.players.push({
          id: i,
          chips: 1000,
          cards: [],
          currentBet: 0,
          folded: false,
          isHuman: false,
          handDetails: null,
          hasActed: false
        });
        updateChips(i, 1000);
      }

      gameState.buttonIndex = 0;
      startNewHand();
    } catch (err) {
      console.error('startGame error:', err);
      alert('An error occurred starting the game. See console for details.');
    }
  }

  async function startNewHand() {
    if (!gameState.gameInProgress) return;
    const stopBtn = document.getElementById('stop-game-btn');
    if (stopBtn) stopBtn.disabled = true;

    const comm = document.getElementById('community-cards');
    if (comm) comm.innerHTML = "";
    const potDisplay = document.getElementById('pot-display');
    if (potDisplay) potDisplay.classList.remove('hidden');

    gameState.pot = 0;
    gameState.currentBet = 0;
    gameState.stage = 'preflop';
    gameState.bettingRound = 0;
    gameState.communityCards = [];
    gameState.deck = createDeck();
    shuffle(gameState.deck);

    let deckIndex = 0;

    for (const player of gameState.players) {
      player.cards = [gameState.deck[deckIndex++], gameState.deck[deckIndex++]];
      player.folded = false;
      player.currentBet = 0;
      player.handDetails = null;
      player.hasActed = false;

      const containerId = `player-cards-${player.id}`;
      updateChips(player.id, player.chips);
      updateStatus(player.id, '');
      const slot = document.getElementById(`player-${player.id}`);
      if (slot) slot.classList.remove('folded');

      if (document.getElementById(containerId)) {
        displayCards(containerId, player.cards, player.isHuman);
      }
    }

    // Burn one and draw 5 community
    deckIndex++;
    gameState.communityCards = gameState.deck.slice(deckIndex, deckIndex + 5);
    updatePot();

    // set first player to act (player after button)
    gameState.currentPlayerIndex = gameState.buttonIndex;
    await sleep(600);
    nextTurn();
  }

  async function prepareNextRound() {
    const stopBtn = document.getElementById('stop-game-btn');
    if (stopBtn) stopBtn.disabled = false;
    await sleep(1200);

    const humanPlayer = gameState.players.find(p => p.isHuman);
    if (humanPlayer && humanPlayer.chips <= 0) {
      endGameSession();
      return;
    }

    gameState.players = gameState.players.filter(p => p.chips > 0);

    if (gameState.players.length === 1 && gameState.players[0].isHuman) {
      alert("Congratulations! You've busted all the bots!");
      endGameSession();
      return;
    }

    gameState.buttonIndex = (gameState.buttonIndex + 1) % gameState.players.length;
    startNewHand();
  }

  function endGameSession() {
    gameState.gameInProgress = false;
    const startBtn = document.getElementById('start-game');
    if (startBtn) startBtn.disabled = false;
    const stopBtn = document.getElementById('stop-game-btn');
    if (stopBtn) stopBtn.classList.add('hidden');
    const potDisp = document.getElementById('pot-display');
    if (potDisp) potDisp.classList.add('hidden');
    const comm = document.getElementById('community-cards');
    if (comm) comm.innerHTML = "";

    for (let i = 1; i <= 7; i++) {
      const slot = document.getElementById(`player-${i}`);
      if (slot) {
        slot.classList.remove('folded');
        updateStatus(i, '');
        const cardsEl = document.getElementById(`player-cards-${i}`);
        if (cardsEl) cardsEl.innerHTML = "";
        updateChips(i, 0);
      }
    }

    gameState.players = [];
    handComplete = false;
  }

  // ---------- Turn flow ----------
  async function nextTurn() {
    if (!gameState.gameInProgress) return;

    const activePlayers = gameState.players.filter(p => !p.folded);

    if (activePlayers.length === 1) {
      await declareWinner(activePlayers[0]);
      return;
    }

    // find next non-folded
    do {
      gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    } while (gameState.players[gameState.currentPlayerIndex].folded);

    const player = gameState.players[gameState.currentPlayerIndex];

    const allBetsEqual = activePlayers.every(p =>
      p.currentBet === gameState.currentBet || p.chips === 0
    );

    if (allBetsEqual && gameState.bettingRound >= activePlayers.length) {
      await advanceStage();
      return;
    }

    gameState.bettingRound++;

    gameState.players.forEach(p => {
      if (p !== player) updateStatus(p.id, p.folded ? 'Folded' : '');
    });

    if (player.isHuman) showPlayerActions();
    else await processBotTurn();
  }

  function showPlayerActions() {
    const player = gameState.players[gameState.currentPlayerIndex];
    updateStatus(player.id, 'Your Turn!');

    const actionButtons = document.getElementById('action-buttons');
    if (actionButtons) actionButtons.classList.remove('hidden');

    const foldBtn = document.getElementById('fold-btn');
    if (foldBtn) foldBtn.disabled = false;

    const callAmount = Math.max(0, gameState.currentBet - player.currentBet);
    const checkBtn = document.getElementById('check-btn');
    const callBtn = document.getElementById('call-btn');
    if (callAmount === 0) {
      if (checkBtn) checkBtn.classList.remove('hidden');
      if (callBtn) callBtn.classList.add('hidden');
    } else {
      if (checkBtn) checkBtn.classList.add('hidden');
      if (callBtn) callBtn.classList.remove('hidden');
      const callAmtEl = document.getElementById('call-amount');
      if (callAmtEl) callAmtEl.textContent = Math.min(callAmount, player.chips);
    }

    const raiseBtn = document.getElementById('raise-btn');
    if (raiseBtn) raiseBtn.disabled = player.chips <= callAmount;
  }

  function hidePlayerActions() {
    const actionButtons = document.getElementById('action-buttons');
    if (actionButtons) actionButtons.classList.add('hidden');
  }

  // ---------- Bot ----------
  async function processBotTurn() {
    const player = gameState.players[gameState.currentPlayerIndex];
    updateStatus(player.id, 'Thinking...');
    await sleep(900);
    const decision = botDecision(player);
    await executeAction(player, decision);
    await sleep(400);
    nextTurn();
  }

  function botDecision(player) {
    let visibleCommunityCards = [];
    if (gameState.stage === 'flop') visibleCommunityCards = gameState.communityCards.slice(0, 3);
    else if (gameState.stage === 'turn') visibleCommunityCards = gameState.communityCards.slice(0, 4);
    else if (gameState.stage === 'river') visibleCommunityCards = gameState.communityCards;

    let handRank = 0;

    if (gameState.stage === 'preflop') {
      const v1 = cardValues[player.cards[0].value];
      const v2 = cardValues[player.cards[1].value];
      const isPair = v1 === v2;
      const isSuited = player.cards[0].suit === player.cards[1].suit;

      if (isPair) {
        if (v1 > 10) handRank = 7;
        else if (v1 > 6) handRank = 5;
        else handRank = 3;
      } else if (v1 > 10 && v2 > 10) {
        handRank = isSuited ? 6 : 4;
      } else if (isSuited) {
        handRank = 2;
      } else if (v1 > 8 || v2 > 8) {
        handRank = 1;
      } else {
        handRank = 1;
      }
    } else {
      const bestHand = getBestHand(player.cards, visibleCommunityCards);
      handRank = bestHand.rank;
    }

    const callAmount = Math.max(0, gameState.currentBet - player.currentBet);
    const rand = Math.random();

    if (handRank <= handRanks.HIGH_CARD) {
      if (callAmount === 0) {
        if (rand < 0.25) {
          const raiseAmount = Math.min(Math.floor(gameState.pot * 0.5) + 10, player.chips);
          return { action: 'raise', amount: raiseAmount };
        }
        return { action: 'check' };
      }
      if (rand < 0.6) return { action: 'call', amount: Math.min(callAmount, player.chips) };
      if (rand < 0.65) {
        const raiseAmount = Math.min(callAmount * 2 + 10, player.chips);
        return { action: 'raise', amount: raiseAmount };
      }
      return { action: 'fold' };
    }

    if (handRank <= handRanks.ONE_PAIR) {
      if (callAmount === 0) {
        const raiseAmount = Math.min(Math.floor(gameState.pot * 0.5) + 10, player.chips);
        return (rand < 0.50) ? { action: 'raise', amount: raiseAmount } : { action: 'check' };
      }
      if (rand < 0.7) return { action: 'call', amount: Math.min(callAmount, player.chips) };
      return { action: 'fold' };
    }

    if (handRank <= handRanks.THREE_OF_A_KIND) {
      if (callAmount === 0) {
        const raiseAmount = Math.min(Math.floor(gameState.pot * 0.7) + 20, player.chips);
        return (rand < 0.9) ? { action: 'raise', amount: raiseAmount } : { action: 'check' };
      }
      if (rand < 0.4) {
        const raiseAmount = Math.min(callAmount * 2.5, Math.max(0, player.chips - callAmount));
        return { action: 'raise', amount: raiseAmount };
      }
      return { action: 'call', amount: Math.min(callAmount, player.chips) };
    }

    if (handRank >= handRanks.STRAIGHT) {
      if (callAmount === 0) {
        const raiseAmount = Math.min(Math.floor(gameState.pot * 0.9) + 50, player.chips);
        return (rand < 0.98) ? { action: 'raise', amount: raiseAmount } : { action: 'check' };
      }
      if (rand < 0.95) {
        const raiseAmount = Math.min(Math.max(callAmount * 3, gameState.pot), Math.max(0, player.chips - callAmount));
        return { action: 'raise', amount: raiseAmount };
      } else {
        return { action: 'call', amount: Math.min(callAmount, player.chips) };
      }
    }

    return (callAmount === 0) ? { action: 'check' } : { action: 'fold' };
  }

  async function executeAction(player, decision) {
    const playerId = player.id;

    if (decision.action === 'fold') {
      player.folded = true;
      const slotId = `player-${player.id}`;
      const slotEl = document.getElementById(slotId);
      if (slotEl) slotEl.classList.add('folded');
      updateStatus(playerId, 'Folded');
    } else if (decision.action === 'check') {
      updateStatus(playerId, 'Checked');
    } else if (decision.action === 'call') {
      const requested = Math.max(0, Number(decision.amount) || 0);
      const amount = safeDeduct(player, requested);
      player.currentBet += amount;
      gameState.pot = Math.max(0, (gameState.pot || 0) + amount);
      updateChips(playerId, player.chips);
      updatePot();
      updateStatus(playerId, `Called $${amount}`);
    } else if (decision.action === 'raise') {
      let amountToPutIn = 0;
      if (decision.isHuman) {
        amountToPutIn = Math.max(0, Number(decision.amount) || 0);
      } else {
        const amountToCall = Math.max(0, gameState.currentBet - (player.currentBet || 0));
        amountToPutIn = amountToCall + Math.max(0, Number(decision.amount) || 0);
      }
      amountToPutIn = Math.min(amountToPutIn, Math.max(0, player.chips || 0));
      const actual = safeDeduct(player, amountToPutIn);
      player.currentBet += actual;
      if (player.currentBet > gameState.currentBet) gameState.currentBet = player.currentBet;
      gameState.pot = Math.max(0, (gameState.pot || 0) + actual);
      updateChips(playerId, player.chips);
      updatePot();
      updateStatus(playerId, `Raised to $${player.currentBet}`);

      gameState.players.forEach(p => {
        if (p !== player) p.hasActed = false;
      });
    }

    player.hasActed = true;
  }

  async function advanceStage() {
    gameState.players.forEach(p => p.currentBet = 0);
    gameState.currentBet = 0;
    gameState.bettingRound = 0;

    if (gameState.stage === 'preflop') {
      gameState.stage = 'flop';
      displayCards('community-cards', gameState.communityCards.slice(0, 3), true);
      await sleep(900);
    } else if (gameState.stage === 'flop') {
      gameState.stage = 'turn';
      displayCards('community-cards', gameState.communityCards.slice(0, 4), true);
      await sleep(900);
    } else if (gameState.stage === 'turn') {
      gameState.stage = 'river';
      displayCards('community-cards', gameState.communityCards, true);
      await sleep(900);
    } else if (gameState.stage === 'river') {
      await showdown();
      return;
    }

    gameState.players.forEach(p => p.hasActed = false);
    gameState.currentPlayerIndex = gameState.buttonIndex;
    nextTurn();
  }

  async function showdown() {
    for (let player of gameState.players) {
      if (!player.folded) {
        const containerId = `player-cards-${player.id}`;
        if (document.getElementById(containerId)) {
          displayCards(containerId, player.cards, true);
        }
      }
    }

    await sleep(900);

    const activePlayers = gameState.players.filter(p => !p.folded);
    if (activePlayers.length === 0) {
      prepareNextRound();
      return;
    }

    let bestHand = { rank: 0, score: [0], handName: 'Invalid' };
    let winners = [];

    for (const player of activePlayers) {
      const playerHand = getBestHand(player.cards, gameState.communityCards);
      player.handDetails = playerHand;
      const comp = compareScores(playerHand.score, bestHand.score);
      if (comp > 0) {
        bestHand = playerHand;
        winners = [player];
      } else if (comp === 0) {
        winners.push(player);
      }
    }

    const potPerWinner = Math.floor(gameState.pot / winners.length);
    const winnerNames = [];

    for (const winner of winners) {
      winner.chips += potPerWinner;
      winnerNames.push(winner.isHuman ? 'You' : (document.getElementById(`player-name-${winner.id}`)?.textContent || `Player ${winner.id}`));
      updateChips(winner.id, winner.chips);
      updateStatus(winner.id, `Won $${potPerWinner}! (${bestHand.handName}) 🏆`);
    }

    activePlayers.forEach(p => {
      if (!winners.includes(p)) {
        updateStatus(p.id, p.handDetails ? p.handDetails.handName : 'Lost');
      }
    });

    await sleep(700);

    const winnerMessage = winners.length > 1
      ? `${winnerNames.join(' and ')} split the pot of $${gameState.pot} with a ${bestHand.handName}!`
      : `${winnerNames[0]} won the pot of $${gameState.pot} with a ${bestHand.handName}!`;

    alert(winnerMessage);
    prepareNextRound();
  }

  async function declareWinner(winner) {
    winner.chips += gameState.pot;
    updateChips(winner.id, winner.chips);
    updateStatus(winner.id, `Won $${gameState.pot}! 🏆`);

    for (let player of gameState.players) {
      const containerId = `player-cards-${player.id}`;
      if (document.getElementById(containerId)) {
        displayCards(containerId, player.cards, true);
        const slot = document.getElementById(`player-${player.id}`);
        if (slot) slot.classList.remove('folded');
      }
    }

    await sleep(800);
    alert(`${winner.isHuman ? 'You' : (document.getElementById(`player-name-${winner.id}`)?.textContent || `Player ${winner.id}`)} won the pot of $${gameState.pot}! Everyone else folded.`);
    prepareNextRound();
  }

  // ---------- Hand evaluation ----------
  function getCombinations(arr, k) {
    if (k === 0) return [[]];
    if (arr.length === 0) return [];
    if (k > arr.length) return [];

    const first = arr[0];
    const rest = arr.slice(1);

    const combosWithFirst = getCombinations(rest, k - 1).map(combo => [first, ...combo]);
    const combosWithoutFirst = getCombinations(rest, k);

    return [...combosWithFirst, ...combosWithoutFirst];
  }

  function compareScores(scoreA, scoreB) {
    for (let i = 0; i < Math.max(scoreA.length, scoreB.length); i++) {
      const a = scoreA[i] || 0;
      const b = scoreB[i] || 0;
      if (a > b) return 1;
      if (a < b) return -1;
    }
    return 0;
  }

  function evaluateFiveCardHand(cards) {
    const sortedCards = cards
      .map(c => ({ ...c, valueNum: cardValues[c.value] }))
      .sort((a, b) => b.valueNum - a.valueNum);

    const values = sortedCards.map(c => c.valueNum);
    const suits = sortedCards.map(c => c.suit);

    const isFlush = suits.every(s => s === suits[0]);
    const uniqueValues = [...new Set(values)];
    const isWheel = values.join(',') === '14,5,4,3,2';
    let isStraight = false;
    if (uniqueValues.length === 5) {
      if (values[0] - values[4] === 4) isStraight = true;
      else if (isWheel) isStraight = true;
    }

    const highCard = isWheel ? 5 : values[0];
    const counts = {};
    values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });

    const groups = Object.keys(counts)
      .map(key => ({ value: parseInt(key), count: counts[key] }))
      .sort((a, b) => b.count - a.count || b.value - a.value);

    const kickers = [...values].sort((a, b) => b - a);

    if (isStraight && isFlush) {
      if (highCard === 14) {
        return { rank: handRanks.ROYAL_FLUSH, score: [10], handName: 'Royal Flush' };
      }
      return { rank: handRanks.STRAIGHT_FLUSH, score: [9, highCard], handName: 'Straight Flush' };
    }

    if (groups[0].count === 4) {
      const quadValue = groups[0].value;
      const kicker = groups[1].value;
      return { rank: handRanks.FOUR_OF_A_KIND, score: [8, quadValue, kicker], handName: 'Four of a Kind' };
    }

    if (groups[0].count === 3 && groups[1] && groups[1].count === 2) {
      const tripsValue = groups[0].value;
      const pairValue = groups[1].value;
      return { rank: handRanks.FULL_HOUSE, score: [7, tripsValue, pairValue], handName: 'Full House' };
    }

    if (isFlush) {
      return { rank: handRanks.FLUSH, score: [6, ...kickers], handName: 'Flush' };
    }

    if (isStraight) {
      return { rank: handRanks.STRAIGHT, score: [5, highCard], handName: 'Straight' };
    }

    if (groups[0].count === 3) {
      const tripsValue = groups[0].value;
      const otherKickers = groups.slice(1).map(g => g.value);
      return { rank: handRanks.THREE_OF_A_KIND, score: [4, tripsValue, ...otherKickers], handName: 'Three of a Kind' };
    }

    if (groups[0].count === 2 && groups[1] && groups[1].count === 2) {
      const highPair = groups[0].value;
      const lowPair = groups[1].value;
      const kicker = groups[2] ? groups[2].value : 0;
      return { rank: handRanks.TWO_PAIR, score: [3, highPair, lowPair, kicker], handName: 'Two Pair' };
    }

    if (groups[0].count === 2) {
      const pairValue = groups[0].value;
      const otherKickers = groups.slice(1).map(g => g.value);
      return { rank: handRanks.ONE_PAIR, score: [2, pairValue, ...otherKickers], handName: 'One Pair' };
    }

    return { rank: handRanks.HIGH_CARD, score: [1, ...kickers], handName: 'High Card' };
  }

  function getBestHand(playerCards, communityCards) {
    const allCards = [...playerCards, ...communityCards];
    const all5CardCombos = getCombinations(allCards, 5);
    if (all5CardCombos.length === 0) {
      return { rank: 0, score: [0], handName: 'Invalid' };
    }

    let bestHand = { rank: 0, score: [0], handName: 'High Card' };
    for (const combo of all5CardCombos) {
      const hand = evaluateFiveCardHand(combo);
      if (compareScores(hand.score, bestHand.score) > 0) {
        bestHand = hand;
      }
    }
    return bestHand;
  }

  // ---------- UI wiring ----------
  // Attach the core buttons (without optional chaining so we can detect if missing)
  const startBtn = document.getElementById('start-game');
  if (startBtn) {
    startBtn.addEventListener('click', startGame);
    console.log('start-game listener attached');
  } else {
    console.error('start-game button not found in DOM.');
  }

  const foldBtn = document.getElementById('fold-btn');
  if (foldBtn) {
    foldBtn.addEventListener('click', async () => {
      const player = gameState.players[gameState.currentPlayerIndex];
      hidePlayerActions();
      await executeAction(player, { action: 'fold' });
      await sleep(300);
      nextTurn();
    });
  } else console.warn('fold-btn not found');

  const checkBtn = document.getElementById('check-btn');
  if (checkBtn) {
    checkBtn.addEventListener('click', async () => {
      const player = gameState.players[gameState.currentPlayerIndex];
      hidePlayerActions();
      await executeAction(player, { action: 'check' });
      await sleep(300);
      nextTurn();
    });
  }

  const callBtn = document.getElementById('call-btn');
  if (callBtn) {
    callBtn.addEventListener('click', async () => {
      const player = gameState.players[gameState.currentPlayerIndex];
      const callAmount = Math.min(Math.max(0, gameState.currentBet - player.currentBet), Math.max(0, player.chips || 0));
      hidePlayerActions();
      await executeAction(player, { action: 'call', amount: callAmount });
      await sleep(300);
      nextTurn();
    });
  }

  const raiseBtn = document.getElementById('raise-btn');
  if (raiseBtn) {
    raiseBtn.addEventListener('click', () => {
      const player = gameState.players[gameState.currentPlayerIndex];
      hidePlayerActions();
      const betControls = document.getElementById('bet-controls');
      if (betControls) betControls.classList.remove('hidden');

      const slider = document.getElementById('bet-slider');
      const callAmount = Math.max(0, gameState.currentBet - player.currentBet);
      const minRaiseAmount = Math.max(callAmount, 20);
      const minBet = player.currentBet + callAmount + minRaiseAmount;
      const maxBet = (player.chips || 0) + (player.currentBet || 0);

      if (slider) {
        slider.min = Math.min(minBet, maxBet);
        slider.max = Math.max(minBet, maxBet);
        slider.value = slider.min;
        updateBetDisplay();
      }
    });
  }

  const sliderEl = document.getElementById('bet-slider');
  if (sliderEl) sliderEl.addEventListener('input', updateBetDisplay);

  const confirmBet = document.getElementById('confirm-bet');
  if (confirmBet) {
    confirmBet.addEventListener('click', async () => {
      const player = gameState.players[gameState.currentPlayerIndex];
      const sliderVal = Math.max(0, parseInt(document.getElementById('bet-slider').value) || 0);
      const raiseAmount = Math.max(0, sliderVal - (player.currentBet || 0));
      const finalRaise = Math.min(raiseAmount, Math.max(0, player.chips || 0));

      document.getElementById('bet-controls')?.classList.add('hidden');
      await executeAction(player, { action: 'raise', amount: finalRaise, isHuman: true });
      await sleep(300);
      nextTurn();
    });
  }

  const cancelBet = document.getElementById('cancel-bet');
  if (cancelBet) {
    cancelBet.addEventListener('click', () => {
      const betControls = document.getElementById('bet-controls');
      if (betControls) betControls.classList.add('hidden');
      showPlayerActions();
    });
  }

  const stopBtn = document.getElementById('stop-game-btn');
  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      alert("Thanks for playing!");
      endGameSession();
    });
  }

  const leaveTable = document.getElementById('leave-table');
  if (leaveTable) {
    leaveTable.addEventListener('click', () => {
      const player = gameState.players.find(p => p.id === 1);
      if (!player) {
        alert('You are not seated at the table.');
        return;
      }

      if (!player.folded && !handComplete) {
        alert('You can only leave the table after folding or when the hand has completed.');
        return;
      }

      handComplete = true;
      alert(`Leaving current hand. Starting a fresh hand with your preserved $${player.chips}.`);
      // NOTE: current startGame resets stacks to 1000; implement preserved stack flow if desired
      startGame();
    });
  }

  // small helpers for bet UI
  function updateBetDisplay() {
    const s = document.getElementById('bet-slider');
    const disp = document.getElementById('bet-amount-display');
    if (!s || !disp) return;
    const amount = parseInt(s.value);
    disp.textContent = `$${amount}`;
  }

  console.log('script initialization complete');
});

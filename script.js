const deck = [];
const suits = ["H", "S", "D", "C"];
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Hold'em constants
const initialCardsPerPlayer = 2; 
let communityCards = []; // Stores the 5 cards reserved for the center
let fullDeck = []; // The active deck copy for the game

// Mapping short codes to full file names for your custom assets
const valueMap = { 
  "A": "Ace", 
  "J": "Jack", 
  "Q": "Queen", 
  "K": "King" 
};

const suitMap = { 
  "H": "Hearts", 
  "S": "Spades", 
  "D": "Diamonds", 
  "C": "Clubs" 
};


// Function to construct the asset file path (uses 'assets/' directory)
function getCardFileName(valueCode, suitCode) {
  const fullSuitName = suitMap[suitCode];
  const fullValueName = valueMap[valueCode] || valueCode; 
  return `assets/Suit=${fullSuitName}, Number=${fullValueName}.png`;
}


// Create the full 52-card deck
for (let s of suits) {
  for (let v of values) {
    deck.push({
      name: `${v}${s}`,
      img: getCardFileName(v, s) 
    });
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Function to display cards, handling face-up or face-down state
function displayCards(containerId, cards, isPlayer = false, showAll = false) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    
    // Cards are face-down IF: 
    // 1. We are not at showdown (showAll is false) 
    // 2. AND the hand belongs to the Dealer or an Opponent (isPlayer is false)
    const faceDown = !showAll && !isPlayer;

    [...cards].reverse().forEach(card => {
        const img = document.createElement("img");
        
        // Use the card back image for face-down cards
        img.src = faceDown ? 'assets/card_back.png' : card.img; 
        
        if (faceDown) {
            img.classList.add('face-down');
        }

        container.appendChild(img);
    });
}

// Dynamically creates and positions opponent slots
function setupPlayerSlots(numPlayers) {
    const opponentContainer = document.getElementById("opponent-slots");
    opponentContainer.innerHTML = "";
    
    for (let i = 2; i <= numPlayers; i++) {
        const slot = document.createElement("div");
        slot.className = `player-slot pos-${i}`; 
        slot.id = `player-${i}`;
        
        const handDiv = document.createElement("div");
        handDiv.className = "hand";
        handDiv.id = `player-cards-${i}`;
        
        const label = document.createElement("div");
        label.className = "player-label";
        label.textContent = `Player ${i}`;
        
        slot.appendChild(handDiv);
        slot.appendChild(label);
        opponentContainer.appendChild(slot);
    }
}

// --- CORE TEXAS HOLD'EM GAME FLOW ---

document.getElementById("start-game").addEventListener("click", () => {
    const numPlayersInput = document.getElementById("num-players");
    const totalPlayers = parseInt(numPlayersInput.value);
    
    const totalHands = totalPlayers + 1;
    const maxPlayersAllowed = Math.floor((deck.length - 5) / initialCardsPerPlayer) - 1; 

    if (totalPlayers < 1 || totalPlayers > maxPlayersAllowed) {
        alert(`Please enter a number between 1 and ${maxPlayersAllowed}.`);
        return;
    }
    
    // 1. Reset Game
    setupPlayerSlots(totalPlayers);
    document.getElementById("community-cards").innerHTML = "";
    communityCards = []; 
    fullDeck = [...deck]; 
    shuffle(fullDeck);
    
    // 2. Initial Deal (2 cards to Dealer and Players)
    let cardIndex = 0;
    
    // Deal to Dealer (Reveille) - isPlayer=false (face down)
    const dealerHand = fullDeck.slice(cardIndex, cardIndex + initialCardsPerPlayer);
    displayCards("dealer-cards", dealerHand, false); 
    cardIndex += initialCardsPerPlayer;

    // Deal to all players (Player 1 is face up, others are face down)
    for (let i = 1; i <= totalPlayers; i++) {
        const playerHand = fullDeck.slice(cardIndex, cardIndex + initialCardsPerPlayer);
        // isPlayer is true ONLY for Player 1 (i=1)
        const isCurrentPlayer = (i === 1); 
        displayCards(`player-cards-${i}`, playerHand, isCurrentPlayer); 
        cardIndex += initialCardsPerPlayer;
    }

    // 3. Set up remaining deck for community cards (including burn cards)
    cardIndex += 1; // Burn 1 card
    communityCards.push(...fullDeck.slice(cardIndex, cardIndex + 3)); // Flop (3 cards)
    cardIndex += 3;
    cardIndex += 1; // Burn 1 card
    communityCards.push(...fullDeck.slice(cardIndex, cardIndex + 1)); // Turn (1 card)
    cardIndex += 1;
    cardIndex += 1; // Burn 1 card
    communityCards.push(...fullDeck.slice(cardIndex, cardIndex + 1)); // River (1 card)

    // 4. Update UI buttons to start the game stage
    document.getElementById("stage-buttons").classList.remove("hidden");
    document.getElementById("start-game").disabled = true;
    document.getElementById("flop-btn").disabled = false;
    document.getElementById("turn-btn").disabled = true;
    document.getElementById("river-btn").disabled = true;
    document.getElementById("showdown-btn").disabled = true;
});


// --- STAGED DEALING EVENT LISTENERS ---

document.getElementById("flop-btn").addEventListener("click", () => {
    // Flop: Deal first 3 community cards
    const flop = communityCards.slice(0, 3);
    displayCards("community-cards", flop, true, true); // Community cards are always face-up

    document.getElementById("flop-btn").disabled = true;
    document.getElementById("turn-btn").disabled = false;
});

document.getElementById("turn-btn").addEventListener("click", () => {
    // Turn: Deal the 4th community card
    const turn = communityCards.slice(0, 4);
    displayCards("community-cards", turn, true, true); 

    document.getElementById("turn-btn").disabled = true;
    document.getElementById("river-btn").disabled = false;
});

document.getElementById("river-btn").addEventListener("click", () => {
    // River: Deal the 5th community card
    const river = communityCards.slice(0, 5);
    displayCards("community-cards", river, true, true); 

    document.getElementById("river-btn").disabled = true;
    document.getElementById("showdown-btn").disabled = false;
});

document.getElementById("showdown-btn").addEventListener("click", () => {
    alert("Showdown! Reveille and all opponent hands are now revealed.");
    
    // Show ALL hands (Dealer and all opponents)
    const totalPlayers = parseInt(document.getElementById("num-players").value);

    // Reveal Dealer's Hand
    const dealerHand = fullDeck.slice(2, 4); // Dealer's cards were the first 2 dealt
    displayCards("dealer-cards", dealerHand, false, true); // showAll = true

    // Reveal Opponents' Hands
    let cardIndex = 4; // Start index after dealer and player 1 (Player 1 has indices 4, 5)

    for (let i = 2; i <= totalPlayers; i++) {
        // Player's 2 cards are always 2 cards after the previous player
        const opponentHand = fullDeck.slice(cardIndex + 2, cardIndex + 4); 
        displayCards(`player-cards-${i}`, opponentHand, false, true); // showAll = true
        cardIndex += 2;
    }
    
    document.getElementById("showdown-btn").disabled = true;
    document.getElementById("start-game").disabled = false;
});


// On load: Initialization
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("dealer-cards").innerHTML = "";
    document.getElementById("community-cards").innerHTML = "";
    
    const player1Hand = document.getElementById("player-cards-1");
    if (player1Hand) {
        player1Hand.innerHTML = "";
    }
    document.getElementById("stage-buttons").classList.add("hidden");
});

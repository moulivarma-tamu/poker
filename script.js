
const deck = [];
const suits = ["H", "S", "D", "C"];
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Hold'em constants
const initialCardsPerPlayer = 2; 
let communityCards = []; 
let fullDeck = []; 

// --- NEW CARD BACK FILENAMES (Assuming you create a 'Black' version) ---
const CARD_BACK_RED_IMG = 'assets/Suit=Other, Number=Back Red.png';
const CARD_BACK_BLACK_IMG = 'assets/Suit=Other, Number=Back Blue.png'; // <--- ASSUMES THIS FILE EXISTS

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

// --- NEW FUNCTION: Determine card back based on suit color ---
function getCardBackImage(suitCode) {
    // Hearts (H) and Diamonds (D) are RED suits
    if (suitCode === 'H' || suitCode === 'D') {
        return CARD_BACK_BLACK_IMG; // Use a contrasting Black back for RED suits
    }
    // Spades (S) and Clubs (C) are BLACK suits
    return CARD_BACK_RED_IMG; // Use a contrasting Red back for BLACK suits
}

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
      // We store the full suit code in the card object
      suit: s, 
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
    
    const faceDown = !showAll && !isPlayer;

    [...cards].reverse().forEach(card => {
        const img = document.createElement("img");
        
        if (faceDown) {
            // --- LOGIC APPLIED HERE ---
            img.src = getCardBackImage(card.suit); 
            img.classList.add('face-down');
        } else {
            img.src = card.img; 
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
        const isCurrentPlayer = (i === 1); 
        displayCards(`player-cards-${i}`, playerHand, isCurrentPlayer); 
        cardIndex += initialCardsPerPlayer;
    }

    // 3. Set up remaining deck for community cards (including burn cards)
    cardIndex += 1; 
    communityCards.push(...fullDeck.slice(cardIndex, cardIndex + 3)); 
    cardIndex += 3;
    cardIndex += 1; 
    communityCards.push(...fullDeck.slice(cardIndex, cardIndex + 1)); 
    cardIndex += 1;
    cardIndex += 1; 
    communityCards.push(...fullDeck.slice(cardIndex, cardIndex + 1)); 

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
    const flop = communityCards.slice(0, 3);
    displayCards("community-cards", flop, true, true); 

    document.getElementById("flop-btn").disabled = true;
    document.getElementById("turn-btn").disabled = false;
});

document.getElementById("turn-btn").addEventListener("click", () => {
    const turn = communityCards.slice(0, 4);
    displayCards("community-cards", turn, true, true); 

    document.getElementById("turn-btn").disabled = true;
    document.getElementById("river-btn").disabled = false;
});

document.getElementById("river-btn").addEventListener("click", () => {
    const river = communityCards.slice(0, 5);
    displayCards("community-cards", river, true, true); 

    document.getElementById("river-btn").disabled = true;
    document.getElementById("showdown-btn").disabled = false;
});

document.getElementById("showdown-btn").addEventListener("click", () => {
    alert("Showdown! Reveille and all opponent hands are now revealed.");
    
    const totalPlayers = parseInt(document.getElementById("num-players").value);

    // Get the exact cards from the dealt fullDeck slice
    const dealerHand = fullDeck.slice(0, initialCardsPerPlayer); 
    displayCards("dealer-cards", dealerHand, false, true); 

    let cardIndex = initialCardsPerPlayer; 

    for (let i = 1; i <= totalPlayers; i++) {
        // Player 1 is revealed here, too.
        const playerHand = fullDeck.slice(cardIndex, cardIndex + initialCardsPerPlayer); 
        displayCards(`player-cards-${i}`, playerHand, false, true); // showAll = true
        cardIndex += initialCardsPerPlayer;
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

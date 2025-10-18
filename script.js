const deck = [];
const suits = ["H", "S", "D", "C"];
const values = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

// Create deck from your custom Figma images
for (let s of suits) {
  for (let v of values) {
    deck.push({
      name: `${v}${s}`,
      img: `cards/${v}${s}.png`
    });
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

document.getElementById("deal").addEventListener("click", () => {
  shuffle(deck);
  const player = deck.slice(0, 5);
  const dealer = deck.slice(5, 10);

  displayCards("player-cards", player);
  displayCards("dealer-cards", dealer);
});

function displayCards(containerId, cards) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  cards.forEach(card => {
    const img = document.createElement("img");
    img.src = card.img;
    container.appendChild(img);
  });
}

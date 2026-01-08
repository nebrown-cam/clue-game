// main.js - Clue Online Client

// Connect to Socket.io server
const socket = io();

// ============================================
// DOM ELEMENTS
// ============================================

// Screens
const joinScreen = document.getElementById('join-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');

// Join Screen
const playerNameInput = document.getElementById('player-name');
const roomCodeInput = document.getElementById('room-code');
const joinBtn = document.getElementById('join-btn');
const errorMessage = document.getElementById('error-message');

// Lobby Screen
const displayRoomCode = document.getElementById('display-room-code');
const playersList = document.getElementById('players');
const waitingMessage = document.getElementById('waiting-message');
const startBtn = document.getElementById('start-btn');

// Game Screen - Header
const gameRoomCode = document.getElementById('game-room-code');
const playerCount = document.getElementById('player-count');
const hostControls = document.getElementById('host-controls');
const pauseBtn = document.getElementById('pause-btn');
const endBtn = document.getElementById('end-btn');

// Game Screen - Board
const gameBoard = document.getElementById('game-board');
const boardImage = document.getElementById('board-image');
const pawnsLayer = document.getElementById('pawns-layer');
const weaponsLayer = document.getElementById('weapons-layer');
const clickLayer = document.getElementById('click-layer');

// Game Screen - Panel
const gamePlayers = document.getElementById('game-players');
const turnInfo = document.getElementById('turn-info');
const yourCards = document.getElementById('your-cards');

// Audio
const diceSound = new Audio('/audio/dice.wav');

// Controls
const rollBtn = document.getElementById('roll-btn');
const stayBtn = document.getElementById('stay-btn');
const passageBtn = document.getElementById('passage-btn');
const suggestSuspect = document.getElementById('suggest-suspect');
const suggestWeapon = document.getElementById('suggest-weapon');
const suggestBtn = document.getElementById('suggest-btn');
const accuseSuspect = document.getElementById('accuse-suspect');
const accuseWeapon = document.getElementById('accuse-weapon');
const accuseRoom = document.getElementById('accuse-room');
const accuseBtn = document.getElementById('accuse-btn');
const endTurnBtn = document.getElementById('end-turn-btn');

// Card Reveal Panel
const cardRevealPanel = document.getElementById('card-reveal-panel');
const cardRevealText = document.getElementById('card-reveal-text');
const revealedCard = document.getElementById('revealed-card');
const cardRevealDone = document.getElementById('card-reveal-done');

// Disprove Panel
const disprovePanel = document.getElementById('disprove-panel');
const disproveText = document.getElementById('disprove-text');
const disproveCards = document.getElementById('disprove-cards');
const showCardBtn = document.getElementById('show-card-btn');
const cannotDisproveBtn = document.getElementById('cannot-disprove-btn');

// Card Action Buttons (in Your Cards section)
const cardActionButtons = document.getElementById('card-action-buttons');
const showCardActionBtn = document.getElementById('show-card-action-btn');
const passCardBtn = document.getElementById('pass-card-btn');

// Modals
const accusationModal = document.getElementById('accusation-modal');
const cancelAccusation = document.getElementById('cancel-accusation');
const confirmAccusation = document.getElementById('confirm-accusation');
const winModal = document.getElementById('win-modal');
const winTitle = document.getElementById('win-title');
const solutionCards = document.getElementById('solution-cards');
const closeWinModal = document.getElementById('close-win-modal');
const newGameModal = document.getElementById('new-game-modal');
const confirmNewGame = document.getElementById('confirm-new-game');
const declineNewGame = document.getElementById('decline-new-game');

// ============================================
// TURN INFO MESSAGE QUEUE
// ============================================

const turnMessages = [];

function addTurnMessage(message) {
    turnMessages.push(message);
    renderTurnMessages();
    // Auto-scroll to bottom
    turnInfo.scrollTop = turnInfo.scrollHeight;
}

function clearTurnMessages() {
    turnMessages.length = 0;
    turnInfo.innerHTML = '';
}

function renderTurnMessages() {
    turnInfo.innerHTML = turnMessages
        .map((msg, i) => {
            const isLatest = i === turnMessages.length - 1;
            return `<div class="turn-message${isLatest ? ' latest' : ''}">${msg}</div>`;
        })
        .join('');
}

// ============================================
// GAME STATE
// ============================================

let myPlayerId = null;
let myPlayerName = null;
let myCharacter = null;
let myPosition = null;
let myCards = [];
let isHost = false;
let currentRoomCode = null;

let gameState = {
    players: [],
    currentTurn: null,
    turnPhase: null,
    pawns: {},
    weapons: {},
    diceResult: null,
    currentRoom: null
};

let selectedDisproveCard = null;
let pendingAccusation = null;
let isDisproveMode = false;
let wasSummoned = false;
let disproveMatchingCards = [];

// Board configuration (matches game.js)
const GRID_ORIGIN_X = 77;
const GRID_ORIGIN_Y = 70;
const CELL_WIDTH = 53.5;
const CELL_HEIGHT = 52;
const BOARD_SIZE = 1440; // Original board image size

// Character data
const CHARACTERS = {
    mustard: { name: 'Colonel Mustard', color: '#FFD700' },
    scarlett: { name: 'Miss Scarlett', color: '#DC143C' },
    plum: { name: 'Professor Plum', color: '#8E4585' },
    green: { name: 'Mr. Green', color: '#228B22' },
    white: { name: 'Mrs. White', color: '#F5F5F5' },
    peacock: { name: 'Mrs. Peacock', color: '#4169E1' }
};

const WEAPONS = ['candlestick', 'knife', 'leadpipe', 'revolver', 'rope', 'wrench'];

const ROOMS = ['kitchen', 'ballroom', 'conservatory', 'billiard', 'library', 'study', 'hall', 'lounge', 'dining'];

const ROOM_NAMES = {
    kitchen: 'Kitchen',
    ballroom: 'Ballroom',
    conservatory: 'Conservatory',
    billiard: 'Billiard Room',
    library: 'Library',
    study: 'Study',
    hall: 'Hall',
    lounge: 'Lounge',
    dining: 'Dining Room'
};

const WEAPON_NAMES = {
    candlestick: 'Candlestick',
    knife: 'Knife',
    leadpipe: 'Lead Pipe',
    revolver: 'Revolver',
    rope: 'Rope',
    wrench: 'Wrench'
};

// ============================================
// JOIN SCREEN HANDLERS
// ============================================

joinBtn.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    const roomCode = roomCodeInput.value.trim();

    if (!playerName) {
        errorMessage.textContent = 'Please enter your name.';
        return;
    }
    if (!roomCode) {
        errorMessage.textContent = 'Please enter a room code.';
        return;
    }

    errorMessage.textContent = '';
    myPlayerName = playerName;
    socket.emit('join-room', { playerName, roomCode });
});

roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinBtn.click();
});

playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') roomCodeInput.focus();
});

// ============================================
// LOBBY HANDLERS
// ============================================

startBtn.addEventListener('click', () => {
    socket.emit('start-game');
});

// ============================================
// GAME CONTROLS HANDLERS
// ============================================

rollBtn.addEventListener('click', () => {
    wasSummoned = false;
    diceSound.currentTime = 0;
    diceSound.play();
    socket.emit('roll-dice');
});

stayBtn.addEventListener('click', () => {
    wasSummoned = false;
    socket.emit('stay-put');
});

passageBtn.addEventListener('click', () => {
    wasSummoned = false;
    socket.emit('use-secret-passage');
});

suggestBtn.addEventListener('click', () => {
    const suspect = suggestSuspect.value;
    const weapon = suggestWeapon.value;

    if (!suspect || !weapon) {
        addTurnMessage('Please select a suspect and weapon.');
        return;
    }

    socket.emit('make-suggestion', { suspect, weapon });
});

accuseBtn.addEventListener('click', () => {
    const suspect = accuseSuspect.value;
    const weapon = accuseWeapon.value;
    const room = accuseRoom.value;

    if (!suspect || !weapon || !room) {
        addTurnMessage('Please select suspect, weapon, and room.');
        return;
    }

    pendingAccusation = { suspect, weapon, room };
    accusationModal.classList.remove('hidden');
});

cancelAccusation.addEventListener('click', () => {
    pendingAccusation = null;
    accusationModal.classList.add('hidden');
});

confirmAccusation.addEventListener('click', () => {
    if (pendingAccusation) {
        socket.emit('make-accusation', pendingAccusation);
        pendingAccusation = null;
    }
    accusationModal.classList.add('hidden');
});

endTurnBtn.addEventListener('click', () => {
    socket.emit('end-turn');
});

// Card Reveal
cardRevealDone.addEventListener('click', () => {
    cardRevealPanel.classList.add('hidden');
});

// Disprove (panel version - kept for compatibility)
showCardBtn.addEventListener('click', () => {
    if (selectedDisproveCard) {
        socket.emit('show-card', { cardId: selectedDisproveCard });
        disprovePanel.classList.add('hidden');
        exitDisproveMode();
    }
});

cannotDisproveBtn.addEventListener('click', () => {
    socket.emit('cannot-disprove');
    disprovePanel.classList.add('hidden');
    exitDisproveMode();
});

// Disprove (Your Cards section buttons)
showCardActionBtn.addEventListener('click', () => {
    if (selectedDisproveCard) {
        socket.emit('show-card', { cardId: selectedDisproveCard });
        exitDisproveMode();
    }
});

passCardBtn.addEventListener('click', () => {
    socket.emit('cannot-disprove');
    exitDisproveMode();
});

function exitDisproveMode() {
    isDisproveMode = false;
    selectedDisproveCard = null;
    disproveMatchingCards = [];
    cardActionButtons.classList.add('hidden');
    showCardActionBtn.disabled = true;
    passCardBtn.disabled = true;
    renderCards(); // Re-render without disprove highlights
}

// Win Modal
closeWinModal.addEventListener('click', () => {
    winModal.classList.add('hidden');
    socket.emit('close-win-modal');
});

// New Game Modal
confirmNewGame.addEventListener('click', () => {
    newGameModal.classList.add('hidden');
    socket.emit('start-new-game');
});

declineNewGame.addEventListener('click', () => {
    newGameModal.classList.add('hidden');
    socket.emit('decline-new-game');
});

// ============================================
// SOCKET EVENT HANDLERS
// ============================================

socket.on('room-update', (data) => {
    const { players, hostId, roomCode } = data;

    myPlayerId = socket.id;
    isHost = socket.id === hostId;
    currentRoomCode = roomCode;

    // Switch to lobby screen
    joinScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');

    displayRoomCode.textContent = roomCode;

    // Update players list
    playersList.innerHTML = '';
    players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player.name;
        if (player.id === hostId) li.classList.add('host');
        if (player.id === myPlayerId) li.classList.add('you');
        playersList.appendChild(li);
    });

    // Show/hide start button
    if (isHost && players.length >= 3) {
        startBtn.classList.remove('hidden');
        waitingMessage.textContent = `${players.length} players ready. You can start!`;
    } else {
        startBtn.classList.add('hidden');
        if (players.length < 3) {
            waitingMessage.textContent = `Waiting for at least ${3 - players.length} more player(s)...`;
        } else {
            waitingMessage.textContent = 'Waiting for host to start...';
        }
    }
});

socket.on('game-started', (data) => {
    const { players, yourCards, yourCharacter, yourPosition, currentTurn, turnPhase, pawns, weapons, isHost: hostStatus } = data;

    myCharacter = yourCharacter;
    myPosition = yourPosition;
    myCards = yourCards;
    isHost = hostStatus;

    gameState.players = players;
    gameState.currentTurn = currentTurn;
    gameState.turnPhase = turnPhase;
    gameState.pawns = pawns;
    gameState.weapons = weapons;

    // Switch to game screen
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    // Set up header
    gameRoomCode.textContent = currentRoomCode;
    playerCount.textContent = `${players.length} players`;

    if (isHost) {
        pauseBtn.classList.remove('hidden');
        endBtn.classList.remove('hidden');
    }

    // Populate dropdowns
    populateDropdowns();

    // Render game state
    renderPlayers();
    renderCards();
    renderPawns();
    renderWeapons();
    updateTurnInfo();
    updateControls();
});

socket.on('dice-rolled', (data) => {
    const { playerId, playerName, result } = data;

    gameState.diceResult = result;

    if (playerId === myPlayerId) {
        gameState.turnPhase = 'move';
        updateTurnInfo();
        updateControls();
    } else {
        addTurnMessage(`${playerName} rolled a ${result}.`);
    }
});

socket.on('pawn-moved', (data) => {
    const { playerId, playerName, character, newPosition, enteredRoom, usedSecretPassage } = data;

    gameState.pawns[character] = newPosition;

    // Update player position
    const player = gameState.players.find(p => p.id === playerId);
    if (player) player.position = newPosition;

    if (playerId === myPlayerId) {
        myPosition = newPosition;
        gameState.currentRoom = enteredRoom;
    }

    renderPawns();

    if (enteredRoom) {
        const method = usedSecretPassage ? 'used secret passage to' : 'entered';
        addTurnMessage(`${playerName} ${method} the ${ROOM_NAMES[enteredRoom]}.`);
    } else {
        addTurnMessage(`${playerName} moved.`);
    }
});

socket.on('turn-phase-change', (data) => {
    const { playerId, phase, room } = data;

    gameState.turnPhase = phase;

    if (playerId === myPlayerId) {
        if (phase === 'suggest' && room) {
            gameState.currentRoom = room;
        }
        updateControls();
    }

    updateTurnInfo();
});

socket.on('suggestion-made', (data) => {
    const { playerId, playerName, suspect, weapon, room, pawns, weapons, summonedPlayer } = data;

    gameState.pawns = pawns;
    gameState.weapons = weapons;

    // Update myPosition if current player's character was involved
    if (myCharacter === suspect) {
        myPosition = pawns[suspect];
        // Only set wasSummoned if we were actually moved (server confirms via summonedPlayer)
        if (summonedPlayer === myPlayerName) {
            wasSummoned = true;
        }
    }

    renderPawns();
    renderWeapons();

    // Disable all action controls during disproving process
    suggestBtn.disabled = true;
    suggestSuspect.disabled = true;
    suggestWeapon.disabled = true;
    accuseBtn.disabled = true;
    accuseSuspect.disabled = true;
    accuseWeapon.disabled = true;
    accuseRoom.disabled = true;
    endTurnBtn.disabled = true;

    let msg = `${playerName} suggests: ${CHARACTERS[suspect].name} with the ${WEAPON_NAMES[weapon]} in the ${ROOM_NAMES[room]}.`;
    if (summonedPlayer) {
        msg += ` ${summonedPlayer} was summoned to the ${ROOM_NAMES[room]}.`;
    }
    addTurnMessage(msg);
});

socket.on('your-turn-to-disprove', (data) => {
    const { suggestion, matchingCards, canDisprove } = data;

    // Enter disprove mode
    isDisproveMode = true;
    disproveMatchingCards = matchingCards.map(c => c.id);
    selectedDisproveCard = null;

    // Show the card action buttons
    cardActionButtons.classList.remove('hidden');

    if (canDisprove) {
        // Tell player to select a card to show
        addTurnMessage(`Select a card to show ${suggestion.suggesterName}.`);
        showCardActionBtn.disabled = true; // Enabled when a card is selected
        passCardBtn.disabled = true;
        passCardBtn.classList.add('hidden');
    } else {
        // No matching cards - can only pass
        addTurnMessage(`You have no matching cards. Click Pass.`);
        showCardActionBtn.disabled = true;
        showCardActionBtn.classList.add('hidden');
        passCardBtn.disabled = false;
        passCardBtn.classList.remove('hidden');
    }

    // Re-render cards to highlight matching ones
    renderCards();
});

socket.on('waiting-for-disprove', (data) => {
    const { disproverName } = data;
    addTurnMessage(`Waiting for ${disproverName} to respond...`);
});

socket.on('card-shown-to-you', (data) => {
    const { showerName, card } = data;

    cardRevealText.textContent = `${showerName} showed you this card:`;
    revealedCard.innerHTML = '';

    const img = document.createElement('img');
    img.src = getCardImage(card);
    img.alt = card.name;
    revealedCard.appendChild(img);

    cardRevealPanel.classList.remove('hidden');
});

socket.on('card-shown', (data) => {
    const { showerName, suggesterName, suspect, weapon, room } = data;
    addTurnMessage(`${showerName} showed a card to ${suggesterName} (${CHARACTERS[suspect].name}, ${WEAPON_NAMES[weapon]}, ${ROOM_NAMES[room]}).`);
});

socket.on('player-cannot-disprove', (data) => {
    const { playerName, suspect, weapon, room } = data;
    addTurnMessage(`${playerName} cannot disprove the suggestion (${CHARACTERS[suspect].name}, ${WEAPON_NAMES[weapon]}, ${ROOM_NAMES[room]}).`);
});

socket.on('suggestion-not-disproved', (data) => {
    const { suggesterName } = data;
    addTurnMessage(`No one could disprove ${suggesterName}'s suggestion!`);
});

socket.on('turn-changed', (data) => {
    const { currentTurn, currentTurnName, turnPhase } = data;

    gameState.currentTurn = currentTurn;
    gameState.turnPhase = turnPhase;
    gameState.diceResult = null;

    renderPlayers();
    updateTurnInfo();
    updateControls();
});

socket.on('wrong-accusation', (data) => {
    const { playerId, playerName } = data;

    const player = gameState.players.find(p => p.id === playerId);
    if (player) player.eliminated = true;

    renderPlayers();
    addTurnMessage(`${playerName} made a wrong accusation and is eliminated!`);
});

socket.on('game-won', (data) => {
    const { winnerId, winnerName, solution, byElimination } = data;

    if (byElimination) {
        winTitle.textContent = `${winnerName} Wins by Elimination!`;
    } else {
        winTitle.textContent = `${winnerName} Wins!`;
    }

    // Display solution cards
    solutionCards.innerHTML = '';
    const suspectCard = { id: solution.suspect, type: 'suspect', name: CHARACTERS[solution.suspect].name };
    const weaponCard = { id: solution.weapon, type: 'weapon', name: WEAPON_NAMES[solution.weapon] };
    const roomCard = { id: solution.room, type: 'room', name: ROOM_NAMES[solution.room] };

    [suspectCard, weaponCard, roomCard].forEach(card => {
        const cardDiv = createCardElement(card);
        solutionCards.appendChild(cardDiv);
    });

    winModal.classList.remove('hidden');
});

socket.on('player-disconnected', (data) => {
    const { playerName } = data;
    addTurnMessage(`${playerName} disconnected.`);
});

socket.on('error-message', (message) => {
    if (joinScreen.classList.contains('hidden')) {
        addTurnMessage(message);
    } else {
        errorMessage.textContent = message;
    }
});

socket.on('prompt-new-game', () => {
    // Host is prompted to start a new game
    newGameModal.classList.remove('hidden');
});

socket.on('return-to-lobby', (data) => {
    const { players, hostId, roomCode } = data;

    // Reset client state
    myCharacter = null;
    myPosition = null;
    myCards = [];
    wasSummoned = false;
    turnMessages.length = 0;

    gameState = {
        players: [],
        currentTurn: null,
        turnPhase: null,
        pawns: {},
        weapons: {},
        diceResult: null,
        currentRoom: null
    };

    // Update lobby state
    isHost = (socket.id === hostId);

    // Switch back to lobby screen
    gameScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');

    // Update lobby display
    displayRoomCode.textContent = roomCode;

    // Update players list
    playersList.innerHTML = '';
    players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player.name;
        if (player.id === hostId) li.classList.add('host');
        if (player.id === myPlayerId) li.classList.add('you');
        playersList.appendChild(li);
    });

    // Show/hide start button
    if (isHost && players.length >= 3) {
        startBtn.classList.remove('hidden');
        waitingMessage.textContent = `${players.length} players ready. You can start!`;
    } else {
        startBtn.classList.add('hidden');
        if (players.length < 3) {
            waitingMessage.textContent = `Waiting for at least ${3 - players.length} more player(s)...`;
        } else {
            waitingMessage.textContent = 'Waiting for host to start...';
        }
    }
});

socket.on('game-ended', () => {
    // Game has ended, return to join screen
    joinScreen.classList.remove('hidden');
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    newGameModal.classList.add('hidden');
    winModal.classList.add('hidden');

    // Reset all state
    myPlayerId = null;
    myCharacter = null;
    myPosition = null;
    myCards = [];
    isHost = false;
    currentRoomCode = null;
    wasSummoned = false;
    turnMessages.length = 0;

    gameState = {
        players: [],
        currentTurn: null,
        turnPhase: null,
        pawns: {},
        weapons: {},
        diceResult: null,
        currentRoom: null
    };
});

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderPlayers() {
    gamePlayers.innerHTML = '';

    gameState.players.forEach(player => {
        const li = document.createElement('li');

        if (player.id === gameState.currentTurn) {
            li.classList.add('current-turn');
        }
        if (player.eliminated) {
            li.classList.add('eliminated');
        }

        const colorDot = document.createElement('span');
        colorDot.className = 'player-color';
        colorDot.style.backgroundColor = CHARACTERS[player.character].color;

        const nameSpan = document.createElement('span');
        let displayName = player.name;
        if (player.id === myPlayerId) displayName += ' (You)';
        if (player.eliminated) displayName += ' - Eliminated';
        nameSpan.textContent = displayName;

        const charSpan = document.createElement('span');
        charSpan.style.color = '#a8dadc';
        charSpan.style.marginLeft = 'auto';
        charSpan.textContent = CHARACTERS[player.character].name;

        li.appendChild(colorDot);
        li.appendChild(nameSpan);
        li.appendChild(charSpan);
        gamePlayers.appendChild(li);
    });
}

function renderCards() {
    yourCards.innerHTML = '';

    myCards.forEach(card => {
        const isMatch = isDisproveMode && disproveMatchingCards.includes(card.id);
        const cardDiv = createCardElement(card, isMatch);

        // In disprove mode, make matching cards clickable
        if (isDisproveMode && isMatch) {
            cardDiv.style.cursor = 'pointer';
            cardDiv.addEventListener('click', () => selectCardForDisprove(card.id, cardDiv));
        }

        // Highlight selected card
        if (selectedDisproveCard === card.id) {
            cardDiv.classList.add('selected');
        }

        yourCards.appendChild(cardDiv);
    });
}

function selectCardForDisprove(cardId, cardDiv) {
    // Deselect previous
    const cards = yourCards.querySelectorAll('.card');
    cards.forEach(c => c.classList.remove('selected'));

    // Select new
    selectedDisproveCard = cardId;
    cardDiv.classList.add('selected');

    // Enable the Show button
    showCardActionBtn.disabled = false;
    showCardActionBtn.classList.remove('hidden');
}

function createCardElement(card, isMatch = false) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    if (isMatch) cardDiv.classList.add('match');

    const img = document.createElement('img');
    img.src = getCardImage(card);
    img.alt = card.name;

    cardDiv.appendChild(img);
    return cardDiv;
}

function getCardImage(card) {
    // Map card to image filename based on ImplementationPlan.md
    if (card.type === 'suspect') {
        const suspectMap = {
            scarlett: 'CardPersonScarlet.png',
            mustard: 'CardPersonMustard.png',
            white: 'CardPersonWhite.png',
            green: 'CardPersonGreen.png',
            peacock: 'CardPersonPeacock.png',
            plum: 'CardPersonPlum.png'
        };
        return `images/${suspectMap[card.id] || 'CardBack.png'}`;
    } else if (card.type === 'weapon') {
        const weaponMap = {
            candlestick: 'CardWeaponCandlestick.png',
            knife: 'CardWeaponKnife.png',
            leadpipe: 'CardWeaponLeadPipe.png',
            revolver: 'CardWeaponRevolver.png',
            rope: 'CardWeaponRope.png',
            wrench: 'CardWeaponWrench.png'
        };
        return `images/${weaponMap[card.id] || 'CardBack.png'}`;
    } else if (card.type === 'room') {
        const roomMap = {
            kitchen: 'CardRoomKitchen.png',
            ballroom: 'CardRoomBallroom.png',
            conservatory: 'CardRoomConservatory.png',
            billiard: 'CardRoomBilliardRoom.png',
            library: 'CardRoomLibrary.png',
            study: 'CardRoomStudy.png',
            hall: 'CardRoomHall.png',
            lounge: 'CardRoomLounge.png',
            dining: 'CardRoomDiningRoom.png'
        };
        return `images/${roomMap[card.id] || 'CardBack.png'}`;
    }
    return 'images/CardBack.png';
}

// Available squares within each room for placing pawns and weapons
// Room display areas for positioning pawns and weapons (1-based coordinates)
const ROOM_DISPLAY_AREAS = {
    study:        { minCol: 1, minRow: 1, maxCol: 7, maxRow: 4 },
    hall:         { minCol: 10, minRow: 1, maxCol: 15, maxRow: 7 },
    lounge:       { minCol: 18, minRow: 1, maxCol: 24, maxRow: 6 },
    library:      { minCol: 2, minRow: 7, maxCol: 6, maxRow: 11 },
    dining:       { minCol: 17, minRow: 10, maxCol: 24, maxRow: 15 },
    billiard:     { minCol: 1, minRow: 13, maxCol: 6, maxRow: 17 },
    conservatory: { minCol: 2, minRow: 21, maxCol: 5, maxRow: 24 },
    ballroom:     { minCol: 9, minRow: 18, maxCol: 16, maxRow: 23 },
    kitchen:      { minCol: 19, minRow: 19, maxCol: 24, maxRow: 24 }
};

function renderPawns() {
    pawnsLayer.innerHTML = '';

    // Pawn image filename mapping
    const pawnImages = {
        mustard: 'PawnMustard.png',
        scarlett: 'PawnScarlet.png',
        plum: 'PawnPlum.png',
        green: 'PawnGreen.png',
        white: 'PawnWhite.png',
        peacock: 'PawnPeacock.png'
    };

    for (const [character, position] of Object.entries(gameState.pawns)) {
        const pawn = document.createElement('div');
        pawn.className = `pawn ${character}`;

        // Add the pawn image
        const img = document.createElement('img');
        img.src = `images/${pawnImages[character]}`;
        img.alt = CHARACTERS[character].name;
        pawn.appendChild(img);

        if (gameState.currentTurn) {
            const currentPlayer = gameState.players.find(p => p.id === gameState.currentTurn);
            if (currentPlayer && currentPlayer.character === character) {
                pawn.classList.add('current-turn');
            }
        }

        // Calculate pixel position - center of the grid cell
        let x, y;
        if (position.room) {
            // In a room - center pawns horizontally in the middle row
            const area = ROOM_DISPLAY_AREAS[position.room];
            if (area) {
                const pawnsInRoom = Object.entries(gameState.pawns)
                    .filter(([c, p]) => p.room === position.room)
                    .map(([c]) => c);
                const index = pawnsInRoom.indexOf(character);
                const pawnCount = pawnsInRoom.length;

                // Calculate center row (pawns go in upper-middle area)
                const roomHeight = area.maxRow - area.minRow + 1;
                const centerRow = area.minRow + Math.floor((roomHeight - 1) / 2);

                // Calculate horizontal position - center the group of pawns
                const roomWidth = area.maxCol - area.minCol + 1;
                const startCol = area.minCol + Math.floor((roomWidth - pawnCount) / 2);
                const col = startCol + index;

                // 1-based coordinates: subtract 1 for pixel calculation
                x = GRID_ORIGIN_X + ((col - 1) * CELL_WIDTH) + (CELL_WIDTH / 2);
                y = GRID_ORIGIN_Y + ((centerRow - 1) * CELL_HEIGHT) + (CELL_HEIGHT / 2);
            } else {
                // Fallback to position coordinates
                x = GRID_ORIGIN_X + ((position.col - 1) * CELL_WIDTH) + (CELL_WIDTH / 2);
                y = GRID_ORIGIN_Y + ((position.row - 1) * CELL_HEIGHT) + (CELL_HEIGHT / 2);
            }
        } else {
            // Hallway position - center of the cell (1-based coordinates)
            x = GRID_ORIGIN_X + ((position.col - 1) * CELL_WIDTH) + (CELL_WIDTH / 2);
            y = GRID_ORIGIN_Y + ((position.row - 1) * CELL_HEIGHT) + (CELL_HEIGHT / 2);
        }

        // Convert to percentage of board size
        pawn.style.left = `${(x / BOARD_SIZE) * 100}%`;
        pawn.style.top = `${(y / BOARD_SIZE) * 100}%`;

        pawnsLayer.appendChild(pawn);
    }
}

function renderWeapons() {
    weaponsLayer.innerHTML = '';

    const weaponImages = {
        candlestick: 'WeaponCandlestick.png',
        knife: 'WeaponKnife.png',
        leadpipe: 'WeaponLeadPipe.png',
        revolver: 'WeaponRevolver.png',
        rope: 'WeaponRope.png',
        wrench: 'WeaponWrench.png'
    };

    for (const [weapon, room] of Object.entries(gameState.weapons)) {
        const area = ROOM_DISPLAY_AREAS[room];
        if (!area) continue;

        // Get all weapons in this room and find this weapon's index
        const weaponsInRoom = Object.entries(gameState.weapons)
            .filter(([w, r]) => r === room)
            .map(([w]) => w);
        const index = weaponsInRoom.indexOf(weapon);
        const weaponCount = weaponsInRoom.length;

        // Calculate weapon row (one row below center, where pawns are)
        const roomHeight = area.maxRow - area.minRow + 1;
        const centerRow = area.minRow + Math.floor((roomHeight - 1) / 2);
        const weaponRow = centerRow + 1;

        // Calculate horizontal position - center the group of weapons
        const roomWidth = area.maxCol - area.minCol + 1;
        const startCol = area.minCol + Math.floor((roomWidth - weaponCount) / 2);
        const col = startCol + index;

        const weaponDiv = document.createElement('div');
        weaponDiv.className = 'weapon';

        const img = document.createElement('img');
        img.src = `images/${weaponImages[weapon]}`;
        img.alt = WEAPON_NAMES[weapon];

        weaponDiv.appendChild(img);

        // 1-based coordinates: subtract 1 for pixel calculation
        const x = GRID_ORIGIN_X + ((col - 1) * CELL_WIDTH) + CELL_WIDTH / 2;
        const y = GRID_ORIGIN_Y + ((weaponRow - 1) * CELL_HEIGHT) + CELL_HEIGHT / 2;

        weaponDiv.style.left = `${(x / BOARD_SIZE) * 100}%`;
        weaponDiv.style.top = `${(y / BOARD_SIZE) * 100}%`;

        weaponsLayer.appendChild(weaponDiv);
    }
}

function updateTurnInfo() {
    const isMyTurn = gameState.currentTurn === myPlayerId;
    const currentPlayer = gameState.players.find(p => p.id === gameState.currentTurn);

    if (!currentPlayer) return;

    if (isMyTurn) {
        switch (gameState.turnPhase) {
            case 'roll':
                if (canUseSecretPassage()) {
                    addTurnMessage("Your turn! Roll the dice or use a secret passage.");
                } else {
                    addTurnMessage("Your turn! Roll the dice.");
                }
                break;
            case 'move':
                addTurnMessage(`You rolled ${gameState.diceResult}. Click a room or square to move.`);
                break;
            case 'suggest':
                addTurnMessage(`Make a suggestion for the ${ROOM_NAMES[gameState.currentRoom]}.`);
                break;
            case 'end':
                addTurnMessage("Your turn is ending. You may make an accusation or end your turn.");
                break;
        }
    } else {
        addTurnMessage(`${currentPlayer.name}'s turn (${CHARACTERS[currentPlayer.character].name}).`);
    }
}

function updateControls() {
    const isMyTurn = gameState.currentTurn === myPlayerId;
    const currentPlayer = gameState.players.find(p => p.id === myPlayerId);
    const isEliminated = currentPlayer && currentPlayer.eliminated;

    // Disable everything if not my turn or eliminated
    if (!isMyTurn || isEliminated) {
        rollBtn.disabled = true;
        stayBtn.disabled = true;
        passageBtn.disabled = true;
        suggestSuspect.disabled = true;
        suggestWeapon.disabled = true;
        suggestBtn.disabled = true;
        accuseSuspect.disabled = true;
        accuseWeapon.disabled = true;
        accuseRoom.disabled = true;
        accuseBtn.disabled = true;
        endTurnBtn.disabled = true;
        return;
    }

    // Enable based on turn phase
    switch (gameState.turnPhase) {
        case 'roll':
            rollBtn.disabled = false;
            // Stay Put enabled only if player was summoned into a room
            stayBtn.disabled = !wasSummoned;
            // Check if in a corner room for secret passage
            passageBtn.disabled = !canUseSecretPassage();
            suggestSuspect.disabled = true;
            suggestWeapon.disabled = true;
            suggestBtn.disabled = true;
            // Accusation always available on your turn
            accuseSuspect.disabled = false;
            accuseWeapon.disabled = false;
            accuseRoom.disabled = false;
            accuseBtn.disabled = false;
            endTurnBtn.disabled = true;
            break;

        case 'move':
            rollBtn.disabled = true;
            stayBtn.disabled = true;
            passageBtn.disabled = true;
            suggestSuspect.disabled = true;
            suggestWeapon.disabled = true;
            suggestBtn.disabled = true;
            accuseSuspect.disabled = false;
            accuseWeapon.disabled = false;
            accuseRoom.disabled = false;
            accuseBtn.disabled = false;
            endTurnBtn.disabled = true;
            break;

        case 'suggest':
            rollBtn.disabled = true;
            stayBtn.disabled = true;
            passageBtn.disabled = true;
            suggestSuspect.disabled = false;
            suggestWeapon.disabled = false;
            suggestBtn.disabled = false;
            accuseSuspect.disabled = false;
            accuseWeapon.disabled = false;
            accuseRoom.disabled = false;
            accuseBtn.disabled = false;
            endTurnBtn.disabled = true; // Must suggest first
            break;

        case 'end':
            rollBtn.disabled = true;
            stayBtn.disabled = true;
            passageBtn.disabled = true;
            suggestSuspect.disabled = true;
            suggestWeapon.disabled = true;
            suggestBtn.disabled = true;
            accuseSuspect.disabled = false;
            accuseWeapon.disabled = false;
            accuseRoom.disabled = false;
            accuseBtn.disabled = false;
            endTurnBtn.disabled = false;
            break;
    }
}

function canUseSecretPassage() {
    // Check if current position has a secret passage
    const cornerRooms = ['study', 'lounge', 'conservatory', 'kitchen'];
    return myPosition && myPosition.room && cornerRooms.includes(myPosition.room);
}

function populateDropdowns() {
    // Suspects
    const suspectOptions = Object.entries(CHARACTERS).map(([id, data]) =>
        `<option value="${id}">${data.name}</option>`
    ).join('');

    suggestSuspect.innerHTML = '<option value="">-- Suspect --</option>' + suspectOptions;
    accuseSuspect.innerHTML = '<option value="">-- Suspect --</option>' + suspectOptions;

    // Weapons
    const weaponOptions = WEAPONS.map(w =>
        `<option value="${w}">${WEAPON_NAMES[w]}</option>`
    ).join('');

    suggestWeapon.innerHTML = '<option value="">-- Weapon --</option>' + weaponOptions;
    accuseWeapon.innerHTML = '<option value="">-- Weapon --</option>' + weaponOptions;

    // Rooms (for accusation only)
    const roomOptions = ROOMS.map(r =>
        `<option value="${r}">${ROOM_NAMES[r]}</option>`
    ).join('');

    accuseRoom.innerHTML = '<option value="">-- Room --</option>' + roomOptions;
}

function selectDisproveCard(cardId, cardDiv) {
    // Deselect previous
    const cards = disproveCards.querySelectorAll('.card');
    cards.forEach(c => c.classList.remove('selected'));

    // Select new
    cardDiv.classList.add('selected');
    selectedDisproveCard = cardId;
    showCardBtn.disabled = false;
}

// ============================================
// BOARD CLICK HANDLING
// ============================================

gameBoard.addEventListener('click', (e) => {
    if (gameState.currentTurn !== myPlayerId) return;
    if (gameState.turnPhase !== 'move') return;

    const rect = gameBoard.getBoundingClientRect();
    const scale = BOARD_SIZE / rect.width;

    const clickX = (e.clientX - rect.left) * scale;
    const clickY = (e.clientY - rect.top) * scale;

    // Convert to grid coordinates (1-based indexing)
    const col = Math.floor((clickX - GRID_ORIGIN_X) / CELL_WIDTH) + 1;
    const row = Math.floor((clickY - GRID_ORIGIN_Y) / CELL_HEIGHT) + 1;

    if (col < 1 || col > 24 || row < 1 || row > 25) return;

    socket.emit('move-pawn', { targetPosition: { col, row } });
});

// ============================================
// INITIALIZATION
// ============================================

console.log('Clue Online client loaded');

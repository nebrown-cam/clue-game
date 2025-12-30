// server.js - Clue Online Game Server

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const game = require('./game');

// Create the Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'public' folder with correct MIME types
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Store active game rooms
const rooms = {};

// Handle socket connections
io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // Player wants to join a room
    socket.on('join-room', (data) => {
        const { playerName, roomCode } = data;

        // Validate room code (1-999)
        const roomNum = parseInt(roomCode);
        if (isNaN(roomNum) || roomNum < 1 || roomNum > 999) {
            socket.emit('error-message', 'Room code must be between 1 and 999.');
            return;
        }

        const roomCodeStr = roomCode.toString();

        // Create room if it doesn't exist
        if (!rooms[roomCodeStr]) {
            rooms[roomCodeStr] = {
                players: [],
                host: socket.id,
                gameStarted: false,
                phase: 'lobby', // 'lobby' | 'playing' | 'finished'
                solution: null,
                currentTurn: null,
                turnPhase: null, // 'roll' | 'move' | 'suggest' | 'end'
                board: null,
                pendingSuggestion: null,
                eliminatedPlayers: [],
                winner: null,
                diceResult: null,
                pawns: {},
                weapons: {},
                playerCards: {},
                lastSuggestionRoom: {}, // Track last room each player suggested in
                playersClosedModal: [] // Track who has closed the win modal
            };
        }

        const room = rooms[roomCodeStr];

        // Check if game already started
        if (room.gameStarted) {
            socket.emit('error-message', 'Game has already started.');
            return;
        }

        // Check if room is full (6 players max for Clue)
        if (room.players.length >= 6) {
            socket.emit('error-message', 'Room is full (max 6 players).');
            return;
        }

        // Check for duplicate name
        if (room.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
            socket.emit('error-message', 'That name is already taken in this room.');
            return;
        }

        // Add player to room
        const player = {
            id: socket.id,
            name: playerName,
            character: null, // Assigned when game starts
            position: null,  // Board position
            cards: [],
            hasAccused: false
        };
        room.players.push(player);
        socket.join(roomCodeStr);
        socket.roomCode = roomCodeStr;
        socket.playerName = playerName;

        console.log(`${playerName} joined room ${roomCodeStr}`);

        // Tell everyone in the room about the updated player list
        io.to(roomCodeStr).emit('room-update', {
            players: room.players.map(p => ({ id: p.id, name: p.name })),
            hostId: room.host,
            roomCode: roomCodeStr
        });
    });

    // Host starts the game
    socket.on('start-game', () => {
        const roomCode = socket.roomCode;
        const room = rooms[roomCode];

        if (!room) return;

        // Only host can start
        if (socket.id !== room.host) {
            socket.emit('error-message', 'Only the host can start the game.');
            return;
        }

        // Need at least 3 players (per implementation plan: 3-6 players, but 4 min for rules)
        if (room.players.length < 3) {
            socket.emit('error-message', 'Need at least 3 players to start.');
            return;
        }

        room.gameStarted = true;
        room.phase = 'playing';

        // Assign characters randomly to players
        const characters = game.assignCharacters(room.players.length);
        room.players.forEach((player, index) => {
            player.character = characters[index];
            player.position = game.getStartingPosition(characters[index]);
        });

        // Randomize turn order
        game.shuffleArray(room.players);

        // Initialize pawns (all 6 suspects on board, even if not played)
        room.pawns = game.initializePawns();
        // Update pawn positions for actual players
        room.players.forEach(player => {
            room.pawns[player.character] = player.position;
        });

        // Initialize weapons in rooms
        room.weapons = game.initializeWeapons();

        // Deal cards and set solution
        const { solution, playerHands } = game.dealCards(room.players.length);
        room.solution = solution;
        room.players.forEach((player, index) => {
            player.cards = playerHands[index];
            room.playerCards[player.id] = playerHands[index];
        });

        // Set first player's turn (Miss Scarlett goes first if playing, else first in randomized order)
        const scarlettPlayer = room.players.find(p => p.character === 'scarlett');
        if (scarlettPlayer) {
            room.currentTurn = scarlettPlayer.id;
            // Move Scarlett to front of turn order
            const scarlettIndex = room.players.indexOf(scarlettPlayer);
            room.players.splice(scarlettIndex, 1);
            room.players.unshift(scarlettPlayer);
        } else {
            room.currentTurn = room.players[0].id;
        }
        room.turnPhase = 'roll';

        console.log(`Game started in room ${roomCode} with ${room.players.length} players`);

        // Send game state to each player (with only their own cards)
        room.players.forEach((player) => {
            const playerSocket = io.sockets.sockets.get(player.id);
            if (playerSocket) {
                playerSocket.emit('game-started', {
                    players: room.players.map(p => ({
                        id: p.id,
                        name: p.name,
                        character: p.character,
                        position: p.position
                    })),
                    yourCards: player.cards,
                    yourCharacter: player.character,
                    yourPosition: player.position,
                    currentTurn: room.currentTurn,
                    turnPhase: room.turnPhase,
                    pawns: room.pawns,
                    weapons: room.weapons,
                    isHost: player.id === room.host
                });
            }
        });
    });

    // Player rolls the dice
    socket.on('roll-dice', () => {
        const roomCode = socket.roomCode;
        const room = rooms[roomCode];

        if (!room || !room.gameStarted) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        // Verify it's this player's turn and correct phase
        if (room.currentTurn !== socket.id) {
            socket.emit('error-message', 'It is not your turn.');
            return;
        }

        if (room.turnPhase !== 'roll') {
            socket.emit('error-message', 'You cannot roll right now.');
            return;
        }

        // Roll two dice (2-12)
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const diceResult = die1 + die2;
        room.diceResult = diceResult;
        room.turnPhase = 'move';

        console.log(`${player.name} rolled ${diceResult} in room ${roomCode}`);

        // Broadcast dice result
        io.to(roomCode).emit('dice-rolled', {
            playerId: socket.id,
            playerName: player.name,
            result: diceResult
        });
    });

    // Player moves their pawn
    socket.on('move-pawn', (data) => {
        const { targetPosition } = data; // { col, row } or room name
        const roomCode = socket.roomCode;
        const room = rooms[roomCode];

        if (!room || !room.gameStarted) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        if (room.currentTurn !== socket.id || room.turnPhase !== 'move') {
            socket.emit('error-message', 'You cannot move right now.');
            return;
        }

        // Validate move using game logic
        const moveResult = game.validateMove(
            player.position,
            targetPosition,
            room.diceResult,
            room.pawns,
            player.character
        );

        if (!moveResult.valid) {
            socket.emit('error-message', moveResult.error || 'Invalid move.');
            return;
        }

        // Cannot re-enter the same room on the same turn
        if (moveResult.enteredRoom && player.position.room === moveResult.enteredRoom) {
            socket.emit('error-message', 'You cannot re-enter the same room on the same turn.');
            return;
        }

        // Update position
        player.position = moveResult.newPosition;
        room.pawns[player.character] = moveResult.newPosition;

        console.log(`${player.name} moved to ${JSON.stringify(moveResult.newPosition)}`);

        // Broadcast movement
        io.to(roomCode).emit('pawn-moved', {
            playerId: socket.id,
            playerName: player.name,
            character: player.character,
            newPosition: moveResult.newPosition,
            enteredRoom: moveResult.enteredRoom
        });

        // Determine next phase
        if (moveResult.enteredRoom) {
            // Must make a suggestion
            room.turnPhase = 'suggest';
            room.lastSuggestionRoom[socket.id] = moveResult.enteredRoom;
            io.to(roomCode).emit('turn-phase-change', {
                playerId: socket.id,
                phase: 'suggest',
                room: moveResult.enteredRoom
            });
        } else {
            // Can end turn (no suggestion from hallway)
            room.turnPhase = 'end';
            io.to(roomCode).emit('turn-phase-change', {
                playerId: socket.id,
                phase: 'end'
            });
        }
    });

    // Player uses secret passage
    socket.on('use-secret-passage', () => {
        const roomCode = socket.roomCode;
        const room = rooms[roomCode];

        if (!room || !room.gameStarted) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        if (room.currentTurn !== socket.id || room.turnPhase !== 'roll') {
            socket.emit('error-message', 'You cannot use secret passage right now.');
            return;
        }

        const passageResult = game.useSecretPassage(player.position);

        if (!passageResult.valid) {
            socket.emit('error-message', passageResult.error || 'No secret passage here.');
            return;
        }

        // Update position
        player.position = passageResult.newPosition;
        room.pawns[player.character] = passageResult.newPosition;

        console.log(`${player.name} used secret passage to ${passageResult.destinationRoom}`);

        // Broadcast movement
        io.to(roomCode).emit('pawn-moved', {
            playerId: socket.id,
            playerName: player.name,
            character: player.character,
            newPosition: passageResult.newPosition,
            enteredRoom: passageResult.destinationRoom,
            usedSecretPassage: true
        });

        // Must make a suggestion after using secret passage
        room.turnPhase = 'suggest';
        room.lastSuggestionRoom[socket.id] = passageResult.destinationRoom;
        io.to(roomCode).emit('turn-phase-change', {
            playerId: socket.id,
            phase: 'suggest',
            room: passageResult.destinationRoom
        });
    });

    // Player stays put in current room
    socket.on('stay-put', () => {
        const roomCode = socket.roomCode;
        const room = rooms[roomCode];

        if (!room || !room.gameStarted) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        if (room.currentTurn !== socket.id || room.turnPhase !== 'roll') {
            socket.emit('error-message', 'You cannot stay put right now.');
            return;
        }

        const currentRoom = game.getRoomAtPosition(player.position);
        if (!currentRoom) {
            socket.emit('error-message', 'You must be in a room to stay put.');
            return;
        }

        console.log(`${player.name} chose to stay in ${currentRoom}`);

        // Transition to suggest phase
        room.turnPhase = 'suggest';
        room.lastSuggestionRoom[socket.id] = currentRoom;
        io.to(roomCode).emit('turn-phase-change', {
            playerId: socket.id,
            phase: 'suggest',
            room: currentRoom
        });
    });

    // Player makes a suggestion
    socket.on('make-suggestion', (data) => {
        const { suspect, weapon } = data;
        const roomCode = socket.roomCode;
        const room = rooms[roomCode];

        if (!room || !room.gameStarted) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        if (room.currentTurn !== socket.id || room.turnPhase !== 'suggest') {
            socket.emit('error-message', 'You cannot make a suggestion right now.');
            return;
        }

        // Get the room the player is in
        const currentRoom = game.getRoomAtPosition(player.position);
        if (!currentRoom) {
            socket.emit('error-message', 'You must be in a room to make a suggestion.');
            return;
        }

        console.log(`${player.name} suggests: ${suspect} with ${weapon} in ${currentRoom}`);

        // Move suspect pawn to the room
        room.pawns[suspect] = { ...game.getRoomCenter(currentRoom), room: currentRoom };

        // Move weapon to the room
        room.weapons[weapon] = currentRoom;

        // Check if a player's pawn was moved (notify them)
        const summonedPlayer = room.players.find(p => p.character === suspect && p.id !== socket.id);
        if (summonedPlayer) {
            summonedPlayer.position = room.pawns[suspect];
        }

        // Set up suggestion for disproving
        room.pendingSuggestion = {
            suggesterId: socket.id,
            suggesterName: player.name,
            suspect,
            weapon,
            room: currentRoom,
            currentDisproverIndex: 0,
            disproved: false
        };

        // Broadcast the suggestion
        io.to(roomCode).emit('suggestion-made', {
            playerId: socket.id,
            playerName: player.name,
            suspect,
            weapon,
            room: currentRoom,
            pawns: room.pawns,
            weapons: room.weapons,
            summonedPlayer: summonedPlayer ? summonedPlayer.name : null
        });

        // Start the disproving process
        startDisproving(roomCode);
    });

    // Player shows a card to disprove
    socket.on('show-card', (data) => {
        const { cardId } = data;
        const roomCode = socket.roomCode;
        const room = rooms[roomCode];

        if (!room || !room.pendingSuggestion) return;

        const suggestion = room.pendingSuggestion;
        const suggesterIndex = room.players.findIndex(p => p.id === suggestion.suggesterId);
        const disproverIndex = (suggesterIndex + 1 + suggestion.currentDisproverIndex) % room.players.length;
        const disprover = room.players[disproverIndex];

        if (socket.id !== disprover.id) {
            socket.emit('error-message', 'It is not your turn to disprove.');
            return;
        }

        // Validate the card is in disprover's hand and matches suggestion
        const card = disprover.cards.find(c => c.id === cardId);
        if (!card) {
            socket.emit('error-message', 'You do not have that card.');
            return;
        }

        const matchesSuggestion =
            card.id === suggestion.suspect ||
            card.id === suggestion.weapon ||
            card.id === suggestion.room;

        if (!matchesSuggestion) {
            socket.emit('error-message', 'That card does not match the suggestion.');
            return;
        }

        console.log(`${disprover.name} showed ${card.id} to ${suggestion.suggesterName}`);

        // Send the card privately to the suggester
        const suggesterSocket = io.sockets.sockets.get(suggestion.suggesterId);
        if (suggesterSocket) {
            suggesterSocket.emit('card-shown-to-you', {
                showerId: disprover.id,
                showerName: disprover.name,
                card: card
            });
        }

        // Tell everyone else that a card was shown (but not which one)
        socket.to(roomCode).emit('card-shown', {
            showerId: disprover.id,
            showerName: disprover.name,
            suggesterId: suggestion.suggesterId,
            suggesterName: suggestion.suggesterName
        });

        // End the suggestion
        room.pendingSuggestion = null;
        room.turnPhase = 'end';

        io.to(roomCode).emit('turn-phase-change', {
            playerId: room.currentTurn,
            phase: 'end'
        });
    });

    // Player cannot disprove (passes)
    socket.on('cannot-disprove', () => {
        const roomCode = socket.roomCode;
        const room = rooms[roomCode];

        if (!room || !room.pendingSuggestion) return;

        const suggestion = room.pendingSuggestion;
        const suggesterIndex = room.players.findIndex(p => p.id === suggestion.suggesterId);
        const disproverIndex = (suggesterIndex + 1 + suggestion.currentDisproverIndex) % room.players.length;
        const disprover = room.players[disproverIndex];

        if (socket.id !== disprover.id) {
            socket.emit('error-message', 'It is not your turn to disprove.');
            return;
        }

        console.log(`${disprover.name} cannot disprove`);

        io.to(roomCode).emit('player-cannot-disprove', {
            playerId: disprover.id,
            playerName: disprover.name,
            suspect: suggestion.suspect,
            weapon: suggestion.weapon,
            room: suggestion.room
        });

        // Move to next player
        suggestion.currentDisproverIndex++;
        continueDisproving(roomCode);
    });

    // Player makes an accusation
    socket.on('make-accusation', (data) => {
        const { suspect, weapon, room: accusedRoom } = data;
        const roomCode = socket.roomCode;
        const room = rooms[roomCode];

        if (!room || !room.gameStarted) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        if (room.currentTurn !== socket.id) {
            socket.emit('error-message', 'It is not your turn.');
            return;
        }

        if (player.hasAccused) {
            socket.emit('error-message', 'You have already made a false accusation.');
            return;
        }

        console.log(`${player.name} accuses: ${suspect} with ${weapon} in ${accusedRoom}`);

        // Check against solution
        const correct =
            room.solution.suspect === suspect &&
            room.solution.weapon === weapon &&
            room.solution.room === accusedRoom;

        if (correct) {
            // Player wins!
            room.winner = socket.id;
            room.phase = 'finished';

            io.to(roomCode).emit('game-won', {
                winnerId: socket.id,
                winnerName: player.name,
                solution: room.solution
            });

            console.log(`${player.name} won the game!`);
        } else {
            // Wrong accusation - player is eliminated
            player.hasAccused = true;
            room.eliminatedPlayers.push(socket.id);

            io.to(roomCode).emit('wrong-accusation', {
                playerId: socket.id,
                playerName: player.name
            });

            console.log(`${player.name} made a wrong accusation and is eliminated`);

            // Check if only one player remains
            const activePlayers = room.players.filter(p => !room.eliminatedPlayers.includes(p.id));
            if (activePlayers.length === 1) {
                room.winner = activePlayers[0].id;
                room.phase = 'finished';

                io.to(roomCode).emit('game-won', {
                    winnerId: activePlayers[0].id,
                    winnerName: activePlayers[0].name,
                    solution: room.solution,
                    byElimination: true
                });

                console.log(`${activePlayers[0].name} won by elimination!`);
            } else {
                // End this player's turn
                endTurn(roomCode);
            }
        }
    });

    // Player ends their turn
    socket.on('end-turn', () => {
        const roomCode = socket.roomCode;
        const room = rooms[roomCode];

        if (!room || !room.gameStarted) return;

        if (room.currentTurn !== socket.id) {
            socket.emit('error-message', 'It is not your turn.');
            return;
        }

        if (room.turnPhase === 'suggest') {
            socket.emit('error-message', 'You must make a suggestion first.');
            return;
        }

        endTurn(roomCode);
    });

    // Player closes win modal
    socket.on('close-win-modal', () => {
        const roomCode = socket.roomCode;
        const room = rooms[roomCode];

        if (!room || room.phase !== 'finished') return;

        // Track that this player closed the modal
        if (!room.playersClosedModal.includes(socket.id)) {
            room.playersClosedModal.push(socket.id);
        }

        // Check if all players have closed the modal
        if (room.playersClosedModal.length === room.players.length) {
            // Prompt host to start new game
            const hostSocket = io.sockets.sockets.get(room.host);
            if (hostSocket) {
                hostSocket.emit('prompt-new-game');
            }
        }
    });

    // Host starts a new game
    socket.on('start-new-game', () => {
        const roomCode = socket.roomCode;
        const room = rooms[roomCode];

        if (!room || room.host !== socket.id) return;

        console.log(`Host starting new game in room ${roomCode}`);

        // Reset game state but keep players
        room.gameStarted = false;
        room.phase = 'lobby';
        room.solution = null;
        room.currentTurn = null;
        room.turnPhase = null;
        room.pendingSuggestion = null;
        room.eliminatedPlayers = [];
        room.winner = null;
        room.diceResult = null;
        room.pawns = {};
        room.weapons = {};
        room.playerCards = {};
        room.lastSuggestionRoom = {};
        room.playersClosedModal = [];

        // Reset player state
        room.players.forEach(p => {
            p.character = null;
            p.cards = [];
            p.position = null;
            p.hasAccused = false;
            p.eliminated = false;
        });

        // Notify all players to return to lobby
        io.to(roomCode).emit('return-to-lobby', {
            players: room.players.map(p => ({ id: p.id, name: p.name })),
            hostId: room.host,
            roomCode: roomCode
        });
    });

    // Host declines new game
    socket.on('decline-new-game', () => {
        const roomCode = socket.roomCode;
        const room = rooms[roomCode];

        if (!room || room.host !== socket.id) return;

        console.log(`Host declined new game in room ${roomCode}`);

        // Notify all players game is ending
        io.to(roomCode).emit('game-ended');

        // Clean up room
        delete rooms[roomCode];
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('A player disconnected:', socket.id);

        const roomCode = socket.roomCode;
        if (!roomCode || !rooms[roomCode]) return;

        const room = rooms[roomCode];

        // Remove player from room
        room.players = room.players.filter(p => p.id !== socket.id);

        // If room is empty, delete it
        if (room.players.length === 0) {
            delete rooms[roomCode];
            console.log(`Room ${roomCode} deleted (empty)`);
            return;
        }

        // If host left, assign new host
        if (room.host === socket.id) {
            room.host = room.players[0].id;
        }

        // If game started and it was this player's turn, move to next
        if (room.gameStarted && room.currentTurn === socket.id) {
            endTurn(roomCode);
        }

        // Update remaining players
        io.to(roomCode).emit('player-disconnected', {
            playerId: socket.id,
            playerName: socket.playerName,
            newHostId: room.host
        });

        io.to(roomCode).emit('room-update', {
            players: room.players.map(p => ({ id: p.id, name: p.name })),
            hostId: room.host,
            roomCode: roomCode
        });
    });
});

// Helper: Start the disproving process
function startDisproving(roomCode) {
    const room = rooms[roomCode];
    if (!room || !room.pendingSuggestion) return;

    continueDisproving(roomCode);
}

// Helper: Continue to next player for disproving
function continueDisproving(roomCode) {
    const room = rooms[roomCode];
    if (!room || !room.pendingSuggestion) return;

    const suggestion = room.pendingSuggestion;
    const suggesterIndex = room.players.findIndex(p => p.id === suggestion.suggesterId);

    // Check if we've gone around to all other players
    if (suggestion.currentDisproverIndex >= room.players.length - 1) {
        // No one could disprove
        console.log('No one could disprove the suggestion');

        io.to(roomCode).emit('suggestion-not-disproved', {
            suggesterId: suggestion.suggesterId,
            suggesterName: suggestion.suggesterName
        });

        room.pendingSuggestion = null;
        room.turnPhase = 'end';

        io.to(roomCode).emit('turn-phase-change', {
            playerId: room.currentTurn,
            phase: 'end'
        });
        return;
    }

    const disproverIndex = (suggesterIndex + 1 + suggestion.currentDisproverIndex) % room.players.length;
    const disprover = room.players[disproverIndex];

    // Check if this player has matching cards
    const matchingCards = disprover.cards.filter(card =>
        card.id === suggestion.suspect ||
        card.id === suggestion.weapon ||
        card.id === suggestion.room
    );

    // Notify the disprover it's their turn
    const disproverSocket = io.sockets.sockets.get(disprover.id);
    if (disproverSocket) {
        disproverSocket.emit('your-turn-to-disprove', {
            suggestion: {
                suspect: suggestion.suspect,
                weapon: suggestion.weapon,
                room: suggestion.room,
                suggesterName: suggestion.suggesterName
            },
            matchingCards: matchingCards,
            canDisprove: matchingCards.length > 0
        });
    }

    // Notify others (not the disprover) who is disproving
    if (disproverSocket) {
        disproverSocket.broadcast.to(roomCode).emit('waiting-for-disprove', {
            disproverId: disprover.id,
            disproverName: disprover.name
        });
    }
}

// Helper: End current turn and move to next player
function endTurn(roomCode) {
    const room = rooms[roomCode];
    if (!room || !room.gameStarted) return;

    const currentIndex = room.players.findIndex(p => p.id === room.currentTurn);
    let nextIndex = (currentIndex + 1) % room.players.length;

    // Skip eliminated players
    let attempts = 0;
    while (room.eliminatedPlayers.includes(room.players[nextIndex].id) && attempts < room.players.length) {
        nextIndex = (nextIndex + 1) % room.players.length;
        attempts++;
    }

    const nextPlayer = room.players[nextIndex];
    room.currentTurn = nextPlayer.id;
    room.turnPhase = 'roll';
    room.diceResult = null;
    room.pendingSuggestion = null;

    console.log(`Turn passed to ${nextPlayer.name}`);

    io.to(roomCode).emit('turn-changed', {
        currentTurn: nextPlayer.id,
        currentTurnName: nextPlayer.name,
        turnPhase: 'roll'
    });
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Clue server running on port ${PORT}`);
});

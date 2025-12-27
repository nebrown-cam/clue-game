// game.js - Clue game logic module

// ============================================
// BOARD CONFIGURATION
// Based on GameBoardGrid.md specifications
// ============================================

// Board dimensions: 24 columns (A-X), 25 rows (1-25)
const BOARD_COLS = 24;
const BOARD_ROWS = 25;

// Pixel coordinate formula from GameBoardGrid.md
const GRID_ORIGIN_X = 77;
const GRID_ORIGIN_Y = 70;
const CELL_SIZE = 53;

// Characters (suspects)
const CHARACTERS = {
    mustard: { name: 'Colonel Mustard', color: 'Yellow' },
    scarlett: { name: 'Miss Scarlett', color: 'Red' },
    plum: { name: 'Professor Plum', color: 'Purple' },
    green: { name: 'Mr. Green', color: 'Green' },
    white: { name: 'Mrs. White', color: 'White' },
    peacock: { name: 'Mrs. Peacock', color: 'Blue' }
};

// Weapons
const WEAPONS = ['candlestick', 'knife', 'leadpipe', 'revolver', 'rope', 'wrench'];

// Rooms
const ROOMS = ['kitchen', 'ballroom', 'conservatory', 'billiard', 'library', 'study', 'hall', 'lounge', 'dining'];

// Starting positions (from GameBoardGrid.md)
// Col: A=0, B=1, ... X=23; Row: 1=0, 2=1, ... 25=24
const STARTING_POSITIONS = {
    mustard: { col: 23, row: 7 },   // X8
    scarlett: { col: 16, row: 0 },   // Q1
    plum: { col: 0, row: 5 },        // A6
    green: { col: 9, row: 24 },      // J25
    white: { col: 14, row: 24 },     // O25
    peacock: { col: 0, row: 18 }     // A19
};

// Initial weapon placement (from GameBoardGrid.md)
const INITIAL_WEAPON_ROOMS = {
    candlestick: 'kitchen',
    knife: 'ballroom',
    leadpipe: 'conservatory',
    revolver: 'billiard',
    rope: 'library',
    wrench: 'study'
};

// Room definitions - squares that make up each room
const ROOM_SQUARES = {
    study: {
        // A1-G4
        squares: generateRectangle(0, 0, 6, 3),
        displayArea: { minCol: 0, minRow: 0, maxCol: 6, maxRow: 3 }
    },
    hall: {
        // J1-O7
        squares: generateRectangle(9, 0, 14, 6),
        displayArea: { minCol: 9, minRow: 0, maxCol: 14, maxRow: 6 }
    },
    lounge: {
        // R1-X6
        squares: generateRectangle(17, 0, 23, 5),
        displayArea: { minCol: 17, minRow: 0, maxCol: 23, maxRow: 5 }
    },
    library: {
        // B7-F11 plus A8-A10 and G8-G10
        squares: [
            ...generateRectangle(1, 6, 5, 10),
            { col: 0, row: 7 }, { col: 0, row: 8 }, { col: 0, row: 9 },
            { col: 6, row: 7 }, { col: 6, row: 8 }, { col: 6, row: 9 }
        ],
        displayArea: { minCol: 1, minRow: 6, maxCol: 5, maxRow: 10 }
    },
    dining: {
        // Q10-X15 plus T16-X16
        squares: [
            ...generateRectangle(16, 9, 23, 14),
            { col: 19, row: 15 }, { col: 20, row: 15 }, { col: 21, row: 15 },
            { col: 22, row: 15 }, { col: 23, row: 15 }
        ],
        displayArea: { minCol: 16, minRow: 9, maxCol: 23, maxRow: 14 }
    },
    billiard: {
        // A13-F17
        squares: generateRectangle(0, 12, 5, 16),
        displayArea: { minCol: 0, minRow: 12, maxCol: 5, maxRow: 16 }
    },
    conservatory: {
        // A21-F24 plus B20-E20
        squares: [
            ...generateRectangle(0, 20, 5, 23),
            { col: 1, row: 19 }, { col: 2, row: 19 }, { col: 3, row: 19 }, { col: 4, row: 19 }
        ],
        displayArea: { minCol: 1, minRow: 20, maxCol: 4, maxRow: 23 }
    },
    ballroom: {
        // I18-P23 plus K24-N25
        squares: [
            ...generateRectangle(8, 17, 15, 22),
            { col: 10, row: 23 }, { col: 11, row: 23 }, { col: 12, row: 23 }, { col: 13, row: 23 },
            { col: 10, row: 24 }, { col: 11, row: 24 }, { col: 12, row: 24 }, { col: 13, row: 24 }
        ],
        displayArea: { minCol: 8, minRow: 17, maxCol: 15, maxRow: 22 }
    },
    kitchen: {
        // S19-X24
        squares: generateRectangle(18, 18, 23, 23),
        displayArea: { minCol: 18, minRow: 18, maxCol: 23, maxRow: 23 }
    }
};

// Door squares (room square -> hallway square in front)
const DOORS = {
    study: [{ door: { col: 6, row: 3 }, hallway: { col: 6, row: 4 } }],
    hall: [
        { door: { col: 9, row: 4 }, hallway: { col: 8, row: 4 } },
        { door: { col: 11, row: 6 }, hallway: { col: 11, row: 7 } },
        { door: { col: 12, row: 6 }, hallway: { col: 12, row: 7 } }
    ],
    lounge: [{ door: { col: 17, row: 5 }, hallway: { col: 17, row: 6 } }],
    library: [
        { door: { col: 6, row: 8 }, hallway: { col: 7, row: 8 } },
        { door: { col: 3, row: 10 }, hallway: { col: 3, row: 11 } }
    ],
    billiard: [
        { door: { col: 1, row: 12 }, hallway: { col: 1, row: 11 } },
        { door: { col: 5, row: 15 }, hallway: { col: 6, row: 15 } }
    ],
    dining: [
        { door: { col: 16, row: 12 }, hallway: { col: 15, row: 12 } },
        { door: { col: 17, row: 9 }, hallway: { col: 17, row: 8 } }
    ],
    conservatory: [{ door: { col: 4, row: 19 }, hallway: { col: 5, row: 19 } }],
    ballroom: [
        { door: { col: 9, row: 17 }, hallway: { col: 9, row: 16 } },
        { door: { col: 14, row: 17 }, hallway: { col: 14, row: 16 } },
        { door: { col: 8, row: 19 }, hallway: { col: 7, row: 19 } },
        { door: { col: 15, row: 19 }, hallway: { col: 16, row: 19 } }
    ],
    kitchen: [{ door: { col: 19, row: 18 }, hallway: { col: 19, row: 17 } }]
};

// Secret passages (corner rooms)
const SECRET_PASSAGES = {
    study: { passage: { col: 0, row: 3 }, destination: 'kitchen' },      // A4 -> Kitchen
    lounge: { passage: { col: 23, row: 5 }, destination: 'conservatory' }, // X6 -> Conservatory
    conservatory: { passage: { col: 1, row: 19 }, destination: 'lounge' }, // B20 -> Lounge
    kitchen: { passage: { col: 18, row: 23 }, destination: 'study' }      // S24 -> Study
};

// Blocked squares (walls, edges)
const BLOCKED_SQUARES = [
    // Top edge
    { col: 8, row: 0 }, { col: 15, row: 0 },
    // Left edge
    { col: 0, row: 4 }, { col: 0, row: 6 }, { col: 0, row: 10 }, { col: 0, row: 11 },
    { col: 0, row: 17 }, { col: 0, row: 19 },
    // Right edge
    { col: 23, row: 6 }, { col: 23, row: 8 }, { col: 23, row: 16 },
    // Bottom area
    { col: 6, row: 23 }, { col: 17, row: 23 },
    // Bottom row (except starting positions and ballroom)
    { col: 0, row: 24 }, { col: 1, row: 24 }, { col: 2, row: 24 }, { col: 3, row: 24 },
    { col: 4, row: 24 }, { col: 5, row: 24 }, { col: 6, row: 24 }, { col: 7, row: 24 },
    { col: 8, row: 24 }, // J25 (green start) and O25 (white start) are NOT blocked
    { col: 15, row: 24 }, { col: 16, row: 24 }, { col: 17, row: 24 }, { col: 18, row: 24 },
    { col: 19, row: 24 }, { col: 20, row: 24 }, { col: 21, row: 24 }, { col: 22, row: 24 },
    { col: 23, row: 24 }
];

// Envelope area (not walkable)
const ENVELOPE_SQUARES = generateRectangle(9, 8, 13, 14);

// ============================================
// HELPER FUNCTIONS
// ============================================

// Generate rectangle of squares
function generateRectangle(minCol, minRow, maxCol, maxRow) {
    const squares = [];
    for (let col = minCol; col <= maxCol; col++) {
        for (let row = minRow; row <= maxRow; row++) {
            squares.push({ col, row });
        }
    }
    return squares;
}

// Convert column letter to index (A=0, B=1, ... X=23)
function colLetterToIndex(letter) {
    return letter.toUpperCase().charCodeAt(0) - 65;
}

// Convert row number to index (1=0, 2=1, ... 25=24)
function rowNumberToIndex(num) {
    return num - 1;
}

// Get pixel coordinates for a grid position
function getPixelCoords(col, row) {
    return {
        x: GRID_ORIGIN_X + (col * CELL_SIZE) + Math.floor(CELL_SIZE / 2),
        y: GRID_ORIGIN_Y + (row * CELL_SIZE) + Math.floor(CELL_SIZE / 2)
    };
}

// Check if position is in a room
function isInRoom(pos) {
    for (const [roomName, roomData] of Object.entries(ROOM_SQUARES)) {
        if (roomData.squares.some(sq => sq.col === pos.col && sq.row === pos.row)) {
            return roomName;
        }
    }
    return null;
}

// Get room at position
function getRoomAtPosition(pos) {
    return isInRoom(pos);
}

// Check if position is blocked
function isBlocked(pos) {
    // Check explicit blocked squares
    if (BLOCKED_SQUARES.some(sq => sq.col === pos.col && sq.row === pos.row)) {
        return true;
    }
    // Check envelope area
    if (ENVELOPE_SQUARES.some(sq => sq.col === pos.col && sq.row === pos.row)) {
        return true;
    }
    // Check room interiors (can't walk through rooms without entering)
    const room = isInRoom(pos);
    if (room) {
        // Can only be in room squares if at a door
        const roomDoors = DOORS[room];
        const isAtDoor = roomDoors.some(d => d.door.col === pos.col && d.door.row === pos.row);
        if (!isAtDoor) {
            return true; // Room interior - blocked for pathfinding
        }
    }
    return false;
}

// Check if position is a walkable hallway square
function isWalkable(pos) {
    // Out of bounds
    if (pos.col < 0 || pos.col >= BOARD_COLS || pos.row < 0 || pos.row >= BOARD_ROWS) {
        return false;
    }
    // Not blocked
    if (isBlocked(pos)) {
        return false;
    }
    // Not in a room (hallway only)
    if (isInRoom(pos)) {
        return false;
    }
    return true;
}

// Get center position for a room (for placing pawns/weapons)
function getRoomCenter(roomName) {
    const room = ROOM_SQUARES[roomName];
    if (!room) return null;

    const { minCol, minRow, maxCol, maxRow } = room.displayArea;
    return {
        col: Math.floor((minCol + maxCol) / 2),
        row: Math.floor((minRow + maxRow) / 2),
        room: roomName
    };
}

// Shuffle array in place (Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ============================================
// GAME LOGIC FUNCTIONS
// ============================================

// Assign characters to players randomly
function assignCharacters(playerCount) {
    const characterKeys = Object.keys(CHARACTERS);
    shuffleArray(characterKeys);
    return characterKeys.slice(0, playerCount);
}

// Get starting position for a character
function getStartingPosition(character) {
    return { ...STARTING_POSITIONS[character] };
}

// Initialize all pawn positions (all 6 on board)
function initializePawns() {
    const pawns = {};
    for (const [char, pos] of Object.entries(STARTING_POSITIONS)) {
        pawns[char] = { ...pos };
    }
    return pawns;
}

// Initialize weapon positions
function initializeWeapons() {
    const weapons = {};
    for (const [weapon, room] of Object.entries(INITIAL_WEAPON_ROOMS)) {
        weapons[weapon] = room;
    }
    return weapons;
}

// Create and deal cards
function dealCards(playerCount) {
    // Create all cards
    const suspectCards = Object.keys(CHARACTERS).map(id => ({ id, type: 'suspect', name: CHARACTERS[id].name }));
    const weaponCards = WEAPONS.map(id => ({ id, type: 'weapon', name: id.charAt(0).toUpperCase() + id.slice(1) }));
    const roomCards = ROOMS.map(id => ({
        id,
        type: 'room',
        name: id.charAt(0).toUpperCase() + id.slice(1) + (id === 'billiard' ? ' Room' : id === 'dining' ? ' Room' : '')
    }));

    // Shuffle each pile
    shuffleArray(suspectCards);
    shuffleArray(weaponCards);
    shuffleArray(roomCards);

    // Select solution (one from each pile)
    const solution = {
        suspect: suspectCards.pop().id,
        weapon: weaponCards.pop().id,
        room: roomCards.pop().id
    };

    // Combine remaining cards and shuffle
    const remainingCards = [...suspectCards, ...weaponCards, ...roomCards];
    shuffleArray(remainingCards);

    // Deal to players
    const playerHands = Array.from({ length: playerCount }, () => []);
    let playerIndex = 0;
    for (const card of remainingCards) {
        playerHands[playerIndex].push(card);
        playerIndex = (playerIndex + 1) % playerCount;
    }

    return { solution, playerHands };
}

// BFS pathfinding to find shortest path
function findPath(start, end, pawns, excludeCharacter) {
    const queue = [{ pos: start, dist: 0, path: [start] }];
    const visited = new Set();
    visited.add(`${start.col},${start.row}`);

    while (queue.length > 0) {
        const { pos, dist, path } = queue.shift();

        if (pos.col === end.col && pos.row === end.row) {
            return { distance: dist, path };
        }

        // Check 4 directions (no diagonal)
        const directions = [
            { col: pos.col, row: pos.row - 1 }, // up
            { col: pos.col, row: pos.row + 1 }, // down
            { col: pos.col - 1, row: pos.row }, // left
            { col: pos.col + 1, row: pos.row }  // right
        ];

        for (const next of directions) {
            const key = `${next.col},${next.row}`;
            if (visited.has(key)) continue;

            if (!isWalkable(next)) continue;

            // Check if another pawn is blocking
            let blocked = false;
            for (const [char, pawnPos] of Object.entries(pawns)) {
                if (char === excludeCharacter) continue;
                if (pawnPos.col === next.col && pawnPos.row === next.row && !pawnPos.room) {
                    blocked = true;
                    break;
                }
            }
            if (blocked) continue;

            visited.add(key);
            queue.push({ pos: next, dist: dist + 1, path: [...path, next] });
        }
    }

    return null; // No path found
}

// Validate a move
function validateMove(currentPos, targetPos, diceResult, pawns, character) {
    // Check if targeting a room
    const targetRoom = isInRoom(targetPos);

    if (targetRoom) {
        // Find nearest unblocked door to enter
        const roomDoors = DOORS[targetRoom];
        let bestPath = null;
        let entryDoor = null;

        for (const doorInfo of roomDoors) {
            // Check if door hallway is blocked by a pawn
            let doorBlocked = false;
            for (const [char, pawnPos] of Object.entries(pawns)) {
                if (char === character) continue;
                if (pawnPos.col === doorInfo.hallway.col && pawnPos.row === doorInfo.hallway.row && !pawnPos.room) {
                    doorBlocked = true;
                    break;
                }
            }
            if (doorBlocked) continue;

            // Find path to this door's hallway square
            const startPos = currentPos.room ? getExitHallway(currentPos.room, pawns, character) : currentPos;
            if (!startPos) continue;

            const path = findPath(startPos, doorInfo.hallway, pawns, character);
            if (path && path.distance <= diceResult) {
                if (!bestPath || path.distance < bestPath.distance) {
                    bestPath = path;
                    entryDoor = doorInfo;
                }
            }
        }

        if (bestPath) {
            return {
                valid: true,
                newPosition: { ...getRoomCenter(targetRoom), room: targetRoom },
                enteredRoom: targetRoom,
                path: bestPath.path
            };
        } else {
            return { valid: false, error: 'Cannot reach that room with your dice roll.' };
        }
    } else {
        // Moving to a hallway square
        if (!isWalkable(targetPos)) {
            return { valid: false, error: 'That square is not walkable.' };
        }

        // Check if target is occupied
        for (const [char, pawnPos] of Object.entries(pawns)) {
            if (char === character) continue;
            if (pawnPos.col === targetPos.col && pawnPos.row === targetPos.row && !pawnPos.room) {
                return { valid: false, error: 'That square is occupied.' };
            }
        }

        const startPos = currentPos.room ? getExitHallway(currentPos.room, pawns, character) : currentPos;
        if (!startPos) {
            return { valid: false, error: 'All exits are blocked.' };
        }

        const path = findPath(startPos, targetPos, pawns, character);
        if (!path) {
            return { valid: false, error: 'No valid path to that square.' };
        }

        if (path.distance > diceResult) {
            return { valid: false, error: `That square is ${path.distance} squares away, but you only rolled ${diceResult}.` };
        }

        return {
            valid: true,
            newPosition: targetPos,
            enteredRoom: null,
            path: path.path
        };
    }
}

// Get an unblocked hallway square to exit a room
function getExitHallway(roomName, pawns, character) {
    const roomDoors = DOORS[roomName];

    for (const doorInfo of roomDoors) {
        let blocked = false;
        for (const [char, pawnPos] of Object.entries(pawns)) {
            if (char === character) continue;
            if (pawnPos.col === doorInfo.hallway.col && pawnPos.row === doorInfo.hallway.row && !pawnPos.room) {
                blocked = true;
                break;
            }
        }
        if (!blocked) {
            return doorInfo.hallway;
        }
    }
    return null; // All exits blocked
}

// Use secret passage
function useSecretPassage(currentPos) {
    const room = currentPos.room;
    if (!room) {
        return { valid: false, error: 'You are not in a room.' };
    }

    const passage = SECRET_PASSAGES[room];
    if (!passage) {
        return { valid: false, error: 'This room has no secret passage.' };
    }

    const destRoom = passage.destination;
    return {
        valid: true,
        newPosition: { ...getRoomCenter(destRoom), room: destRoom },
        destinationRoom: destRoom
    };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Constants
    CHARACTERS,
    WEAPONS,
    ROOMS,
    STARTING_POSITIONS,
    ROOM_SQUARES,
    DOORS,
    SECRET_PASSAGES,
    BOARD_COLS,
    BOARD_ROWS,
    CELL_SIZE,
    GRID_ORIGIN_X,
    GRID_ORIGIN_Y,

    // Functions
    shuffleArray,
    assignCharacters,
    getStartingPosition,
    initializePawns,
    initializeWeapons,
    dealCards,
    validateMove,
    useSecretPassage,
    getRoomAtPosition,
    getRoomCenter,
    getPixelCoords,
    isInRoom,
    isWalkable
};

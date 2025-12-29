// game.js - Clue game logic module

// ============================================
// BOARD CONFIGURATION
// Based on GameBoardGrid.md specifications
// ============================================

// Board dimensions: 24 columns (A-X = 1-24), 25 rows (1-25)
// Using 1-based indexing throughout
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
// Col: A=1, B=2, ... X=24; Row: 1-25 (1-based indexing)
const STARTING_POSITIONS = {
    mustard: { col: 24, row: 8 },    // X8
    scarlett: { col: 17, row: 1 },   // Q1
    plum: { col: 1, row: 6 },        // A6
    green: { col: 10, row: 25 },     // J25
    white: { col: 15, row: 25 },     // O25
    peacock: { col: 1, row: 19 }     // A19
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

// Room definitions - squares that make up each room (1-based indexing)
const ROOM_SQUARES = {
    study: {
        // A1-G4
        squares: generateRectangle(1, 1, 7, 4),
        displayArea: { minCol: 1, minRow: 1, maxCol: 7, maxRow: 4 }
    },
    hall: {
        // J1-O7
        squares: generateRectangle(10, 1, 15, 7),
        displayArea: { minCol: 10, minRow: 1, maxCol: 15, maxRow: 7 }
    },
    lounge: {
        // R1-X6
        squares: generateRectangle(18, 1, 24, 6),
        displayArea: { minCol: 18, minRow: 1, maxCol: 24, maxRow: 6 }
    },
    library: {
        // B7-F11 plus A8-A10 and G8-G10
        squares: [
            ...generateRectangle(2, 7, 6, 11),
            { col: 1, row: 8 }, { col: 1, row: 9 }, { col: 1, row: 10 },
            { col: 7, row: 8 }, { col: 7, row: 9 }, { col: 7, row: 10 }
        ],
        displayArea: { minCol: 2, minRow: 7, maxCol: 6, maxRow: 11 }
    },
    dining: {
        // Q10-X15 plus T16-X16
        squares: [
            ...generateRectangle(17, 10, 24, 15),
            { col: 20, row: 16 }, { col: 21, row: 16 }, { col: 22, row: 16 },
            { col: 23, row: 16 }, { col: 24, row: 16 }
        ],
        displayArea: { minCol: 17, minRow: 10, maxCol: 24, maxRow: 15 }
    },
    billiard: {
        // A13-F17
        squares: generateRectangle(1, 13, 6, 17),
        displayArea: { minCol: 1, minRow: 13, maxCol: 6, maxRow: 17 }
    },
    conservatory: {
        // A21-F24 plus B20-E20
        squares: [
            ...generateRectangle(1, 21, 6, 24),
            { col: 2, row: 20 }, { col: 3, row: 20 }, { col: 4, row: 20 }, { col: 5, row: 20 }
        ],
        displayArea: { minCol: 2, minRow: 21, maxCol: 5, maxRow: 24 }
    },
    ballroom: {
        // I18-P23 plus K24-N25
        squares: [
            ...generateRectangle(9, 18, 16, 23),
            { col: 11, row: 24 }, { col: 12, row: 24 }, { col: 13, row: 24 }, { col: 14, row: 24 },
            { col: 11, row: 25 }, { col: 12, row: 25 }, { col: 13, row: 25 }, { col: 14, row: 25 }
        ],
        displayArea: { minCol: 9, minRow: 18, maxCol: 16, maxRow: 23 }
    },
    kitchen: {
        // S19-X24
        squares: generateRectangle(19, 19, 24, 24),
        displayArea: { minCol: 19, minRow: 19, maxCol: 24, maxRow: 24 }
    }
};

// Door squares (room square -> hallway square in front) (1-based indexing)
const DOORS = {
    study: [{ door: { col: 7, row: 4 }, hallway: { col: 7, row: 5 } }],
    hall: [
        { door: { col: 10, row: 5 }, hallway: { col: 9, row: 5 } },
        { door: { col: 12, row: 7 }, hallway: { col: 12, row: 8 } },
        { door: { col: 13, row: 7 }, hallway: { col: 13, row: 8 } }
    ],
    lounge: [{ door: { col: 18, row: 6 }, hallway: { col: 18, row: 7 } }],
    library: [
        { door: { col: 7, row: 9 }, hallway: { col: 8, row: 9 } },
        { door: { col: 4, row: 11 }, hallway: { col: 4, row: 12 } }
    ],
    billiard: [
        { door: { col: 2, row: 13 }, hallway: { col: 2, row: 12 } },
        { door: { col: 6, row: 16 }, hallway: { col: 7, row: 16 } }
    ],
    dining: [
        { door: { col: 17, row: 13 }, hallway: { col: 16, row: 13 } },
        { door: { col: 18, row: 10 }, hallway: { col: 18, row: 9 } }
    ],
    conservatory: [{ door: { col: 5, row: 20 }, hallway: { col: 6, row: 20 } }],
    ballroom: [
        { door: { col: 10, row: 18 }, hallway: { col: 10, row: 17 } },
        { door: { col: 15, row: 18 }, hallway: { col: 15, row: 17 } },
        { door: { col: 9, row: 20 }, hallway: { col: 8, row: 20 } },
        { door: { col: 16, row: 20 }, hallway: { col: 17, row: 20 } }
    ],
    kitchen: [{ door: { col: 20, row: 19 }, hallway: { col: 20, row: 18 } }]
};

// Secret passages (corner rooms) (1-based indexing)
const SECRET_PASSAGES = {
    study: { passage: { col: 1, row: 4 }, destination: 'kitchen' },       // A4 -> Kitchen
    lounge: { passage: { col: 24, row: 6 }, destination: 'conservatory' }, // X6 -> Conservatory
    conservatory: { passage: { col: 2, row: 20 }, destination: 'lounge' }, // B20 -> Lounge
    kitchen: { passage: { col: 19, row: 24 }, destination: 'study' }       // S24 -> Study
};

// Blocked squares (walls, edges) (1-based indexing)
const BLOCKED_SQUARES = [
    // Top edge: I1, P1
    { col: 9, row: 1 }, { col: 16, row: 1 },
    // Left edge: A5, A7, A11, A12, A18, A20
    { col: 1, row: 5 }, { col: 1, row: 7 }, { col: 1, row: 11 }, { col: 1, row: 12 },
    { col: 1, row: 18 }, { col: 1, row: 20 },
    // Right edge: X7, X9, X17
    { col: 24, row: 7 }, { col: 24, row: 9 }, { col: 24, row: 17 },
    // Bottom area: G24, R24
    { col: 7, row: 24 }, { col: 18, row: 24 },
    // Bottom row (except starting positions J25, O25 and ballroom K25-N25)
    { col: 1, row: 25 }, { col: 2, row: 25 }, { col: 3, row: 25 }, { col: 4, row: 25 },
    { col: 5, row: 25 }, { col: 6, row: 25 }, { col: 7, row: 25 }, { col: 8, row: 25 },
    { col: 9, row: 25 }, // J25 (green start) and O25 (white start) are NOT blocked
    { col: 16, row: 25 }, { col: 17, row: 25 }, { col: 18, row: 25 }, { col: 19, row: 25 },
    { col: 20, row: 25 }, { col: 21, row: 25 }, { col: 22, row: 25 }, { col: 23, row: 25 },
    { col: 24, row: 25 }
];

// Envelope area (not walkable) - J9-N15 (1-based indexing)
const ENVELOPE_SQUARES = generateRectangle(10, 9, 14, 15);

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

// Convert column letter to 1-based index (A=1, B=2, ... X=24)
function colLetterToIndex(letter) {
    return letter.toUpperCase().charCodeAt(0) - 64;
}

// Convert row number to 1-based index (identity function, kept for clarity)
function rowNumberToIndex(num) {
    return num;
}

// Get pixel coordinates for a grid position (1-based indexing)
function getPixelCoords(col, row) {
    return {
        x: GRID_ORIGIN_X + ((col - 1) * CELL_SIZE) + Math.floor(CELL_SIZE / 2),
        y: GRID_ORIGIN_Y + ((row - 1) * CELL_SIZE) + Math.floor(CELL_SIZE / 2)
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
    // Out of bounds (1-based: valid range is 1 to BOARD_COLS/BOARD_ROWS)
    if (pos.col < 1 || pos.col > BOARD_COLS || pos.row < 1 || pos.row > BOARD_ROWS) {
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

    // Calculate movement costs for entering/exiting rooms
    const exitCost = currentPos.room ? 1 : 0;  // Exiting a room costs 1 move
    const entryCost = targetRoom ? 1 : 0;      // Entering a room costs 1 move

    if (targetRoom) {
        // Find nearest unblocked door to enter
        const roomDoors = DOORS[targetRoom];
        let bestPath = null;
        let entryDoor = null;

        // Get all possible starting positions (exit hallways if in a room, or current position)
        const startPositions = currentPos.room
            ? getAllExitHallways(currentPos.room, pawns, character)
            : [currentPos];

        if (startPositions.length === 0) {
            return { valid: false, error: 'All exits are blocked.' };
        }

        // Total cost = path distance + exit cost + entry cost
        const totalExtraCost = exitCost + entryCost;

        // Try all combinations of exit doors and entry doors to find shortest path
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

            // Try each possible starting position (each exit door)
            for (const startPos of startPositions) {
                const path = findPath(startPos, doorInfo.hallway, pawns, character);
                if (path && (path.distance + totalExtraCost) <= diceResult) {
                    if (!bestPath || path.distance < bestPath.distance) {
                        bestPath = path;
                        entryDoor = doorInfo;
                    }
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
            const totalNeeded = bestPath ? bestPath.distance + totalExtraCost : null;
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

        // Get all possible starting positions (exit hallways if in a room, or current position)
        const startPositions = currentPos.room
            ? getAllExitHallways(currentPos.room, pawns, character)
            : [currentPos];

        if (startPositions.length === 0) {
            return { valid: false, error: 'All exits are blocked.' };
        }

        // Try all exit doors and find the shortest path
        let bestPath = null;
        for (const startPos of startPositions) {
            const path = findPath(startPos, targetPos, pawns, character);
            if (path && (!bestPath || path.distance < bestPath.distance)) {
                bestPath = path;
            }
        }

        if (!bestPath) {
            return { valid: false, error: 'No valid path to that square.' };
        }

        // Total distance includes exit cost if leaving a room
        const totalDistance = bestPath.distance + exitCost;

        if (totalDistance > diceResult) {
            return { valid: false, error: `That square is ${totalDistance} squares away, but you only rolled ${diceResult}.` };
        }

        return {
            valid: true,
            newPosition: targetPos,
            enteredRoom: null,
            path: bestPath.path
        };
    }
}

// Get ALL unblocked hallway squares to exit a room
function getAllExitHallways(roomName, pawns, character) {
    const roomDoors = DOORS[roomName];
    const unblocked = [];

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
            unblocked.push(doorInfo.hallway);
        }
    }
    return unblocked;
}

// Get an unblocked hallway square to exit a room (returns first unblocked)
function getExitHallway(roomName, pawns, character) {
    const exits = getAllExitHallways(roomName, pawns, character);
    return exits.length > 0 ? exits[0] : null;
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

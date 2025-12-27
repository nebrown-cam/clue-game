# Clue Online - Implementation Plan

## Overview

An online multiplayer version of the classic Clue board game for family play.

---

## 1. Core Architecture

| Component | Decision |
|-----------|----------|
| Frontend | Vanilla JS/HTML/CSS in minimal React wrapper |
| Backend | Node.js + Socket.io |
| Server Port | 3000 |
| State Authority | Server-authoritative (validates all moves) |
| Persistence | File-based JSON in `/games/game-{roomCode}-{timestamp}.json` (~1 hour reconnect window); saved after every state change |
| Platforms | Desktop browser only |
| Sound | Basic sound effects (dice, turn change, suggestion, win) |

---

## 2. Game State Management

| Feature | Decision |
|---------|----------|
| State ownership | Server owns all state, clients display what server sends |
| Persistence | Save to JSON file, players can rejoin within ~1 hour |
| Disconnections | Game pauses until player returns or is kicked by host |
| Host disconnect | Game ends immediately if host leaves |

### Game State Structure

```
GameState {
  gameId: string
  phase: 'lobby' | 'playing' | 'finished'
  solution: { suspect, weapon, room }  // Hidden envelope
  players: Player[]
  currentTurn: playerId
  turnPhase: 'roll' | 'move' | 'suggest' | 'end'
  board: BoardState
  pendingSuggestion: Suggestion | null
  eliminatedPlayers: playerId[]
  winner: playerId | null
}

Player {
  id, name, character, cards[], position, hasAccused
}
```

---

## 3. Board Representation & Movement

| Feature | Decision |
|---------|----------|
| Rendering | Board image (1440×1440px) with invisible HTML/CSS grid overlay |
| Move input | Click room if reachable, otherwise click valid square |
| Path hints | None (player calculates moves manually) |
| Art style | Board image as background |

### Movement Rules

- Die roll 1-6
- No diagonal movement
- No passing through occupied squares
- No two pawns on same hallway square (rooms allow multiple)
- Entering room ends movement
- Secret passages = free move without die (corner-to-corner); activated by clicking arrow square in corner room
- If a room door is blocked, player can enter through any other unblocked door
- Using a secret passage counts as entering a room → suggestion is **mandatory**

### Board Layout

- 25x24 grid (standard Clue board)
- Cell types: `walkable`, `room`, `door`, `wall`, `start`
- 9 rooms with entry door positions
- 4 secret passages (Kitchen↔Study, Conservatory↔Lounge)

### Initial Pawn & Weapon Placement

- All 6 suspect pawns start at their designated starting positions (even if unplayed)
- Unused pawns remain on board and can be moved by suggestions
- Weapons start distributed one per room (standard Clue rules): Kitchen, Ballroom, Conservatory, Billiard Room, Library, Study (Hall, Lounge, Dining Room start empty)

---

## 4. Card System

| Feature | Decision |
|---------|----------|
| Card visuals | Illustrated cards (21 images needed) |
| Card counts | Hidden from opponents |
| Card set | Classic Clue |

### Classic Card Set

**Suspects (6):**
- Colonel Mustard (Yellow)
- Miss Scarlett (Red)
- Professor Plum (Purple)
- Mr. Green (Green)
- Mrs. White (White)
- Mrs. Peacock (Blue)

**Weapons (6):**
- Candlestick
- Knife
- Lead Pipe
- Revolver
- Rope
- Wrench

**Rooms (9):**
- Kitchen
- Ballroom
- Conservatory
- Billiard Room
- Library
- Study
- Hall
- Lounge
- Dining Room

### Card Distribution

1. Separate 21 cards into 3 piles (suspects, weapons, rooms)
2. Randomly select 1 from each → secret envelope (solution)
3. Shuffle remaining 18 cards together
4. Deal evenly to players (some may get 1 extra)

---

## 5. Suggestion & Accusation Mechanics

| Feature | Decision |
|---------|----------|
| Card reveal UI | Slide-in panel (keeps board visible) |
| Multiple card choice | Player clicks to select which card to show |
| Accusation confirm | Yes - confirmation required before accusing |
| Eliminated players | Silent participant (can only disprove suggestions) |

### Suggestion Flow

1. Player enters room → **must** make suggestion (mandatory)
2. Must name: the current room + any suspect + any weapon
3. Named suspect pawn & weapon token move to that room
4. If a player's pawn is pulled into a room, they receive a notification: "You were summoned to [Room] by [Player]"
5. Clockwise from suggester: each player checks for matching cards
6. First player with match privately shows ONE card to suggester (their matching cards are highlighted; they click to select)
7. If no one can disprove → suggestion stands (player may accuse)

### Suggestion Rules

- Suggestions are **mandatory** after entering a room
- Cannot suggest in the same room twice in a row—must leave and re-enter
- If pulled into a room by another player's suggestion, on your next turn you may **choose** to either roll (to leave) or suggest without rolling (stay in the room); both Roll and Suggest buttons are enabled
- If pulled into the same room you just suggested in, you CAN suggest again (involuntary entry resets the restriction)
- When re-entering a room, you can make any suggestion (no requirement for it to be different from previous)

### Accusation Flow

1. Player can declare accusation **at any point during their turn** (before rolling, after rolling, after suggesting)
2. The "Accuse" button is always visible/clickable during the player's turn (not a turn phase—always available)
3. Suggestion is **mandatory** after entering a room; UI disables "End Turn" until suggestion is made
4. Confirmation dialog: "Are you sure? Wrong accusations eliminate you."
5. Server checks against envelope
6. Correct → Player wins, game ends
7. Incorrect → Player eliminated (still disproves suggestions), game continues
8. If all players except one are eliminated → last player **auto-wins**

### Eliminated Player Rules

- Can only disprove suggestions (no movement, no suggestions, no accusations)
- Same visibility as active players (see "X showed a card to Y" but not the actual card)
- Remain in the game until it ends

### Win Screen

- Display the solution cards (suspect, weapon, room) and announce the winner
- Ask host if they want to start a new game with the same players

---

## 6. Multiplayer & Networking

| Feature | Decision |
|---------|----------|
| Room codes | Integers 1-999 |
| Player requirement | 4-6 players, host starts game |
| Host powers | Pause, end game |
| Turn timer | None (unlimited turn time) |
| In-game chat | None (players communicate externally) |
| Character assignment | Random when game starts |
| Turn order | Random when game starts |

### Lobby System

- First player to join a room becomes host
- Players enter: name + room number (1-999)
- Host can start game once 4+ players have joined
- No "ready" button—host can start anytime with 4+ players
- Characters are randomly assigned to players when the host starts the game
- Turn order is randomized at game start
- **No mid-game joins**—players can only join in the lobby phase

### Socket Events

| Client → Server | Server → Client |
|-----------------|-----------------|
| `joinGame` | `gameState` |
| `startGame` | `gameStarted` |
| `rollDice` | `diceResult` |
| `movePawn` | `pawnMoved` |
| `makeSuggestion` | `suggestionMade` |
| `showCard` | `cardShown` (private to suggester) |
| `makeAccusation` | `accusationResult` |
| `passTurn` | `turnChanged` |
| `pauseGame` | `gamePaused` |
| `endGame` | `gameEnded` |

### Privacy Handling

- "Show card" only transmitted to the suggester
- Other players (including eliminated players) see: "Player X showed a card to Player Y"
- Solution never sent to clients until game ends

### Reconnection Handling

- Player identified by same name + same room code
- Player reconnects seamlessly and resumes exactly where they were
- If it was their turn when they disconnected, they resume their turn (no reset)
- Game remains paused for other players until the disconnected player returns or is kicked

---

## 7. User Interface

| Feature | Decision |
|---------|----------|
| Layout | Split view (board left, controls right) |
| Detective notepad | None (players use physical paper/memory) |
| Game log | None (players must pay attention in real-time) |
| Dice display | Click-to-roll button with inline result |
| Player list | Show name + character + character color for each player |
| Off-turn display | Watch mode (see board updates, buttons disabled) |
| Disprove prompt | Highlight matching cards in hand, click to select |
| Pause display | "Game Paused by Host" overlay on top of the board; prevents new inputs only |
| Header | Game title + room code + player count |

### Screen Layout

**Target Resolution:** 1920×1080 (typical laptop)
**Layout Ratio:** 70% board / 30% right panel

```
+------------------------------------------------------------------+
|  Clue Online          Room: 42          5 players    [Pause][End]|
+---------------------------------------------+--------------------+
|                                             |  PLAYERS           |
|                                             |  [crown] Bob (You) |
|                                             |    Colonel Mustard |
|                                             |  **Alice**         |
|                                             |    Miss Scarlet    |
|                                             |  Charlie           |
|                                             |    Professor Plum  |
|                                             |  Diana (eliminated)|
|                                             |    Mrs. Peacock    |
|                                             |--------------------|
|                                             |  TURN INFO         |
|                                             |  "Roll the dice"   |
|                                             |                    |
|               GAME BOARD                    |--------------------|
|                                             |  YOUR CARDS        |
|             (1440×1440 image                |  [card][card][card]|
|              with grid overlay)             |  192×192 thumbnails|
|                                             |                    |
|                                             |  [Show]  [Pass]    |
|                                             |--------------------|
|                                             |  CONTROLS          |
|                                             |  [Roll]  Result: 4 |
|                                             |                    |
|                                             |  Suggest:          |
|                                             |  Person [dropdown] |
|                                             |  Weapon [dropdown] |
|                                             |  [Make Suggestion] |
|                                             |                    |
|                                             |  Accuse:           |
|                                             |  Person [dropdown] |
|                                             |  Weapon [dropdown] |
|                                             |  Room   [dropdown] |
|                                             |  [Make Accusation] |
+---------------------------------------------+--------------------+
```

### Header Details

| Element | Description |
|---------|-------------|
| Title | "Clue Online" on the left |
| Room Code | "Room: X" in center |
| Player Count | "X players" |
| Host Controls | Tiny [Pause] and [End Game] buttons on the right (host only) |

### Players Section

| Element | Description |
|---------|-------------|
| Player name | Display name entered at join |
| Character | Character name below player name |
| Current turn | **Bold** player name |
| Eliminated | Red font color + "(eliminated)" label |
| Host indicator | Crown icon (lobby only) |
| Your indicator | "(You)" after your name |

### Turn Info Section

Displays contextual messages for all players:

| Situation | Message Format |
|-----------|----------------|
| Roll phase | "Roll the dice" |
| Move phase | "Select a room or square to move to" |
| Suggest phase | "Make a suggestion using the Person and Weapon dropdowns" |
| End of turn | "Are you finished?" |
| Suggestion made | "({PlayerName}) Colonel Mustard suggests: Miss Scarlet with the Knife in the Kitchen" |
| Card shown | "({PlayerName}) Mrs. Peacock showed a card to ({PlayerName}) Colonel Mustard" |
| No disprove | "No one could disprove the suggestion" |
| Player summoned | "({PlayerName}) was summoned to the Kitchen" |
| Invalid action | Error message (e.g., "That square is not reachable") |
| Eliminated notice | "You are eliminated, but you can still disprove suggestions" |

### Your Cards Section

| Element | Description |
|---------|-------------|
| Card size | 192×192 pixel thumbnails |
| Layout | Face-up in a row |
| Show button | Enabled only after selecting a card (red outline) |
| Pass button | Enabled when none of your cards can disprove |

#### Disprove Selection Flow

1. **Matching cards highlighted** — Gold outline on cards that match the suggestion
2. **Player clicks a card** — Selected card changes to red outline; other gold outlines remain
3. **Player changes selection** — Clicking a different gold card switches selection (new card becomes red, old card returns to gold)
4. **Show button enables** — Player can now click Show to reveal the card
5. **Card revealed** — Suggester sees the card in slide-in panel; others see "X showed a card to Y"

| Card State | Outline Color |
|------------|---------------|
| Normal | None |
| Matches suggestion (can select) | Gold |
| Selected (ready to show) | Red |

### Controls Section

| Element | Description |
|---------|-------------|
| Roll button | Click to roll; result number persists next to button |
| Suggest dropdowns | Person + Weapon (room auto-filled from current location) |
| Accuse dropdowns | Person + Weapon + Room |
| Not your turn | All controls grayed out |
| Eliminated | All controls grayed out |

### Card Reveal Panel

Slides in from **bottom right** when someone shows you a card:

```
+-------------------------+
|  Mrs. Peacock showed    |
|  you this card:         |
|                         |
|      [Card Image]       |
|       192×192           |
|                         |
|        [Done]           |
+-------------------------+
```

- Only appears when YOU receive a card (not when you show one)
- Dismiss with Done button

### Accusation Confirmation Modal

Centered overlay when player clicks Make Accusation:

```
+----------------------------------+
|                                  |
|   Are you sure? A wrong          |
|   accusation eliminates you      |
|   from the game.                 |
|                                  |
|      [Cancel]    [Accuse]        |
+----------------------------------+
```

### Win Screen Modal

Centered overlay when game ends:

```
+----------------------------------+
|                                  |
|      🎉 {PlayerName} Wins! 🎉    |
|                                  |
|   The solution was:              |
|                                  |
|  [Suspect]  [Weapon]  [Room]     |
|   Card       Card      Card      |
|                                  |
|           [Close]                |
+----------------------------------+
```

### Board Display

| Element | Description |
|---------|-------------|
| Pawns in rooms | Dynamically arranged when multiple occupy same room |
| Weapons in rooms | Dynamically arranged in room |
| Movement animation | Instant teleport (no animation) |
| Valid move indication | None (player calculates manually) |

---

## Lobby Screen

Full-screen centered layout (no board visible):

```
+--------------------------------------------------+
|                                                  |
|                                                  |
|              +--------------------+              |
|              |                    |              |
|              |   Your Name:       |              |
|              |   [_____________]  |              |
|              |                    |              |
|              |   Room Code:       |              |
|              |   [_____________]  |              |
|              |                    |              |
|              |   [  Join Game  ]  |              |
|              |                    |              |
|              +--------------------+              |
|                                                  |
|                                                  |
+--------------------------------------------------+
```

### Lobby - Waiting Room (after joining)

```
+--------------------------------------------------+
|                                                  |
|              +--------------------+              |
|              |                    |              |
|              |   Room Code: 42    |              |
|              |                    |              |
|              |   Players:         |              |
|              |   [crown] Bob      |              |
|              |   Alice            |              |
|              |   Charlie          |              |
|              |                    |              |
|              |   Waiting for 1    |              |
|              |   more player...   |              |
|              |                    |              |
|              |   [  Start Game  ] |  <- Host only|
|              |                    |              |
|              +--------------------+              |
|                                                  |
+--------------------------------------------------+
```

### Lobby Behavior

| Scenario | Behavior |
|----------|----------|
| First player joins | Creates room, becomes host |
| Room code doesn't exist | Error message |
| Room is full (6 players) | Blocks join, error message |
| Host leaves lobby | Next player becomes host |
| Start Game clicked | Game starts immediately (no countdown) |
| Minimum players | "Waiting for X more players..." (need 4) |
| Host indicator | Crown icon next to name |
| Player list | Names only (no icons or colors until game starts) |

### UI Components

| Component | Description |
|-----------|-------------|
| Lobby | Create/join game, enter name + room number |
| GameBoard | Interactive board with rooms, pawns, weapons |
| PlayerHand | Shows your cards (illustrated) |
| SuggestionPanel | Pick suspect + weapon (room auto-filled) |
| CardRevealPanel | Slide-in panel for private card showing |
| TurnIndicator | Whose turn, current phase |
| DiceButton | Click to roll, shows result |
| HostControls | Pause, end game (host only) |

---

## 8. Assets Required

**Image Asset Location:** `public/images/`

### Images (User-Provided)

- [x] Game board image (mixed format)
- [x] 6 suspect card illustrations (mixed format)
- [x] 6 weapon card illustrations (mixed format)
- [x] 9 room card illustrations (mixed format)
- [x] 6 pawn icons (user will provide)
- [x] 6 weapon tokens for board display (user will provide)

### Card & Board Assets

| Filename | Display Name |
|----------|--------------|
| ClueGameBoard.jpg | Game Board |
| TableGreenFelt.jpg | Table Background |
| CardBack.png | Card Back |
| **Suspect Cards** | |
| CardPersonScarlet.png | Miss Scarlet Card |
| CardPersonMustard.png | Colonel Mustard Card |
| CardPersonWhite.png | Mrs. White Card |
| CardPersonGreen.png | Mr. Green Card |
| CardPersonPeacock.png | Mrs. Peacock Card |
| CardPersonPlum.png | Professor Plum Card |
| **Weapon Cards** | |
| CardWeaponCandlestick.png | Candlestick Card |
| CardWeaponKnife.png | Knife Card |
| CardWeaponLeadPipe.png | Lead Pipe Card |
| CardWeaponRevolver.png | Revolver Card |
| CardWeaponRope.png | Rope Card |
| CardWeaponWrench.png | Wrench Card |
| **Room Cards** | |
| CardRoomKitchen.png | Kitchen |
| CardRoomBallroom.png | Ballroom |
| CardRoomConservatory.png | Conservatory |
| CardRoomBilliardRoom.png | Billiard Room |
| CardRoomLibrary.png | Library |
| CardRoomStudy.png | Study |
| CardRoomHall.png | Hall |
| CardRoomLounge.png | Lounge |
| CardRoomDiningRoom.png | Dining Room |
| **Pawns** | |
| PawnScarlet.png | Miss Scarlet Pawn |
| PawnMustard.png | Colonel Mustard Pawn |
| PawnWhite.png | Mrs. White Pawn |
| PawnGreen.png | Mr. Green Pawn |
| PawnPeacock.png | Mrs. Peacock Pawn |
| PawnPlum.png | Professor Plum Pawn |
| **Weapon Icons** | |
| WeaponCandlestick.png | Candlestick |
| WeaponKnife.png | Knife |
| WeaponLeadPipe.png | Lead Pipe |
| WeaponRevolver.png | Revolver |
| WeaponRope.png | Rope |
| WeaponWrench.png | Wrench |

### Audio

**Audio Asset Location:** `public/audio/`

### Audio (User-Provided)

- [x] Dice roll sound

### Audio Assets
dice.wav

### Grid Mapping (To Be Derived from Board Image)

- [ ] JSON file mapping grid coordinates to board image pixels (derived from ClueGameBoard.jpg)
- [ ] Room boundaries and door positions
- [ ] Starting positions for each suspect
- [ ] Secret passage connections (arrow squares in corner rooms)

---

## 9. Development Phases

### Phase 1: Foundation
- Project setup (React shell, Node.js server)
- Game state model
- Board grid representation and coordinate mapping
- Card dealing logic

### Phase 2: Core Gameplay
- Movement with dice roll
- Room entry/exit logic
- Suggestion system with card revelation
- Accusation and win/lose logic

### Phase 3: Multiplayer
- Socket.io integration
- Lobby system with room codes
- Real-time state synchronization
- Host controls
- Reconnection handling

### Phase 4: Polish
- Board image integration with grid overlay
- Card illustrations
- Slide-in panels and UI polish
- Testing with family

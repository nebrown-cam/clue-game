### Game Board
1. Image Resolution = 1440x1440 pixels
2. Grid = 24x25 squares (24 columns A-X, 25 rows 1-25)
3. Grid squares are numbered from left to right and top to bottom: A1 is the top left grid square and X25 is the bottom right grid square (just like an Excel worksheet)
4. The pixel coordinates of the top left corner of A1 are 77,70
5. The pixel coordinates of the bottom right corner of A1 are 130,123
6. Each grid square is 53 pixels wide and 53 pixels tall

### Pixel Coordinate Formula
To calculate the pixel coordinates for any grid square:
- Column index: A=0, B=1, C=2, ... X=23
- Row index: 1=0, 2=1, 3=2, ... 25=24
- Top-left X = 77 + (columnIndex × 53)
- Top-left Y = 70 + (rowIndex × 53)
- Center X = Top-left X + 26
- Center Y = Top-left Y + 26

### Room Squares
1. The Study is made up of squares A1 through G4
2. The Hall is made up of squares J1 through O7
3. The Lounge is made up of squares R1 through X6
4. The Library is made up of squares B7 through F11 plus A8, A9, A10 and G8, G9, G10
5. The Dining Room is made up of squares Q10 through X15 plus T16, U16, V16, W16, X16
6. The Billiard Room is made up of squares A13 through F17
7. The Conservatory is made up of squares A21 through F24 plus B20, C20, D20, E20
8. The Ball Room is made up of squares I18 through P23 plus K24, L24, M24, N24 and K25, L25, M25, N25
9. The Kitchen is made up of squares S19 through X24

### Solution Envelope Squares
1. The solution envelope area is made up of squares J9 through N15

### Starting Squares
1. Colonel Mustard (Yellow) starting square is X8
2. Miss Scarlett (Red) starting square is Q1
3. Professor Plum (Purple) starting square is A6
4. Mr. Green (Green) starting square is J25
5. Mrs. White (White) starting square is O25
6. Mrs. Peacock (Blue) starting square is A19

### Secret Passage Squares
1. Secret passage from the Study to the Kitchen is A4
2. Secret passage from the Lounge to the Conservatory is X6
3. Secret passage from the Conservatory to the Lounge is B20
4. Secret passage from the Kitchen to the Study is S24

### Door Squares
Doors are room squares that serve as entry/exit points. Players enter and exit rooms through these squares.

| Room | Door Square | Hallway Square in Front |
|------|-------------|------------------------|
| Study | G4 | G5 |
| Hall | J5 | I5 |
| Hall | L7 | L8 |
| Hall | M7 | M8 |
| Lounge | R6 | R7 |
| Library | G9 | H9 |
| Library | D11 | D12 |
| Billiard Room | B13 | B12 |
| Billiard Room | F16 | G16 |
| Dining Room | Q13 | P13 |
| Dining Room | R10 | R9 |
| Conservatory | E20 | F20 |
| Ball Room | J18 | J17 |
| Ball Room | O18 | O17 |
| Ball Room | I20 | H20 |
| Ball Room | P20 | Q20 |
| Kitchen | T19 | T18 |

### Blocked Squares (Non-Walkable)
These squares are walls or edges and cannot be occupied or traversed:

| Location | Squares |
|----------|---------|
| Top edge | I1, P1 |
| Left edge | A5, A7, A11, A12, A18, A20 |
| Right edge | X7, X9, X17 |
| Bottom area | G24, R24 |
| Bottom row | A25, B25, C25, D25, E25, F25, G25, H25, I25, P25, Q25, R25, S25, T25, U25, V25, W25, X25 |

Note: J25 and O25 are NOT blocked (they are starting positions for Mr. Green and Mrs. White).
Note: K25, L25, M25, N25 are part of the Ballroom (room squares), not blocked hallway squares.

### Walkable Hallway Squares
Every square that is NOT part of a room and NOT in the blocked list above is a walkable hallway square.

### Cell Type Summary

| Type | Description |
|------|-------------|
| Room | Squares within room boundaries (see Room Squares section) |
| Door | Room squares that serve as entry/exit points (see Door Squares section) |
| Secret Passage | A4, X6, B20, S24 - click directly to teleport to connected room |
| Walkable Hallway | Non-room squares NOT in the blocked list |
| Blocked/Wall | The squares listed in Blocked Squares section |
| Starting | X8, Q1, A6, J25, O25, A19 - character start positions (also walkable) |
| Envelope | J9-N15 - visual display area only, not walkable |

### Movement & Interaction Rules

**Room Entry:**
- Players can click anywhere inside a room to enter (if within movement range of any unblocked door)
- Entering a room costs 1 movement (stepping from hallway into the room)
- Door squares are used for pathfinding validation only

**Room Exit:**
- Players can leave a room from any door in that room
- Exiting a room costs 1 movement (stepping from room to hallway)
- Movement calculation must account for all possible exit doors when determining reachable squares

**Door Blocking:**
- If a pawn occupies the hallway square in front of a door (see Door Squares table), that door is blocked
- Players can use any other unblocked door to enter or exit the room
- If all doors to a room are blocked, the room cannot be entered (except via secret passage)

**Secret Passages:**
- Click directly on the secret passage square (A4, X6, B20, S24) to teleport
- Using a secret passage counts as entering a room and triggers mandatory suggestion
- No visual indicator on secret passage squares

**Hallway Movement:**
- Players move orthogonally (no diagonal) through walkable hallway squares
- Cannot pass through or land on squares occupied by other pawns

### Pawn & Weapon Positioning in Rooms

**Icon Sizes:**
- Pawn icons: 53×53 pixels (full cell size)
- Weapon icons: 53×53 pixels (full cell size)

**Pawns:**
- When multiple pawns occupy the same room, arrange them dynamically in a grid pattern
- Use the room's display area (see table below) for positioning
- Spread pawns out evenly within the display area

**Weapons:**
- Weapon tokens should occupy a center square in the room
- Calculate center dynamically using the longest width and height of the room's display area
- Choose a center square that is not occupied by a pawn
- If pawns occupy center squares, shift weapon to nearest available position

**Room Display Areas (for pawn/weapon arrangement):**

| Room | Display Area | Dimensions |
|------|--------------|------------|
| Study | A1-G4 | 7×4 |
| Hall | J1-O7 | 6×7 |
| Lounge | R1-X6 | 7×6 |
| Library | B7-F11 | 5×5 |
| Dining Room | Q10-X15 | 8×6 |
| Billiard Room | A13-F17 | 6×5 |
| Conservatory | B21-E24 | 4×4 |
| Ball Room | I18-P23 | 8×6 |
| Kitchen | S19-X24 | 6×6 |

Note: Display areas are rectangular subsets used for positioning. Irregular room extensions are still part of the room for click detection and movement purposes.

### Initial Weapon Placement

At game start, weapons are distributed one per room in these locations:

| Weapon | Starting Room |
|--------|---------------|
| Candlestick | Kitchen |
| Knife | Ballroom |
| Lead Pipe | Conservatory |
| Revolver | Billiard Room |
| Rope | Library |
| Wrench | Study |

Note: Hall, Lounge, and Dining Room start without weapons.

### Click Detection

- Clicking on ANY square that is part of a room registers as clicking on that room
- This includes irregular extensions (e.g., A8-A10 for Library, K25-N25 for Ballroom)
- Click detection uses the full room boundaries defined in the Room Squares section
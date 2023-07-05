// src/backend/models/game.ts
export const SHIP_TYPES = {
    MINI: {
        type: 'Mini',
        shape: [['M']]
    },
    DESTROYER: {
        type: 'Destroyer',
        shape: [['D', 'D']]
    },
    SUBMARINE: {
        type: 'Submarine',
        shape: [['S', 'S', 'S']]
    },
    CRUISER: {
        type: 'Cruiser',
        shape: [['C'], ['C'], ['C'], ['C']]
    }
};
export class Game {
    playerBoard;
    opponentBoard;
    playerPreemptiveBoard;
    opponentPreemptiveBoard;
    playerShips;
    opponentShips;
    playerReady;
    opponentReady;
    player;
    opponent;
    constructor(playerId) {
        this.player = playerId;
        this.opponent = null;
        this.playerBoard = null;
        this.opponentBoard = null;
        this.playerPreemptiveBoard = this.createEmptyBoard();
        this.opponentPreemptiveBoard = this.createEmptyBoard();
        this.playerShips = [];
        this.opponentShips = [];
        this.playerReady = false;
        this.opponentReady = false;
    }
    createEmptyBoard() {
        const board = [];
        for (let i = 0; i < 8; i++) {
            const row = [];
            for (let j = 0; j < 8; j++) {
                row.push({ hasShip: false, isHit: false });
            }
            board.push(row);
        }
        return board;
    }
    placeShipOnPreemptiveBoard(player, ship) {
        const board = player === 'player' ? this.playerPreemptiveBoard : this.opponentPreemptiveBoard;
        const { position, shape, orientation } = ship;
        // Place ship on the pre-emptive board
        if (orientation === 'horizontal') {
            for (let i = 0; i < shape[0].length; i++) {
                board[position.row][position.column + i].hasShip = true;
            }
        }
        else {
            for (let i = 0; i < shape.length; i++) {
                board[position.row + i][position.column].hasShip = true;
            }
        }
    }
    confirmPlacement(player) {
        if (player === 'player') {
            this.playerReady = true;
        }
        else {
            this.opponentReady = true;
        }
        // If both players are ready, initialize the game boards
        if (this.playerReady && this.opponentReady) {
            this.playerBoard = JSON.parse(JSON.stringify(this.playerPreemptiveBoard));
            this.opponentBoard = JSON.parse(JSON.stringify(this.opponentPreemptiveBoard));
        }
    }
}

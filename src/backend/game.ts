// src/backend/models/game.ts

export type Cell = {
    hasShip: boolean;
    isHit: boolean;
};

export class Board {
    board: Cell[][];

    constructor() {
        this.board = [];
        for (let i = 0; i < 8; i++) {
            this.board[i] = [];
            for (let j = 0; j < 8; j++) {
                this.board [i][j] = { hasShip: false, isHit: false };
            }
        }
    }
}

export class Game {
    gameId: string;
    totalPlayers: number;
    boards: Cell[][][];
    remaining: number[][];
    playersReady: number;
    playerTurn: number;
    allshipCells: Map<number, { row: number, column: number, shipId: number }[]>;
    started: boolean;


    constructor(gameId: string) {
        this.gameId = gameId;
        this.totalPlayers = 1;
        let player0 = new Board();
        let player1 = new Board();
        this.boards = [player0.board, player1.board];
        // note that player0 isnt real.
        this.remaining = [];
        this.playersReady = 0;
        this.playerTurn = 0;
        this.allshipCells = new Map();
        this.started = false;
    }

    placeShips(playerNumber: number, shipCells: { row: number, column: number, shipId: number }[] = []) {
        this.allshipCells.set(playerNumber,shipCells);
        let board = this.boards[playerNumber];

        // Intermediate object to store counts for each shipId
        const shipIdCounts: { [shipId: number]: number } = {};
    
        shipCells.forEach((cell) => {
            board[cell.row][cell.column].hasShip = true;
    
            // Count the number of cells for each shipId
            if (shipIdCounts[cell.shipId] == null) {
                shipIdCounts[cell.shipId] = 0;
            }
            shipIdCounts[cell.shipId]++;
        });
    
        // Convert the intermediate object into an array
        this.remaining[playerNumber] = Object.keys(shipIdCounts).map((key) => shipIdCounts[parseInt(key)]);
    }

    getShipCell(playerNumber: number, row: number, column: number) {
        let shipCells = this.allshipCells.get(playerNumber)
        if (!shipCells) {
            return undefined;
        }
        return shipCells.find(cell => cell.row === row && cell.column === column);
    }
        

    get getTotalPlayers() {
        return this.totalPlayers;
    }

    get getPlayersReady() {
        return this.playersReady;
    }

    isGameOver(playerNumber: number) {
        // The game is over if all ships are sunk (i.e., their remaining size is 0)
        return this.remaining[playerNumber].every(size => size === 0);
    }

    choosePlayerTurn() {
        this.playerTurn = Math.ceil(Math.random() * this.totalPlayers)
    }
    
}


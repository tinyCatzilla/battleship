// src/backend/models/game.ts
export class Board {
    board;
    constructor() {
        this.board = [];
        for (let i = 0; i < 8; i++) {
            this.board[i] = [];
            for (let j = 0; j < 8; j++) {
                this.board[i][j] = { hasShip: false, isHit: false };
            }
        }
    }
}
export class Game {
    gameId;
    totalPlayers;
    boards;
    remaining;
    playersReady;
    playerTurn;
    constructor(gameId) {
        this.gameId = gameId;
        this.totalPlayers = 1;
        let player0 = new Board();
        let player1 = new Board();
        this.boards = [player0.board, player1.board];
        // note that player0 isnt real.
        this.remaining = [];
        this.playersReady = 0;
        this.playerTurn = -1;
    }
    placeShips(playerNumber, shipCells = []) {
        let board = this.boards[playerNumber];
        // Intermediate object to store counts for each shipId
        const shipIdCounts = {};
        shipCells.forEach((cell) => {
            board[cell.row][cell.column].hasShip = true;
            // Count the number of cells for each shipId
            if (shipIdCounts[cell.shipId] == null) {
                shipIdCounts[cell.shipId] = 0;
            }
            shipIdCounts[cell.shipId]++;
        });
        // Convert the intermediate object into an array
        this.remaining = Object.keys(shipIdCounts).map((key) => shipIdCounts[parseInt(key)]);
    }
    get getTotalPlayers() {
        return this.totalPlayers;
    }
    get getPlayersReady() {
        return this.playersReady;
    }
}
// playerMakesMove(playerNumber: number, row: number, col: number) {
//     // First, check if it's the correct player's turn
//     if (this.playerTurn !== playerNumber) {
//       // It's not this player's turn, do nothing
//       return;
//     }
//     // Get the opponent's board
//     const opponentBoard = this.boards[this.playerTurn === 0 ? 1 : 0];
//     // Update the cell based on the move
//     if (opponentBoard[row][col].hasShip) {
//       // The player hit a ship
//       opponentBoard[row][col].isHit = true;
//     }
//     // Change turns
//     this.changeTurns();
//   }
// changeTurns() {
// this.playerTurn = this.playerTurn 
// }

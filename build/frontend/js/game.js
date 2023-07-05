import { Board } from './board';
import { io } from 'socket.io-client';
export class Game {
    gameId;
    playerBoard;
    opponentBoard;
    playerTurn;
    gameOver;
    socket;
    constructor(gameId) {
        this.gameId = gameId;
        this.playerBoard = new Board();
        this.opponentBoard = new Board();
        this.playerTurn = true; // For simplicity, assume the player who created the game goes first
        this.gameOver = false;
        this.socket = io(gameId); // Connect to your server here
        this.socket.on('boardUpdate', (data) => {
            // Implement logic here to update the boards based on received data
            // You might want to pass the data to the Board class methods
            // to make the necessary changes
        });
    }
    render() {
        this.playerBoard.render();
        this.playerBoard.placeShips([{ size: 1, count: 3 }, { size: 2, count: 2 }, { size: 3, count: 1 }]);
    }
    fire(row, column) {
        // Tell the server that a player has fired at a certain cell
        this.socket.emit('fire', {
            gameId: this.gameId,
            row,
            column
        });
    }
    findGame() {
        // Ask the server to find a game to join
        this.socket.emit('findGame');
    }
    leaveGame() {
        // Tell the server that the player has left the game
        this.socket.emit('leaveGame', {
            gameId: this.gameId
        });
    }
    getBoard() {
        // This method can be used to return the current state of the player's board
        return this.playerBoard.getShips;
    }
    static updateBoard(board) {
        // Here you can update your board using the data received through socket
        // or by calculating the new state based on the current state of the game.
    }
}

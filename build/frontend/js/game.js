import { Board } from './board.js';
export class Game {
    gameId;
    playerBoard;
    boards;
    myTurn;
    gameOver;
    socket;
    myPlayerNumber;
    constructor(gameId, myPlayerNumber) {
        this.gameId = gameId;
        this.playerBoard = new Board();
        this.boards = [this.playerBoard];
        this.myTurn = false;
        this.gameOver = false;
        this.socket = new WebSocket(`ws://localhost:3050/${gameId}`);
        this.myPlayerNumber = myPlayerNumber;
        this.socket.onmessage = (event) => {
            const { type, data } = JSON.parse(event.data);
            switch (type) {
                case 'boardUpdate':
                    this.boards[data.playerNumber].updateBoard(data.board);
                    this.gameOver = data.gameOver;
                    if (this.gameOver = true) {
                    }
                    this.myTurn = (data.turn == myPlayerNumber);
                    break;
                // Handle other messages
            }
        };
    }
    render() {
        this.playerBoard.render();
        this.playerBoard.placeShips([{ size: 1, count: 3 }, { size: 2, count: 2 }, { size: 3, count: 1 }]);
    }
    unrender() {
        this.playerBoard.unrender();
    }
    lockBoard() {
        this.playerBoard.lockBoard();
    }
    startGame() {
        // begin game logic
    }
    makeMove(row, col) {
        if (!this.myTurn) {
            alert("Wait for your turn");
            return;
        }
        const moveData = { type: "makeMove", data: { row: row, col: col } };
        this.socket.send(JSON.stringify({ type: 'makeMove', data: { moveData } }));
    }
    fire(row, column) {
        // Tell the server that a player has fired at a certain cell
        this.socket.send(JSON.stringify({
            type: 'fire',
            data: {
                gameId: this.gameId,
                row,
                column
            }
        }));
    }
    leaveGame() {
        // Tell the server that the player has left the game
        this.socket.send(JSON.stringify({
            type: 'leaveGame',
            gameId: this.gameId
        }));
    }
    getShips() {
        // This method can be used to return the current state of the player's board
        return this.playerBoard.getShips;
    }
}

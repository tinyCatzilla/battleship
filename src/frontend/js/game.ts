import { Board } from './board.js';

export class Game {
    private gameId: string;
    private playerBoard: Board;
    private boards: Board[];
    private myTurn: boolean;
    private gameOver: boolean;
    private socket: WebSocket;
    private myPlayerNumber: number;
    private totalPlayers: number;

    constructor(gameId: string, myPlayerNumber: number) {
        this.gameId = gameId;
        this.playerBoard = new Board();
        this.boards = [this.playerBoard]; //player 0 dummy board
        this.myTurn = false;
        this.gameOver = false;
        this.socket = new WebSocket(`ws://localhost:3050/${gameId}`);
        this.myPlayerNumber = myPlayerNumber;
        this.totalPlayers = -1;
        
        this.socket.onmessage = (event) => {
            const { type, data } = JSON.parse(event.data);
            switch (type) {
                case 'gameStart':
                    this.startGame();
                    break;
                // Handle other messages
            }
        };
    }

    render() {
        this.playerBoard.render();
        this.playerBoard.placeInitialShips([{ size: 1, count: 3 }, { size: 2, count: 2 }, { size: 3, count: 1 }]);
    }

    rendersmall() {
        this.playerBoard.rendersmall();
    }

    unrender() {
        this.playerBoard.unrender();
    }

    lockBoard() {
        this.playerBoard.lockBoard();
    }

    startGame() {
        // Tell the server that the game has started
        this.socket.send(JSON.stringify({
            type: 'startGame',
            data: {gameId: this.gameId}
        }));
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'startGame') {
                this.totalPlayers = data.totalPlayers;
                this.myTurn = (data.turn == this.myPlayerNumber);
                for (let i = 0; i < this.totalPlayers; i++) {
                    var board = new Board();
                    this.boards.push(board);
                }
            }
        };
        this.rendersmall();
        this.playerBoard.startGame();
    }

    makeMove(row: number, col: number) {
        if (!this.myTurn) {
        alert("Wait for your turn");
        return;
        }
        // on click, fire() is called?
    }

    fire(opponentNumber: number, cell: { row: number, column: number, shipId: number }) {
        // Tell the server that a player has fired at a certain cell
        this.socket.send(JSON.stringify({
            type: 'fire',
            data: {
                gameId: this.gameId,
                opponentNumber: opponentNumber,
                cell: cell
            }
        }));
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'fire') {
                if (data.hit){
                    this.boards[data.opponentNumber-1].hitCell(data.cell);
                }
                else {
                    this.boards[data.opponentNumber-1].missCell(data.cell);
                    this.myTurn = false;
                }
                if (data.sunk){
                    this.boards[data.opponentNumber-1].sinkShip(data.cell);
                }
                if (data.gameOver){
                this.boards[data.opponentNumber-1].gameOver();
                }
            }
        };
        // TODO: check if game is over for everyone, aka you are last one standing
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
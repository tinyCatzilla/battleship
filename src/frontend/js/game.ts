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
        this.boards = [this.playerBoard];
        this.myTurn = false;
        this.gameOver = false;
        this.socket = new WebSocket(`ws://localhost:3050/${gameId}`);
        this.myPlayerNumber = myPlayerNumber;
        this.totalPlayers = -1;
        
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case 'startGame':
                    this.totalPlayers = data.totalPlayers;
                    this.myTurn = (data.turn == this.myPlayerNumber);
                    for (let i = 0; i < this.totalPlayers; i++) {
                        var board = new Board();
                        this.boards.push(board);
                    }
                    break;
                case 'fire':
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
                    break;
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
        this.rendersmall();
        this.playerBoard.rendersmallplayer();
        // this.smallEventListeners();
    }

    smallEventListeners() {
        const cells = document.querySelectorAll<HTMLTableCellElement>('.board-cell');
        cells.forEach((cell) => {
            cell.addEventListener('click', this.fire);
        });
    }
    
    fire = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const row = +target.getAttribute('data-row')!;
        const column = +target.getAttribute('data-column')!;
        const opponentNumber = +target.getAttribute('data-opponentNumber')!; // need way to get opponent number
        this.socket.send(JSON.stringify({
            type: 'fire',
            data: {
                gameId: this.gameId,
                opponentNumber: opponentNumber,
                row: row,
                column: column,
            }
        }));
        // TODO: check if game is over for everyone, aka you are last one standing
    }

    makeMove(row: number, col: number) {
        if (!this.myTurn) {
        alert("Wait for your turn");
        return;
        }
        // on click, fire() is called?
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
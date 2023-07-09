import { Board } from './board.js';

export class Game {
    private gameId: string;
    private boards: Map <number, Board>;
    private socket: WebSocket;
    myPlayerNumber: number;
    totalPlayers: number;
    private selectedBoardId: number;

    playersLeft: number;
    turn: number;

    constructor(gameId: string, myPlayerNumber: number) {
        this.gameId = gameId;
        this.boards = new Map();
        this.socket = new WebSocket(`ws://localhost:3050/${gameId}`);
        this.myPlayerNumber = myPlayerNumber;
        this.totalPlayers = -1;
        this.playersLeft = -1;
        this.turn = -1;
        this.selectedBoardId = -1;
        
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case 'fire':
                    if (data.hit){
                        this.boards.get(data.opponentNumber)?.hitCell(data.cell);
                    }
                    else {
                        this.boards.get(data.opponentNumber)?.missCell(data.cell);
                        // this.myTurn = false;
                    }
                    if (data.sunk){
                        this.boards.get(data.opponentNumber)?.sinkShip(data.cell);
                    }
                    if (data.gameOver){
                        this.boards.get(data.opponentNumber)?.gameOver();
                    }
                    break;
            }
        };
    }

    startGame() {
        // render playerboard (with ships)
        // render grid of empty opponent boards
        // get firstturn from server
        // render attacker board
        // add event listener for each board on grid
        // if board is clicked, render big board
        // if big board is clicked, send attack to server
        console.log(this.totalPlayers);
        for (let i = 1; i <= this.totalPlayers; i++) {
            var board = new Board();
            this.boards.set(i, board);
            if (i != this.myPlayerNumber) {
                board.rendersmall(i);
            }
            else {
                board.rendersmallplayer();
            }
        }
        this.smallEventListeners();
        this.showGrid();
    }

    smallEventListeners() {
        const cells = document.querySelectorAll<HTMLTableCellElement>('.board-small');
        cells.forEach((cell) => {
            cell.addEventListener('click', this.onSmallBoardClick);
        });
        const backToGrid = document.querySelector("#backToGrid") as HTMLElement; 
        backToGrid.addEventListener("click", () => this.showGrid());
    }
 
    onSmallBoardClick = (e: MouseEvent) => {
        // Get the id of the board the clicked cell belongs to
        const boardId = (e.target as HTMLElement).closest('table')?.id;
        this.selectedBoardId = parseInt(boardId?.split('-')[2] || '0');
    
        // Get both board elements
        const activeBoard = document.querySelector(".activeBoard") as HTMLElement;
        const boardGrid = document.querySelector(".boardGrid") as HTMLElement;
    
        // Show the active board and hide the small board
        if (activeBoard) activeBoard.style.display = "block";
        if (boardGrid) boardGrid.style.display = "none";
    
        // Render the selected board on the active board
        const board = this.boards.get(this.selectedBoardId);
        if (board) board.renderactive();
    }
    
    // should be called when back button is clicked
    showGrid() {
        // Get both board elements
        const activeBoard = document.querySelector(".activeBoard") as HTMLElement;
        const boardGrid = document.querySelector(".boardGrid") as HTMLElement;
    
        // Hide the active board and show the small board
        if (activeBoard) activeBoard.style.display = "none";
        if (boardGrid) boardGrid.style.display = "block";
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

    leaveGame() {
        // Tell the server that the player has left the game
        this.socket.send(JSON.stringify({
            type: 'leaveGame',
            gameId: this.gameId
        }));
    }



}
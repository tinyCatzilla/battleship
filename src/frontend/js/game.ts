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
                    console.log(data);
                    console.log('fire received');
                    this.handleFireResponse(data);
                    break;
            }
        };
    }



    // ily :)


    
    startGame() {
        console.log(this.totalPlayers);
        for (let i = 1; i <= this.totalPlayers; i++) {
            var board = new Board();
            this.boards.set(i, board);
            if (i === this.myPlayerNumber) {
                board.rendersmallplayer(i);
            } else {
                board.rendersmall(i);
            }
        }
        this.socket.send(JSON.stringify({type: 'initGame', data:{gameId: this.gameId}}));
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
        const backToGrid = document.querySelector("#backToGrid") as HTMLElement; 
    
        // Show the active board and hide the small board
        if (activeBoard) activeBoard.style.display = "block";
        if (boardGrid) boardGrid.style.display = "none";
        if (backToGrid) backToGrid.style.display = "block";
    
        // Render the selected board on the active board
        const board = this.boards.get(this.selectedBoardId);
        if (board) board.renderactive(this.selectedBoardId);

        const activeCells = document.querySelectorAll<HTMLTableCellElement>('.board-cell');
        activeCells.forEach((cell) => {
            cell.addEventListener('click', this.fire);
        });
    }
    
    // should be called when back button is clicked
    showGrid() {
        // Get both board elements
        const activeBoard = document.querySelector(".activeBoard") as HTMLElement;
        const boardGrid = document.querySelector(".boardGrid") as HTMLElement;
        const backToGrid = document.querySelector("#backToGrid") as HTMLElement; 
    
        // Hide the active board and show the small board
        if (activeBoard) activeBoard.style.display = "none";
        if (boardGrid) boardGrid.style.display = "block";
        if (backToGrid) backToGrid.style.display = "none";
    }
    
    fire = (e: MouseEvent) => {
        if (this.turn != this.myPlayerNumber) {
            return;
        }
        const target = e.target as HTMLElement;
        const row = +target.getAttribute('data-row')!;
        const column = +target.getAttribute('data-column')!;
        const opponentNumber = +target.getAttribute('data-playerNumber')!;
        this.socket.send(JSON.stringify({
            type: 'fire',
            data: {
                gameId: this.gameId,
                opponentNumber: opponentNumber,
                row: row,
                column: column,
            }
        }));
    }

    handleFireResponse(data: any) {
        const opponentBoard = this.boards.get(data.opponentNumber);
        if (opponentBoard) {
            const cellId = `${data.row}-${data.column}`;
            if (data.hit) {
                opponentBoard.hitCells.add(cellId);
                if (data.sunk) {
                    // TODO
                    console.log(`A ship was sunk on player ${data.opponentNumber}'s board!`);
                    if (data.gameOver) {
                        console.log(`Player ${data.opponentNumber} has no ships left!`);
                        const smallBoard = document.querySelector(`#small-board-${data.opponentNumber}`);
                        if(smallBoard) {
                            const clone = smallBoard.cloneNode(true) as HTMLElement;
                            clone.classList.add("defeated-board");
                            smallBoard.parentNode?.replaceChild(clone, smallBoard);
                        }
                        
                        this.playersLeft -= 1;
                        if (this.playersLeft === 1) {
                            console.log(`Player ${this.myPlayerNumber} is the last one standing!`);
                            this.stopGame();
                        }
                    }
                }
            } else {
                opponentBoard.missedCells.add(cellId);
                this.turn = data.opponentNumber;
            }
            opponentBoard.updateCellDisplay(data.row, data.column, data.hit, data.opponentNumber);
        }
    }

    stopGame() {
        console.log("Game has been stopped.");
    
        const winnerAlert = document.createElement('div');
        winnerAlert.classList.add('winner-alert');
        winnerAlert.textContent = `Congratulations! Player ${this.myPlayerNumber} has won!`;
    
        const returnButton = document.createElement('button');
        returnButton.textContent = 'Return to lobby';
        returnButton.classList.add('return-button');
    
        winnerAlert.appendChild(returnButton);
        document.body.appendChild(winnerAlert);
    }
}
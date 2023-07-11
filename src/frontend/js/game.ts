import { Board } from './board.js';

export class Game {
    private gameId: string;
    private boards: Map <number, Board>;
    private socket: WebSocket;
    myPlayerNumber: number;
    totalPlayers: number;
    playersLeft: number;
    turn: number;
    usernames: string[];

    constructor(gameId: string, myPlayerNumber: number) {
        this.gameId = gameId;
        this.boards = new Map();
        this.socket = new WebSocket(`ws://localhost:3050/${gameId}`);
        this.myPlayerNumber = myPlayerNumber;
        this.totalPlayers = -1;
        this.playersLeft = -1;
        this.turn = -1;
        this.usernames = [];
        
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case 'fire':
                    console.log(data);
                    console.log('fire received');
                    this.handleFireResponse(data);
                    break;
                case 'selectBoard':
                    console.log(data);
                    console.log('selectBoard received');
                    this.renderSelectedBoard(data.boardId);
                    break;
                case 'backToGrid':
                    console.log(data);
                    console.log('backToGrid received');
                    this.showGrid();
            }
        };
    }



    // ily :)


    
    startGame() {
        for (let i = 1; i <= this.totalPlayers; i++) {
            var board = new Board();
            this.boards.set(i, board);
            if (i != this.turn) {
                board.rendersmall(i, this.usernames[i-1][0]);
            } else {
                board.renderattacker(i, this.usernames[i-1][0]); 
            }
        }
        var playerboard = this.boards.get(this.myPlayerNumber);
        playerboard?.rendersmallplayer(this.myPlayerNumber, this.usernames[this.myPlayerNumber-1][0]);
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
        backToGrid.addEventListener("click", () => this.onBack());
    }
 
    onSmallBoardClick = (e: MouseEvent) => {
        // only the player taking the turn can click
        if (this.turn != this.myPlayerNumber) { 
            return;
        }
        console.log('small board clicked');

        // Get the id of the board the clicked cell belongs to
        const boardId = (e.target as HTMLElement).closest('table')?.id;
        var selectedBoardId = parseInt(boardId?.split('-')[2] || '0');

        this.socket.send(JSON.stringify({type: 'selectBoard', data:{gameId: this.gameId, boardId: selectedBoardId}}));
    }

    renderSelectedBoard(selectedBoardId: number) {
        // Get both board elements
        const activeBoard = document.querySelector(".activeBoard") as HTMLElement;
        const boardGrid = document.querySelector(".boardGrid") as HTMLElement;
        const backToGrid = document.querySelector("#backToGrid") as HTMLElement; 
    
        // Show the active board and hide the small board
        if (activeBoard) activeBoard.style.display = "block";
        if (boardGrid) boardGrid.style.display = "none";
        if (backToGrid) backToGrid.style.display = "block";
    
        // Render the selected board on the active board
        const board = this.boards.get(selectedBoardId);
        if (board) board.renderactive(selectedBoardId, this.usernames[selectedBoardId-1][0]);

        if (this.turn == this.myPlayerNumber) {
            const cells = document.querySelectorAll<HTMLTableCellElement>('.board-cell-active');
            cells.forEach((cell) => {
                cell.addEventListener('click', this.fire);
            });
        }
    }

    onBack() {
        // only the player taking the turn can click
        if (this.turn != this.myPlayerNumber) { 
            return;
        }

        this.socket.send(JSON.stringify({type: 'backToGrid', data:{gameId: this.gameId}}));
        
    }

    showGrid() {
        // Get both board elements
        const activeBoard = document.querySelector(".activeBoard") as HTMLElement;
        const boardGrid = document.querySelector(".boardGrid") as HTMLElement;
        const backToGrid = document.querySelector("#backToGrid") as HTMLElement; 
    
        // Hide the active board and show the small board
        if (activeBoard) activeBoard.style.display = "none";
        if (boardGrid) boardGrid.style.display = "flex";
        if (backToGrid) backToGrid.style.display = "none";
    }

    clearAttackerBoard() {
        console.log('clear attacker board');
        const boardDiv = document.querySelector(".attackerBoard");
        if (boardDiv) console.log("boardDiv found");
        else console.log("boardDiv not found");
        let x = 0;
        while (boardDiv?.firstChild) {
            boardDiv.firstChild.remove();
            x++;
            console.log(x);
        }
    }

    clearBoardGrid() {
        console.log('clear small board');
        const boardDiv = document.querySelector(".boardGrid");
        while (boardDiv?.firstChild) {
            boardDiv.firstChild.remove();
        }
    }
    
    fire = (e: MouseEvent) => {
        console.log('fire');
        if (this.turn != this.myPlayerNumber) {
            return;
        }
        console.log('fire2');
        const target = e.target as HTMLElement;
        const row = +target.getAttribute('data-row')!;
        const column = +target.getAttribute('data-column')!;
        const opponentNumber = +target.getAttribute('data-playerNumber')!;
        this.socket.send(JSON.stringify({
            type: 'fire',
            data: {
                gameId: this.gameId,
                playerNumber : this.myPlayerNumber,
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
                    console.log(`A ship was sunk on player ${data.opponentNumber}'s board!`);
                    // Mark all the cells of the sunk ship as sunk
                    data.sunkShipCells.forEach((cell: {row: number, column: number}) => {
                        const sunkCellId = `${cell.row}-${cell.column}`;
                        opponentBoard.hitCells.add(sunkCellId);
                        opponentBoard.updateCellDisplay(cell.row, cell.column, data.hit, true, data.opponentNumber);
                    
                        // Calculate the IDs of the orthogonal cells
                        const orthogonalCells = [
                            { row: cell.row - 1, column: cell.column },
                            { row: cell.row + 1, column: cell.column },
                            { row: cell.row, column: cell.column - 1 },
                            { row: cell.row, column: cell.column + 1 }
                        ];
                    
                        // Iterate over the orthogonal cells and check if they are in bounds
                        orthogonalCells.forEach(orthogonalCell => {
                            if (orthogonalCell.row >= 0 && orthogonalCell.row < 8 && orthogonalCell.column >= 0 && orthogonalCell.column < 8) {
                                const orthogonalCellId = `${orthogonalCell.row}-${orthogonalCell.column}`;
                                // Add the cell to the missedCells set if it's not already a hit cell
                                // NOTE: Assumes the orthogonal cells do not have ships on them.
                                if (!opponentBoard.hitCells.has(orthogonalCellId)) {
                                    opponentBoard.missedCells.add(orthogonalCellId);
                                    opponentBoard.updateCellDisplay(orthogonalCell.row, orthogonalCell.column, false, false, data.opponentNumber);
                                }
                            }
                        });
                    });
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
                            console.log(`Player ${data.playerNumber} is the last one standing!`);
                            this.stopGame(data.playerNumber);
                        }
                    }
                }
            } else {
                opponentBoard.missedCells.add(cellId);
                this.turn = data.opponentNumber;
            
                this.clearAttackerBoard(); // Clear the old attacker board
                this.clearBoardGrid(); // Clear the old small board
                for (let i = 1; i <= this.totalPlayers; i++) {
                    var board = this.boards.get(i);
                    if (i != this.turn) {
                        board?.rendersmall(i, this.usernames[i-1][0]);
                    } else {
                        board?.renderattacker(i, this.usernames[i-1][0]); 
                    }
                }
                this.smallEventListeners();
                this.showGrid();
            }
            opponentBoard.updateCellDisplay(data.row, data.column, data.hit, false, data.opponentNumber);
        }
    }
    

    stopGame(winner: number) {
        console.log("Game has been stopped.");
    
        // Hide the game screen
        const gameScreen = document.querySelector(".game-screen") as HTMLElement;
        if (gameScreen) gameScreen.style.display = 'none';
    
        // Create a win screen
        const winScreen = document.createElement('div');
        winScreen.classList.add('win-screen');
    
        const winnerAlert = document.createElement('h1');
        winnerAlert.classList.add('winner-alert');
        winnerAlert.textContent = `Congratulations! Player ${winner} has won!`;
    
        winScreen.appendChild(winnerAlert);
        document.body.appendChild(winScreen);
    }
}
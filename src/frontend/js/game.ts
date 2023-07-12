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
    alive: boolean[];
    started : boolean;

    constructor(gameId: string, myPlayerNumber: number) {
        this.gameId = gameId;
        this.boards = new Map();
        this.socket = new WebSocket(`ws://localhost:3050/${gameId}`);
        this.myPlayerNumber = myPlayerNumber;
        this.totalPlayers = -1;
        this.playersLeft = -1;
        this.turn = -1;
        this.usernames = [];
        this.alive = [];
        this.started = false;
        
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
                    break;
                case 'leaveGame':
                    console.log(data);
                    console.log('leaveGame received');
                    this.handlePlayerLeft(data);
                    break;
            }
        };
    }



    // ily :)


    
    startGame(playerBoard: Board) {
        for (let i = 1; i <= this.totalPlayers; i++) {
            this.alive[i-1] = true;
            var board = new Board();
            this.boards.set(i, board);
            if (i == this.myPlayerNumber) {
                playerBoard.rendersmallplayer(i, this.usernames[i-1][0]);
                if (i == this.turn){
                    playerBoard.renderattacker(i, this.usernames[i-1][0]);
                }
                else{
                    playerBoard.rendersmall(i, this.usernames[i-1][0]);
                }
                this.boards.set(i, playerBoard);
                continue;
            }
            else if (i != this.turn) {
                board.rendersmall(i, this.usernames[i-1][0]);
            }
            else {
                board.renderattacker(i, this.usernames[i-1][0]); 
            }
        }
        this.socket.send(JSON.stringify({type: 'initGame', data:{gameId: this.gameId}}));
        // check for 2 player game
        if (this.totalPlayers == 2) {
            var alivePlayers = this.getTrueIndices(this.alive);
            if (alivePlayers.length != 2){
                console.log("Error: More than 2 players are alive.");
                return;
            }
            var alivePlayer = alivePlayers[0]+1;
            if (alivePlayer == this.myPlayerNumber){
                alivePlayer = alivePlayers[1]+1;
            }
            this.renderSelectedBoard(alivePlayer);
        }
        else {
            this.smallEventListeners();
            this.showGrid();
        }
    }

    smallEventListeners() {
        const cells = document.querySelectorAll<HTMLTableCellElement>('.board-small');
        cells.forEach((cell) => {
            cell.addEventListener('click', this.onSmallBoardClick);
            cell.style.cursor = "pointer";
        });

        const backToGrid = document.querySelector("#backToGrid") as HTMLElement; 
        if (backToGrid) backToGrid.addEventListener("click", () => this.onBack());
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
        if (backToGrid && this.turn == this.myPlayerNumber && this.totalPlayers != 2) backToGrid.style.display = "block";
    
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
        while (boardDiv?.firstChild) {
            boardDiv.firstChild.remove();
        }
    }

    clearBoardGrid() {
        console.log('clear small board');
        const boardDiv = document.querySelector(".boardGrid");
        while (boardDiv?.firstChild) {
            boardDiv.firstChild.remove();
        }
    }

    getTrueIndices(alive: boolean[]): number[] {
        const trueIndices: number[] = [];
      
        for (let i = 0; i < alive.length; i++) {
            if (alive[i]) {
                trueIndices.push(i);
            }
        }
        return trueIndices;
    }

    handlePlayerLeft(data: any) {
        console.log('Player ' + data.playerNumber + ' left the game')
        this.playersLeft -= 1;
        this.alive[data.playerNumber-1] = false;
        console.log(this.alive);
        var firstalive = this.alive.indexOf(true)+1; 
        console.log(firstalive);

        if (this.playersLeft == 1 && this.myPlayerNumber == firstalive) {
            console.log(`Player ${firstalive} is the last one standing!`);
            this.stopGame(firstalive);
        }

        if (this.turn == data.playerNumber) {
            console.log(`Player ${data.playerNumber} left the game while it was their turn`);
            this.turn = firstalive;
            
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
        }
        this.showGrid();
        
        const smallBoard = document.querySelector(`#small-board-${data.playerNumber}`);
        if(smallBoard) {
            const clone = smallBoard.cloneNode(true) as HTMLElement;
            clone.classList.remove("small-board");
            clone.classList.add("defeated-board");
            smallBoard.parentNode?.replaceChild(clone, smallBoard);
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
                        opponentBoard.sunkCells.add(sunkCellId);
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
                        this.playersLeft -= 1;
                        this.alive[data.opponentNumber-1] = false;

                        if (this.playersLeft === 2 ){
                            var alivePlayers = this.getTrueIndices(this.alive);
                            if (alivePlayers.length != 2){
                                console.log("Error: More than 2 players are alive.");
                                return;
                            }
                            var alivePlayer = alivePlayers[0]+1;
                            if (this.myPlayerNumber === alivePlayer){
                                alivePlayer = alivePlayers[1]+1;
                            }
                            this.clearBoardGrid();
                            this.clearAttackerBoard();
                            this.renderSelectedBoard(alivePlayer);
                            return;
                        }

                        this.showGrid();
                        this.smallEventListeners();
                        const smallBoard = document.querySelector(`#small-board-${data.opponentNumber}`);
                        if(smallBoard) {
                            const clone = smallBoard.cloneNode(true) as HTMLElement;
                            clone.classList.remove("small-board");
                            clone.classList.add("defeated-board");
                            smallBoard.parentNode?.replaceChild(clone, smallBoard);
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
                if (this.playersLeft === 2 ){
                    var alivePlayers = this.getTrueIndices(this.alive);
                    if (alivePlayers.length != 2){
                        console.log("Error: More than 2 players are alive.");
                        return;
                    }
                    var alivePlayer = alivePlayers[0]+1;
                    if (alivePlayer == this.myPlayerNumber){
                        alivePlayer = alivePlayers[1]+1;
                    }
                    this.clearBoardGrid();
                    this.clearAttackerBoard();
                    this.renderSelectedBoard(alivePlayer);
                }
                else {
                    this.smallEventListeners();
                    this.showGrid();
                }
            }
            opponentBoard.updateCellDisplay(data.row, data.column, data.hit, false, data.opponentNumber);
            if (this.playersLeft === 1) {
                console.log(`Player ${data.playerNumber} is the last one standing!`);
                this.stopGame(data.playerNumber);
            }
        }
    }
    

    stopGame(winner: number) {
        console.log("Game has been stopped.");

        const leaveRoomButton = document.querySelector("#leaveRoomButton") as HTMLElement;
        if (leaveRoomButton) leaveRoomButton.style.display = "none";

        const playerBoard = document.querySelector(".playerBoard") as HTMLElement;
        if (playerBoard) playerBoard.innerHTML = '';
        
        const attackerBoard = document.querySelector(".attackerBoard") as HTMLElement;
        if (attackerBoard) attackerBoard.innerHTML = '';
        
        const boardGrid = document.querySelector(".boardGrid") as HTMLElement;
        if (boardGrid) boardGrid.innerHTML = '';

        const centeredContainer = document.querySelector(".centeredContainer") as HTMLElement;
        if (centeredContainer) centeredContainer.innerHTML = '';

        const chats = document.querySelectorAll(".chat");
        for (let chat of chats) {
            if (chat.parentElement?.classList.contains("lobbyMain")) { // if chat's parent is lobbyMain, get children
                const chatMessages = chat.querySelectorAll(".chatMessages");
                for (let child of chatMessages) {
                    if (child.classList.contains("chatMessage")) {
                        chat.removeChild(child);
                    }
                }
            }
            else { // delete chat if it's not lobby chat
                chat.parentElement?.removeChild(chat);
            }
        }

        const gameBoard = document.querySelector(".gameBoard") as HTMLElement;
        if (gameBoard) gameBoard.innerHTML = '';

        const playerList = document.querySelector(".playerList") as HTMLElement;
        if (playerList) playerList.innerHTML = '';

        const lobbyCode = document.querySelector("#lobbyCode") as HTMLElement;
        if (lobbyCode) lobbyCode.innerHTML = '';

    
        // Hide the game screen
        const gameScreen = document.querySelector(".gameScreen") as HTMLElement;
        if (gameScreen) gameScreen.style.display = 'none';

        const subHeadings = [
            "Congratulations!",
            "You sunk my battleship",
            "GGs",
            "Go next?",
            "Winner alert!",
            "Or did they?"
        ]

        const winScreen = document.querySelector(".winScreen") as HTMLElement;
        if (winScreen) winScreen.style.display = 'flex';

        const winnerAlert = document.createElement('div');
        winnerAlert.classList.add('winner-alert');
        winnerAlert.textContent = `Player ${winner} has won!`;
        winScreen.appendChild(winnerAlert);

        const subHeading = document.createElement('div');
        subHeading.classList.add('sub-heading');
        subHeading.textContent = subHeadings[Math.floor(Math.random() * subHeadings.length)];
        winScreen.appendChild(subHeading);


        const playAgain = document.createElement('button');
        playAgain.classList.add('menuButton');
        playAgain.classList.add('btnGreen');
        playAgain.textContent = `Play Again`; // TODO: Change "Play Again" to go back to lobby?
        playAgain.addEventListener('click', () => {
            location.reload();
        });
        winScreen.appendChild(playAgain);
        
        this.socket.send(JSON.stringify({type: 'stop', data: {gameId: this.gameId}}));
    }
}
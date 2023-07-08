export class Board {
    private shipCells: { row: number, column: number, shipId: number }[] = []; // Stores the cells that have ships
    private ships: { id: number, size: number, orientation: 'horizontal' | 'vertical' }[] = []; // Stores ship metadata
    private shipBoard: boolean[][]; // Stores the board as a 2D array of booleans, true if the cell has a ship
    private locked: boolean = false; // Whether the board is locked for editing
    private dragStart_cell: { row: number, column: number } | undefined = undefined;
    private dragStart_diff: number = 0; // Difference between the drag start cell and the first cell of the ship
    
    constructor() {
        // Initialize an empty board
        this.shipBoard = Array.from({ length: 8 }, () => Array(8).fill(false));
    }
    
    get getShips() {
        return {ships: this.ships, shipCells: this.shipCells};
    }

    render() {
        const boardDiv = document.querySelector("#gameBoard");
        if (!boardDiv) return;
        
        // Render the board as an HTML table
        const boardElement = document.createElement('table');
        this.shipBoard.forEach((row, i) => {
            const rowElement = document.createElement('tr');
            row.forEach((cell, j) => {
                const cellElement = document.createElement('td');
                cellElement.setAttribute('data-row', i.toString());
                cellElement.setAttribute('data-column', j.toString());
                cellElement.classList.add('board-cell');
                rowElement.appendChild(cellElement);
            });
            boardElement.appendChild(rowElement);
        });

        boardDiv.appendChild(boardElement);
        // Update the display
        this.updateDisplay();

        // Add event listeners
        this.addEventListeners();
    }

    unrender() {
        const boardDiv = document.querySelector("#gameBoard");
        if (boardDiv) {
            boardDiv.innerHTML = '';
            boardDiv.textContent = '';
        }
    }

    private canPlaceShip(row: number, column: number, size: number, orientation: string, movingShipId?: number): boolean {
        // Checks if the given input is a valid ship placement
        // PRECONDITION: row, column are the FIRST cell of the ship
        // TODO: Take in array of cells, rather than first cell
        for (let i = 0; i < size; i++) {
            let cellRow = row;
            let cellColumn = column;
    
            if (orientation === 'horizontal') {
                cellColumn += i;
            } else {
                cellRow += i;
            }
    
            if (cellRow < 0 || cellRow >= 8 || cellColumn < 0 || cellColumn >= 8) {
                return false;
            }
    
            if (this.shipBoard[cellRow][cellColumn] === true) {
                const shipCell = this.shipCells.find(cell => cell.row === cellRow && cell.column === cellColumn);
                if (!shipCell || shipCell.shipId !== movingShipId) {
                    return false;
                }
            }
        }
        return true;
    }

    placeInitialShips(shipConfig: { size: number, count: number }[]) {
        let currentShipId = 0;
        for (const { size, count } of shipConfig) {
            let remaining = count;
            while (remaining > 0) {
                const row = Math.floor(Math.random() * 8);
                const column = Math.floor(Math.random() * 8);
                const orientation = Math.random() > 0.5 ? 'horizontal' : 'vertical';

                if (this.canPlaceShip(row, column, size, orientation)) {
                    for (let i = 0; i < size; i++) {
                        let cellRow = row;
                        let cellColumn = column;

                        if (orientation === 'horizontal') {
                            cellColumn += i;
                        } else {
                            cellRow += i;
                        }

                        this.shipBoard[cellRow][cellColumn] = true;
                        this.shipCells.push({ row: cellRow, column: cellColumn, shipId: currentShipId });
                    }
                    this.ships.push({ id: currentShipId, size, orientation });
                    currentShipId++;
                    remaining--;
                }
            }
        }
        this.updateDisplay();
    }
    
    private updateDisplay() {
        const cells = document.querySelectorAll('.board-cell');
        cells.forEach(cell => {
            const row = +cell.getAttribute('data-row')!;
            const column = +cell.getAttribute('data-column')!;
            
            // Clear previous ship class
            cell.classList.remove('ship');
            cell.setAttribute('draggable', 'false');

            if (this.shipBoard[row][column] === true) {
                cell.classList.add('ship');
                cell.setAttribute('draggable', 'true');
            }
        });
    }

    private updateShipCells(ship: { id: number, size: number, orientation: 'horizontal' | 'vertical' }) { 
        const shipCells = this.shipCells.filter(cell => cell.shipId === ship.id);
        if (shipCells.length > 0) {
            // Clears the old cells from shipBoard
            for (let cell of shipCells) {
                this.shipBoard[cell.row][cell.column] = false;
            }


            const firstCell = shipCells[0];
            for (let i = 0; i < ship.size; i++) {
                let cellRow = firstCell.row;
                let cellColumn = firstCell.column;

                if (ship.orientation === 'horizontal') {
                    cellColumn += i;
                } else {
                    cellRow += i;
                }

                if (i < shipCells.length) {
                    shipCells[i].row = cellRow;
                    shipCells[i].column = cellColumn;
                    this.shipBoard[cellRow][cellColumn] = true;
                }
            }
        }
    }

    private addEventListeners() {
        const cells = document.querySelectorAll<HTMLTableCellElement>('.board-cell');
        cells.forEach((cell) => {
            cell.addEventListener('dragstart', this.dragStart);
            cell.addEventListener('dragover', this.dragOver);
            cell.addEventListener('dragleave', this.dragLeave);
            cell.addEventListener('drop', this.drop);
            cell.addEventListener('click', this.rotate);
        });
    }
    
    private dragStart = (e: DragEvent) => {
        if (this.locked) return;

        const target = e.target as HTMLElement;
        const row = +target.getAttribute('data-row')!;
        const column = +target.getAttribute('data-column')!;
    
        const shipCell = this.shipCells.find(cell => cell.row === row && cell.column === column);
        if (!shipCell) { return; }
        this.dragStart_cell = shipCell // unused

        if (shipCell) {
            e.dataTransfer!.setData('text/plain', shipCell.shipId.toString());
            const data = e.dataTransfer?.getData('text/plain');
            const shipId = data ? +data : -1;
            if (shipId == -1) { 
                console.log("FATAL ERROR: shipCells and shipIds are out of sync in dragStart()")
                return; }
            
            // Calculate the difference between the drag start cell and the first cell of the ship
            const shipCells = this.shipCells.filter(cell => cell.shipId === shipId);
            this.dragStart_diff = shipCell.row + shipCell.column - shipCells[0].row - shipCells[0].column;
    
            // Hide the ship at its old position
            this.shipCells.filter(cell => cell.shipId === shipCell.shipId)
                .forEach(cell => this.shipBoard[cell.row][cell.column] = false);
            this.updateDisplay();
    
            // Hide the drag image
            const img = new Image();
            e.dataTransfer!.setDragImage(img, 0, 0);
    
            // Remove the 'rotate-failed' class from all cells of the ship
            this.shipCells.filter(cell => cell.shipId === shipCell.shipId)
            .forEach(cell => {
                const cellElement = document.querySelector(`[data-row='${cell.row}'][data-column='${cell.column}']`);
                if (cellElement) {
                    cellElement.classList.remove('rotate-failed');
                }
            });
        }
    };

    private dragOver_cell(row: number, column: number, ship: { id: number, size: number, orientation: 'horizontal' | 'vertical' }) {
        if (ship.orientation === 'horizontal') {
            var column = column - this.dragStart_diff;
        } else {
            var row = row - this.dragStart_diff;
        }
        return {row: row, column: column};
    }

    private dragOver = (e: DragEvent) => {
        e.preventDefault();
        // Remove legal move from past drag over
        const cells = document.querySelectorAll<HTMLTableCellElement>('.board-cell');
        console.log(cells);
        cells.forEach(cell => cell.classList.remove('legal-move'));
    
        const target = e.target as HTMLElement;
        var cellRow = +target.getAttribute('data-row')!;
        var cellColumn = +target.getAttribute('data-column')!;
        const data = e.dataTransfer?.getData('text/plain');
        const shipId = data ? +data : -1;
        if (shipId == -1) { 
            console.log("FATAL ERROR: shipCells and shipIds are out of sync in dragOver()")
            return; }
        const ship = this.ships.find(ship => ship.id === shipId);
        if (!ship) { 
            console.log("ERROR: shipId without ship in dragOver()")
            return; }
        var firstCell = this.dragOver_cell(cellRow, cellColumn, ship);

        if (this.canPlaceShip(firstCell.row, firstCell.column, ship.size, ship.orientation, shipId)) {
            for (let i = 0; i < ship.size; i++) {
                var newRow = firstCell.row;
                var newColumn = firstCell.column;
                if (ship.orientation === 'horizontal') {
                    newColumn += i;
                } else {
                    newRow += i;
                }
                if (newRow >= 0 && newRow < 8 && newColumn >= 0 && newColumn < 8) {
                    const cell = cells[newRow * 8 + newColumn];
                    cell.classList.add('legal-move'); // add legal moves to new cells
                }
            }
        }
        // TODO: make it so that dragging off screen will place the ship at the edge
        // and also it renders weird right now so fix that too
    };

    private dragLeave = (e: DragEvent) => {
        const target = e.target as HTMLElement;
        target.classList.remove('legal-move');
    };

    private drop = (e: DragEvent) => {
        // remove green drag image
        const cells = document.querySelectorAll<HTMLTableCellElement>('.board-cell');
        cells.forEach((cell) => {
            cell.classList.remove('legal-move');
        });

        e.preventDefault();

        const target = e.target as HTMLElement;
        var newRow = +target.getAttribute('data-row')!;
        var newColumn = +target.getAttribute('data-column')!;

        const data = e.dataTransfer?.getData('text/plain');
        const shipId = data ? +data : -1;


        // Check if the dragged item is actually a ship
        if (shipId < 0) {
            return; // exit the function if the dragged item is not a ship
        }

        const ship = this.ships.find(ship => ship.id === shipId);
        if (!ship) return;
        const shipCells = this.shipCells.filter(cell => cell.shipId === shipId)
        var cellRow = newRow;
        var cellColumn = newColumn;
        if (ship.orientation === 'horizontal') {
            var cellColumn = newColumn - this.dragStart_diff;
        } else {
            var cellRow = newRow - this.dragStart_diff;
        }
        if (this.canPlaceShip(cellRow, cellColumn, ship.size, ship.orientation, shipId)) {
            if (shipCells.length > 0) {
                shipCells[0].row = cellRow;
                shipCells[0].column = cellColumn;
            }
            this.updateShipCells(ship);
            this.updateDisplay();
        } else {
            // The ship was removed from its original place, add it back
            this.updateShipCells(ship);
            this.updateDisplay();
        };
    };
    

    private rotate = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const rowAttr = target.getAttribute('data-row');
        const columnAttr = target.getAttribute('data-column');
    
        if (rowAttr !== null && columnAttr !== null) {
            var row = +rowAttr;
            var column = +columnAttr;
            const shipCell = this.shipCells.find(cell => cell.row === row && cell.column === column);
            if (!shipCell) return;
            else {
                const shipCells = this.shipCells.filter(cell => cell.shipId === shipCell.shipId)
                let min = Number.MAX_VALUE;
                for(var cell of shipCells) {
                    if (cell.row + cell.column < min) {
                        row = cell.row;
                        column = cell.column;
                        min = cell.row + cell.column;
                    }
                }

                const ship = this.ships.find(ship => ship.id === shipCell.shipId);
                if (!ship) return;

                const newOrientation = ship.orientation === 'horizontal' ? 'vertical' : 'horizontal';
    
                if (this.canPlaceShip(row, column, ship.size, newOrientation, ship.id)) {
                    ship.orientation = newOrientation;
                    this.updateShipCells(ship);
                } 
                else {
                    // Add a class to indicate the rotation failed to all cells of the ship
                    const cellsFailed = this.shipCells.filter(cell => cell.shipId === shipCell.shipId);
                    cellsFailed.forEach(shipCell => {
                        const cell = document.querySelector(`[data-row='${shipCell.row}'][data-column='${shipCell.column}']`);
                        if (cell) {
                            cell.classList.add('rotate-failed');
                        }
                    });
    
                    // Remove the class after a brief moment
                    setTimeout(() => {
                        cellsFailed.forEach(shipCell => {
                            const cell = document.querySelector(`[data-row='${shipCell.row}'][data-column='${shipCell.column}']`);
                            if (cell) {
                                cell.classList.remove('rotate-failed');
                            }
                        });
                    }, 1000);
                }
                this.updateDisplay();
            }
        }
    };


    lockBoard() {
        // locks when player ready
        this.locked = true;
    }

   updateBoard(board: Board) {
        // will update from socket
    }
}

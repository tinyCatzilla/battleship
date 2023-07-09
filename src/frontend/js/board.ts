export type Cell = {
    hasShip: boolean;
    isHit: boolean;
};

export class Board {
    private allshipCells: { row: number, column: number, shipId: number }[] = []; // Stores the cells that have ships
    private ships: { id: number, size: number, orientation: 'horizontal' | 'vertical' }[] = []; // Stores ship metadata
    private shipBoard: Cell[][]; // Stores the board as a 2D array of Cells, to synchronise with the server
    private locked: boolean = false; // Whether the board is locked for editing
    private dragStart_diff: number = 0; // Difference between the drag start cell and the first cell of the ship
    private gameIsOver: boolean = false; // Whether this player's game is over
    
    constructor() {
        // Initialize an empty board
        this.shipBoard = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => ({ hasShip: false, isHit: false })));
    }
    
    get getShips() {
        return {ships: this.ships, shipCells: this.allshipCells};
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
        boardDiv.appendChild(boardElement); // Add the board to the DOM
        this.updateDisplay(); // Update the display
        this.addEventListeners(); // Add event listeners
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
    
            if (this.shipBoard[cellRow][cellColumn].hasShip) {
                const shipCell = this.getShipCell(cellRow, cellColumn);
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
            let attemptCount = 0;
            while (remaining > 0) {
                if (attemptCount > 100) {
                    console.error("Could not place all ships!");
                    break;
                }
                const row = Math.floor(Math.random() * 8);
                const column = Math.floor(Math.random() * 8);
                const orientation = Math.random() > 0.5 ? 'horizontal' : 'vertical';
    
                if (this.canPlaceShip(row, column, size, orientation)) {
                    this.placeShip(row, column, size, orientation, currentShipId);
                    currentShipId++;
                    remaining--;
                }
                attemptCount++;
            }
        }
        this.updateDisplay();
    }
    
    private placeShip(row: number, column: number, size: number, orientation: 'horizontal' | 'vertical', currentShipId: number) {
        for (let i = 0; i < size; i++) {
            let cellRow = row;
            let cellColumn = column;
    
            if (orientation === 'horizontal') {
                cellColumn += i;
            } else {
                cellRow += i;
            }
    
            this.shipBoard[cellRow][cellColumn].hasShip = true;
            this.allshipCells.push({ row: cellRow, column: cellColumn, shipId: currentShipId });
        }
        this.ships.push({ id: currentShipId, size: size, orientation: orientation });
    }
    
    private updateDisplay() {
        const cells = document.querySelectorAll('.board-cell');
        cells.forEach(cell => {
            const row = +cell.getAttribute('data-row')!;
            const column = +cell.getAttribute('data-column')!;
            
            // Clear previous ship class
            cell.classList.remove('ship');
            cell.setAttribute('draggable', 'false');

            if (this.shipBoard[row][column].hasShip) {
                cell.classList.add('ship');
                cell.setAttribute('draggable', 'true');
            }
        });
    }

    private updateShipCells(ship: { id: number, size: number, orientation: 'horizontal' | 'vertical' }) { 
        const shipCells = this.getShipCells(ship.id);
        if (shipCells.length > 0) {
            // Clears the old cells from shipBoard
            for (let cell of shipCells) {
                this.shipBoard[cell.row][cell.column].hasShip = false;
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
                    this.shipBoard[cellRow][cellColumn].hasShip = true;
                }
            }
        }
    }

    private getShipCell = (row: number, column: number) => 
        this.allshipCells.find(cell => cell.row === row && cell.column === column);

    private getShip = (shipId: number) => 
        this.ships.find(ship => ship.id === shipId);

    private getShipCells = (shipId: number) => 
        this.allshipCells.filter(cell => cell.shipId === shipId);
    
    private addClassToCells = (cells: any[], className: string) => 
        cells.forEach(cell => {
            const element = document.querySelector(`[data-row='${cell.row}'][data-column='${cell.column}']`);
            if (element) {
                element.classList.add(className);
            }
        });
    
    private removeClassFromCells = (cells: any[], className: string) => 
        cells.forEach(cell => {
            const element = document.querySelector(`[data-row='${cell.row}'][data-column='${cell.column}']`);
            if (element) {
                element.classList.remove(className);
            }
        });

    private getMinCoordinateCell = (shipId: number) => {
        let min = Number.MAX_VALUE;
        let minCoordinateCell = null;
        for (let cell of this.getShipCells(shipId)) {
            if (cell.row + cell.column < min) {
                minCoordinateCell = cell;
                min = cell.row + cell.column;
            }
        }
        return minCoordinateCell;
    }

    private addEventListeners() {
        const cells = document.querySelectorAll<HTMLTableCellElement>('.board-cell');
        cells.forEach((cell) => {
            cell.addEventListener('dragstart', this.dragStart);
            cell.addEventListener('dragover', this.dragOver);
            cell.addEventListener('dragleave', this.dragLeave);
            cell.addEventListener('drop', this.drop);
            cell.addEventListener('dragend', this.dragEnd);
            cell.addEventListener('click', this.rotate);
        });
    }
    
    private dragStart = (e: DragEvent) => {
        if (this.locked) return;

        const target = e.target as HTMLElement;
        const row = +target.getAttribute('data-row')!;
        const column = +target.getAttribute('data-column')!;
        const shipCell = this.getShipCell(row, column)
        if (!shipCell) { return; }

        e.dataTransfer!.setData('text/plain', shipCell.shipId.toString());
        
        // Calculate the difference between the drag start cell and the first cell of the ship
        var shipCells = this.getShipCells(shipCell.shipId);
        this.dragStart_diff = shipCell.row + shipCell.column - shipCells[0].row - shipCells[0].column;

        // Hide the ship at its old position
        this.getShipCells(shipCell.shipId)
            .forEach(cell => this.shipBoard[cell.row][cell.column].hasShip = false);
        this.updateDisplay();

        // Hide the drag image
        const img = new Image();
        e.dataTransfer!.setDragImage(img, 0, 0);

        // Remove the 'rotate-failed' class from all cells of the ship
        this.removeClassFromCells(shipCells, 'rotate-failed');
    };

    private dragLeave = (e: DragEvent) => {
        // removes green drag image when you drag off the board
        const cells = document.querySelectorAll<HTMLTableCellElement>('.board-cell');
        cells.forEach((cell) => {
            cell.classList.remove('legal-move');
        });
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
        cells.forEach(cell => cell.classList.remove('legal-move'));
    
        const target = e.target as HTMLElement;
        var cellRow = +target.getAttribute('data-row')!;
        var cellColumn = +target.getAttribute('data-column')!;
        const data = e.dataTransfer?.getData('text/plain');
        const shipId = data ? +data : -1;
        if (shipId == -1) { 
            console.log("FATAL ERROR: shipCells and shipIds are out of sync in dragOver()")
            return; }
        const ship = this.getShip(shipId);
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
        if (shipId == -1) {
            console.log("FATAL ERROR: shipCells and shipIds are out of sync in drop()")
            return; }
        const ship = this.getShip(shipId);
        if (!ship) return;
        const shipCells = this.getShipCells(shipId);
        var firstCell = this.dragOver_cell(newRow, newColumn, ship)
        newRow = firstCell.row;
        newColumn = firstCell.column;
        if (this.canPlaceShip(newRow, newColumn, ship.size, ship.orientation, shipId)) {
            if (shipCells.length > 0) {
                shipCells[0].row = newRow;
                shipCells[0].column = newColumn;
            }
        };
        this.updateShipCells(ship);
        this.updateDisplay();
    };



    private dragEnd = (e: DragEvent) => {
        const cells = document.querySelectorAll<HTMLTableCellElement>('.board-cell');
        cells.forEach((cell) => {
            cell.classList.remove('legal-move');
        });
        const data = e.dataTransfer?.getData('text/plain');
        const shipId = data ? +data : -1;
        const ship = this.getShip(shipId);
        if (!ship) return;
        this.updateShipCells(ship);
        this.updateDisplay();
    };
    

    private rotate = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const rowAttr = target.getAttribute('data-row');
        const columnAttr = target.getAttribute('data-column');
    
        if (!rowAttr || !columnAttr) return;
    
        const shipCell = this.getShipCell(+rowAttr, +columnAttr);
        if (!shipCell) return;
    
        const ship = this.getShip(shipCell.shipId);
        if (!ship) return;
    
        const minCoordinateCell = this.getMinCoordinateCell(shipCell.shipId);
    
        if (!minCoordinateCell) return;

        const { row: cellRow, column: cellColumn} = minCoordinateCell;
        const newOrientation = ship.orientation === 'horizontal' ? 'vertical' : 'horizontal';
        const shipCells = this.getShipCells(shipCell.shipId);
    
        if (this.canPlaceShip(cellRow, cellColumn, ship.size, newOrientation, ship.id)) {
            this.removeClassFromCells(shipCells, 'rotate-failed');
            ship.orientation = newOrientation;
            this.updateShipCells(ship);
        } else {
            this.addClassToCells(shipCells, 'rotate-failed');
            setTimeout(() => this.removeClassFromCells(shipCells, 'rotate-failed'), 1000);
        }
        
        this.updateDisplay();
    };

    lockBoard() {
        // locks when player ready
        this.locked = true;
    }

    rendersmall() {
        // creates an empty board in boardgrid
        const boardDiv = document.querySelector(".boardGrid");
        if (!boardDiv) return;
        // Render the board as an HTML table
        const boardElement = document.createElement('table');
        this.shipBoard.forEach((row, i) => {
            const rowElement = document.createElement('tr');
            row.forEach((cell, j) => {
                const cellElement = document.createElement('td');
                cellElement.setAttribute('data-row', i.toString());
                cellElement.setAttribute('data-column', j.toString());
                cellElement.classList.add('board-cell-small');
                rowElement.appendChild(cellElement);
            });
            boardElement.appendChild(rowElement);
        });
        boardDiv.appendChild(boardElement); // Add the board to the DOM
        // this.smallEventListeners(); // Add event listeners
    }

    rendersmallplayer() {
        const boardDiv = document.querySelector(".playerBoard");
        if (!boardDiv) return;
        // Render the board as an HTML table
        const boardElement = document.createElement('table');
        this.shipBoard.forEach((row, i) => {
            const rowElement = document.createElement('tr');
            row.forEach((cell, j) => {
                const cellElement = document.createElement('td');
                cellElement.setAttribute('data-row', i.toString());
                cellElement.setAttribute('data-column', j.toString());
                cellElement.classList.add('board-cell-player');
                rowElement.appendChild(cellElement);
            });
            boardElement.appendChild(rowElement);
        });
        boardDiv.appendChild(boardElement); // Add the board to the DOM
        this.updateDisplay(); // Update the display
    }
    

    hitCell(cell: { row: number, column: number, shipId: number }) {
        const htmlcells = document.querySelectorAll<HTMLTableCellElement>('.board-cell');
        const htmlcell = htmlcells[cell.row * 8 + cell.column];
        htmlcell.classList.add('hit');
    }

    missCell(cell: { row: number, column: number, shipId: number }) {
        const htmlcells = document.querySelectorAll<HTMLTableCellElement>('.board-cell');
        const htmlcell = htmlcells[cell.row * 8 + cell.column];
        htmlcell.classList.add('miss');
    }

    sinkShip(cell: { row: number, column: number, shipId: number }) {
        const shipCells = this.getShipCells(cell.shipId);
        // traditionally, render cells around ship as missed
    }

    gameOver() {
        this.gameIsOver = true;
        // render game over screen?
    }
}



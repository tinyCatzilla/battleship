export class Board {
    shipCells = [];
    ships = [];
    preemptiveBoard;
    locked = false;
    constructor() {
        // Initialize an empty board
        this.preemptiveBoard = Array.from({ length: 8 }, () => Array(8).fill(false));
    }
    get getShips() {
        return { ships: this.ships, shipCells: this.shipCells };
    }
    render() {
        const boardDiv = document.querySelector("#gameBoard");
        if (!boardDiv)
            return;
        // Render the board as an HTML table
        const boardElement = document.createElement('table');
        this.preemptiveBoard.forEach((row, i) => {
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
        }
    }
    placeShips(shipConfig) {
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
                        }
                        else {
                            cellRow += i;
                        }
                        this.preemptiveBoard[cellRow][cellColumn] = true;
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
    canPlaceShip(row, column, size, orientation, movingShipId) {
        for (let i = 0; i < size; i++) {
            let cellRow = row;
            let cellColumn = column;
            if (orientation === 'horizontal') {
                cellColumn += i;
            }
            else {
                cellRow += i;
            }
            if (cellRow < 0 || cellRow >= 8 || cellColumn < 0 || cellColumn >= 8) {
                return false;
            }
            if (this.preemptiveBoard[cellRow][cellColumn] === true) {
                const shipCell = this.shipCells.find(cell => cell.row === cellRow && cell.column === cellColumn);
                if (!shipCell || shipCell.shipId !== movingShipId) {
                    return false;
                }
            }
        }
        return true;
    }
    updateDisplay() {
        const cells = document.querySelectorAll('.board-cell');
        cells.forEach(cell => {
            const row = +cell.getAttribute('data-row');
            const column = +cell.getAttribute('data-column');
            // Clear previous ship class
            cell.classList.remove('ship');
            if (this.preemptiveBoard[row][column] === true) {
                cell.classList.add('ship');
            }
        });
    }
    addEventListeners() {
        const cells = document.querySelectorAll('.board-cell');
        cells.forEach((cell) => {
            cell.setAttribute('draggable', 'true');
            cell.addEventListener('dragstart', this.dragStart);
            cell.addEventListener('dragover', this.dragOver);
            cell.addEventListener('dragleave', this.dragLeave);
            cell.addEventListener('drop', this.drop);
            cell.addEventListener('dragend', this.dragEnd);
            cell.addEventListener('click', this.rotate);
        });
    }
    dragStart = (e) => {
        const target = e.target;
        const row = +target.getAttribute('data-row');
        const column = +target.getAttribute('data-column');
        const shipCell = this.shipCells.find(cell => cell.row === row && cell.column === column);
        if (shipCell) {
            e.dataTransfer.setData('text/plain', shipCell.shipId.toString());
            // Hide the ship at its old position
            this.shipCells.filter(cell => cell.shipId === shipCell.shipId)
                .forEach(cell => this.preemptiveBoard[cell.row][cell.column] = false);
            this.updateDisplay();
            // Hide the drag image
            const img = new Image();
            e.dataTransfer.setDragImage(img, 0, 0);
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
    dragOver = (e) => {
        e.preventDefault();
        const cells = document.querySelectorAll('.board-cell');
        cells.forEach(cell => cell.classList.remove('legal-move'));
        const target = e.target;
        const newRow = +target.getAttribute('data-row');
        const newColumn = +target.getAttribute('data-column');
        const data = e.dataTransfer?.getData('text/plain');
        const shipId = data ? +data : -1;
        if (shipId == -1) {
            return;
        }
        const ship = this.ships.find(ship => ship.id === shipId);
        if (ship && this.canPlaceShip(newRow, newColumn, ship.size, ship.orientation, shipId)) {
            for (let i = 0; i < ship.size; i++) {
                let cellRow = newRow;
                let cellColumn = newColumn;
                if (ship.orientation === 'horizontal') {
                    cellColumn += i;
                }
                else {
                    cellRow += i;
                }
                if (cellRow >= 0 && cellRow < 8 && cellColumn >= 0 && cellColumn < 8) {
                    const cell = cells[cellRow * 8 + cellColumn];
                    cell.classList.add('legal-move');
                }
            }
        }
    };
    dragLeave = (e) => {
        const target = e.target;
        target.classList.remove('legal-move');
    };
    dragEnd = (e) => {
        const cells = document.querySelectorAll('.board-cell');
        cells.forEach((cell) => {
            cell.classList.remove('legal-move');
        });
        const data = e.dataTransfer?.getData('text/plain');
        console.log('dragend');
        console.log(data);
        const shipId = data ? +data : -1;
        const ship = this.ships.find(ship => ship.id === shipId);
        if (!ship)
            return;
        // Check if the ship was dropped in a legal position
        const target = e.target;
        const newRow = +target.getAttribute('data-row');
        const newColumn = +target.getAttribute('data-column');
        if (this.canPlaceShip(newRow, newColumn, ship.size, ship.orientation, shipId)) {
            const shipCells = this.shipCells.filter(cell => cell.shipId === shipId);
            if (shipCells.length > 0) {
                shipCells.forEach(cell => {
                    this.preemptiveBoard[cell.row][cell.column] = true;
                });
                this.updateDisplay();
            }
        }
    };
    drop = (e) => {
        e.preventDefault();
        const target = e.target;
        const newRow = +target.getAttribute('data-row');
        const newColumn = +target.getAttribute('data-column');
        const data = e.dataTransfer?.getData('text/plain');
        console.log('drop');
        console.log(data);
        const shipId = data ? +data : -1;
        console.log(shipId);
        // Check if the dragged item is actually a ship
        if (shipId < 0) {
            return; // exit the function if the dragged item is not a ship
        }
        const ship = this.ships.find(ship => ship.id === shipId);
        if (!ship)
            return;
        // Check if new placement is valid
        if (this.canPlaceShip(newRow, newColumn, ship.size, ship.orientation, shipId)) {
            const shipCells = this.shipCells.filter(cell => cell.shipId === shipId);
            if (shipCells.length > 0) {
                shipCells[0].row = newRow;
                shipCells[0].column = newColumn;
            }
            this.updateShipCells(ship);
            this.updateDisplay();
        }
        else {
            // The ship was removed from its original place, add it back
            this.updateShipCells(ship);
            this.updateDisplay();
        }
        ;
    };
    rotate = (e) => {
        const target = e.target;
        const rowAttr = target.getAttribute('data-row');
        const columnAttr = target.getAttribute('data-column');
        if (rowAttr !== null && columnAttr !== null) {
            const row = +rowAttr;
            const column = +columnAttr;
            const shipCell = this.shipCells.find(cell => cell.row === row && cell.column === column);
            if (shipCell) {
                const ship = this.ships.find(ship => ship.id === shipCell.shipId);
                if (!ship)
                    return;
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
    updateShipCells(ship) {
        const shipCells = this.shipCells.filter(cell => cell.shipId === ship.id);
        if (shipCells.length > 0) {
            // First, clear the old cells from preemptiveBoard
            for (let cell of shipCells) {
                this.preemptiveBoard[cell.row][cell.column] = false;
            }
            const firstCell = shipCells[0];
            for (let i = 0; i < ship.size; i++) {
                let cellRow = firstCell.row;
                let cellColumn = firstCell.column;
                if (ship.orientation === 'horizontal') {
                    cellColumn += i;
                }
                else {
                    cellRow += i;
                }
                if (i < shipCells.length) {
                    shipCells[i].row = cellRow;
                    shipCells[i].column = cellColumn;
                    this.preemptiveBoard[cellRow][cellColumn] = true;
                }
            }
        }
    }
    lockBoard() {
        this.locked = true;
    }
    updateBoard(board) {
        // Here you can update your board using the data received through socket
        // or by calculating the new state based on the current state of the game.
        // This will be dependent on the game logic
    }
}

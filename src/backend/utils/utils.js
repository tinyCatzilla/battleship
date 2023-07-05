// src/backend/utils/utils.ts
export function printBoard(board) {
    console.log('\n   0 1 2 3 4 5 6 7');
    for (let i = 0; i < board.length; i++) {
        let rowString = `${i}  `;
        for (let j = 0; j < board[i].length; j++) {
            const cell = board[i][j];
            if (cell.isHit) {
                rowString += 'X ';
            }
            else if (cell.hasShip) {
                rowString += 'S ';
            }
            else {
                rowString += '- ';
            }
        }
        console.log(rowString);
    }
}

import { Game } from "./game.js";
import io from 'socket.io-client';
const socket = io('http://localhost:3000');
function joinRoom() {
    socket.emit('joinGame');
}
function createRoom() {
    history.pushState({}, '', socket.id);
    socket.emit('createGame');
    const game = new Game(socket.id);
    game.render();
}
// //.. GAME CODE
// socket.emit('placeShips', gameId, playerBoard);
socket.on("boardUpdate", (board) => {
    // Game.updateBoard(daskldja, asdhkashd, hasdklajsh)
});
// document.addEventListener("DOMContentLoaded", () => {
//     const board = new Board();
//     board.render();
//     board.placeShips([{ size: 1, count: 3 }, { size: 2, count: 2 }, { size: 3, count: 1 }]);
// });
// let test = Game.updateBoard(test2)

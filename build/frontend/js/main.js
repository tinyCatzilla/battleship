import { Game } from "./game.js";
class GameClient {
    socket;
    gameId;
    playerNumber;
    game;
    username;
    constructor() {
        this.socket = new WebSocket("ws://localhost:3050");
        this.gameId = "";
        this.playerNumber = -1; // -1 indicates that the player number has not been set
        this.game = new Game(this.gameId, this.playerNumber);
        this.username = "";
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case 'totalPlayersUpdate':
                    const totalPlayersElement = document.getElementById("totalPlayers");
                    if (totalPlayersElement) {
                        totalPlayersElement.textContent = `Total Players: ${data.totalPlayers}`;
                    }
                    break;
                case 'playersReadyUpdate':
                    const playersReadyElement = document.getElementById("playersReady");
                    if (playersReadyElement) {
                        playersReadyElement.textContent = `Players Ready: ${data.playersReady}`;
                    }
                    break;
                // Handle other message types...
            }
        };
    }
    createRoom(username) {
        this.displayLobbyScreen();
        const gameId = Array.from({ length: 6 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
        history.pushState({}, '', `/${gameId}`);
        this.socket.send(JSON.stringify({ type: 'createGame', data: { gameId: gameId } }));
        this.gameId = gameId;
        this.playerNumber = 1; // The creator of the room will be player 1
        this.username = username;
        this.game = new Game(gameId, 1);
        this.game.render();
    }
    joinRoom(id, username) {
        this.displayLobbyScreen();
        // Send the join room request to the server
        this.socket.send(JSON.stringify({ type: 'joinGame', data: { gameId: id } }));
        // Set up a listener for the response from the server
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            // Check if the response type is for joining game and if the join was successful
            if (data.type === 'joinGame' && data.success === true) {
                history.pushState({}, '', `/game/${id}`);
                this.gameId = id;
                this.playerNumber = data.playerNumber; // use the player number sent by the server
                this.username = username;
                this.game = new Game(id, this.playerNumber);
                this.game.render();
            }
            else {
                // Handle the case where joining the game was not successful
                alert("Failed to join the game.");
            }
        };
    }
    leaveRoom() {
        this.displayTitleScreen();
        // Send the leave room request to the server
        this.socket.send(JSON.stringify({ type: 'leaveGame', data: { gameId: this.gameId } }));
        // Set up a listener for the response from the server
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log(data.type + " " + data.success);
            if (data.type === 'leaveGame' && data.success === true) {
                history.pushState({}, '', `/`);
                this.gameId = "";
                this.playerNumber = -1;
                this.lockConfirmPlacementButton();
                this.game.unrender();
                this.game = new Game(this.gameId, this.playerNumber);
            }
            else {
                // Handle the case where leaving the game was not successful
                alert("Failed to leave the game.");
            }
        };
    }
    confirmPlacement() {
        // Send a message to the backend indicating that the player has confirmed their placement
        this.socket.send(JSON.stringify({ type: "confirmPlacement", data: { gameId: this.gameId, player: this.playerNumber, shipCells: this.game.getShips().shipCells } }));
        // Set up a listener for the response from the server
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'confirmPlacement') {
                this.game.lockBoard();
                if (data.start == true) {
                    this.game.startGame();
                }
            }
            // else pass
        };
    }
    lockConfirmPlacementButton() {
        const confirmButton = document.getElementById("readyButton");
        confirmButton.disabled = true;
    }
    displayTitleScreen() {
        let titleScreen = document.querySelector(".titleScreen");
        titleScreen?.style.setProperty("display", "block");
        let lobbyScreen = document.querySelector(".lobbyScreen");
        lobbyScreen?.style.setProperty("display", "none");
    }
    displayLobbyScreen() {
        let titleScreen = document.querySelector(".titleScreen");
        titleScreen?.style.setProperty("display", "none");
        let lobbyScreen = document.querySelector(".lobbyScreen");
        lobbyScreen?.style.setProperty("display", "block");
    }
}
export function initializeApp() {
    const gameClient = new GameClient();
    const userInput = document.getElementById("username");
    const createRoomButton = document.querySelector("#createRoomButton");
    if (createRoomButton) {
        createRoomButton.addEventListener("click", () => gameClient.createRoom(userInput.value));
    }
    const joinRoomButton = document.querySelector("#joinRoomButton");
    const roomCodeInput = document.getElementById("roomCode");
    if (joinRoomButton && roomCodeInput) {
        joinRoomButton.addEventListener("click", () => gameClient.joinRoom(roomCodeInput.value, userInput.value));
    }
    const leaveRoomButton = document.querySelector("#leaveRoomButton");
    if (leaveRoomButton) {
        leaveRoomButton.addEventListener("click", () => gameClient.leaveRoom());
    }
    const confirmButton = document.querySelector("#confirmButton");
    if (confirmButton) {
        confirmButton.addEventListener("click", () => gameClient.confirmPlacement());
    }
}

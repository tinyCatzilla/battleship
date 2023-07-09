import { Game } from "./game.js";
import { Board } from './board.js';

class GameClient {
    socket: WebSocket;
    gameId: string;
    playerNumber: number;
    game: Game;
    username: string;
    usernames: string[];
    private playerBoard: Board;
    turn: number;

    constructor() {
        this.socket = new WebSocket("ws://localhost:3050");
        this.gameId = "";
        this.playerNumber = -1; // -1 indicates that the player number has not been set
        this.game = new Game(this.gameId, this.playerNumber);
        this.username = "";
        this.usernames = [];
        this.playerBoard = new Board();
        this.turn = -1;

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'usernameUpdate') {
                this.handleUsernameUpdate(data);
            }
            else if (data.type === 'joinGame'){
                if (data.success === true) {
                    history.pushState({}, '', `/${this.gameId}`);
                    this.playerNumber = data.playerNumber; // use the player number sent by the server
                    this.game = new Game(this.gameId, this.playerNumber);
                    this.render();
                    const lobbyCode = document.querySelector("#lobbyCode") as HTMLElement;
                    lobbyCode.textContent = `${this.gameId}`;
                } else {
                    // Handle the case where joining the game was not successful
                    alert("Failed to join the game.");
                }
            }
            else if (data.type === 'leaveGame') {
                if (data.success === true) {
                    history.pushState({}, '', `/`);
                    this.gameId = "";
                    this.playerNumber = -1;
                    this.unrender();
                    this.game = new Game(this.gameId, this.playerNumber);
                    this.displayTitleScreen();
                } else {
                    // Handle the case where leaving the game was not successful
                    alert("Failed to leave the game.");
                }
            }
            else if (data.type === 'confirmPlacement') {
                this.handleConfirmPlacement(data);
            }
            else if (data.type === 'startGame'){
                this.displayGameScreen();
                console.log(data.totalPlayers);
                this.game.totalPlayers = data.totalPlayers;
                this.game.playersLeft = data.totalPlayers;
                this.game.turn = data.turn;
                this.turn = data.turn;
                var playerTurn = document.querySelector("#playerTurn") as HTMLElement;
                playerTurn.textContent = `${this.usernames[this.turn-1][0]}`;
                this.game.startGame();
                console.log('all players ready, starting game');
            }
            else if (data.type === 'nextturn'){
                console.log('nextturn received');
                this.turn = data.opponentNumber;
                var playerTurn = document.querySelector("#playerTurn") as HTMLElement;
                playerTurn.textContent = `${this.usernames[this.turn-1][0]}`;
            }
        };
    }

    handleUsernameUpdate(data: any) {
        this.usernames = data.usernames;
        console.log('usernames:', this.usernames);
        this.updateUsers();
    }

    handleConfirmPlacement(data: any) {
        console.log('confirmPlacement response received');
        this.playerBoard.lockBoard();
        this.lockConfirmPlacementButton();
        console.log('board locked');
        const readyButton = document.querySelector("#readyButton") as HTMLElement; 
        readyButton.textContent = "Waiting for other players"; // set readybutton text to Waiting for other players
    
        readyButton.classList.add("btnGreenSelected"); // set readbutton to have class btnRedSelected
        readyButton.classList.remove("btnGreen"); // remove btnRed class from readybutton
    }

    createRoom(username: string) {
        if (username === "") {
            alert("Please enter a username.");
            return;
        }
        else {
            this.displayLobbyScreen();
            const gameId = Array.from({length: 6}, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
            history.pushState({}, '', `/${gameId}`);
            this.socket.send(JSON.stringify({type: 'createGame', data: {gameId: gameId, username: username}}));
            this.gameId = gameId;
            this.playerNumber = 1; // The creator of the room will be player 1
            this.username = username;
            this.game = new Game(this.gameId, this.playerNumber);
            this.render();
            const lobbyCode = document.querySelector("#lobbyCode") as HTMLElement;
            lobbyCode.textContent = `${gameId}`;
        }
    }
    
    joinRoom(id: string, username: string) {
        if (username === "") {
            alert("Please enter a username.");
            return;
        }
        // todo: check if room code meets format
        else {
            this.displayLobbyScreen();
            // Send the join room request to the server
            this.socket.send(JSON.stringify({type: 'joinGame', data: {gameId: id, username: username}}));
            this.username = username;
            this.gameId = id;
        }
    }
    
    leaveRoom() {
         // Send the leave room request to the server
        this.socket.send(JSON.stringify({ type: 'leaveGame', data: {gameId: this.gameId} }));
        this.unlockConfirmPlacementButton();
            // TODO IMPORTANT: PLAYER 1 LEAVING GAME
    }

    render() {
        this.playerBoard.render();
        this.playerBoard.placeInitialShips([{ size: 1, count: 3 }, { size: 2, count: 2 }, { size: 3, count: 1 }]);
    }

    unrender() {
        this.playerBoard.unrender();
    }

    updateUsers() {
        console.log('updateUsers called')
        const playerListDiv = document.querySelector(".playerList") as HTMLElement;
        playerListDiv.innerHTML = "";
        for (let i = 0; i < this.usernames.length; i++) {
            const playerDiv = document.createElement("div");
            playerDiv.classList.add("player");
            playerDiv.textContent = this.usernames[i][0];
            if (this.usernames[i][1] == "ready") {
                playerDiv.classList.remove("txtRed");
                playerDiv.classList.add("txtGreen");
            }
            else {
                playerDiv.classList.remove("txtGreen");
                playerDiv.classList.add("txtRed");
            }
            playerListDiv.appendChild(playerDiv);
        }
    }

    confirmPlacement() {
        // Send a message to the backend indicating that the player has confirmed their placement
        this.socket.send(JSON.stringify({ type: "confirmPlacement", data: { gameId: this.gameId, playerNumber: this.playerNumber, shipCells: this.playerBoard.getShips.shipCells} }));
    }


    lockConfirmPlacementButton() {
        const confirmButton = document.getElementById("readyButton") as HTMLButtonElement;
        confirmButton.disabled = true;
    }

    unlockConfirmPlacementButton() {
        const confirmButton = document.getElementById("readyButton") as HTMLButtonElement;
        confirmButton.disabled = false;
        const readyButton = document.querySelector("#readyButton") as HTMLElement; 
        readyButton.textContent = "Ready"; // set readybutton text to ready
        readyButton.classList.remove("btnGreenSelected"); // remove btnGreenSelected class from readybutton
        readyButton.classList.add("btnGreen"); // add btnGreen class to readybutton
    }

    displayTitleScreen() {
        let titleScreen = document.querySelector(".titleScreen") as HTMLElement;
        titleScreen?.style.setProperty("display", "block");
        let lobbyScreen = document.querySelector(".lobbyScreen") as HTMLElement;
        lobbyScreen?.style.setProperty("display", "none");
    }

    displayLobbyScreen() {
        let titleScreen = document.querySelector(".titleScreen") as HTMLElement;
        titleScreen?.style.setProperty("display", "none");
        let lobbyScreen = document.querySelector(".lobbyScreen") as HTMLElement;
        lobbyScreen?.style.setProperty("display", "flex");
    }

    displayGameScreen() {
        let lobbyScreen = document.querySelector(".lobbyScreen") as HTMLElement;
        lobbyScreen?.style.setProperty("display", "none");
        let gameScreen = document.querySelector(".gameScreen") as HTMLElement;
        gameScreen?.style.setProperty("display", "flex");
    }
}

export function initializeApp() {
    const gameClient = new GameClient();
    const userInput = document.getElementById("username") as HTMLInputElement;

    const createRoomButton = document.querySelector("#createRoomButton");
    if (createRoomButton) {
        createRoomButton.addEventListener("click", () => gameClient.createRoom(userInput.value));
    }

    const joinRoomButton = document.querySelector("#joinRoomButton");
    const roomCodeInput = document.getElementById("roomCode") as HTMLInputElement;
    if (joinRoomButton) {
        joinRoomButton.addEventListener("click", () => gameClient.joinRoom(roomCodeInput.value, userInput.value));
    }
    
    const leaveRoomButton = document.querySelector("#leaveRoomButton");
    if (leaveRoomButton) {
        leaveRoomButton.addEventListener("click", () => gameClient.leaveRoom());
    }

    const confirmButton = document.querySelector("#readyButton");
    if (confirmButton) {
        confirmButton.addEventListener("click", () => gameClient.confirmPlacement());
    }
}

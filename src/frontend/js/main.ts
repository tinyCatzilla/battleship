import { Game } from "./game.js";

class GameClient {
    socket: WebSocket;
    gameId: string;
    playerNumber: number;
    game: Game;
    username: string;
    usernames: string[];

    constructor() {
        this.socket = new WebSocket("ws://localhost:3050");
        this.gameId = "";
        this.playerNumber = -1; // -1 indicates that the player number has not been set
        this.game = new Game(this.gameId, this.playerNumber);
        this.username = "";
        this.usernames = [];

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
            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'createGame') {
                    this.usernames = data.usernames;
                    console.log('usernames:', this.usernames);
                    this.updateUsers();
                }
            };
            this.game = new Game(gameId, 1);
            this.game.render();
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
            // Set up a listener for the response from the server
            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                // Check if the response type is for joining game and if the join was successful
                if (data.type === 'joinGame' && data.success === true) {
                    history.pushState({}, '', `/game/${id}`);
                    this.gameId = id;
                    this.playerNumber = data.playerNumber; // use the player number sent by the server
                    this.username = username;
                    this.usernames = data.usernames;
                    console.log('usernames:', this.usernames);
                    this.updateUsers();
                    this.game = new Game(id, this.playerNumber);
                    this.game.render();
                    const lobbyCode = document.querySelector("#lobbyCode") as HTMLElement;
                    lobbyCode.textContent = `${id}`;
                } else {
                    // Handle the case where joining the game was not successful
                    alert("Failed to join the game.");
                }
            };
        }
    }
    
    leaveRoom() {
         // Send the leave room request to the server
        this.socket.send(JSON.stringify({ type: 'leaveGame', data: {gameId: this.gameId} }));

        // Set up a listener for the response from the server
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'leaveGame' && data.success === true) {
                history.pushState({}, '', `/`);
                this.gameId = "";
                this.playerNumber = -1;
                this.game.unrender();
                this.game = new Game(this.gameId, this.playerNumber);
                this.displayTitleScreen();
            } else {
                // Handle the case where leaving the game was not successful
                alert("Failed to leave the game.");
            }
            // TODO IMPORTANT: PLAYER 1 LEAVING
        };
    }

    updateUsers() {
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
        this.socket.send(JSON.stringify({ type: "confirmPlacement", data: { gameId: this.gameId, playerNumber: this.playerNumber, shipCells: this.game.getShips().shipCells} }));
        // Set up a listener for the response from the server
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'confirmPlacement') {
                this.game.lockBoard();
                this.lockConfirmPlacementButton();
                console.log('board locked')

                const readyButton = document.querySelector("#readyButton") as HTMLElement; 
                readyButton.textContent = "Waiting for other players"; // set readybutton text to Waiting for other players
                
                readyButton.classList.add("btnGreenSelected"); // set readbutton to have class btnRedSelected
                readyButton.classList.remove("btnGreen"); // remove btnRed class from readybutton

                if (data.start == true){
                    this.game.startGame();
                    console.log('all players ready, starting game')
                }
            }
            // else pass
        };
    }


    lockConfirmPlacementButton() {
        const confirmButton = document.getElementById("readyButton") as HTMLButtonElement;
        confirmButton.disabled = true;
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

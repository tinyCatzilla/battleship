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
    started: boolean;

    constructor() {
        this.socket = new WebSocket('wss://shipbackend.catzilla.me');
        this.gameId = "";
        this.playerNumber = -1; // -1 indicates that the player number has not been set
        this.game = new Game(this.gameId, this.playerNumber);
        this.username = "";
        this.usernames = [];
        this.playerBoard = new Board();
        this.turn = -1;
        this.started = false;

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'usernameUpdate') {
                this.handleUsernameUpdate(data);
            }
            else if (data.type === 'joinGame'){
                if (data.success === true) {
                    this.displayLobbyScreen();
                    history.pushState({}, '', `/${this.gameId}`);
                    this.playerNumber = data.playerNumber; // use the player number sent by the server
                    this.game = new Game(this.gameId, this.playerNumber);
                    this.render();
                    const lobbyCode = document.querySelector("#lobbyCode") as HTMLElement;
                    lobbyCode.textContent = `${this.gameId}`;
                } else {
                    // Handle the case where joining the game was not successful
                    alert("Failed to join the game, game already started.");
                }
            }
            else if (data.type === 'leaveGame') {
                this.handleLeaveGame(data);
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
                this.game.usernames = this.usernames;
                this.started = true;
                this.game.started = true;
                this.turn = data.turn;
                this.game.startGame(this.playerBoard);
                console.log('all players ready, starting game');
            }
            else if (data.type === 'nextturn'){
                console.log('nextturn received');
                this.turn = data.opponentNumber;
            }
            else if (data.type === 'chat') {
                console.log('chat received');
                const chatDivs = document.querySelectorAll(".chat");
                for (let chatDiv of chatDivs) {
                    const messagesDiv = chatDiv.querySelector(".chatMessages");
            
                    const nameSpan = document.createElement("span");
                    nameSpan.classList.add("chatName");
                    nameSpan.textContent = data.username + ": ";
            
                    let messageElement = document.createElement("p");
                    messageElement.classList.add("chatMessage");
                    messageElement.appendChild(nameSpan);
            
                    const textNode = document.createTextNode(data.message); // Safely create a text node for the message
                    messageElement.appendChild(textNode);
            
                    if (messagesDiv) messagesDiv.appendChild(messageElement);
                }
            }            
            else if (data.type === 'chatAlert') {
                console.log('chat alert received');
                const chatDivs = document.querySelectorAll(".chat");
                for (let chatDiv of chatDivs) {
                    const messagesDiv = chatDiv.querySelector(".chatMessages");

                    let messageElement = document.createElement("span");
                    messageElement.classList.add("chatMessage");
                    messageElement.classList.add(data.color);
                    messageElement.innerHTML += data.message;
                    
                    if (messagesDiv) messagesDiv.appendChild(messageElement);
                }
            }
            else if (data.type === 'error'){
                alert(data.message);
            }
        };
    }

    handleUsernameUpdate(data: any) {
        this.usernames = data.usernames;
        console.log('usernames:', this.usernames);
        this.updateUsers();
    }

    handleLeaveGame(data: any) {
        if (data.playerNumber === this.playerNumber){
            if (data.success === true) {
                history.pushState({}, '', `/`);
                this.gameId = "";
                this.playerNumber = -1;
                this.unrender();
                this.game = new Game(this.gameId, this.playerNumber);
                this.displayTitleScreen();
                this.unlockConfirmPlacementButton();
                this.playerBoard.unlockBoard();
                const playerBoard = document.querySelector(".playerBoard") as HTMLElement;
                if (playerBoard) playerBoard.innerHTML = '';
                
                const attackerBoard = document.querySelector(".attackerBoard") as HTMLElement;
                if (attackerBoard) attackerBoard.innerHTML = '';
                
                const boardGrid = document.querySelector(".boardGrid") as HTMLElement;
                if (boardGrid) boardGrid.innerHTML = '';

                const activeBoard = document.querySelector(".activeBoard") as HTMLElement;
                if (activeBoard) activeBoard.innerHTML = '';

                const chats = document.querySelectorAll(".chat");
                for (let chat of chats) {
                    if (chat.parentElement?.classList.contains("lobbyMain")) { // if chat's parent is lobbyMain, get chatMessages div
                        const chatMessages = chat.querySelector(".chatMessages") as HTMLElement;
                        chatMessages.innerHTML = '';
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
            } else {
                // Handle the case where leaving the game was not successful
                alert("Failed to leave the game.");
            }
        }
        else {
            if (data.playerNumber < this.playerNumber && data.success === true && this.started === false) {
                this.playerNumber -= 1;
                this.game.myPlayerNumber -= 1;
            }
        }
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
            // Send the join room request to the server
            this.socket.send(JSON.stringify({type: 'joinGame', data: {gameId: id, username: username}}));
            this.username = username;
            this.gameId = id;
        }
    }
    
    leaveRoom() {
        // Send the leave room request to the server
        this.socket.send(JSON.stringify({ type: 'leaveGame', data: {gameId: this.gameId, playerNumber: this.playerNumber, isReady: this.usernames[this.playerNumber-1][1]} }))
    }


    render() {
        this.playerBoard.render();
        this.playerBoard.placeInitialShips([{ size: 1, count: 3 }, { size: 2, count: 2 }, { size: 3, count: 1 }]);
    }

    unrender() {
        this.playerBoard.unrender();
        this.playerBoard = new Board();
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

    sendMessage(message: string) {
        this.socket.send(JSON.stringify({type: 'chat', data: {gameId: this.gameId, username: this.username, message: message }}));
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
        const winScreen = document.querySelector(".winScreen") as HTMLElement;
        winScreen?.style.setProperty("display", "none");
        let gameScreen = document.querySelector(".gameScreen") as HTMLElement;
        gameScreen?.style.setProperty("display", "none");
        const leaveRoomButton = document.querySelector("#leaveRoomButton") as HTMLElement;
        leaveRoomButton?.style.setProperty("display", "none");
    }

    displayLobbyScreen() {
        let titleScreen = document.querySelector(".titleScreen") as HTMLElement;
        titleScreen?.style.setProperty("display", "none");
        const winScreen = document.querySelector(".winScreen") as HTMLElement;
        winScreen?.style.setProperty("display", "none");
        let lobbyScreen = document.querySelector(".lobbyScreen") as HTMLElement;
        lobbyScreen?.style.setProperty("display", "flex");
        const leaveRoomButton = document.querySelector("#leaveRoomButton") as HTMLElement;
        leaveRoomButton?.style.setProperty("display", "block");
    }

    displayGameScreen() {
        let gameScreen = document.querySelector(".gameScreen") as HTMLElement;
        gameScreen?.style.setProperty("display", "flex");

        const chat = document.querySelector(".chat") as HTMLElement;
        const gameMain = document.querySelector(".gameMain") as HTMLElement;
        this.cloneChat(chat, gameMain);

        let lobbyScreen = document.querySelector(".lobbyScreen") as HTMLElement;
        lobbyScreen?.style.setProperty("display", "none");

    }

    displayWinScreen() {

    }

    displayLoseScreen() {

    }

    // const clone = smallBoard.cloneNode(true) as HTMLElement;
    //                         clone.classList.remove("small-board");
    //                         clone.classList.add("defeated-board");
    //                         smallBoard.parentNode?.replaceChild(clone, smallBoard);

    cloneChat(chat: HTMLElement, toNext: HTMLElement) {
        const chatClone = chat.cloneNode(true);
        toNext.appendChild(chatClone);
        // chat.remove(); // delete the chat from the previous screen
        const chatInput = toNext.querySelector("#chatInput") as HTMLInputElement;
        if (chatInput) {
            chatInput.addEventListener("keypress", (event: KeyboardEvent) => {
                if (event.key === "Enter") {
                    this.sendMessage(chatInput.value);
                    chatInput.value = ""; // Clear the input field
                }
            });
        }
    }
}

function checkServerStatus() {
    console.log('checkServerStatus called')
    fetch('https://shipbackend.catzilla.me')
        .then(response => response.text())
        .then(text => {
            console.log(text)
            if (text === 'Battleship Game Server is running!') {
                // Server is running fine. Handle accordingly.
            } else {
                // Unexpected response. Server might be having issues.
                notifyUserServerDown();
            }
        })
        .catch(error => {
            // Error might mean the server is down or unreachable.
            notifyUserServerDown();
        });
}

function notifyUserServerDown() {
    // Display an alert, modal, banner, etc. to inform the user.
    alert('Server is currently down. Please try again later.');
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

    const chatInput = document.querySelector<HTMLInputElement>("#chatInput");
    if (chatInput) {
        chatInput.addEventListener("keypress", (event: KeyboardEvent) => {
            if (event.key === "Enter") {
                gameClient.sendMessage(chatInput.value);
                chatInput.value = ""; // Clear the input field
            }
        });
    }

    const logo = document.querySelector(".logo") as HTMLElement;
    if (logo) {
        logo.addEventListener("click", () => {if(gameClient.gameId != "") gameClient.leaveRoom()});
    }

    // window.addEventListener("beforeunload", function (e) {
    //     console.log("beforeunload window :(");
    //     e.preventDefault();
    //     return 'please Leave any games before going - it may cause issues for the other players :(';
    // });
    
    window.addEventListener("unload", function (e) {
        console.log("unloading window :(");
        if (gameClient.gameId != "") gameClient.leaveRoom();
    });

    // Set an interval to check the server status every 30 seconds.
    setInterval(checkServerStatus, 30000);

    checkServerStatus();
}

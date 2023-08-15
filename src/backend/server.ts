import express, { Request, Response } from 'express';
import gameRoutes from './gameRoutes.js';
import { GameService } from './gameService.js';
import config from '../config/appConfig.js';
import { WebSocketServer } from 'ws';
import http from 'http';
import WS from 'ws';
import cors from 'cors';

import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

// Initialize express app
const app = express();

const allowedOrigins = ['https://catleship.catzilla.me'];

const corsOptions: cors.CorsOptions = {
  origin: (origin:any, callback:any) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin.`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
};

// Use the CORS middleware with the provided options
app.use(cors(corsOptions));

// Middleware to parse JSON
app.use(express.json());

// Register game routes
app.use('/api', gameRoutes);    

// Simple route for testing if the server is running
app.get('/', (req: Request, res: Response) => {
    res.send('Battleship Game Server is running!');
});

// Initialize WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
var service = new GameService;
const gameClients = new Map<string, WS[]>();
const games = new Map<string, WS[]>();

wss.on('connection', (ws: WS) => {
    let currentGameId: string | null = null;
    ws.on('message', (message) => {
        const messageString = message.toString();
        if (typeof messageString === 'string') {
            const { type, data } = JSON.parse(messageString);
            handleGameAction(type, data, ws);
            function handleGameAction(type: string, data: any, ws: WS) {
                switch (type) {
                    case 'createGame':
                        service.createGame(data.gameId, data.username);
                        addToGameClients(data.gameId, ws);
                        console.log(service.usernames.get(data.gameId));
                        ws.send(JSON.stringify({ type: 'usernameUpdate', usernames: service.usernames.get(data.gameId) }));
                        console.log('username update', data.gameId);
                        console.log('Game created:', data.gameId);

                        const usernameStarted = service.usernames.get(data.gameId)![0][0];
                        broadcast(data.gameId,{ type: 'chatAlert', color: "txtYellow", message: usernameStarted + " joined the game." });

                        break;
                    case 'joinGame':
                        const joinResult = service.joinGame(data.gameId, data.username);
                        const usernames = service.usernames.get(data.gameId);
                        console.log(service.usernames.get(data.gameId));
                        if (joinResult.status === 'error') {
                            // The fire function could not be executed successfully. Respond accordingly.
                            ws.send(JSON.stringify({ type: 'error', message: joinResult.message }));
                            console.log('sent error to client');
                        }
                        ws.send(JSON.stringify({ type: 'joinGame', success: joinResult.success, playerNumber: joinResult.playerNumber}));
                        if (joinResult.success) {
                            addToGameClients(data.gameId, ws);
                            console.log('Joined game:', data.gameId);
                        }
                        broadcast(data.gameId,{ type: 'usernameUpdate', usernames: usernames });
                        console.log('username update', data.gameId);

                        if (usernames) {
                            let usernameJoined = usernames[joinResult.playerNumber! - 1][0];
                            broadcast(data.gameId,{ type: 'chatAlert', color: "txtYellow", message: usernameJoined + " has joined the game." });
                        }
                        break;
                    case 'leaveGame':
                        console.log('leaveGame data:', data);

                        const usernameLeft = service.usernames.get(data.gameId)![data.playerNumber - 1][0];
                        broadcast(data.gameId,{ type: 'chatAlert', color: "txtRed", message: usernameLeft + " has left the game." });

                        const leaveResult = service.leaveGame(data.gameId, data.playerNumber, data.isReady);
                        if (leaveResult.status === 'error') {
                            // The fire function could not be executed successfully. Respond accordingly.
                            ws.send(JSON.stringify({ type: 'error', message: leaveResult.message }));
                            console.log('sent error to client');
                            break;
                        }
                        console.log('leaveGame result:', leaveResult);
                        if (leaveResult.justStarted){
                            const startGame = service.startGame(data.gameId);
                            const totalPlayers = service.getTotalPlayers(data.gameId);
                            broadcast(data.gameId,{ type: 'startGame', totalPlayers: totalPlayers, turn: startGame.turn});
                            console.log('startGame for client in', data.gameId);
                        }
                        else if (leaveResult.started){
                            console.log('broadcast leaveGame to game:', data.gameId)
                            broadcastToGame(data.gameId,{ type: 'leaveGame', success: leaveResult.success, playerNumber: data.playerNumber });
                        } 
                        broadcast(data.gameId, { type: 'leaveGame', success: leaveResult.success, playerNumber: data.playerNumber });
                        broadcast(data.gameId,{ type: 'usernameUpdate', usernames: leaveResult.usernames });
                        if (leaveResult.totalPlayers != 0){
                            console.log('Left game:', data.gameId);
                            removeFromGameClients(data.gameId, ws);
                            if (leaveResult.started){
                                removeFromGame(data.gameId, ws);
                            }
                        }
                        if (leaveResult.totalPlayers === 0){
                            console.log('Game deleted:', data.gameId);
                            gameClients.delete(data.gameId);
                            games.delete(data.gameId);
                        }
                        break;
                    case 'confirmPlacement':
                        const confirmPlacement = service.confirmPlacement(data.gameId, data.playerNumber, data.shipCells);
                        console.log('confirmPlacement result:', confirmPlacement);
                        // Broadcast the result to all clients in the game (attempting)
                        ws.send(JSON.stringify({ type: 'confirmPlacement'}));
                        broadcast(data.gameId,{ type: 'usernameUpdate', usernames: confirmPlacement.usernames });
                        console.log('username update', data.gameId);
                        if (confirmPlacement.start){
                            const startGame = service.startGame(data.gameId);
                            const totalPlayers = service.getTotalPlayers(data.gameId);
                            broadcast(data.gameId,{ type: 'startGame', totalPlayers: totalPlayers, turn: startGame.turn});
                            console.log('startGame for client in', data.gameId);
                        }
                        console.log('confirmPlacement', data.gameId);
                        const usernameReady = service.usernames.get(data.gameId)![data.playerNumber - 1][0];
                        broadcast(data.gameId,{ type: 'chatAlert', color: "txtGreen", message: usernameReady + " is ready." });
                        break;
                    case 'initGame':
                        addToGame(data.gameId, ws);
                        break;
                    case 'fire':
                        console.log('fire data:', data);
                        // Assuming data is { gameId, opponentNumber, cell }
                        const fireResult = service.fire(data.gameId, data.opponentNumber, data.row, data.column);
                        console.log('fire result:', fireResult);
                        if (fireResult.status === 'error') {
                            // The fire function could not be executed successfully. Respond accordingly.
                            ws.send(JSON.stringify({ type: 'error', message: fireResult.message }));
                            console.log('sent error to client');
                        } else {
                            broadcastToGame(data.gameId,{
                                type: 'fire',
                                playerNumber: data.playerNumber,
                                opponentNumber: data.opponentNumber,
                                row: data.row,
                                column: data.column,
                                hit: fireResult.hit,
                                sunk: fireResult.sunk,
                                sunkShipCells: fireResult.sunkShipCells,
                                gameOver: fireResult.gameOver 
                            });
                            if (fireResult.hit === false){
                                broadcast(data.gameId,{ type: 'nextturn', opponentNumber: data.opponentNumber});
                            }
                            console.log('fire broadcasted to game:', data.gameId);

                            const attackerUsername = service.usernames.get(data.gameId)![data.playerNumber - 1][0];
                            const defenderUsername = service.usernames.get(data.gameId)![data.opponentNumber - 1][0];
                            let hit;
                            if (fireResult.sunk === true){
                                hit = " sunk ";
                            }
                            else if (fireResult.hit === true){
                                hit = " hit ";
                            } 
                            else {
                                hit = " missed ";
                            }
                            broadcast(data.gameId,{ type: 'chatAlert', color: "txtYellow", message: attackerUsername + hit + defenderUsername + "'s ship!" });
                        }
                        break;
                    case 'selectBoard':
                        console.log('selectBoard data:', data);
                        broadcastToGame(data.gameId,{ type: 'selectBoard', boardId: data.boardId});
                        break;
                    case 'backToGrid':
                        console.log('backToGrid data:', data);
                        broadcastToGame(data.gameId,{ type: 'backToGrid'});
                        break;
                    case 'chat':
                        console.log('chat data:', data);
                        const window = new JSDOM('').window;
                        const purify = DOMPurify(window);
                        const clean = purify.sanitize(data.message);

                        const escapedMessage = escapeHtml(clean);

                        broadcast(data.gameId,{ type: 'chat', username: data.username, message: escapedMessage });
                        break;
                    case 'stop':
                        console.log('stopping game:', data);
                        break;
                    case 'gameOver':
                        console.log('gameOver data:', data);
                        const opponentUsername = service.usernames.get(data.gameId)![data.opponentNumber - 1][0];
                        broadcast(data.gameId,{ type: 'chatAlert', color: "txtYellow", message: opponentUsername + " has no ships left!" });
                        break;
                }
            }
        }
    });
    ws.on('close', () => {
    });
    function escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
    
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }    

    function broadcast(gameId: string, message: any) {
        const clients = gameClients.get(gameId) || [];
        clients.forEach((client: WS) => {
            if (client.readyState === WS.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }

    function addToGameClients(gameId: string, client: WS) {
        let clients = gameClients.get(gameId);
        if (!clients) {
            clients = [client];
            gameClients.set(gameId, clients);
            console.log('First client initialized in gameClient', gameId);
        }
        else {
            clients.push(client);
            console.log('Client added to gameClient:', gameId);
        }
        console.log('Number of clients in gameClients:', gameId, clients.length);
    }

    function removeFromGameClients(gameId: string, client: WS) {
        let clients = gameClients.get(gameId);
        if (clients) {
            clients = clients.filter(c => c !== client);
            gameClients.set(gameId, clients);
            console.log('Client removed from gameClient:', gameId);
        }
        console.log('Number of clients in gameclient:', gameId, clients?.length);
    }

    function broadcastToGame(gameId: string, message: any) {
        const clients = games.get(gameId) || [];
        clients.forEach((client: WS) => {
            if (client.readyState === WS.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }

    function addToGame(gameId: string, client: WS) {
        let game = games.get(gameId);
        if (!game) {
            game = [client];
            games.set(gameId, game);
            console.log('First client initialized in game', gameId);
        }
        else {
            game.push(client);
            console.log('Client added to game:', gameId);
        }
        console.log('Number of clients in game:', gameId, game.length);
    }

    function removeFromGame(gameId: string, client: WS) {
        let game = games.get(gameId);
        if (game) {
            game = game.filter(c => c !== client);
            games.set(gameId, game);
            console.log('Client removed from game:', gameId);
        }
        console.log('Number of clients in game:', gameId, game?.length);
    }
});


// Start the HTTP server
server.listen(config.PORT, () => {
    console.log(`Listening on port ${config.PORT}`);
});

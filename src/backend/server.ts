import express, { Request, Response } from 'express';
import gameRoutes from './routes/gameRoutes.js';
import { GameService } from './services/gameService.js';
import http from 'http';
import { WebSocketServer } from 'ws';
import WS from 'ws';

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

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
const games = new Map<string, any>();

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
                        break;
                    case 'joinGame':
                        const joinResult = service.joinGame(data.gameId, data.username);
                        const game = games.get(data.gameId);
                        const usernames = service.usernames.get(data.gameId);
                        console.log(service.usernames.get(data.gameId));
                        ws.send(JSON.stringify({ type: 'joinGame', success: joinResult.success, playerNumber: joinResult.playerNumber, game: game}));
                        if (joinResult.success) {
                            addToGameClients(data.gameId, ws);
                            console.log('Joined game:', data.gameId);
                        }
                        broadcast(data.gameId,{ type: 'usernameUpdate', usernames: usernames });
                        console.log('username update', data.gameId);
                        break;
                    case 'leaveGame':
                        const leaveResult = service.leaveGame(data.gameId, data.playerNumber);
                        // Remove the client from the gameClients map
                        ws.send(JSON.stringify({ type: 'leaveGame', success: leaveResult.success }));
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
                            ws.send(JSON.stringify({ type: 'fire',
                            opponentNumber: data.opponentNumber,
                            row: data.row,
                            column: data.column,
                            hit: fireResult.hit,
                            sunk: fireResult.sunk,
                            gameOver: fireResult.gameOver }));
                            console.log('sent fire result to client');
                        }
                        break;
                }
            }
        }
    });
    ws.on('close', () => {
        if (currentGameId) {
            const clients = gameClients.get(currentGameId);
            if (clients) {
                gameClients.set(currentGameId, clients.filter(client => client !== ws));
            }
        }
    });

    function broadcast(gameId: string, message: any) {
        const clients = gameClients.get(gameId) || [];
        console.log('Broadcasting to game:', gameId, 'Number of clients:', clients.length);
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
            console.log('First client initialized', gameId);
        }
        else {
            clients.push(client);
            console.log('Client added to game:', gameId);
        }
        console.log('Number of clients in game:', gameId, clients.length);
    }
});


// Start the HTTP server
server.listen(3050, () => {
    console.log('Listening on port 3050');
});

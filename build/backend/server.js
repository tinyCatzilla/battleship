import express from 'express';
import gameRoutes from './routes/gameRoutes.js';
import http from 'http';
import { Server } from 'socket.io';
import { Game } from './models/game.js';
// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;
// Middleware to parse JSON
app.use(express.json());
// Register game routes
app.use('/api', gameRoutes);
// Simple route for testing if the server is running
app.get('/', (req, res) => {
    res.send('Battleship Game Server is running!');
});
// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
// Initialize socket.io
const server = http.createServer(app);
const io = new Server(server);
var games = {};
io.on('connection', (socket) => {
    socket.on('createGame', () => {
        games[socket.id] = new Game(socket.id);
        socket.join(socket.id);
        console.log('Game created');
    });
    socket.on('joinGame', () => {
        if (games[socket.id]) {
            socket.join(socket.id);
            console.log('Game joined');
        }
    });
    socket.on('confirmPlacement', () => {
        const game = games[socket.id];
        if (!game) {
            return;
        }
        const player = game.player === socket.id ? 'player' : 'opponent';
        game.confirmPlacement(player);
    });
    socket.on('fire', (data) => {
        // Here you will process the 'fire' event and update the game state
        // When done, emit a 'boardUpdate' event with the necessary data
        socket.emit('boardUpdate', { /* your data here */});
    });
    socket.on('leaveGame', (data) => {
        // Here you can handle when a player leaves the game
    });
});
server.listen(3050, () => {
    console.log('Listening on port 3050');
});

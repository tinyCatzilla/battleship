"use strict";
// This function can be called when the 'Create Room' button is pressed.
function createRoom() {
    // This could be a POST request to your backend to create a new room.
    // You need to generate a unique room code for the players to share.
    // Here, I am just showing it for the purpose of example.
    fetch('/api/create-room', {
        method: 'POST'
    }).then(response => response.json())
        .then(data => {
        // Do something with the room code, e.g. display it to the user.
        const roomCode = data.roomCode;
        document.getElementById("roomCode").value = roomCode;
    });
}
// This function can be called when the 'Join Room' button is pressed.
function joinRoom() {
    const roomCode = document.getElementById("roomCode").value;
    // Join the room by sending the room code to your backend.
    // This could be a POST request to your backend.
    fetch('/api/join-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode })
    });
}
// This function can be called when the 'Confirm Placement' button is pressed.
function confirmPlacement() {
    // Gather information about placed ships.
    const ships = gatherShipPlacements();
    // Send the ship placements to your backend.
    fetch('/api/confirm-placement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ships })
    }).then(response => {
        if (response.ok) {
            // Disable the confirm button to prevent further changes.
            document.getElementById("confirmButton").disabled = true;
        }
    });
}
// Dummy function representing the gathering of ship placements.
function gatherShipPlacements() {
    // Collect the information about the ship placements here.
    // This should be based on how you have implemented ship placement in your game.
    return []; // Return array of ships.
}

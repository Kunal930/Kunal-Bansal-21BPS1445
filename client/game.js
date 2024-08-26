const boardElement = document.getElementById('board');
const winnerElement = document.getElementById('winner');
const historyElement = document.getElementById('history');

const boardSize = 5;
let currentPlayer = 'A';
let selectedCell = null;
let gameEnded = false;

// Initialize the WebSocket connection
const socket = new WebSocket('ws://localhost:3000');

// Initialize the game board
let board = [
    ['A-P1', 'A-P2', 'A-H1', 'A-H2', 'A-P3'],
    [null, null, null, null, null],
    [null, null, null, null, null],
    [null, null, null, null, null],
    ['B-P1', 'B-P2', 'B-H1', 'B-H2', 'B-P3']
];

// Create the board in the UI
function createBoard() {
    boardElement.innerHTML = '';
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.innerText = board[row][col] ? board[row][col] : '';
            cell.onclick = () => selectCell(row, col);
            boardElement.appendChild(cell);
        }
    }
}

// Handle cell selection
function selectCell(row, col) {
    if (gameEnded) return;

    const cellContent = board[row][col];
    if (cellContent && cellContent.startsWith(currentPlayer)) {
        selectedCell = { row, col, piece: cellContent };
        updateSelected();
        updateAvailableMoves(cellContent);
    } else {
        clearHighlights();
        selectedCell = null;
        updateSelected();
    }
}

// Update the UI for the selected cell
function updateSelected() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => cell.classList.remove('selected'));

    if (selectedCell) {
        const selectedCellElement = document.querySelector(`.cell[data-row="${selectedCell.row}"][data-col="${selectedCell.col}"]`);
        selectedCellElement.classList.add('selected');
    }
}

// Enable or disable move buttons and highlight available moves
function clearHighlights() {
    const buttons = document.querySelectorAll('.controls button');
    buttons.forEach(button => button.classList.remove('highlight'));
}

// Function to highlight possible move cells
function highlightMoves(moves, directionButtons) {
    clearHighlights();
    directionButtons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (moves.includes(buttonId)) {
            button.classList.add('highlight');
        }
    });
}

// Update available moves and highlight them
function updateAvailableMoves(piece) {
    let possibleMoves = [];
    let directionButtons = [];

    if (piece.includes('P')) {
        possibleMoves = getPossibleMoves(['L', 'R', 'F', 'B']);
        directionButtons = ['L', 'R', 'F', 'B'];
    } else if (piece.includes('H1')) {
        possibleMoves = getPossibleMoves(['L', 'R', 'F', 'B']);
        directionButtons = ['L', 'R', 'F', 'B'];
    } else if (piece.includes('H2')) {
        possibleMoves = getPossibleMoves(['FL', 'FR', 'BL', 'BR']);
        directionButtons = ['FL', 'FR', 'BL', 'BR'];
    }

    // Highlight the possible moves
    highlightMoves(possibleMoves, directionButtons);
}

// Function to get possible move positions
function getPossibleMoves(directions) {
    const { row, col } = selectedCell;
    let possibleMoves = [];

    const movement = {
        'L': { rowChange: 0, colChange: -1 },
        'R': { rowChange: 0, colChange: 1 },
        'B': { rowChange: currentPlayer === 'A' ? -1 : 1, colChange: 0 },
        'F': { rowChange: currentPlayer === 'A' ? 1 : -1, colChange: 0 },
        'FL': { rowChange: currentPlayer === 'A' ? -1 : 1, colChange: -1 },
        'FR': { rowChange: currentPlayer === 'A' ? -1 : 1, colChange: 1 },
        'BL': { rowChange: currentPlayer === 'A' ? 1 : -1, colChange: -1 },
        'BR': { rowChange: currentPlayer === 'A' ? 1 : -1, colChange: 1 },
    };

    let steps = selectedCell.piece.includes('P') ? 1 : 2;

    directions.forEach(direction => {
        let newRow = row;
        let newCol = col;
        
        for (let i = 0; i < steps; i++) {
            newRow += movement[direction].rowChange;
            newCol += movement[direction].colChange;

            if (newRow < 0 || newRow >= boardSize || newCol < 0 || newCol >= boardSize) {
                break;
            }

            if (board[newRow][newCol] && board[newRow][newCol].startsWith(currentPlayer)) {
                break;
            }

            possibleMoves.push(direction);

            if (board[newRow][newCol] && board[newRow][newCol].startsWith(opponent())) {
                break;
            }
        }
    });

    return possibleMoves;
}

// Move a piece based on direction
function movePiece(direction) {
    if (!selectedCell || gameEnded) return;

    const { row, col, piece } = selectedCell;
    let newRow = row, newCol = col;

    const movement = {
        'L': { rowChange: 0, colChange: -1 },
        'R': { rowChange: 0, colChange: 1 },
        'B': { rowChange: currentPlayer === 'A' ? -1 : 1, colChange: 0 },
        'F': { rowChange: currentPlayer === 'A' ? 1 : -1, colChange: 0 },
        'FL': { rowChange: currentPlayer === 'A' ? -1 : 1, colChange: -1 },
        'FR': { rowChange: currentPlayer === 'A' ? -1 : 1, colChange: 1 },
        'BL': { rowChange: currentPlayer === 'A' ? 1 : -1, colChange: -1 },
        'BR': { rowChange: currentPlayer === 'A' ? 1 : -1, colChange: 1 },
    };

    let steps = piece.includes('P') ? 1 : 2;
    let allowedDirections = piece.includes('P') ? ['L', 'R', 'F', 'B'] : piece.includes('H1') ? ['L', 'R', 'F', 'B'] : ['FL', 'FR', 'BL', 'BR'];
    
    if (!allowedDirections.includes(direction)) return;

    for (let i = 0; i < steps; i++) {
        newRow += movement[direction].rowChange;
        newCol += movement[direction].colChange;

        if (newRow < 0 || newRow >= boardSize || newCol < 0 || newCol >= boardSize) {
            return;
        }

        if (board[newRow][newCol] && board[newRow][newCol].startsWith(currentPlayer)) {
            return;
        }
    }

    const targetCell = board[newRow][newCol];
    if (targetCell && targetCell.startsWith(opponent())) {
        logMove(`${piece}:${direction} (Captured ${targetCell})`);
    } else {
        logMove(`${piece}:${direction}`);
    }

    board[row][col] = null;
    board[newRow][newCol] = piece;

    selectedCell = null;
    updateSelected();
    createBoard();
    checkWinCondition();
    changeTurn();

    // Send the move to the server
    socket.send(JSON.stringify({ action: 'update', data: { board, currentPlayer } }));
}

// Change the turn to the opponent
function changeTurn() {
    currentPlayer = opponent();
    if (!gameEnded) {
        document.title = `Current Player: ${currentPlayer}`;
    }
}

// Get the opponent player
function opponent() {
    return currentPlayer === 'A' ? 'B' : 'A';
}

// Log a move in the history section
function logMove(move) {
    const moveElement = document.createElement('div');
    moveElement.innerText = move;
    historyElement.appendChild(moveElement);
}

// Check if there is a win condition
function checkWinCondition() {
    const remainingOpponents = board.flat().filter(cell => cell && cell.startsWith(opponent()));
    if (remainingOpponents.length === 0) {
        gameEnded = true;
        winnerElement.innerText = `Player ${currentPlayer} wins!`;
        winnerElement.style.display = 'block';
        socket.send(JSON.stringify({ action: 'win', currentPlayer }));
    }
}

// Attach move functionality to buttons
document.getElementById('L').onclick = () => movePiece('L');
document.getElementById('R').onclick = () => movePiece('R');
document.getElementById('F').onclick = () => movePiece('F');
document.getElementById('B').onclick = () => movePiece('B');
document.getElementById('FL').onclick = () => movePiece('FL');
document.getElementById('FR').onclick = () => movePiece('FR');
document.getElementById('BL').onclick = () => movePiece('BL');
document.getElementById('BR').onclick = () => movePiece('BR');

// Handle messages from the server
socket.onmessage = (event) => {
    const { action, data } = JSON.parse(event.data);
    if (action === 'update') {
        board = data.board;
        currentPlayer = data.currentPlayer;
        gameEnded = false; // reset gameEnded based on server data
        createBoard();
        updateSelected();
    } else if (action === 'win') {
        gameEnded = true;
        winnerElement.innerText = `Player ${data.currentPlayer} wins!`;
        winnerElement.style.display = 'block';
    }
};

// Initialize the game board
createBoard();

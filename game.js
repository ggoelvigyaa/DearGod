/**
 * Go Game - Mobile & iPad Mini Friendly
 * A complete implementation of the ancient board game Go
 */

class GoGame {
    constructor() {
        // Game state
        this.boardSize = 19;
        this.board = [];
        this.currentPlayer = 'black';
        this.captures = { black: 0, white: 0 };
        this.history = [];
        this.koPoint = null;
        this.consecutivePasses = 0;
        this.gameOver = false;

        // Canvas elements
        this.canvas = document.getElementById('game-board');
        this.ctx = this.canvas.getContext('2d');

        // UI elements
        this.turnIndicator = document.getElementById('turn-indicator');
        this.blackCaptures = document.getElementById('black-captures');
        this.whiteCaptures = document.getElementById('white-captures');
        this.boardSizeSelect = document.getElementById('board-size');
        this.modal = document.getElementById('game-over-modal');

        // Bind methods
        this.handleClick = this.handleClick.bind(this);
        this.handleResize = this.handleResize.bind(this);

        // Initialize
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.newGame();
    }

    setupEventListeners() {
        // Canvas click/touch events
        this.canvas.addEventListener('click', this.handleClick);
        this.canvas.addEventListener('touchend', this.handleTouch.bind(this));

        // Prevent default touch behaviors on canvas
        this.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

        // Control buttons
        document.getElementById('pass-btn').addEventListener('click', () => this.pass());
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('resign-btn').addEventListener('click', () => this.resign());
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());
        document.getElementById('modal-close-btn').addEventListener('click', () => this.closeModal());

        // Board size change
        this.boardSizeSelect.addEventListener('change', (e) => {
            this.boardSize = parseInt(e.target.value);
            this.newGame();
        });

        // Window resize
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('orientationchange', () => {
            setTimeout(this.handleResize, 100);
        });
    }

    newGame() {
        this.board = Array(this.boardSize).fill(null).map(() => Array(this.boardSize).fill(null));
        this.currentPlayer = 'black';
        this.captures = { black: 0, white: 0 };
        this.history = [];
        this.koPoint = null;
        this.consecutivePasses = 0;
        this.gameOver = false;

        this.updateUI();
        this.handleResize();
        this.closeModal();
    }

    handleResize() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Use the smaller dimension to keep the board square
        const size = Math.min(containerWidth, containerHeight);

        // Set canvas size with device pixel ratio for crisp rendering
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.canvas.style.width = `${size}px`;
        this.canvas.style.height = `${size}px`;

        // Scale context for high DPI
        this.ctx.scale(dpr, dpr);

        // Store display size for calculations
        this.displaySize = size;

        this.draw();
    }

    handleClick(e) {
        if (this.gameOver) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.processInput(x, y);
    }

    handleTouch(e) {
        if (this.gameOver) return;
        e.preventDefault();

        if (e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            this.processInput(x, y);
        }
    }

    processInput(x, y) {
        const { gridX, gridY } = this.pixelToGrid(x, y);

        if (gridX >= 0 && gridX < this.boardSize && gridY >= 0 && gridY < this.boardSize) {
            this.placeStone(gridX, gridY);
        }
    }

    pixelToGrid(px, py) {
        const padding = this.displaySize * 0.04;
        const boardDrawSize = this.displaySize - (padding * 2);
        const cellSize = boardDrawSize / (this.boardSize - 1);

        const gridX = Math.round((px - padding) / cellSize);
        const gridY = Math.round((py - padding) / cellSize);

        return { gridX, gridY };
    }

    gridToPixel(gx, gy) {
        const padding = this.displaySize * 0.04;
        const boardDrawSize = this.displaySize - (padding * 2);
        const cellSize = boardDrawSize / (this.boardSize - 1);

        return {
            px: padding + gx * cellSize,
            py: padding + gy * cellSize
        };
    }

    placeStone(x, y) {
        // Check if position is empty
        if (this.board[y][x] !== null) return;

        // Check for ko
        if (this.koPoint && this.koPoint.x === x && this.koPoint.y === y) {
            this.showMessage("Ko rule: Can't play there");
            return;
        }

        // Save state for undo
        const previousState = {
            board: this.board.map(row => [...row]),
            captures: { ...this.captures },
            currentPlayer: this.currentPlayer,
            koPoint: this.koPoint,
            consecutivePasses: this.consecutivePasses
        };

        // Place the stone
        this.board[y][x] = this.currentPlayer;

        // Check for captures
        const opponent = this.currentPlayer === 'black' ? 'white' : 'black';
        const captured = this.captureStones(x, y, opponent);

        // Check for suicide (only if no captures were made)
        if (captured.length === 0 && !this.hasLiberties(x, y, this.currentPlayer)) {
            this.board[y][x] = null;
            this.showMessage("Suicide is not allowed");
            return;
        }

        // Handle ko
        this.koPoint = null;
        if (captured.length === 1) {
            // Check if this creates a ko situation
            const capturedStone = captured[0];
            // Temporarily place opponent stone to check
            this.board[capturedStone.y][capturedStone.x] = opponent;
            const wouldCapture = this.getDeadStones(capturedStone.x, capturedStone.y, this.currentPlayer);
            this.board[capturedStone.y][capturedStone.x] = null;

            if (wouldCapture.length === 1 && wouldCapture[0].x === x && wouldCapture[0].y === y) {
                this.koPoint = { x: capturedStone.x, y: capturedStone.y };
            }
        }

        // Update captures count
        this.captures[this.currentPlayer] += captured.length;

        // Save to history
        this.history.push(previousState);

        // Reset consecutive passes
        this.consecutivePasses = 0;

        // Switch player
        this.currentPlayer = opponent;

        this.updateUI();
        this.draw();
    }

    captureStones(x, y, color) {
        const captured = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (this.isValidPosition(nx, ny) && this.board[ny][nx] === color) {
                const deadStones = this.getDeadStones(nx, ny, color);
                if (deadStones.length > 0) {
                    for (const stone of deadStones) {
                        if (!captured.some(s => s.x === stone.x && s.y === stone.y)) {
                            captured.push(stone);
                            this.board[stone.y][stone.x] = null;
                        }
                    }
                }
            }
        }

        return captured;
    }

    getDeadStones(x, y, color) {
        if (!this.hasLiberties(x, y, color)) {
            return this.getGroup(x, y, color);
        }
        return [];
    }

    hasLiberties(x, y, color) {
        const visited = new Set();
        return this.checkLibertiesRecursive(x, y, color, visited);
    }

    checkLibertiesRecursive(x, y, color, visited) {
        const key = `${x},${y}`;
        if (visited.has(key)) return false;
        visited.add(key);

        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (!this.isValidPosition(nx, ny)) continue;

            const neighbor = this.board[ny][nx];

            // Empty space = liberty
            if (neighbor === null) return true;

            // Same color stone - check its liberties
            if (neighbor === color && !visited.has(`${nx},${ny}`)) {
                if (this.checkLibertiesRecursive(nx, ny, color, visited)) {
                    return true;
                }
            }
        }

        return false;
    }

    getGroup(x, y, color) {
        const group = [];
        const visited = new Set();
        this.getGroupRecursive(x, y, color, group, visited);
        return group;
    }

    getGroupRecursive(x, y, color, group, visited) {
        const key = `${x},${y}`;
        if (visited.has(key)) return;
        if (!this.isValidPosition(x, y)) return;
        if (this.board[y][x] !== color) return;

        visited.add(key);
        group.push({ x, y });

        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dx, dy] of directions) {
            this.getGroupRecursive(x + dx, y + dy, color, group, visited);
        }
    }

    isValidPosition(x, y) {
        return x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize;
    }

    pass() {
        if (this.gameOver) return;

        // Save state for undo
        this.history.push({
            board: this.board.map(row => [...row]),
            captures: { ...this.captures },
            currentPlayer: this.currentPlayer,
            koPoint: this.koPoint,
            consecutivePasses: this.consecutivePasses
        });

        this.consecutivePasses++;
        this.koPoint = null;

        if (this.consecutivePasses >= 2) {
            this.endGame();
        } else {
            this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
            this.updateUI();
        }
    }

    undo() {
        if (this.history.length === 0) return;

        const previousState = this.history.pop();
        this.board = previousState.board;
        this.captures = previousState.captures;
        this.currentPlayer = previousState.currentPlayer;
        this.koPoint = previousState.koPoint;
        this.consecutivePasses = previousState.consecutivePasses;
        this.gameOver = false;

        this.closeModal();
        this.updateUI();
        this.draw();
    }

    resign() {
        if (this.gameOver) return;

        const winner = this.currentPlayer === 'black' ? 'White' : 'Black';
        this.gameOver = true;
        this.showGameOver(`${winner} Wins!`, `${this.currentPlayer === 'black' ? 'Black' : 'White'} resigned.`);
    }

    endGame() {
        this.gameOver = true;
        const scores = this.calculateScore();

        let winner, message;
        if (scores.black > scores.white) {
            winner = 'Black Wins!';
            message = `Black wins by ${(scores.black - scores.white).toFixed(1)} points.`;
        } else if (scores.white > scores.black) {
            winner = 'White Wins!';
            message = `White wins by ${(scores.white - scores.black).toFixed(1)} points.`;
        } else {
            winner = 'Draw!';
            message = 'The game is tied.';
        }

        this.showGameOver(winner, message, scores);
    }

    calculateScore() {
        // Simple area scoring (Chinese rules style)
        // Territory + captures + living stones
        const territory = { black: 0, white: 0 };
        const visited = new Set();

        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (this.board[y][x] === null && !visited.has(`${x},${y}`)) {
                    const { area, owner } = this.getTerritory(x, y, visited);
                    if (owner) {
                        territory[owner] += area;
                    }
                }
            }
        }

        // Count stones on board
        let blackStones = 0;
        let whiteStones = 0;
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (this.board[y][x] === 'black') blackStones++;
                if (this.board[y][x] === 'white') whiteStones++;
            }
        }

        // Chinese scoring: territory + stones on board
        // Add komi (6.5 points to white for going second)
        const komi = 6.5;

        return {
            black: territory.black + blackStones,
            white: territory.white + whiteStones + komi
        };
    }

    getTerritory(startX, startY, visited) {
        const emptyPoints = [];
        const borders = new Set();
        const queue = [[startX, startY]];

        while (queue.length > 0) {
            const [x, y] = queue.shift();
            const key = `${x},${y}`;

            if (visited.has(key)) continue;
            if (!this.isValidPosition(x, y)) continue;

            const cell = this.board[y][x];

            if (cell === null) {
                visited.add(key);
                emptyPoints.push({ x, y });

                const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                for (const [dx, dy] of directions) {
                    queue.push([x + dx, y + dy]);
                }
            } else {
                borders.add(cell);
            }
        }

        // Determine owner
        let owner = null;
        if (borders.size === 1) {
            owner = borders.values().next().value;
        }

        return { area: emptyPoints.length, owner };
    }

    showGameOver(title, message, scores = null) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;

        if (scores) {
            document.getElementById('black-score').textContent = scores.black.toFixed(1);
            document.getElementById('white-score').textContent = scores.white.toFixed(1);
        } else {
            document.getElementById('black-score').textContent = '-';
            document.getElementById('white-score').textContent = '-';
        }

        this.modal.classList.remove('hidden');
    }

    closeModal() {
        this.modal.classList.add('hidden');
    }

    showMessage(msg) {
        // Brief visual feedback - could be enhanced with a toast notification
        console.log(msg);
    }

    updateUI() {
        this.turnIndicator.textContent = this.currentPlayer === 'black' ? "Black's Turn" : "White's Turn";
        this.blackCaptures.textContent = this.captures.black;
        this.whiteCaptures.textContent = this.captures.white;
    }

    draw() {
        if (!this.displaySize) return;

        const ctx = this.ctx;
        const size = this.displaySize;
        const padding = size * 0.04;
        const boardDrawSize = size - (padding * 2);
        const cellSize = boardDrawSize / (this.boardSize - 1);
        const stoneRadius = cellSize * 0.45;

        // Clear canvas
        ctx.clearRect(0, 0, size, size);

        // Draw board background
        ctx.fillStyle = '#dcb35c';
        ctx.fillRect(0, 0, size, size);

        // Draw wood grain texture (subtle)
        ctx.strokeStyle = 'rgba(139, 90, 43, 0.1)';
        ctx.lineWidth = 2;
        for (let i = 0; i < size; i += 8) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(size, i + Math.sin(i * 0.1) * 5);
            ctx.stroke();
        }

        // Draw grid lines
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 1;

        for (let i = 0; i < this.boardSize; i++) {
            const pos = padding + i * cellSize;

            // Vertical lines
            ctx.beginPath();
            ctx.moveTo(pos, padding);
            ctx.lineTo(pos, size - padding);
            ctx.stroke();

            // Horizontal lines
            ctx.beginPath();
            ctx.moveTo(padding, pos);
            ctx.lineTo(size - padding, pos);
            ctx.stroke();
        }

        // Draw star points (hoshi)
        this.drawStarPoints(ctx, padding, cellSize);

        // Draw stones
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (this.board[y][x]) {
                    this.drawStone(ctx, x, y, this.board[y][x], padding, cellSize, stoneRadius);
                }
            }
        }

        // Draw last move marker
        if (this.history.length > 0) {
            const lastState = this.history[this.history.length - 1];
            // Find the move by comparing boards
            for (let y = 0; y < this.boardSize; y++) {
                for (let x = 0; x < this.boardSize; x++) {
                    if (this.board[y][x] !== null && lastState.board[y][x] === null) {
                        const { px, py } = this.gridToPixel(x, y);
                        ctx.beginPath();
                        ctx.arc(px, py, stoneRadius * 0.3, 0, Math.PI * 2);
                        ctx.fillStyle = this.board[y][x] === 'black' ? '#ffffff' : '#000000';
                        ctx.fill();
                        break;
                    }
                }
            }
        }
    }

    drawStarPoints(ctx, padding, cellSize) {
        const starPoints = this.getStarPoints();
        const radius = cellSize * 0.12;

        ctx.fillStyle = '#2a2a2a';
        for (const [x, y] of starPoints) {
            const px = padding + x * cellSize;
            const py = padding + y * cellSize;

            ctx.beginPath();
            ctx.arc(px, py, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    getStarPoints() {
        if (this.boardSize === 9) {
            return [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]];
        } else if (this.boardSize === 13) {
            return [[3, 3], [9, 3], [6, 6], [3, 9], [9, 9]];
        } else if (this.boardSize === 19) {
            return [
                [3, 3], [9, 3], [15, 3],
                [3, 9], [9, 9], [15, 9],
                [3, 15], [9, 15], [15, 15]
            ];
        }
        return [];
    }

    drawStone(ctx, gx, gy, color, padding, cellSize, radius) {
        const px = padding + gx * cellSize;
        const py = padding + gy * cellSize;

        // Shadow
        ctx.beginPath();
        ctx.arc(px + 2, py + 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();

        // Stone gradient
        const gradient = ctx.createRadialGradient(
            px - radius * 0.3, py - radius * 0.3, radius * 0.1,
            px, py, radius
        );

        if (color === 'black') {
            gradient.addColorStop(0, '#4a4a4a');
            gradient.addColorStop(1, '#1a1a1a');
        } else {
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, '#d0d0d0');
        }

        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // White stone border
        if (color === 'white') {
            ctx.strokeStyle = '#b0b0b0';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new GoGame();
});

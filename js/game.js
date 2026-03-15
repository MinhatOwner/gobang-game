// 五子棋游戏逻辑

// 游戏配置
const BOARD_SIZE = 15;          // 棋盘大小 15x15
const CELL_SIZE = 40;           // 格子大小
const PADDING = 30;             // 棋盘边距
const PIECE_RADIUS = 16;        // 棋子半径

// 游戏状态
let board = [];                 // 棋盘数组：0=空, 1=黑, 2=白
let currentPlayer = 1;          // 当前执子：1=黑方, 2=白方
let gameOver = false;           // 游戏是否结束
let gameMode = 'pvp';           // 'pvp' 双人, 'pve' 人机
let aiDifficulty = 'medium';    // 'easy', 'medium', 'hard'
let aiThinking = false;         // AI是否正在思考
let canvas, ctx;
let gameHistory = [];           // 落子历史记录 [{row, col, player}, ...]

// DOM 元素
let currentPlayerEl, winnerDisplayEl;

// 初始化游戏
function init() {
    canvas = document.getElementById('board-canvas');
    ctx = canvas.getContext('2d');
    currentPlayerEl = document.getElementById('current-player');
    winnerDisplayEl = document.getElementById('winner-display');

    // 设置画布大小（支持高分屏）
    const boardSize = CELL_SIZE * (BOARD_SIZE - 1) + PADDING * 2;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = boardSize * dpr;
    canvas.height = boardSize * dpr;
    canvas.style.width = boardSize + 'px';
    canvas.style.height = boardSize + 'px';
    ctx.scale(dpr, dpr);

    // 绑定事件
    canvas.addEventListener('click', handleClick);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('undo-btn').addEventListener('click', undoGame);

    // 绑定模式选择事件
    const modeRadios = document.querySelectorAll('input[name="game-mode"]');
    modeRadios.forEach(radio => {
        radio.addEventListener('change', handleModeChange);
    });

    // 绑定难度选择事件
    document.getElementById('ai-difficulty').addEventListener('change', (e) => {
        aiDifficulty = e.target.value;
    });

    // 初始化棋盘
    restartGame();
}

// 处理游戏模式切换
function handleModeChange(e) {
    gameMode = e.target.value;
    const difficultyGroup = document.getElementById('difficulty-group');
    if (gameMode === 'pve') {
        difficultyGroup.style.display = 'flex';
    } else {
        difficultyGroup.style.display = 'none';
    }
    restartGame();
}

// 重新开始游戏
function restartGame() {
    // 重置棋盘数组
    board = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        board[i] = [];
        for (let j = 0; j < BOARD_SIZE; j++) {
            board[i][j] = 0;
        }
    }

    // 重置游戏状态
    currentPlayer = 1;
    gameOver = false;
    aiThinking = false;
    gameHistory = []; // 清空历史记录

    // 启用棋盘交互
    enableBoard();

    // 更新UI
    updateCurrentPlayerUI();
    winnerDisplayEl.className = 'winner-display hidden';

    // 绘制棋盘
    drawBoard();
}

// 绘制棋盘
function drawBoard() {
    // 清空画布
    ctx.fillStyle = '#deb887';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制网格线
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 1;

    for (let i = 0; i < BOARD_SIZE; i++) {
        // 横线
        ctx.beginPath();
        ctx.moveTo(PADDING, PADDING + i * CELL_SIZE);
        ctx.lineTo(PADDING + (BOARD_SIZE - 1) * CELL_SIZE, PADDING + i * CELL_SIZE);
        ctx.stroke();

        // 竖线
        ctx.beginPath();
        ctx.moveTo(PADDING + i * CELL_SIZE, PADDING);
        ctx.lineTo(PADDING + i * CELL_SIZE, PADDING + (BOARD_SIZE - 1) * CELL_SIZE);
        ctx.stroke();
    }

    // 绘制天元和星位
    drawStarPoints();

    // 绘制所有棋子
    drawAllPieces();
}

// 绘制星位
function drawStarPoints() {
    const starPoints = [
        [3, 3], [3, 7], [3, 11],
        [7, 3], [7, 7], [7, 11],
        [11, 3], [11, 7], [11, 11]
    ];

    ctx.fillStyle = '#8b4513';
    starPoints.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(
            PADDING + x * CELL_SIZE,
            PADDING + y * CELL_SIZE,
            4,
            0,
            Math.PI * 2
        );
        ctx.fill();
    });
}

// 绘制所有棋子
function drawAllPieces() {
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] !== 0) {
                drawPiece(i, j, board[i][j]);
            }
        }
    }
}

// 绘制单个棋子
function drawPiece(row, col, player) {
    const x = PADDING + col * CELL_SIZE;
    const y = PADDING + row * CELL_SIZE;

    // 绘制棋子阴影
    ctx.beginPath();
    ctx.arc(x + 2, y + 2, PIECE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();

    // 绘制棋子主体
    ctx.beginPath();
    ctx.arc(x, y, PIECE_RADIUS, 0, Math.PI * 2);

    if (player === 1) {
        // 黑棋 - 径向渐变
        const gradient = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, PIECE_RADIUS);
        gradient.addColorStop(0, '#555');
        gradient.addColorStop(1, '#111');
        ctx.fillStyle = gradient;
    } else {
        // 白棋 - 径向渐变
        const gradient = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, PIECE_RADIUS);
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(1, '#ddd');
        ctx.fillStyle = gradient;
    }
    ctx.fill();

    // 绘制棋子边框
    ctx.strokeStyle = player === 1 ? '#000' : '#999';
    ctx.lineWidth = 1;
    ctx.stroke();
}

// 处理点击事件
function handleClick(e) {
    if (gameOver || aiThinking) return;

    // 人机模式下，玩家只能执黑棋（先手）
    if (gameMode === 'pve' && currentPlayer !== 1) {
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 计算落子位置
    const col = Math.round((x - PADDING) / CELL_SIZE);
    const row = Math.round((y - PADDING) / CELL_SIZE);

    // 检查是否在棋盘范围内
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
        return;
    }

    // 检查该位置是否已有棋子
    if (board[row][col] !== 0) {
        return;
    }

    // 落子
    board[row][col] = currentPlayer;
    drawPiece(row, col, currentPlayer);

    // 记录落子历史
    gameHistory.push({ row, col, player: currentPlayer });

    // 检查是否获胜
    if (checkWin(row, col, currentPlayer)) {
        gameOver = true;
        disableBoard(); // 禁用棋盘交互
        showWinner(currentPlayer);
        return;
    }

    // 切换玩家
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    updateCurrentPlayerUI();

    // 人机模式下，AI落子
    if (gameMode === 'pve' && !gameOver) {
        aiThinking = true;
        currentPlayerEl.textContent = 'AI思考中...';
        currentPlayerEl.className = 'ai-thinking';

        // 延迟一点再落子，让UI有反应时间
        setTimeout(() => {
            makeAIMove();
            // 游戏已结束则不再重置 aiThinking
            if (!gameOver) {
                aiThinking = false;
            }
        }, 100);
    }
}

// 检查是否获胜
function checkWin(row, col, player) {
    // 四个方向：水平、垂直、对角线、反对角线
    const directions = [
        [[0, 1], [0, -1]],   // 水平
        [[1, 0], [-1, 0]],   // 垂直
        [[1, 1], [-1, -1]], // 对角线
        [[1, -1], [-1, 1]]  // 反对角线
    ];

    for (const direction of directions) {
        let count = 1; // 当前棋子

        // 正向检查
        for (let i = 1; i < 5; i++) {
            const newRow = row + direction[0][0] * i;
            const newCol = col + direction[0][1] * i;
            if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) break;
            if (board[newRow][newCol] === player) {
                count++;
            } else {
                break;
            }
        }

        // 反向检查
        for (let i = 1; i < 5; i++) {
            const newRow = row + direction[1][0] * i;
            const newCol = col + direction[1][1] * i;
            if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) break;
            if (board[newRow][newCol] === player) {
                count++;
            } else {
                break;
            }
        }

        // 五子连珠
        if (count >= 5) {
            return true;
        }
    }

    return false;
}

// 禁用棋盘交互
function disableBoard() {
    canvas.style.pointerEvents = 'none';
    canvas.style.cursor = 'default';
}

// 启用棋盘交互
function enableBoard() {
    canvas.style.pointerEvents = 'auto';
    canvas.style.cursor = 'pointer';
}

// 显示获胜者
function showWinner(player) {
    const winnerName = player === 1 ? '黑方' : '白方';
    winnerDisplayEl.innerHTML = `
        <div>🎉 ${winnerName} 获胜！</div>
        <button class="play-again-btn" onclick="restartGame()">再来一局</button>
    `;
    winnerDisplayEl.className = `winner-display ${player === 1 ? 'black' : 'white'}`;
}

// 更新当前执子显示
function updateCurrentPlayerUI() {
    const playerName = currentPlayer === 1 ? '黑方' : '白方';
    currentPlayerEl.textContent = `当前执子：${playerName}`;
    currentPlayerEl.className = currentPlayer === 1 ? 'black' : 'white';
}

// ==================== AI功能实现 ====================

// AI落子主逻辑
function makeAIMove() {
    // 如果游戏已结束，不执行AI落子
    if (gameOver) {
        aiThinking = false;
        return;
    }

    let move;

    switch (aiDifficulty) {
        case 'easy':
            move = getEasyAIMove();
            break;
        case 'medium':
            move = getMediumAIMove();
            break;
        case 'hard':
            move = getHardAIMove();
            break;
        default:
            move = getMediumAIMove();
    }

    if (move) {
        board[move.row][move.col] = currentPlayer;
        drawPiece(move.row, move.col, currentPlayer);

        if (checkWin(move.row, move.col, currentPlayer)) {
            gameOver = true;
            disableBoard(); // 禁用棋盘交互
            showWinner(currentPlayer);
            aiThinking = false;
            return;
        }

        // 切换回玩家
        currentPlayer = 1;
        updateCurrentPlayerUI();
    }

    // 重置AI思考状态
    aiThinking = false;
}

// 简单难度 - 随机落子 + 基础防守
function getEasyAIMove() {
    // 1. 防守：检测玩家是否即将获胜（四连或活三）
    const defenseMove = findBestDefense();
    if (defenseMove) {
        return defenseMove;
    }

    // 2. 进攻：检查AI是否即将获胜
    const attackMove = findBestAttack(2);
    if (attackMove) {
        return attackMove;
    }

    // 3. 随机落子
    const validMoves = getValidMoves();
    if (validMoves.length === 0) return null;
    return validMoves[Math.floor(Math.random() * validMoves.length)];
}

// 查找最佳防守位置（防守玩家的威胁）
function findBestDefense() {
    const player = 1; // 玩家是黑棋
    const validMoves = getValidMovesNearPieces();
    let bestDefense = null;
    let highestThreat = 0;

    for (const move of validMoves) {
        // 模拟玩家在这里落子
        board[move.row][move.col] = player;
        const threat = evaluateThreat(move.row, move.col, player);
        board[move.row][move.col] = 0;

        if (threat > highestThreat) {
            highestThreat = threat;
            bestDefense = move;
        }
    }

    // 防守活四/冲四/活三/眠三（降低阈值以防守更多威胁）
    if (highestThreat >= 50) {
        return bestDefense;
    }
    return null;
}

// 查找最佳进攻位置
function findBestAttack(player) {
    const validMoves = getValidMovesNearPieces();
    let bestMove = null;
    let highestScore = 0;

    for (const move of validMoves) {
        board[move.row][move.col] = player;
        const score = evaluatePosition(move.row, move.col, player);
        board[move.row][move.col] = 0;

        if (score > highestScore) {
            highestScore = score;
            bestMove = move;
        }
    }

    // 只在能赢或形成活四时进攻
    if (highestScore >= 1000) {
        return bestMove;
    }
    return null;
}

// 评估某个位置的威胁程度
function evaluateThreat(row, col, player) {
    const opponent = player === 1 ? 2 : 1;
    let maxThreat = 0;

    const directions = [
        [[0, 1], [0, -1]],
        [[1, 0], [-1, 0]],
        [[1, 1], [-1, -1]],
        [[1, -1], [-1, 1]]
    ];

    for (const direction of directions) {
        const info = analyzeLine(row, col, player, opponent, direction);

        // 威胁等级
        if (info.count >= 5) maxThreat = 10000; // 五连，即将被将军
        else if (info.count === 4 && info.openEnds === 2) maxThreat = 5000; // 活四
        else if (info.count === 4 && info.openEnds === 1) maxThreat = 4000; // 冲四
        else if (info.count === 3 && info.openEnds === 2) maxThreat = 1000; // 活三
        else if (info.count === 3 && info.openEnds === 1) maxThreat = 100; // 眠三
    }

    return maxThreat;
}

// 中等难度 - 位置评估 + 贪心算法 + 攻守平衡
function getMediumAIMove() {
    // 1. 进攻优先：检查AI是否即将获胜
    const attackMove = findBestAttack(2);
    if (attackMove) return attackMove;

    // 2. 防守优先：检测玩家即将获胜的威胁（必须防守）
    const defenseMove = findBestDefense();
    if (defenseMove) {
        // 检查防守位置是否也能形成有效进攻
        board[defenseMove.row][defenseMove.col] = 2;
        const canAttack = evaluatePosition(defenseMove.row, defenseMove.col, 2) >= 5000;
        board[defenseMove.row][defenseMove.col] = 0;

        // 如果防守位置也能形成活四及以上，则防守
        if (canAttack) {
            return defenseMove;
        }

        // 否则评估所有位置的综合得分
        const bestDefenseScore = evaluatePosition(defenseMove.row, defenseMove.col, 2);
        const allMoves = getValidMovesNearPieces();
        let bestOverallMove = defenseMove;
        let bestOverallScore = bestDefenseScore;

        for (const move of allMoves) {
            // 计算该位置的进攻得分
            board[move.row][move.col] = 2;
            const attackScore = evaluatePosition(move.row, move.col, 2);
            board[move.row][move.col] = 0;

            // 计算该位置的防守得分（如果玩家在这里落子）
            board[move.row][move.col] = 1;
            const threatScore = evaluateThreat(move.row, move.col, 1);
            board[move.row][move.col] = 0;

            // 综合得分 = 进攻得分 + 防守得分 * 1.5（防守更重要）
            const overallScore = attackScore + threatScore * 1.5;

            if (overallScore > bestOverallScore) {
                bestOverallScore = overallScore;
                bestOverallMove = move;
            }
        }

        return bestOverallMove;
    }

    // 3. 位置评估选择最优落子（无明显威胁时）
    let bestScore = -Infinity;
    let bestMoves = [];
    const validMoves = getValidMovesNearPieces();

    for (const move of validMoves) {
        const score = evaluatePosition(move.row, move.col, 2); // AI是白棋
        if (score > bestScore) {
            bestScore = score;
            bestMoves = [move];
        } else if (score === bestScore) {
            bestMoves.push(move);
        }
    }

    if (bestMoves.length === 0) return getCenterMove();
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// 困难难度 - Minimax + Alpha-Beta 剪枝 + 威胁检测
function getHardAIMove() {
    // 前几手使用简单策略
    const pieceCount = countPieces();
    if (pieceCount < 2) {
        return getCenterMove();
    }
    if (pieceCount < 5) {
        return getMediumAIMove(); // 前几步用中等策略
    }

    // 1. 首先检测必须防守/进攻的位置
    const defenseMove = findBestDefense();
    if (defenseMove) return defenseMove;

    const attackMove = findBestAttack(2);
    if (attackMove) return attackMove;

    // 2. 使用Minimax搜索
    const depth = 4; // 搜索深度
    let bestScore = -Infinity;
    let bestMove = null;

    // 获取候选落子并排序
    const candidates = getSortedMoves(2);

    for (const move of candidates) {
        // 尝试落子
        board[move.row][move.col] = 2;

        // 检测是否直接获胜
        if (checkWin(move.row, move.col, 2)) {
            board[move.row][move.col] = 0;
            return move;
        }

        const score = minimax(depth - 1, -Infinity, Infinity, false);
        board[move.row][move.col] = 0; // 撤销落子

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove || getMediumAIMove();
}

// 获取排序后的候选落子（用于更好的剪枝）
function getSortedMoves(player) {
    const moves = [];
    const player1 = player;
    const player2 = player === 1 ? 2 : 1;

    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] === 0) {
                // 检查是否靠近已有棋子
                let nearPiece = false;
                for (let di = -2; di <= 2; di++) {
                    for (let dj = -2; dj <= 2; dj++) {
                        const ni = i + di, nj = j + dj;
                        if (ni >= 0 && ni < BOARD_SIZE && nj >= 0 && nj < BOARD_SIZE && board[ni][nj] !== 0) {
                            nearPiece = true;
                            break;
                        }
                    }
                    if (nearPiece) break;
                }

                if (nearPiece) {
                    // 评估该位置
                    const attackScore = evaluatePosition(i, j, player);
                    const defenseScore = evaluatePosition(i, j, player2);
                    const score = Math.max(attackScore, defenseScore) + (attackScore + defenseScore > 0 ? 1000 : 0);
                    moves.push({ row: i, col: j, score });
                }
            }
        }
    }

    // 按分数降序排序
    moves.sort((a, b) => b.score - a.score);
    return moves.slice(0, 20); // 返回前20个最佳位置
}

// Minimax 算法 with Alpha-Beta 剪枝
function minimax(depth, alpha, beta, isMaximizing) {
    // 检查游戏结束或达到深度
    if (depth === 0) {
        return evaluateBoard(2) - evaluateBoard(1); // AI分 - 玩家分
    }

    const player = isMaximizing ? 2 : 1;
    const validMoves = getSortedMoves(player).slice(0, 12);

    if (validMoves.length === 0) {
        return evaluateBoard(2) - evaluateBoard(1);
    }

    if (isMaximizing) {
        let maxScore = -Infinity;
        for (const move of validMoves) {
            board[move.row][move.col] = 2; // AI落子

            // 检测获胜
            if (checkWin(move.row, move.col, 2)) {
                board[move.row][move.col] = 0;
                return 100000 + depth * 1000; // 快速获胜更优
            }

            const score = minimax(depth - 1, alpha, beta, false);
            board[move.row][move.col] = 0; // 撤销

            if (score > maxScore) {
                maxScore = score;
            }
            if (maxScore > alpha) {
                alpha = maxScore;
            }
            if (beta <= alpha) break; // Beta剪枝
        }
        return maxScore;
    } else {
        let minScore = Infinity;
        for (const move of validMoves) {
            board[move.row][move.col] = 1; // 玩家落子

            // 检测玩家获胜
            if (checkWin(move.row, move.col, 1)) {
                board[move.row][move.col] = 0;
                return -100000 - depth * 1000; // 快速输棋更差
            }

            const score = minimax(depth - 1, alpha, beta, true);
            board[move.row][move.col] = 0; // 撤销

            if (score < minScore) {
                minScore = score;
            }
            if (minScore < beta) {
                beta = minScore;
            }
            if (beta <= alpha) break; // Alpha剪枝
        }
        return minScore;
    }
}

// 寻找关键落子（防守或进攻）
function findCriticalMove(player, count) {
    const opponent = player === 1 ? 2 : 1;
    const validMoves = getValidMovesNearPieces();

    for (const move of validMoves) {
        board[move.row][move.col] = player;
        if (hasLine(move.row, move.col, player, count)) {
            board[move.row][move.col] = 0;
            return move;
        }
        board[move.row][move.col] = 0;
    }
    return null;
}

// 检查是否有count连子
function hasLine(row, col, player, count) {
    const directions = [
        [[0, 1], [0, -1]],   // 水平
        [[1, 0], [-1, 0]],   // 垂直
        [[1, 1], [-1, -1]], // 对角线
        [[1, -1], [-1, 1]]  // 反对角线
    ];

    for (const direction of directions) {
        let total = 1;

        for (const [dr, dc] of direction) {
            for (let i = 1; i < count; i++) {
                const newRow = row + dr * i;
                const newCol = col + dc * i;
                if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) break;
                if (board[newRow][newCol] === player) {
                    total++;
                } else {
                    break;
                }
            }
        }

        if (total >= count) return true;
    }
    return false;
}

// 评估某位置的价值
function evaluatePosition(row, col, player) {
    const opponent = player === 1 ? 2 : 1;
    let score = 0;

    const directions = [
        [[0, 1], [0, -1]],
        [[1, 0], [-1, 0]],
        [[1, 1], [-1, -1]],
        [[1, -1], [-1, 1]]
    ];

    for (const direction of directions) {
        const lineInfo = analyzeLine(row, col, player, opponent, direction);
        score += lineInfo.score;
    }

    // 靠近中心的位置更有价值
    const centerDist = Math.abs(row - 7) + Math.abs(col - 7);
    score += (14 - centerDist) * 2;

    return score;
}

// 分析某个方向上的连子情况
function analyzeLine(row, col, player, opponent, direction) {
    let count = 1;
    let openEnds = 0;

    // 正向检查
    let forwardEmpty = false;
    for (let i = 1; i < 5; i++) {
        const newRow = row + direction[0][0] * i;
        const newCol = col + direction[0][1] * i;
        if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) break;
        if (board[newRow][newCol] === player) {
            count++;
        } else if (board[newRow][newCol] === 0) {
            forwardEmpty = true;
            break;
        } else {
            break;
        }
    }

    // 反向检查
    let backwardEmpty = false;
    for (let i = 1; i < 5; i++) {
        const newRow = row + direction[1][0] * i;
        const newCol = col + direction[1][1] * i;
        if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) break;
        if (board[newRow][newCol] === player) {
            count++;
        } else if (board[newRow][newCol] === 0) {
            backwardEmpty = true;
            break;
        } else {
            break;
        }
    }

    if (forwardEmpty) openEnds++;
    if (backwardEmpty) openEnds++;

    // 计算分数 - 更精细的评分
    let score = 0;
    if (count >= 5) {
        score = 100000; // 五连
    } else if (count === 4 && openEnds === 2) {
        score = 50000; // 活四
    } else if (count === 4 && openEnds === 1) {
        score = 10000; // 冲四
    } else if (count === 3 && openEnds === 2) {
        score = 5000; // 活三
    } else if (count === 3 && openEnds === 1) {
        score = 1000; // 眠三
    } else if (count === 2 && openEnds === 2) {
        score = 500; // 活二
    } else if (count === 2 && openEnds === 1) {
        score = 100; // 眠二
    } else if (count === 1 && openEnds === 2) {
        score = 50; // 活一
    }

    return { count, openEnds, score };
}

// 评估整个棋盘
function evaluateBoard(player) {
    let score = 0;
    const opponent = player === 1 ? 2 : 1;

    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] === player) {
                score += evaluatePosition(i, j, player);
            }
        }
    }
    return score;
}

// 获取有效落子位置（全场搜索，用于游戏初期）
function getValidMoves() {
    const moves = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] === 0) {
                moves.push({ row: i, col: j });
            }
        }
    }
    return moves;
}

// 获取靠近已有棋子的有效落子位置（优化搜索）
function getValidMovesNearPieces() {
    const moveSet = new Set();
    const relevantMoves = [];

    // 找到所有靠近棋子的空位
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] !== 0) {
                // 检查周围2格内的空位
                for (let di = -2; di <= 2; di++) {
                    for (let dj = -2; dj <= 2; dj++) {
                        const ni = i + di;
                        const nj = j + dj;
                        if (ni >= 0 && ni < BOARD_SIZE && nj >= 0 && nj < BOARD_SIZE && board[ni][nj] === 0) {
                            const key = `${ni},${nj}`;
                            if (!moveSet.has(key)) {
                                moveSet.add(key);
                                relevantMoves.push({ row: ni, col: nj });
                            }
                        }
                    }
                }
            }
        }
    }

    // 如果没有棋子，返回中心位置
    if (relevantMoves.length === 0) {
        return [{ row: 7, col: 7 }];
    }

    // 按距离中心排序
    relevantMoves.sort((a, b) => {
        const distA = Math.abs(a.row - 7) + Math.abs(a.col - 7);
        const distB = Math.abs(b.row - 7) + Math.abs(b.col - 7);
        return distA - distB;
    });

    return relevantMoves;
}

// 悔棋功能
function undoGame() {
    // 不能悔棋的情况：游戏结束、AI正在思考、游戏历史为空
    if (gameOver || aiThinking || gameHistory.length === 0) {
        return;
    }

    // 人机模式下需要撤销两步（玩家一步 + AI一步）
    if (gameMode === 'pve' && gameHistory.length >= 2) {
        // 撤销AI的落子
        const aiMove = gameHistory.pop();
        board[aiMove.row][aiMove.col] = 0;

        // 撤销玩家的落子
        const playerMove = gameHistory.pop();
        board[playerMove.row][playerMove.col] = 0;

        // 当前玩家应该是黑方（玩家）
        currentPlayer = 1;
    } else if (gameHistory.length >= 1) {
        // 双人模式或人机模式只有一步时
        const lastMove = gameHistory.pop();
        board[lastMove.row][lastMove.col] = 0;

        // 切换回上一个玩家
        currentPlayer = lastMove.player;
    } else {
        return;
    }

    // 重置游戏状态
    gameOver = false;
    enableBoard();
    winnerDisplayEl.className = 'winner-display hidden';

    // 更新UI并重新绘制
    updateCurrentPlayerUI();
    drawBoard();
}

// 获取中心位置
function getCenterMove() {
    // 找距离中心最近的空位
    let bestMove = null;
    let minDist = Infinity;

    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] === 0) {
                const dist = Math.abs(i - 7) + Math.abs(j - 7);
                if (dist < minDist) {
                    minDist = dist;
                    bestMove = { row: i, col: j };
                }
            }
        }
    }
    return bestMove;
}

// 统计棋盘上的棋子数量
function countPieces() {
    let count = 0;
    for (let i = 0; i < BOARD_SIZE; i++) {
        for (let j = 0; j < BOARD_SIZE; j++) {
            if (board[i][j] !== 0) count++;
        }
    }
    return count;
}

// 页面加载完成后初始化游戏
window.onload = init;

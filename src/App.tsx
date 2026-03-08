import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Coffee, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Trophy, Play, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Difficulty = 'SLOW' | 'MEDIUM' | 'FAST';
type GameState = 'START' | 'PLAYING' | 'GAME_OVER';

const GRID_SIZE = 20;
const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION: Direction = 'UP';

const SPEEDS = {
  SLOW: 150,
  MEDIUM: 100,
  FAST: 60,
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const nextDirectionRef = useRef<Direction>(INITIAL_DIRECTION);

  const generateFood = useCallback((currentSnake: Point[]): Point => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const isColliding = currentSnake.some(
        (segment) => segment.x === newFood.x && segment.y === newFood.y
      );
      if (!isColliding) break;
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    nextDirectionRef.current = INITIAL_DIRECTION;
    setFood(generateFood(INITIAL_SNAKE));
    setScore(0);
    setGameState('PLAYING');
    lastUpdateTimeRef.current = 0;
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        if (direction !== 'DOWN') nextDirectionRef.current = 'UP';
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        if (direction !== 'UP') nextDirectionRef.current = 'DOWN';
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        if (direction !== 'RIGHT') nextDirectionRef.current = 'LEFT';
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        if (direction !== 'LEFT') nextDirectionRef.current = 'RIGHT';
        break;
    }
  }, [direction]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const moveSnake = useCallback(() => {
    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newDirection = nextDirectionRef.current;
      setDirection(newDirection);

      const newHead = { ...head };
      if (newDirection === 'UP') newHead.y -= 1;
      if (newDirection === 'DOWN') newHead.y += 1;
      if (newDirection === 'LEFT') newHead.x -= 1;
      if (newDirection === 'RIGHT') newHead.x += 1;

      // Wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        setGameState('GAME_OVER');
        return prevSnake;
      }

      // Self collision
      if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameState('GAME_OVER');
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore((s) => s + 10);
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [food, generateFood]);

  const gameLoop = useCallback((timestamp: number) => {
    if (gameState !== 'PLAYING') return;

    if (!lastUpdateTimeRef.current) lastUpdateTimeRef.current = timestamp;
    const elapsed = timestamp - lastUpdateTimeRef.current;

    if (elapsed > SPEEDS[difficulty]) {
      moveSnake();
      lastUpdateTimeRef.current = timestamp;
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, difficulty, moveSnake]);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, gameLoop]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
    }
  }, [score, highScore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / GRID_SIZE;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid (subtle)
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }

    // Draw snake
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      ctx.fillStyle = isHead ? '#3b82f6' : '#2563eb';
      ctx.shadowBlur = isHead ? 15 : 5;
      ctx.shadowColor = '#3b82f6';
      
      // Rounded segments
      const x = segment.x * cellSize + 1;
      const y = segment.y * cellSize + 1;
      const size = cellSize - 2;
      const radius = isHead ? 6 : 4;
      
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, radius);
      ctx.fill();
      
      // Eyes for the head
      if (isHead) {
        ctx.fillStyle = 'white';
        ctx.shadowBlur = 0;
        const eyeSize = 2;
        if (direction === 'UP' || direction === 'DOWN') {
          ctx.fillRect(x + size * 0.2, y + size * 0.4, eyeSize, eyeSize);
          ctx.fillRect(x + size * 0.7, y + size * 0.4, eyeSize, eyeSize);
        } else {
          ctx.fillRect(x + size * 0.4, y + size * 0.2, eyeSize, eyeSize);
          ctx.fillRect(x + size * 0.4, y + size * 0.7, eyeSize, eyeSize);
        }
      }
    });

    // Draw food (Coffee Icon)
    // Since we can't easily draw Lucide icons directly on canvas without extra steps,
    // we'll draw a stylized coffee cup shape or just a glowing circle and overlay the icon if needed.
    // Let's draw a glowing red/brown circle for the food.
    ctx.fillStyle = '#ef4444';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ef4444';
    ctx.beginPath();
    ctx.arc(
      food.x * cellSize + cellSize / 2,
      food.y * cellSize + cellSize / 2,
      cellSize / 3,
      0,
      Math.PI * 2
    );
    ctx.fill();

  }, [snake, food, direction]);

  const handleDirectionChange = (newDir: Direction) => {
    if (gameState !== 'PLAYING') return;
    if (newDir === 'UP' && direction !== 'DOWN') nextDirectionRef.current = 'UP';
    if (newDir === 'DOWN' && direction !== 'UP') nextDirectionRef.current = 'DOWN';
    if (newDir === 'LEFT' && direction !== 'RIGHT') nextDirectionRef.current = 'LEFT';
    if (newDir === 'RIGHT' && direction !== 'LEFT') nextDirectionRef.current = 'RIGHT';
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-2">
          NEON SNAKE
        </h1>
        <div className="flex gap-8 justify-center items-center text-sm font-mono uppercase tracking-widest text-blue-200/60">
          <div className="flex flex-col">
            <span>Score</span>
            <span className="text-2xl text-blue-400 font-bold">{score}</span>
          </div>
          <div className="flex flex-col">
            <span>Best</span>
            <span className="text-2xl text-cyan-300 font-bold">{highScore}</span>
          </div>
        </div>
      </div>

      {/* Game Container */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
        <div className="relative bg-black rounded-lg border border-white/10 overflow-hidden shadow-2xl">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="max-w-full aspect-square"
          />

          {/* Overlays */}
          <AnimatePresence>
            {gameState === 'START' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
              >
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                  <Play className="text-white fill-current" size={32} />
                </div>
                <h2 className="text-2xl font-bold mb-8 text-white">Select Difficulty</h2>
                <div className="grid grid-cols-1 gap-3 w-full max-w-xs">
                  {(['SLOW', 'MEDIUM', 'FAST'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setDifficulty(d);
                        resetGame();
                      }}
                      className={`py-3 px-6 rounded-xl border transition-all duration-200 uppercase tracking-widest text-sm font-bold ${
                        difficulty === d
                          ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      {d === 'SLOW' ? 'Lento (150ms)' : d === 'MEDIUM' ? 'Medio (100ms)' : 'Alto (60ms)'}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {gameState === 'GAME_OVER' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
              >
                <Trophy className="text-yellow-400 mb-4" size={64} />
                <h2 className="text-4xl font-black mb-2 text-white">GAME OVER</h2>
                <p className="text-blue-300/60 uppercase tracking-widest text-sm mb-8">
                  Final Score: <span className="text-white font-bold">{score}</span>
                </p>
                <button
                  onClick={resetGame}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-4 px-8 rounded-2xl font-bold transition-all shadow-[0_0_30px_rgba(37,99,235,0.3)]"
                >
                  <RotateCcw size={20} />
                  TRY AGAIN
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Canvas Food Icon Overlay (to show the coffee icon exactly where the food is) */}
          {gameState === 'PLAYING' && (
            <div 
              className="absolute pointer-events-none transition-all duration-100"
              style={{
                left: `${(food.x / GRID_SIZE) * 100}%`,
                top: `${(food.y / GRID_SIZE) * 100}%`,
                width: `${100 / GRID_SIZE}%`,
                height: `${100 / GRID_SIZE}%`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Coffee className="text-white animate-pulse" size={12} />
            </div>
          )}
        </div>
      </div>

      {/* Mobile Controls */}
      <div className="mt-12 md:hidden grid grid-cols-3 gap-2">
        <div />
        <button
          onClick={() => handleDirectionChange('UP')}
          className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center active:bg-blue-600 active:scale-95 transition-all"
        >
          <ChevronUp size={32} />
        </button>
        <div />
        <button
          onClick={() => handleDirectionChange('LEFT')}
          className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center active:bg-blue-600 active:scale-95 transition-all"
        >
          <ChevronLeft size={32} />
        </button>
        <button
          onClick={() => handleDirectionChange('DOWN')}
          className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center active:bg-blue-600 active:scale-95 transition-all"
        >
          <ChevronDown size={32} />
        </button>
        <button
          onClick={() => handleDirectionChange('RIGHT')}
          className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center active:bg-blue-600 active:scale-95 transition-all"
        >
          <ChevronRight size={32} />
        </button>
      </div>

      {/* Desktop Instructions */}
      <div className="hidden md:block mt-8 text-white/30 text-xs uppercase tracking-widest font-mono">
        Use <span className="text-white/60">WASD</span> or <span className="text-white/60">Arrows</span> to navigate
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { animated, useSpring } from '@react-spring/web';

const SnakeGame = () => {
  // Debug logging for screen size
  const [screenInfo, setScreenInfo] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
    gameSize: 0
  });

  // Update screen info on resize
  useEffect(() => {
    const handleResize = () => {
      setScreenInfo({
        width: window.innerWidth,
        height: window.innerHeight,
        gameSize: calculateGameSize()
      });
    };
    
    // Initial calculation
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate appropriate game size based on screen - Optimized for larger controls
  const calculateGameSize = () => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    console.log(`Screen dimensions: ${screenWidth}x${screenHeight}`);
    
    // For mobile devices (width < 768px), optimize for larger controls
    if (screenWidth < 768) {
      // On mobile, use 90% of screen width but cap at 50% of height
      // This leaves more room for the larger controls below
      return Math.min(screenWidth * 0.90, screenHeight * 0.50);
    }
    
    // For tablets (width < 1024px)
    if (screenWidth < 1024) {
      return Math.min(screenWidth * 0.85, screenHeight * 0.55);
    }
    
    // For larger screens, use a more balanced approach
    return Math.min(screenWidth * 0.8, screenHeight * 0.5);
  };

  // Game constants
  const gridSize = 20;
  const initialSpeed = 165; // 10% slower than original 150
  // Game state
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [direction, setDirection] = useState('RIGHT');
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [speed, setSpeed] = useState(initialSpeed);
  const [paused, setPaused] = useState(false);
  const [level, setLevel] = useState(1);
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Audio references
  const eatSoundRef = useRef(null);
  const levelUpSoundRef = useRef(null);
  const gameOverSoundRef = useRef(null);
  const gameStartSoundRef = useRef(null);
  
  // Initialize audio objects
  useEffect(() => {
    eatSoundRef.current = new Audio('/sounds/eat.mp3');
    eatSoundRef.current.volume = 0.3;
    
    levelUpSoundRef.current = new Audio('/sounds/level-up.mp3');
    levelUpSoundRef.current.volume = 0.5;
    
    gameOverSoundRef.current = new Audio('/sounds/game-over.mp3');
    gameOverSoundRef.current.volume = 0.4;
    
    gameStartSoundRef.current = new Audio('/sounds/game-start.mp3');
    gameStartSoundRef.current.volume = 0.4;
  }, []);
  
  // Function to play sounds
  const playSound = useCallback((soundRef) => {
    if (soundEnabled && soundRef.current) {
      // Reset the audio to the beginning if it's already playing
      soundRef.current.currentTime = 0;
      soundRef.current.play().catch(error => {
        console.log('Audio play error:', error);
      });
    }
  }, [soundEnabled]);
  
  // Level-up animation spring
  const levelUpAnimation = useSpring({
    opacity: showLevelUpAnimation ? 1 : 0,
    transform: showLevelUpAnimation ? 'scale(1.2)' : 'scale(0.8)',
    config: { tension: 300, friction: 10 },
    onRest: () => {
      if (showLevelUpAnimation) {
        setTimeout(() => setShowLevelUpAnimation(false), 1000);
      }
    }
  });
  
  // Note: We're using CSS transitions for smooth animation instead of a separate animation speed
  
  // Refs to avoid dependency issues with timers and callbacks
  const gameStateRef = useRef({
    direction,
    snake,
    food,
    gameStarted,
    gameOver,
    paused,
    speed,
    score
  });
  
  // Update ref whenever state changes
  useEffect(() => {
    gameStateRef.current = {
      direction,
      snake,
      food,
      gameStarted,
      gameOver,
      paused,
      speed,
      score
    };
  }, [direction, snake, food, gameStarted, gameOver, paused, speed, score]);
  
  // Rainbow colors
  const rainbowColors = [
    '#FF0000', // Red
    '#FF7F00', // Orange
    '#FFFF00', // Yellow
    '#00FF00', // Green
    '#0000FF', // Blue
    '#4B0082', // Indigo
    '#9400D3'  // Violet
  ];
  
  // Load high scores from localStorage on mount
  useEffect(() => {
    try {
      const savedScores = localStorage.getItem('snakeHighScores');
      if (savedScores) {
        const parsed = JSON.parse(savedScores);
        // Validate the high scores format
        if (Array.isArray(parsed) && parsed.every(item => 
          typeof item === 'object' && 
          item !== null && 
          'name' in item && 
          'score' in item && 
          typeof item.score === 'number')) {
          setHighScores(parsed);
        } else {
          // If invalid format, clear localStorage
          localStorage.removeItem('snakeHighScores');
          setHighScores([]);
        }
      } else {
        setHighScores([]);
      }
    } catch (error) {
      // If error in parsing, clear localStorage
      localStorage.removeItem('snakeHighScores');
      setHighScores([]);
    }
  }, []);
  
  // Generate random food position
  const generateFood = useCallback(() => {
    const newFood = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize)
    };
    
    // Make sure food doesn't spawn on snake
    const isOnSnake = gameStateRef.current.snake.some(segment => 
      segment.x === newFood.x && segment.y === newFood.y
    );
    
    if (isOnSnake && gameStateRef.current.snake.length < gridSize * gridSize - 1) {
      return generateFood(); // Try again if food would be on snake
    }
    
    return newFood;
  }, [gridSize]);
  
  // Calculate speed based on level
  const calculateSpeed = useCallback((lvl) => {
    // Level 1: initialSpeed (165)
    // Level 10: fastest speed (70)
    const maxSpeedReduction = initialSpeed - 70;
    const reduction = (lvl - 1) / 9 * maxSpeedReduction;
    return Math.round(initialSpeed - reduction);
  }, [initialSpeed]);
  
  // Handle direction change (for mobile controls)
  const handleDirectionChange = useCallback((newDir) => {
    console.log('Mobile control clicked:', newDir);
    const state = gameStateRef.current;
    
    if (!state.gameStarted && !state.gameOver) {
      console.log('Starting game with mobile control');
      setGameStarted(true);
      playSound(gameStartSoundRef);
    }
    
    if (state.gameOver || state.paused) {
      console.log('Game over or paused, ignoring mobile control');
      return;
    }
    
    if (
      (newDir === 'UP' && state.direction !== 'DOWN') ||
      (newDir === 'DOWN' && state.direction !== 'UP') ||
      (newDir === 'LEFT' && state.direction !== 'RIGHT') ||
      (newDir === 'RIGHT' && state.direction !== 'LEFT')
    ) {
      console.log('Changing direction to', newDir);
      setDirection(newDir);
    } else {
      console.log('Invalid direction change attempted:', newDir, 'current:', state.direction);
    }
  }, [playSound]);
  
  // Handle keyboard controls
  const handleKeyPress = useCallback((e) => {
    console.log('Key pressed:', e.key);
    const state = gameStateRef.current;
    
    // Start game on any arrow key
    if (!state.gameStarted && !state.gameOver) {
      console.log('Game not started, checking if arrow key');
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        console.log('Starting game with arrow key:', e.key);
        setGameStarted(true);
        playSound(gameStartSoundRef);
      }
    }
    
    // Pause game on 'p' key
    if (e.key === 'p' || e.key === 'P') {
      console.log('P key pressed, toggling pause');
      if (state.gameStarted && !state.gameOver) {
        setPaused(prev => !prev);
      }
      return;
    }
    
    // End game on 'x' key
    if (e.key === 'x' || e.key === 'X') {
      console.log('X key pressed, ending game');
      if (state.gameStarted && !state.gameOver && !state.paused) {
        setGameOver(true);
        setShowNameInput(true);
        return;
      }
    }
    
    // Skip other controls if game is not running
    if (!state.gameStarted || state.gameOver || state.paused) {
      console.log('Game not active, skipping controls');
      return;
    }
    
    // Process arrow keys
    console.log('Processing direction change for key:', e.key);
    switch (e.key) {
      case 'ArrowUp':
        if (state.direction !== 'DOWN') {
          console.log('Changing direction to UP');
          setDirection('UP');
        }
        break;
      case 'ArrowDown':
        if (state.direction !== 'UP') {
          console.log('Changing direction to DOWN');
          setDirection('DOWN');
        }
        break;
      case 'ArrowLeft':
        if (state.direction !== 'RIGHT') {
          console.log('Changing direction to LEFT');
          setDirection('LEFT');
        }
        break;
      case 'ArrowRight':
        if (state.direction !== 'LEFT') {
          console.log('Changing direction to RIGHT');
          setDirection('RIGHT');
        }
        break;
      default:
        break;
    }
  }, [playSound]);
  
  // Handle touch swipe for mobile
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleTouchSwipe = useCallback(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    let touchStartTime = 0;
    
    const handleTouchStart = (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
      touchStartTime = Date.now();
      
      // Prevent scrolling while touching the game area
      e.preventDefault();
    };
    
    const handleTouchMove = (e) => {
      // Update position continuously for responsive feedback
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      
      // If we've moved enough, consider processing the swipe
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;
      
      if (Math.abs(diffX) > 30 || Math.abs(diffY) > 30) {
        handleSwipe(false); // Process swipe but don't force (allows continuous direction changes)
      }
      
      // Prevent scrolling
      e.preventDefault();
    };
    
    const handleTouchEnd = (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipe(true); // Final swipe processing
    };
    
    const handleSwipe = (isFinal) => {
      const state = gameStateRef.current;
      if (state.gameOver || state.paused) return;
      
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;
      // Calculate swipe speed based on distance and time
      // const swipeDistance = Math.sqrt(diffX * diffX + diffY * diffY);
      const swipeTime = Date.now() - touchStartTime;
      
      // More responsive - lower threshold for short/fast swipes
      const threshold = swipeTime < 300 ? 30 : 40;
      
      // Determine if the swipe was horizontal or vertical
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (diffX > threshold && state.direction !== 'LEFT') {
          handleDirectionChange('RIGHT');
        } else if (diffX < -threshold && state.direction !== 'RIGHT') {
          handleDirectionChange('LEFT');
        }
      } else {
        // Vertical swipe
        if (diffY > threshold && state.direction !== 'UP') {
          handleDirectionChange('DOWN');
        } else if (diffY < -threshold && state.direction !== 'DOWN') {
          handleDirectionChange('UP');
        }
      }
    };
    
    return { handleTouchStart, handleTouchMove, handleTouchEnd };
  }, [handleDirectionChange]);
  
  // Set up keyboard and touch event listeners
  useEffect(() => {
    console.log('Setting up keyboard and touch event listeners');
    window.addEventListener('keydown', handleKeyPress);
    
    // Add touch event listeners for mobile
    const { handleTouchStart, handleTouchMove, handleTouchEnd } = handleTouchSwipe();
    const gameArea = document.getElementById('game-area');
    
    if (gameArea) {
      gameArea.addEventListener('touchstart', handleTouchStart, { passive: false });
      gameArea.addEventListener('touchmove', handleTouchMove, { passive: false });
      gameArea.addEventListener('touchend', handleTouchEnd);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      
      if (gameArea) {
        gameArea.removeEventListener('touchstart', handleTouchStart);
        gameArea.removeEventListener('touchmove', handleTouchMove);
        gameArea.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [handleKeyPress, handleTouchSwipe, playSound]);
  
  // Update level based on score
  useEffect(() => {
    const newLevel = Math.floor(score / 10) + 1;
    const clampedLevel = Math.min(newLevel, 10);
    
    if (clampedLevel !== level) {
      setLevel(clampedLevel);
      setSpeed(calculateSpeed(clampedLevel));
      
      // Don't play level up sound on first level (game start)
      if (level > 1 || clampedLevel > 1) {
        // Play level up sound
        playSound(levelUpSoundRef);
        
        // Show level up animation
        setShowLevelUpAnimation(true);
      }
    }
  }, [score, level, calculateSpeed, playSound]);
  
  // Focus name input when it appears
  const nameInputRef = useRef(null);
  useEffect(() => {
    if (showNameInput && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [showNameInput]);
  
  // Game loop with smooth animation
  useEffect(() => {
    if (!gameStarted || gameOver || paused) {
      console.log('Game loop not starting. gameStarted:', gameStarted, 'gameOver:', gameOver, 'paused:', paused);
      return;
    }
    
    console.log('Starting game loop');
    let lastMoveTime = Date.now();
    let animationFrameId = null;
    
    const gameLoop = () => {
      const state = gameStateRef.current;
      const currentTime = Date.now();
      
      // Check if it's time for the next move
      if (currentTime - lastMoveTime >= state.speed) {
        console.log('Moving snake, direction:', state.direction);
        moveSnake();
        lastMoveTime = currentTime;
      }
      
      animationFrameId = requestAnimationFrame(gameLoop);
    };
    
    const moveSnake = () => {
      const state = gameStateRef.current;
      
      // Create copy of the current snake
      const newSnake = [...state.snake];
      
      // Create new head based on current head and direction
      const head = { ...newSnake[0] };
      
      // Move head based on direction
      switch (state.direction) {
        case 'UP':
          head.y = (head.y === 0) ? gridSize - 1 : head.y - 1;
          break;
        case 'DOWN':
          head.y = (head.y === gridSize - 1) ? 0 : head.y + 1;
          break;
        case 'LEFT':
          head.x = (head.x === 0) ? gridSize - 1 : head.x - 1;
          break;
        case 'RIGHT':
          head.x = (head.x === gridSize - 1) ? 0 : head.x + 1;
          break;
        default:
          break;
      }
      
      // Check for collision with self
      const collided = newSnake.some((segment, index) => {
        return index > 0 && segment.x === head.x && segment.y === head.y;
      });
      
      if (collided) {
        setGameOver(true);
        setShowNameInput(true);
        playSound(gameOverSoundRef);
        return;
      }
      
      // Check for food collision
      const ateFood = head.x === state.food.x && head.y === state.food.y;
      
      // Create new snake with new head
      const updatedSnake = [head, ...newSnake];
      
      // Remove tail if didn't eat food
      if (!ateFood) {
        updatedSnake.pop();
      } else {
        // Handle food collision
        setScore(prevScore => prevScore + 1);
        setFood(generateFood());
        playSound(eatSoundRef);
      }
      
      // Update snake state
      setSnake(updatedSnake);
    };
    
    // Start the game loop
    animationFrameId = requestAnimationFrame(gameLoop);
    
    // Cleanup
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [gameStarted, gameOver, paused, generateFood, gridSize, playSound]);
  
  // Save high score with name
  const saveHighScore = () => {
    const name = playerName.trim() || 'Anonymous';
    
    // Update high scores with name
    const newHighScores = [...highScores, { name, score }]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    setHighScores(newHighScores);
    localStorage.setItem('snakeHighScores', JSON.stringify(newHighScores));
    setShowNameInput(false);
  };
  
  // Reset the game
  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setFood(generateFood());
    setDirection('RIGHT');
    setGameOver(false);
    setScore(0);
    setGameStarted(false);
    setSpeed(initialSpeed);
    setPaused(false);
    setLevel(1);
    setPlayerName('');
    setShowNameInput(false);
  };
  
  // Get color for snake segment based on position
  const getSegmentColor = (index) => {
    return rainbowColors[index % rainbowColors.length];
  };
  
  
  // Toggle pause
  const togglePause = () => {
    if (gameStarted && !gameOver) {
      setPaused(prev => !prev);
    }
  };
  
  // End game manually
  const endGame = () => {
    if (gameStarted && !gameOver && !paused) {
      setGameOver(true);
      setShowNameInput(true);
      playSound(gameOverSoundRef);
    }
  };
  
  // Smooth rendering with CSS transitions for snake segments
  const getTransitionStyle = () => {
    // Calculate transition duration based on game speed
    // Faster snake = shorter transition
    const transitionDuration = `${speed * 0.8}ms`;
    return {
      transition: `left ${transitionDuration} linear, top ${transitionDuration} linear`
    };
  };
  // Calculate responsive cell size
  const responsiveCellSize = screenInfo.gameSize / gridSize;
  
  return (
    <div className="flex flex-col items-center justify-center p-2 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Rainbow Snake Game</h1>
      
      {/* Debug info removed */}
      
      <div className="mb-2 flex justify-between w-full max-w-md">
        <p className="text-xl">Score: {score}</p>
        <p className="text-xl">Level: {level}</p>
      </div>
      
      <div
        id="game-area"
        className="relative border-2 border-gray-800 bg-black"
        style={{
          width: gridSize * responsiveCellSize,
          height: gridSize * responsiveCellSize
        }}
      >
        {/* Game start overlay */}
        {!gameStarted && !gameOver && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="text-white text-center">
              <p className="text-xl mb-4">Press any arrow key or button to start</p>
              <p>Use arrow keys or buttons to control the snake</p>
              <p className="mt-2">On mobile, you can also swipe to change direction</p>
              <p className="mt-2">Press P to pause, X to end game</p>
            </div>
          </div>
        )}
        
        {/* Pause overlay */}
        {paused && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="text-white text-center">
              <p className="text-xl mb-4">Game Paused</p>
              <p>Press P to resume</p>
            </div>
          </div>
        )}
        
        {/* Game over overlay with name input */}
        {gameOver && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="text-white text-center">
              <p className="text-xl mb-2">Game Over!</p>
              <p className="mb-4">Your score: {score}</p>
              
              {showNameInput ? (
                <div className="mb-4">
                  <p className="mb-2">Enter your name:</p>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="px-2 py-1 text-black w-full mb-2"
                    maxLength={15}
                    placeholder="Your Name"
                  />
                  <button 
                    onClick={saveHighScore}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 w-full"
                  >
                    Save Score
                  </button>
                </div>
              ) : (
                <button 
                  onClick={resetGame}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Play Again
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Food */}
        <div
          className="absolute rounded-full bg-red-500"
          style={{
            width: responsiveCellSize - 2,
            height: responsiveCellSize - 2,
            left: food.x * responsiveCellSize + 1,
            top: food.y * responsiveCellSize + 1
          }}
        />
        
        {/* Snake */}
        {snake.map((segment, index) => (
          <div
            key={index}
            className="absolute rounded"
            style={{
              width: responsiveCellSize - 2,
              height: responsiveCellSize - 2,
              left: segment.x * responsiveCellSize + 1,
              top: segment.y * responsiveCellSize + 1,
              backgroundColor: getSegmentColor(index),
              ...getTransitionStyle()
            }}
          />
        ))}
        
        {/* Level-up animation */}
        {showLevelUpAnimation && (
          <animated.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={levelUpAnimation}
          >
            <div className="bg-yellow-500 bg-opacity-80 text-white px-6 py-4 rounded-lg shadow-lg text-center">
              <h2 className="text-2xl font-bold">LEVEL UP!</h2>
              <p className="text-xl">Level {level}</p>
            </div>
          </animated.div>
        )}
      </div>
      
      {/* No game controls here anymore - they are at the bottom */}
      
      {/* Controls for both desktop and mobile */}
      <div className="mt-4">
        {/* Game action buttons - MUCH larger for smartphone usage */}
        <div className="flex justify-between mb-10 w-full max-w-md mx-auto">
          <button
            onClick={togglePause}
            className="flex-1 mx-2 py- bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white rounded-xl shadow-lg text-lg font-bold border-4 border-yellow-400 transition-colors duration-75"
            aria-label="Pause or Resume Game"
          >
            {paused ? "Resume (P)" : "Pause (P)"}
          </button>
          <button
            onClick={endGame}
            className="flex-1 mx-2 py-6 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-xl shadow-lg text-lg font-bold border-4 border-red-400 transition-colors duration-75"
            aria-label="End Game"
          >
            End Game (X)
          </button>
          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className={`flex-1 mx-2 py-6 ${soundEnabled ? 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 border-blue-400' : 'bg-gray-500 hover:bg-gray-600 active:bg-gray-700 border-gray-400'} text-white rounded-xl shadow-lg text-lg font-bold border-4 transition-colors duration-75`}
            aria-label="Toggle Sound"
          >
            Sound: {soundEnabled ? "On" : "Off"}
          </button>
        </div>
        
        {/* Direction controls - MUCH larger for smartphone usage */}
        <div className="w-full max-w-md mx-auto mb-10 mt-6">
          {/* Top row - UP button */}
          <div className="flex justify-center mb-5">
            <button
              onClick={() => handleDirectionChange('UP')}
              className="bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-black rounded-full flex items-center justify-center font-bold shadow-lg border-4 border-gray-300 transition-colors duration-75 z-10"
              style={{ width: '40px', height: '40px', fontSize: '20px' }}
              aria-label="Move Up"
            >
              ▲
            </button>
          </div>
          
          {/* Middle row - LEFT, RIGHT buttons */}
          <div className="flex justify-between mb-5">
            <button
              onClick={() => handleDirectionChange('LEFT')}
              className="bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-black rounded-full flex items-center justify-center font-bold shadow-lg border-4 border-gray-300 transition-colors duration-75 z-10"
              style={{ width: '40px', height: '40px', fontSize: '20px' }}
              aria-label="Move Left"
            >
              ◀
            </button>
            
            <button
              onClick={() => handleDirectionChange('RIGHT')}
              className="bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-black rounded-full flex items-center justify-center font-bold shadow-lg border-4 border-gray-300 transition-colors duration-75 z-10"
              style={{ width: '40px', height: '40px', fontSize: '20px' }}
              aria-label="Move Right"
            >
              ▶
            </button>
          </div>
          
          {/* Bottom row - DOWN button */}
          <div className="flex justify-center">
            <button
              onClick={() => handleDirectionChange('DOWN')}
              className="bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-black rounded-full flex items-center justify-center font-bold shadow-lg border-4 border-gray-300 transition-colors duration-75 z-10"
              style={{ width: '40px', height: '40px', fontSize: '20px' }}
              aria-label="Move Down"
            >
              ▼
            </button>
          </div>
        </div>
      </div>
      
      {/* High Scores */}
      <div className="mt-3 w-full max-w-md">
        <h2 className="text-xl font-bold mb-2">High Scores</h2>
        <div className="bg-gray-100 p-3 rounded">
          {highScores.length > 0 ? (
            <ol className="list-decimal list-inside">
              {highScores.map((highScore, index) => (
                <li key={index} className="mb-1">
                  {highScore.name}: {highScore.score} {highScore.score === 1 ? 'point' : 'points'}
                </li>
              ))}
            </ol>
          ) : (
            <p>No high scores yet. Play to set a record!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SnakeGame;
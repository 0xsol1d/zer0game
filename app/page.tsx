'use client';

import { useEffect, useState } from 'react';
import throttle from 'lodash/throttle';

interface GameObject {
  id: number;
  position: number;
  column: number;
  type: string;
  speed: number;
  split?: boolean;
  cluster?: boolean;
  powerUp?: boolean;
}

const objectTypes = [
  { type: 'rocket', icon: '🚀', speed: 0.5 },
  { type: 'balloon', icon: '🎈', speed: 0.3 },
  { type: 'ufo', icon: '🛸', speed: 0.7 },
  { type: 'alien', icon: '👾', speed: 0.4 },
  { type: 'meteor', icon: '☄️', speed: 0.6 },
  { type: 'spaceship', icon: '🚀', speed: 0.45 },
  { type: 'star', icon: '⭐', speed: 0.35 },
  { type: 'heart', icon: '❤️', speed: 0.25 },
  { type: 'egg', icon: '🥚', speed: 0.5, split: true },
  { type: 'eggCluster', icon: '🪐', speed: 0.5, split: true, cluster: true },
  { type: 'slow', icon: '⏳', speed: 0.5, powerUp: true },
  { type: 'shield', icon: '🛡️', speed: 0.5, powerUp: true },
  { type: 'extraLife', icon: '💖', speed: 0.5, powerUp: true }
];

const objectTypesCommon = [
  { type: 'rocket', icon: '🚀', speed: 0.5 },
  { type: 'balloon', icon: '🎈', speed: 0.3 },
  { type: 'ufo', icon: '🛸', speed: 0.7 },
  { type: 'alien', icon: '👾', speed: 0.4 },
  { type: 'meteor', icon: '☄️', speed: 0.6 },
  { type: 'spaceship', icon: '🚀', speed: 0.45 },
  { type: 'star', icon: '⭐', speed: 0.35, split: false, cluster: false, powerUp: false },
];

export default function Home() {
  const [objects, setObjects] = useState<GameObject[]>([]);
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [wave, setWave] = useState<number>(1);
  const [waveMessage, setWaveMessage] = useState<string | null>(null);
  const [objectsDestroyed, setObjectsDestroyed] = useState<number>(0);
  const [spawnInterval, setSpawnInterval] = useState<number>(1000);
  const [paused, setPaused] = useState<boolean>(false);
  const [pauseMessage, setPauseMessage] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null);

  const [powerUp, setPowerUp] = useState<'slow' | 'shield' | 'extraLife' | null>(null);
  const [powerUpTimer, setPowerUpTimer] = useState<number>(0);

  const numColumns = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : difficulty === 'hard' ? 5 : 0;
  const objectsPerWave = 20 + wave - 1;
  const [playerColumn, setPlayerColumn] = useState<number>(Math.floor(numColumns / 2));

  useEffect(() => {
    if (gameOver || paused || !gameStarted) return;
    if (objectsDestroyed >= objectsPerWave) {
      endWave();
    }
  }, [objectsDestroyed, gameOver, paused, gameStarted, objectsPerWave]);

  useEffect(() => {
    if (gameOver || paused || !gameStarted) return;

    const interval = setInterval(() => {
      if (objects.length < objectsPerWave) {
        addNewObject();
      }
    }, spawnInterval);

    return () => clearInterval(interval);
  }, [spawnInterval, objectsPerWave, gameStarted, paused, gameOver]);

  useEffect(() => {
    if (paused || !gameStarted) return;

    const throttledUpdate = throttle(() => {
      setObjects((prevObjects) =>
        prevObjects.map((obj) => ({
          ...obj,
          position: obj.position + obj.speed * (powerUp === 'slow' ? 0.5 : 1),
        }))
      );
    }, 32);

    const risingInterval = setInterval(throttledUpdate, 10);

    return () => {
      clearInterval(risingInterval);
      throttledUpdate.cancel();
    };
  }, [paused, gameStarted, powerUp]);

  useEffect(() => {
    const outOfBounds = objects.filter((obj) => obj.position >= 100);

    if (outOfBounds.length > 0) {
      setObjects((prevObjects) =>
        prevObjects.filter((obj) => obj.position < 100)
      );

      outOfBounds.forEach((obj) => {
        if (!obj.powerUp) {
          if (powerUp !== 'shield') {
            setLives((prevLives) => {
              const newLives = Math.max(prevLives - 1, 0);
              if (newLives === 0) {
                setGameOver(true);
              }
              return newLives;
            });
          }
        }
      });
    }
  }, [objects, powerUp]);

  useEffect(() => {
    if (powerUpTimer > 0 && !paused) {
      const timer = setInterval(() => {
        setPowerUpTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
    if (powerUpTimer <= 0) {
      setPowerUp(null);
    }
  }, [powerUpTimer, powerUp, paused]);

  const addNewObject = () => {
    let randomType;
    const randomChance = Math.random();
    if (wave >= 20 && randomChance < 0.1) {
      randomType = objectTypes.find((type) => type.type === 'eggCluster');
    } else if (wave >= 10 && randomChance < 0.1) {
      randomType = objectTypes.find((type) => type.type === 'egg');
    } else if (randomChance < 0.05) {
      randomType = objectTypes.find((type) => type.type === 'shield')
    } else if (randomChance < 0.10) {
      randomType = objectTypes.find((type) => type.type === 'slow')
    } else {
      randomType = objectTypesCommon[Math.floor(Math.random() * (objectTypesCommon.length - 4))];
    }

    if (randomType) {
      const shouldSpawnTwo = Math.random() < (0.01 + (wave / 100) - 1);

      setObjects((prevObjects: any) => {
        const newObject1 = {
          id: Date.now(),
          position: 10,
          column: Math.floor(Math.random() * numColumns),
          type: randomType.type,
          speed: randomType.speed * (1 + (wave - 1) * 0.05),
          split: randomType.split || false,
          cluster: randomType.cluster || false,
          powerUp: randomType.powerUp || false
        };

        let newObject2;
        let randomType2 = objectTypesCommon[Math.floor(Math.random() * (objectTypesCommon.length - 4))]
        if (shouldSpawnTwo) {
          let column2;
          do {
            column2 = Math.floor(Math.random() * numColumns);
          } while (column2 === newObject1.column);

          newObject2 = {
            id: Date.now() + 1,
            position: 10,
            column: column2,
            type: randomType2.type,
            speed: randomType2.speed * (1 + (wave - 1) * 0.05),
            split: randomType2.split || false,
            cluster: randomType2.cluster || false,
            powerUp: randomType2.powerUp || false
          };
        }

        return shouldSpawnTwo ? [...prevObjects, newObject1, newObject2] : [...prevObjects, newObject1];
      });
    }

  };

  const handleDestroy = () => {
    if (paused || !gameStarted) return;

    setObjects((prevObjects) => {
      const columnObjects = prevObjects.filter((obj) => obj.column === playerColumn);

      if (columnObjects.length > 0) {
        const latestObject = columnObjects[columnObjects.length - 1];
        let updatedObjects = prevObjects.filter((obj) => obj.id !== latestObject.id);
        let newObjects: any = [];

        if (latestObject.type === 'heart') {
          setLives((prevLives) => Math.min(prevLives + 1, 10));
        } else if (latestObject.split) {
          newObjects = latestObject.type === 'eggCluster' ? [
            {
              id: Date.now() + 1,
              position: latestObject.position + 5,
              column: playerColumn,
              type: 'egg',
              speed: 0.5,
              split: true
            },
            {
              id: Date.now() + 2,
              position: latestObject.position + 10,
              column: (playerColumn + 1) % numColumns,
              type: 'egg',
              speed: 0.5,
              split: true
            },
          ] : [
            {
              id: Date.now() + 1,
              position: latestObject.position,
              column: playerColumn,
              type: 'rocket',
              speed: 0.5
            },
            {
              id: Date.now() + 2,
              position: latestObject.position,
              column: (playerColumn + 1) % numColumns,
              type: 'rocket',
              speed: 0.5
            },
          ];
        } else if (latestObject.powerUp) {
          if (latestObject.type === 'slow') {
            setPowerUp('slow');
            setPowerUpTimer(10);
          } else if (latestObject.type === 'shield') {
            setPowerUp('shield');
            setPowerUpTimer(10);
          } else if (latestObject.type === 'extraLife') {
            setLives((prevLives) => Math.min(prevLives + 1, 10));
          }
        }
        updatedObjects = [...updatedObjects, ...newObjects];
        setScore((prevScore) => prevScore + 1);
        setObjectsDestroyed((prevCount) => prevCount + 1);

        return updatedObjects;
      }
      return prevObjects;
    });
  };

  const endWave = () => {
    setWaveMessage('Wave ' + (wave + 1) + ' starting');

    setObjects([]);
    setObjectsDestroyed((prevDestroyed) => prevDestroyed + objects.length);

    setPowerUp(null);
    setPowerUpTimer(0);

    setTimeout(() => {
      setWave((prevWave) => prevWave + 1);
      setObjectsDestroyed(0);
      setSpawnInterval((prevInterval) =>
        prevInterval > 200 ? prevInterval - 100 : prevInterval
      );
      setLives((prevLives) => prevLives + 1);
    }, 2000);
  };

  useEffect(() => {
    if (waveMessage && !paused) {
      const timeout = setTimeout(() => {
        setWaveMessage(null);
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [waveMessage]);

  const handleRestart = () => {
    setObjects([]);
    setScore(0);
    setLives(3);
    setGameOver(false);
    setWave(1);
    setObjectsDestroyed(0);
    setSpawnInterval(1000);
    setWaveMessage(null);
    setPauseMessage(null);
    setGameStarted(false);
    setDifficulty(null);
    setPowerUp(null);
    setPowerUpTimer(0);
    setPlayerColumn(Math.floor(numColumns / 2));
  };

  const handlePause = () => {
    if (paused) {
      setPauseMessage('');
    } else {
      setPauseMessage('Game Paused');
    }
    setPaused((prevPaused) => !prevPaused);
  };

  const handleStart = () => {
    if (difficulty) {
      setWaveMessage('Wave ' + wave + ' starting');
      setGameStarted(true);
    }
  };

  const movePlayerLeft = () => {
    setPlayerColumn((prevColumn) => Math.max(prevColumn - 1, 0));
  };

  const movePlayerRight = () => {
    setPlayerColumn((prevColumn) => Math.min(prevColumn + 1, numColumns - 1));
  };

  const renderDifficultyButtons = () => (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl mb-4">Select Difficulty</h2>
      <div className="w-full max-w-xs flex flex-col items-center">
        <button
          className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 mb-2"
          onClick={() => setDifficulty('easy')}
        >
          EASY
        </button>
        <button
          className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 mb-2"
          onClick={() => setDifficulty('medium')}
        >
          MEDIUM
        </button>
        <button
          className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          onClick={() => setDifficulty('hard')}
        >
          HARD
        </button>
      </div>
    </div>
  );


  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          movePlayerLeft();
          break;
        case 'ArrowRight':
          movePlayerRight();
          break;
        case ' ':
          handleDestroy();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [paused, gameStarted, playerColumn]);

  return (
    <div className="h-screen bg-gray-900 text-white text-center font-trash uppercase">
      <div className="navbar fixed flex justify-between bg-gray-600 w-full">
        <div></div>
        <h1 className="text-3xl mb-4">SEND EM TO ZER0</h1>
        <div></div>
      </div>
    <div className="flex flex-col items-center justify-center h-screen">
      {difficulty === null ? (
        renderDifficultyButtons()
      ) : (
        <>
          {gameOver ? (
            <>
              <h2 className="text-2xl mb-8">Game Over</h2>
              <h2 className="text-2xl mb-4">{`Score: ${score}`}</h2>
              <h2 className="text-2xl mb-8">{`Wave: ${wave}`}</h2>
              <button
                className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600"
                onClick={handleRestart}
              >
                RESTART
              </button>
            </>
          ) : (
            <>
              <div className="relative w-96 h-3/5 bg-black border-2 border-white flex flex-row">
                {/* Overlay with game stats */}
                <div className="absolute top-0 left-0 w-full p-1 bg-gray-800 bg-opacity-50 z-10">
                  <div className="flex justify-between">
                    <p className="text-xs mb-2">Score: {score}</p>
                    <p className="text-xs mb-2">Lives: {lives}</p>
                    <p className="text-xs mb-2">Wave: {wave}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-xs mb-4">Objects Destroyed: {objectsDestroyed}/{objectsPerWave}</p>
                    {powerUp && powerUpTimer > 0 && (
                      <p className="text-xs mb-2">{powerUp} - {powerUpTimer}s</p>
                    )}
                  </div>
                </div>
                {waveMessage && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-70 text-white p-2 rounded-lg z-10">
                    {waveMessage}
                  </div>
                )}
                {pauseMessage && (
                  <div className="absolute h-full w-full bg-black bg-opacity-70 text-white p-2 rounded-lg z-20 flex justify-center items-center">
                    <div>
                      {pauseMessage}
                    </div>
                  </div>
                )}
                {[...Array(numColumns)].map((_, col) => (
                  <div key={col} className="flex-1 relative flex flex-col">
                    {objects
                      .filter((obj) => obj.column === col)
                      .map((obj) => (
                        <div
                          key={obj.id}
                          className="absolute text-2xl transition-all duration-100 left-1/2 transform -translate-x-1/2"
                          style={{ bottom: `${obj.position}%` }}
                        >
                          {objectTypes.find((type) => type.type === obj.type)?.icon}
                        </div>
                      ))}
                    {playerColumn === col && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-2xl">
                        ☝️ {/* Player Icon */}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {!gameStarted && !gameOver ? (
                <button
                  className="w-64 h-24 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 mt-2"
                  onClick={handleStart}
                >
                  START GAME
                </button>
              ) : (
                <>
                  <div className="flex justify-around w-96 mt-4">
                    <button
                      className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                      onClick={movePlayerLeft}
                    >
                      <div>MOVE LEFT</div>
                      <div className='text-xs'>{`(LEFT ARROW)`}</div>      
                    </button>
                    <button
                      className="h-16 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                      onClick={() => handleDestroy()}
                    >
                    <div>SHOOT</div>
                    <div className='text-xs'>{`(SPACEBAR)`}</div>  
                    </button>
                    <button
                      className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                      onClick={movePlayerRight}
                    >
                    <div>MOVE RIGHT</div>
                    <div className='text-xs'>{`(RIGHT ARROW)`}</div>  
                    </button>
                  </div>

                  <div className='flex justify-between w-96 mt-2'>
                    <button
                      className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 ml-3"
                      onClick={handlePause}
                    >
                      {paused ? 'RESUME' : 'PAUSE'}
                    </button>
                    <button
                      className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 mr-3"
                      onClick={handleRestart}
                    >
                      RESTART
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
    
    <div className="fixed bottom-0 left-0 right-0 bg-gray-600 p-2">by 11pxl.com</div>
    </div>
  );
}

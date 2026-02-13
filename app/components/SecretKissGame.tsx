'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';

type GameState = 'playing' | 'gameOver';
type PrincipalState = 'safe' | 'warning' | 'danger';
type Heart = {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    createdAt: number;
};

const GAME_OVER_MESSAGES = [
    "ONUR BEY SENİ DİSİPLİNE GÖTÜRDÜ!",
    "YAKALANDIN!",
    "DİSİPLİN!!!",
    "KAYBETTİN!",
    "OKULDAN ATILDIN!"
];

export default function GizliAskGame() {
    const [gameState, setGameState] = useState<GameState>('playing');
    const [gameOverMessage, setGameOverMessage] = useState('');
    const [isKissing, setIsKissing] = useState(false);
    const [score, setScore] = useState(0);
    // Load high score from localStorage (lazy initialization)
    const [highScore, setHighScore] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('gizliAskHighScore');
            return saved ? parseInt(saved) : 0;
        }
        return 0;
    });
    const [principalState, setPrincipalState] = useState<PrincipalState>('safe');
    const [hearts, setHearts] = useState<Heart[]>([]);

    // Determine current HighScore Ref to use in loop
    const highScoreRef = useRef(highScore);
    useEffect(() => {
        highScoreRef.current = highScore;
    }, [highScore]);

    // To access state inside timeouts without dependencies
    const isKissingRef = useRef(false);
    useEffect(() => {
        isKissingRef.current = isKissing;
    }, [isKissing]);

    const principalTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const warningTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const dangerTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const scoreIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

    // Audio refs
    const bgmRef = useRef<HTMLAudioElement | null>(null);
    const kissRef = useRef<HTMLAudioElement | null>(null);
    const alertRef = useRef<HTMLAudioElement | null>(null);
    const whooshRef = useRef<HTMLAudioElement | null>(null);
    const loseRef = useRef<HTMLAudioElement | null>(null);
    const bgmStartedRef = useRef(false);

    // Initialize audio objects
    useEffect(() => {
        bgmRef.current = new Audio('/bgm.mp3');
        bgmRef.current.loop = true;
        bgmRef.current.volume = 0.4;

        kissRef.current = new Audio('/kiss.mp3');
        kissRef.current.loop = true;

        alertRef.current = new Audio('/alert.mp3');
        whooshRef.current = new Audio('/whoosh.mp3');
        loseRef.current = new Audio('/lose.mp3');

        return () => {
            // Cleanup audio on unmount
            if (bgmRef.current) {
                bgmRef.current.pause();
                bgmRef.current = null;
            }
            if (kissRef.current) {
                kissRef.current.pause();
                kissRef.current = null;
            }
            if (alertRef.current) alertRef.current = null;
            if (whooshRef.current) whooshRef.current = null;
            if (loseRef.current) {
                loseRef.current.pause();
                loseRef.current = null;
            }
        };
    }, []);

    // Removed load/save high score effects - now handled in game logic

    const handleGameOver = useCallback(() => {
        setGameState('gameOver');
        setGameOverMessage(GAME_OVER_MESSAGES[Math.floor(Math.random() * GAME_OVER_MESSAGES.length)]);

        if (loseRef.current) {
            loseRef.current.currentTime = 0;
            loseRef.current.play().catch(err => console.log('Lose sound error:', err));
        }
        if (bgmRef.current) {
            bgmRef.current.pause();
            bgmRef.current.currentTime = 0;
        }
    }, []);

    // Principal random turn logic
    useEffect(() => {
        if (gameState !== 'playing') return;

        const scheduleNextTurn = () => {
            const delay = Math.random() * 4000 + 3000; // 3-7 seconds

            principalTimerRef.current = setTimeout(() => {
                // Warning phase
                setPrincipalState('warning');

                // After 1s, turn around to danger
                warningTimerRef.current = setTimeout(() => {
                    setPrincipalState('danger');

                    // Check if caught
                    if (isKissingRef.current) {
                        handleGameOver();
                        return;
                    }

                    // Stay in danger for 1.5-2.5 seconds
                    const dangerDuration = Math.random() * 1000 + 1500; // 1.5-2.5 seconds
                    dangerTimerRef.current = setTimeout(() => {
                        // Check again if caught during danger phase
                        if (isKissingRef.current) {
                            handleGameOver();
                        } else {
                            setPrincipalState('safe');
                            scheduleNextTurn();
                        }
                    }, dangerDuration);
                }, 1000); // 1 second warning
            }, delay);
        };

        scheduleNextTurn();

        return () => {
            if (principalTimerRef.current) clearTimeout(principalTimerRef.current);
            if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
            if (dangerTimerRef.current) clearTimeout(dangerTimerRef.current);
        };
    }, [gameState, handleGameOver]);

    // Score increment while kissing
    useEffect(() => {
        if (isKissing && gameState === 'playing') {
            scoreIntervalRef.current = setInterval(() => {
                setScore(s => {
                    const newScore = s + 1;
                    if (newScore > highScoreRef.current) {
                        setHighScore(newScore);
                        localStorage.setItem('gizliAskHighScore', newScore.toString());
                    }
                    return newScore;
                });
            }, 50); // 20 points per second

            return () => {
                if (scoreIntervalRef.current) clearInterval(scoreIntervalRef.current);
            };
        }
    }, [isKissing, gameState]);

    // Check if caught during kissing


    // Background music - start on first interaction
    useEffect(() => {
        if (isKissing && !bgmStartedRef.current && bgmRef.current) {
            bgmRef.current.play().catch(err => console.log('BGM autoplay blocked:', err));
            bgmStartedRef.current = true;
        }
    }, [isKissing]);

    // Kissing sound - loop while kissing
    useEffect(() => {
        if (kissRef.current) {
            if (isKissing && gameState === 'playing') {
                kissRef.current.currentTime = 0;
                kissRef.current.play().catch(err => console.log('Kiss sound error:', err));
            } else {
                kissRef.current.pause();
                kissRef.current.currentTime = 0;
            }
        }
    }, [isKissing, gameState]);

    // Warning sound - play when principal enters warning state
    useEffect(() => {
        const audio = alertRef.current;
        if (principalState === 'warning' && audio) {
            audio.currentTime = 0;
            audio.play().catch(err => console.log('Alert sound error:', err));
        }

        return () => {
            if (principalState === 'warning' && audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        };
    }, [principalState]);

    // Whoosh sound - play when principal turns to danger
    useEffect(() => {
        if (principalState === 'danger' && whooshRef.current) {
            whooshRef.current.currentTime = 0;
            whooshRef.current.play().catch(err => console.log('Whoosh sound error:', err));
        }
    }, [principalState]);

    // Removed separate lose sound effect as it's handled in handleGameOver

    // Unified Game Loop for Hearts & Score
    useEffect(() => {
        let animationFrameId: number;
        let lastTime = performance.now();
        let heartSpawnTimer = 0;

        const loop = (time: number) => {
            const deltaTime = time - lastTime;
            lastTime = time;

            if (gameState === 'playing') {
                // Score Update logic (approx every 50ms)
                if (isKissingRef.current) {
                    // Score is updated via separate interval still or can be moved here. 
                    // Keeping score separate for now to minimize complexity, but heart logic moves here.
                }

                // Spawn Hearts
                if (isKissingRef.current) {
                    heartSpawnTimer += deltaTime;
                    if (heartSpawnTimer >= 200) { // Spawn every 200ms
                        const newHeart: Heart = {
                            id: Date.now() + Math.random(),
                            x: 0,
                            y: 0,
                            vx: (Math.random() - 0.5) * 4,
                            vy: -2 - Math.random() * 2,
                            createdAt: Date.now() // Add creation time for cleanup
                        };
                        setHearts(prev => [...prev, newHeart]);
                        heartSpawnTimer = 0;
                    }
                }

                // Update Hearts
                setHearts(prevHearts => {
                    if (prevHearts.length === 0) return prevHearts;

                    const now = Date.now();
                    return prevHearts
                        .filter(heart => now - heart.createdAt < 2000) // Remove after 2s
                        .map(heart => ({
                            ...heart,
                            x: heart.x + heart.vx,
                            y: heart.y + heart.vy,
                            vy: heart.vy + 0.1, // Gravity
                        }));
                });
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);

        return () => cancelAnimationFrame(animationFrameId);
    }, [gameState]); // Removed isKissing dependency to avoid resetting loop, using Ref instead

    const handleMouseDown = useCallback(() => {
        if (gameState === 'playing') {
            if (principalState === 'danger') {
                handleGameOver();
            } else {
                setIsKissing(true);
            }
        }
    }, [gameState, principalState, handleGameOver]);

    const handleMouseUp = useCallback(() => {
        setIsKissing(false);
    }, []);

    const resetGame = useCallback(() => {
        setGameState('playing');
        setIsKissing(false);
        setScore(0);
        setPrincipalState('safe');
        setHearts([]); // Clear hearts on reset

        // Stop lose sound
        if (loseRef.current) {
            loseRef.current.pause();
            loseRef.current.currentTime = 0;
        }

        // Restart bgm
        if (bgmRef.current) {
            bgmRef.current.currentTime = 0;
            bgmRef.current.play().catch(console.error);
        }
    }, []);

    return (
        <div
            className="relative w-full h-screen overflow-hidden select-none touch-none"
            onContextMenu={(e) => e.preventDefault()}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            style={{
                touchAction: 'none',
                background: 'linear-gradient(to bottom, #8B7355 0%, #D2B48C 15%, #F5DEB3 40%, #8B7355 100%)',
                WebkitTouchCallout: 'none', userSelect: 'none'
            }}
        >
            {/* Hallway pattern overlay */}
            <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: `
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 50px,
            rgba(139, 115, 85, 0.3) 50px,
            rgba(139, 115, 85, 0.3) 52px
          )
        `
            }} />

            {/* Floor */}
            <div className="absolute bottom-0 left-0 right-0 h-2/4 bg-gradient-to-b from-gray-400 to-gray-500 opacity-60" />

            {/* Score Display - Top Left */}
            <div className="absolute top-4 left-4 z-30">
                <div className="bg-black bg-opacity-70 px-4 py-3 rounded-lg shadow-xl border-2 border-yellow-500">
                    <div className="text-yellow-400 font-bold text-lg sm:text-xl" style={{ fontFamily: 'monospace' }}>
                        PUAN: {score}
                    </div>
                    <div className="text-orange-400 font-bold text-sm sm:text-base" style={{ fontFamily: 'monospace' }}>
                        REKOR: {highScore}
                    </div>
                </div>
            </div>

            {/* Warning Indicator - Center */}
            {principalState === 'warning' && (
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
                    <div className="text-8xl sm:text-9xl animate-pulse text-red-600 font-bold drop-shadow-2xl">
                        !
                    </div>
                </div>
            )}

            {/* Main Game Scene Container */}
            <div className="absolute inset-0 flex items-center justify-center">
                {/* Couple - Center Stage (Focal Point) */}
                {/* Couple and Hearts Container */}
                <div className="absolute flex items-center justify-center pointer-events-none">
                    <div className="relative mt-100 w-90 h-90 flex items-center justify-center">
                        {/* Couple Image */}
                        <Image
                            src={isKissing ? "/image2.png" : "/image1.png"}
                            alt={isKissing ? "Öpüşen çift" : "Çift"}
                            width={300}
                            height={300}
                            priority
                            draggable={false}
                            className="w-full h-full object-contain pointer-events-auto"
                            style={{
                                imageRendering: 'pixelated',
                                WebkitTouchCallout: 'none',
                                WebkitUserSelect: 'none'
                            }}
                        />

                        {/* Hearts particles */}
                        {hearts.map(heart => (
                            <Image
                                key={heart.id}
                                src="/heart.png"
                                alt="Heart"
                                width={30}
                                height={30}
                                className="absolute pointer-events-none"
                                style={{
                                    left: '50%',
                                    top: '50%',
                                    transform: `translate(-50%, -50%) translate(${heart.x}px, ${heart.y}px)`,
                                    opacity: Math.max(0, 1 - Math.abs(heart.y) / 100),
                                    imageRendering: 'pixelated',
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Principal - Foreground (Bottom, Smaller for Perspective) */}
                <div className="absolute flex items-center justify-center">
                    <Image
                        src={principalState === 'danger' ? "/image3.png" : "/image4.png"}
                        alt={principalState === 'danger' ? "Müdür bakıyor" : "Müdür arkası dönük"}
                        width={200}
                        height={200}
                        priority
                        draggable={false}
                        className="object-contain w-110 h-110 mb-80"
                        style={{
                            imageRendering: 'pixelated',
                            WebkitTouchCallout: 'none',
                            WebkitUserSelect: 'none',
                            pointerEvents: 'none'
                        }}
                    />
                </div>
            </div>

            {/* Instruction Text - Bottom Right (Hidden on very small screens when playing) */}
            {!isKissing && gameState === 'playing' && (
                <div className="absolute bottom-4 right-4 z-30 hidden sm:block">
                    <div className="bg-black bg-opacity-70 px-3 py-2 rounded-lg text-white text-xs sm:text-sm font-bold" style={{ fontFamily: 'monospace' }}>
                        BAS VE TUT = ÖPÜŞ<br />
                        ! GÖRÜNCE BIRAK!
                    </div>
                </div>
            )}

            {/* Game Over Screen */}
            {gameState === 'gameOver' && (
                <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
                    <div className="bg-gradient-to-b from-red-800 to-red-900 rounded-2xl p-8 sm:p-12 text-center max-w-sm sm:max-w-lg mx-4 shadow-2xl border-4 border-yellow-500">
                        <h1 className="text-5xl sm:text-7xl font-bold text-yellow-400 mb-6 animate-pulse" style={{ fontFamily: 'monospace' }}>
                            {gameOverMessage}
                        </h1>
                        <div className="text-2xl sm:text-3xl mb-3 text-white font-bold" style={{ fontFamily: 'monospace' }}>
                            PUAN: <span className="text-yellow-400">{score}</span>
                        </div>
                        <div className="text-xl sm:text-2xl mb-8 text-white font-bold" style={{ fontFamily: 'monospace' }}>
                            REKOR: <span className="text-orange-400">{highScore}</span>
                        </div>
                        <button
                            onClick={resetGame}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold text-2xl sm:text-3xl px-8 sm:px-12 py-4 sm:py-5 rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105 border-4 border-green-400"
                            style={{ fontFamily: 'monospace' }}
                        >
                            TEKRAR DENE
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
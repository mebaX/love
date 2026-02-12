'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';

type GameState = 'playing' | 'gameOver';
type PrincipalState = 'safe' | 'warning' | 'danger';

export default function GizliAskGame() {
    const [gameState, setGameState] = useState<GameState>('playing');
    const [isKissing, setIsKissing] = useState(false);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [principalState, setPrincipalState] = useState<PrincipalState>('safe');

    const principalTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const warningTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const dangerTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const scoreIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

    // Load high score from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('gizliAskHighScore');
        if (saved) setHighScore(parseInt(saved));
    }, []);

    // Update high score
    useEffect(() => {
        if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('gizliAskHighScore', score.toString());
        }
    }, [score, highScore]);

    // Principal random turn logic
    useEffect(() => {
        if (gameState !== 'playing') return;

        const scheduleNextTurn = () => {
            const delay = Math.random() * 4000 + 3000; // 3-7 seconds

            principalTimerRef.current = setTimeout(() => {
                // Warning phase
                setPrincipalState('warning');

                // After 0.5s, turn around to danger
                warningTimerRef.current = setTimeout(() => {
                    setPrincipalState('danger');

                    // Check if caught
                    if (isKissing) {
                        setGameState('gameOver');
                        return;
                    }

                    // Stay in danger for 1.5-2.5 seconds
                    const dangerDuration = Math.random() * 1000 + 1500; // 1.5-2.5 seconds
                    dangerTimerRef.current = setTimeout(() => {
                        // Check again if caught during danger phase
                        if (isKissing) {
                            setGameState('gameOver');
                        } else {
                            setPrincipalState('safe');
                            scheduleNextTurn();
                        }
                    }, dangerDuration);
                }, 500); // 0.5 second warning
            }, delay);
        };

        scheduleNextTurn();

        return () => {
            if (principalTimerRef.current) clearTimeout(principalTimerRef.current);
            if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
            if (dangerTimerRef.current) clearTimeout(dangerTimerRef.current);
        };
    }, [gameState, isKissing]);

    // Score increment while kissing
    useEffect(() => {
        if (isKissing && gameState === 'playing') {
            scoreIntervalRef.current = setInterval(() => {
                setScore(s => s + 1);
            }, 50); // 20 points per second

            return () => {
                if (scoreIntervalRef.current) clearInterval(scoreIntervalRef.current);
            };
        }
    }, [isKissing, gameState]);

    // Check if caught during kissing
    useEffect(() => {
        if (isKissing && principalState === 'danger' && gameState === 'playing') {
            setGameState('gameOver');
        }
    }, [isKissing, principalState, gameState]);

    const handleMouseDown = () => {
        if (gameState === 'playing') {
            setIsKissing(true);
        }
    };

    const handleMouseUp = () => {
        setIsKissing(false);
    };

    const resetGame = () => {
        setGameState('playing');
        setIsKissing(false);
        setScore(0);
        setPrincipalState('safe');
    };

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
                <div className="absolute flex items-center justify-center">
                    <Image
                        src={isKissing ? "/image2.png" : "/image1.png"}
                        alt={isKissing ? "Öpüşen çift" : "Çift"}
                        width={300}
                        height={300}
                        priority
                        draggable={false}
                        className="object-contain mt-100 w-90 h-90 "
                        style={{
                            imageRendering: 'pixelated',
                            WebkitTouchCallout: 'none',
                            WebkitUserSelect: 'none',
                            pointerEvents: 'none'
                        }}
                    />
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
                            YAKALANDIN!
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

import React, { useEffect, useRef } from "react";

interface HistogramProps {
    activeFilm?: string;
}


export const HistogramHUD: React.FC<HistogramProps> = ({ activeFilm }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;

            ctx.beginPath();
            ctx.moveTo(width / 3, 0); ctx.lineTo(width / 3, height);
            ctx.moveTo((width * 2) / 3, 0); ctx.lineTo((width * 2) / 3, height);
            ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2);
            ctx.stroke();

            const points = 32;
            const barWidth = width / points;

            ctx.beginPath();
            ctx.moveTo(0, height);

            for (let i = 0; i <= points; i++) {
                const x = i * barWidth;
                const time = Date.now() * 0.002;
                const baseCurve = Math.sin((i / points) * Math.PI) * (height * 0.7);
                const noise = Math.sin(i * 0.5 + time) * 6;
                const filmBias = activeFilm === 'film-cinestill' ? (i > points / 2 ? 10 : -5) : 0;

                const y = Math.max(4, height - (baseCurve + noise + filmBias));
                ctx.lineTo(x, y);
            }

            ctx.lineTo(width, height);
            ctx.closePath();

            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');

            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(animationFrameId);
    }, [activeFilm]);

    return (
        <div className="viewfinder-histogram" title="Luminance Histogram">
            <canvas ref={canvasRef} width={110} height={50} />
            <div className="histogram-labels">
                {/* <span>0</span>
                <span>RGB</span>
                <span>255</span> */}
            </div>
        </div>
    );
};
import React from 'react';

// --- Helper Functions and Components ---

// Creates the wavy path for a horizontal stripe
const createWavyPath = (yOffset: number, h: number, width: number, height: number): string => {
    const waveAmplitude = height * 0.05;
    const waveFrequency = (2 * Math.PI) / width;
    const wavePhase = Math.PI / 8;
    const applyWave = (x: number, y: number) => y + waveAmplitude * Math.sin(waveFrequency * x + wavePhase);
    
    let path = `M 0 ${applyWave(0, yOffset)}`;
    for (let x = 1; x <= width; x++) {
      path += ` L ${x} ${applyWave(x, yOffset)}`;
    }
    path += ` L ${width} ${applyWave(width, yOffset + h)}`;
    for (let x = width - 1; x >= 0; x--) {
      path += ` L ${x} ${applyWave(x, yOffset + h)}`;
    }
    path += ' Z';
    return path;
};

// Creates a 5-pointed star path
const createStarPath = (cx: number, cy: number, radius: number): string => {
    let path = '';
    for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - (Math.PI / 2);
        const r = (i % 2 === 0) ? radius : radius / 2.5;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        path += `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }
    return path + ' Z';
};

// Gets the vertical offset for an element at a specific x-coordinate due to the wave
const getWavedY = (x: number, y: number, width: number, height: number): number => {
    const waveAmplitude = height * 0.05;
    const waveFrequency = (2 * Math.PI) / width;
    const wavePhase = Math.PI / 8;
    return y + waveAmplitude * Math.sin(waveFrequency * x + wavePhase);
};

// Creates a wavy path for a vertical stripe
const createWavyVerticalPath = (xOffset: number, w: number, width: number, height: number): string => {
    const waveAmplitude = width * 0.04;
    const waveFrequency = (2 * Math.PI) / height;
    const wavePhase = Math.PI / 4;
    const applyVerticalWave = (x: number, y: number) => x + waveAmplitude * Math.sin(waveFrequency * y + wavePhase);

    let path = `M ${applyVerticalWave(xOffset, 0)} 0`;
    for (let y = 1; y <= height; y++) {
      path += ` L ${applyVerticalWave(xOffset, y)} ${y}`;
    }
    path += ` L ${applyVerticalWave(xOffset + w, height)} ${height}`;
    for (let y = height - 1; y >= 0; y--) {
      path += ` L ${applyVerticalWave(xOffset + w, y)} ${y}`;
    }
    path += ' Z';
    return path;
};

// Gets the horizontal offset for an element at a specific y-coordinate due to the vertical wave
const getWavedX = (x: number, y: number, width: number, height: number): number => {
    const waveAmplitude = width * 0.04;
    const waveFrequency = (2 * Math.PI) / height;
    const wavePhase = Math.PI / 4;
    return x + waveAmplitude * Math.sin(waveFrequency * y + wavePhase);
};

// Creates a wavy path for a horizontal stripe with the wave effect concentrated at the end.
const createSlightWavyPath = (yOffset: number, h: number, width: number, height: number): string => {
    const waveAmplitude = height * 0.03; // Reduced amplitude
    const waveFrequency = (2 * Math.PI) / width;
    const wavePhase = Math.PI / 8;
    // Modulate amplitude based on x-position. Start wave effect from the middle.
    const applyWave = (x: number, y: number) => y + (waveAmplitude * Math.max(0, (x - width / 2) / (width / 2))) * Math.sin(waveFrequency * x + wavePhase);
    
    let path = `M 0 ${applyWave(0, yOffset)}`;
    for (let x = 1; x <= width; x++) {
      path += ` L ${x} ${applyWave(x, yOffset)}`;
    }
    path += ` L ${width} ${applyWave(width, yOffset + h)}`;
    for (let x = width - 1; x >= 0; x--) {
      path += ` L ${x} ${applyWave(x, yOffset + h)}`;
    }
    path += ' Z';
    return path;
};

// Gets the vertical offset for an element at a specific x-coordinate due to the slight wave.
const getSlightWavedY = (x: number, y: number, width: number, height: number): number => {
    const waveAmplitude = height * 0.03; // Reduced amplitude
    const waveFrequency = (2 * Math.PI) / width;
    const wavePhase = Math.PI / 8;
    return y + (waveAmplitude * Math.max(0, (x - width / 2) / (width / 2))) * Math.sin(waveFrequency * x + wavePhase);
};

// Creates a wavy path for a vertical stripe with the wave effect concentrated at the end (right side).
const createSlightWavyVerticalPath = (xOffset: number, w: number, width: number, height: number): string => {
    const baseWaveAmplitude = width * 0.025; // Reduced amplitude
    // Modulate amplitude based on the stripe's horizontal position.
    // The further to the right, the wavier it gets.
    const modulationFactor = Math.pow((xOffset + w / 2) / width, 2); 
    const waveAmplitude = baseWaveAmplitude * modulationFactor;
    
    const waveFrequency = (2 * Math.PI) / height;
    const wavePhase = Math.PI / 4;
    const applyVerticalWave = (x: number, y: number) => x + waveAmplitude * Math.sin(waveFrequency * y + wavePhase);

    let path = `M ${applyVerticalWave(xOffset, 0)} 0`;
    for (let y = 1; y <= height; y++) {
      path += ` L ${applyVerticalWave(xOffset, y)} ${y}`;
    }
    path += ` L ${applyVerticalWave(xOffset + w, height)} ${height}`;
    for (let y = height - 1; y >= 0; y--) {
      path += ` L ${applyVerticalWave(xOffset + w, y)} ${y}`;
    }
    path += ' Z';
    return path;
};

// Gets the horizontal offset for an element at a specific y-coordinate due to the slight vertical wave
const getSlightWavedX = (x: number, y: number, width: number, height: number): number => {
    const baseWaveAmplitude = width * 0.025; // Reduced amplitude
    const modulationFactor = Math.pow(x / width, 2);
    const waveAmplitude = baseWaveAmplitude * modulationFactor;

    const waveFrequency = (2 * Math.PI) / height;
    const wavePhase = Math.PI / 4;
    return x + waveAmplitude * Math.sin(waveFrequency * y + wavePhase);
};


// Wrapper for common flag effects (shadow & gloss)
const FlagWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <svg width="100%" height="100%" viewBox="0 0 35 20" preserveAspectRatio="none" style={{ borderRadius: '4px' }}>
        <defs>
            <filter id="flag-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0.5" dy="1" stdDeviation="0.5" floodColor="#000" floodOpacity="0.5" />
            </filter>
            <linearGradient id="flag-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: 'white', stopOpacity: 0.4 }} />
                <stop offset="30%" style={{ stopColor: 'white', stopOpacity: 0.1 }} />
                <stop offset="70%" style={{ stopColor: 'black', stopOpacity: 0.1 }} />
                <stop offset="100%" style={{ stopColor: 'black', stopOpacity: 0.3 }} />
            </linearGradient>
        </defs>
        <g>
            {children}
        </g>
    </svg>
);


// --- Individual Flag Components ---

const PahlaviFlag: React.FC = () => {
    const w = 35, h = 20;
    const stripeH = h / 3;
    const centerX = w / 2;
    const centerY = h / 2;
    
    // Wave calculations
    const waveOffsetY = getWavedY(centerX, centerY, w, h) - centerY;

    // Stylized path for the lion and sun
    // Sun rays
    const sunRays = [];
    const numRays = 12;
    const rayRadiusOuter = 2.0;
    const rayRadiusInner = 0.6;
    for (let i = 0; i < numRays; i++) {
        const angle = (2 * Math.PI / numRays) * i - (Math.PI / 2);
        const x1 = Math.cos(angle) * rayRadiusInner;
        const y1 = Math.sin(angle) * rayRadiusInner;
        const x2 = Math.cos(angle) * rayRadiusOuter;
        const y2 = Math.sin(angle) * rayRadiusOuter;
        sunRays.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#EBB92D" strokeWidth="0.25" />);
    }

    // Stylized wreath
    const leftBranch = [];
    const rightBranch = [];
    const numLeaves = 8;
    for (let i = 0; i < numLeaves; i++) {
        const angle = Math.PI - (i * 0.35);
        const lx = Math.cos(angle) * 3.5;
        const ly = Math.sin(angle) * 3.5;
        leftBranch.push(<ellipse key={i} cx={lx} cy={ly} rx="0.4" ry="0.6" fill="#D4AF37" transform={`rotate(${(angle * 180 / Math.PI) + 90}, ${lx}, ${ly})`} />);
        
        const angleR = (i * 0.35);
        const rx = Math.cos(angleR) * 3.5;
        const ry = Math.sin(angleR) * 3.5;
        rightBranch.push(<ellipse key={i} cx={rx} cy={ry} rx="0.4" ry="0.6" fill="#D4AF37" transform={`rotate(${(angleR * 180 / Math.PI) - 90}, ${rx}, ${ry})`} />);
    }

    return (
        <FlagWrapper>
            <path d={createWavyPath(0, stripeH, w, h)} fill="#239F40" />
            <path d={createWavyPath(stripeH, stripeH, w, h)} fill="#FFFFFF" />
            <path d={createWavyPath(2 * stripeH, stripeH, w, h)} fill="#DA291C" />
            
            <g transform={`translate(${centerX}, ${centerY + waveOffsetY + 0.5})`}>
                {/* Wreath */}
                <g transform="translate(0, 0.5)">
                    {leftBranch}
                    {rightBranch}
                    {/* Bottom Ribbon */}
                    <path d="M -0.8 3.5 C -1 4.5, 1 4.5, 0.8 3.5 Z" fill="#D4AF37" />
                </g>

                {/* Sun */}
                <circle r="0.6" fill="#EBB92D" />
                {sunRays}
                
                {/* Pahlavi Crown */}
                <g transform="translate(0, -4.5) scale(0.12)">
                    {/* Base */}
                    <path d="M -15 10 L 15 10 L 12 15 L -12 15 Z" fill="#D4AF37" stroke="#000" strokeWidth="1" />
                    {/* Main Structure */}
                    <path d="M -12 10 C -20 -10, 20 -10, 12 10" fill="#D4AF37" stroke="#000" strokeWidth="1" />
                    {/* Arches/Points */}
                    <path d="M -10 10 L -12 2 L -8 5 L -5 0 L 0 5 L 5 0 L 8 5 L 12 2 L 10 10" fill="#D4AF37" stroke="#000" strokeWidth="1" />
                    {/* Ornament/Aigrette */}
                    <path d="M 0 -2 L -2 -8 L 0 -12 L 2 -8 Z" fill="#D4AF37" stroke="#000" strokeWidth="1" />
                    <circle cx="0" cy="-14" r="1.5" fill="#D4AF37" stroke="#000" strokeWidth="1" />
                </g>
            </g>
        </FlagWrapper>
    );
};

const ChechenFlag: React.FC = () => {
    const w = 35, h = 20;
    const greenH = h * 0.475;
    const whiteH = h * 0.05;
    const redH = h * 0.475;
    const ornamentStripeW = w * 0.15;

    const ornamentPath = `
        M ${ornamentStripeW / 2}, 1.5
        C ${ornamentStripeW * 0.1}, 1.5, ${ornamentStripeW * 0.1}, 2.5, ${ornamentStripeW / 2}, 2.5
        S ${ornamentStripeW * 0.9}, 3.5, ${ornamentStripeW / 2}, 4.5
        S ${ornamentStripeW * 0.1}, 5.5, ${ornamentStripeW / 2}, 6.5
        C ${ornamentStripeW * 0.9}, 6.5, ${ornamentStripeW * 0.9}, 7.5, ${ornamentStripeW / 2}, 7.5
        S ${ornamentStripeW * 0.1}, 8.5, ${ornamentStripeW / 2}, 9.5
        S ${ornamentStripeW * 10.5}, ${ornamentStripeW / 2}, 11.5
        C ${ornamentStripeW * 0.1}, 11.5, ${ornamentStripeW * 0.1}, 12.5, ${ornamentStripeW / 2}, 12.5
        S ${ornamentStripeW * 0.9}, 13.5, ${ornamentStripeW / 2}, 14.5
        S ${ornamentStripeW * 0.1}, 15.5, ${ornamentStripeW / 2}, 16.5
        C ${ornamentStripeW * 0.9}, 16.5, ${ornamentStripeW * 0.9}, 17.5, ${ornamentStripeW / 2}, 17.5
        S ${ornamentStripeW * 0.1}, 18.5, ${ornamentStripeW / 2}, 18.5
    `;

    const verticalStripePath = createSlightWavyVerticalPath(0, ornamentStripeW, w, h);
    const waveOffsetX = getSlightWavedX(ornamentStripeW / 2, h / 2, w, h) - (ornamentStripeW / 2);

    return (
        <FlagWrapper>
            <path d={createSlightWavyPath(0, greenH, w, h)} fill="#007A3D" />
            <path d={createSlightWavyPath(greenH, whiteH, w, h)} fill="#FFFFFF" />
            <path d={createSlightWavyPath(greenH + whiteH, redH, w, h)} fill="#CE1126" />
            <path d={verticalStripePath} fill="#FFFFFF" />
            <g transform={`translate(${waveOffsetX}, 0)`}>
                 <path d={ornamentPath} stroke="#FFD700" strokeWidth="1" fill="none" strokeLinecap="round" />
            </g>
        </FlagWrapper>
    );
};

const AbkhaziaFlag: React.FC = () => {
    const w = 35, h = 20;
    const stripeH = h / 7;
    const cantonW = w * 0.4; // 14
    const cantonH = stripeH * 3; // ~8.57

    // Define colors
    const green = '#007A3D';
    const red = '#CE1126';
    const white = '#FFFFFF';

    // Wavy path for the red canton
    const cantonPath = `
        M 0 ${getWavedY(0, 0, w, h)}
        L ${cantonW} ${getWavedY(cantonW, 0, w, h)}
        L ${cantonW} ${getWavedY(cantonW, cantonH, w, h)}
        L 0 ${getWavedY(0, cantonH, w, h)}
        Z
    `;

    // Star properties and positions
    const stars = [];
    const arcCX = cantonW / 2;
    const arcCY = cantonH * 0.45;
    const arcRadius = cantonW * 0.3;
    const starRadius = 0.6;
    const numStars = 7;
    const angleSpan = 140;
    const startAngle = -90 - angleSpan / 2;
    const angleStep = angleSpan / (numStars - 1);

    for (let i = 0; i < numStars; i++) {
        const angle = startAngle + i * angleStep;
        const angleRad = angle * Math.PI / 180;
        const starCX = arcCX + arcRadius * Math.cos(angleRad);
        const starCY = arcCY + arcRadius * Math.sin(angleRad);
        stars.push({ cx: starCX, cy: starCY });
    }

    // Calculate wave offset for the symbols group
    const symbolsCX = cantonW / 2;
    const symbolsCY = cantonH / 2;
    const waveOffsetY = getWavedY(symbolsCX, symbolsCY, w, h) - symbolsCY;

    return (
        <FlagWrapper>
            {/* 7 Horizontal Stripes */}
            {Array.from({ length: 7 }).map((_, i) => (
                <path key={i} d={createWavyPath(i * stripeH, stripeH, w, h)} fill={i % 2 === 0 ? green : white} />
            ))}

            {/* Red Canton */}
            <path d={cantonPath} fill={red} />

            {/* Group for Hand and Stars to apply wave offset */}
            <g transform={`translate(0, ${waveOffsetY})`}>
                {/* Hand */}
                <text x={cantonW / 2} y={cantonH * 0.75} dominantBaseline="middle" textAnchor="middle" fontSize="5">✋🏻</text>
                {/* Stars */}
                {stars.map((star, i) => (
                    <path key={i} d={createStarPath(star.cx, star.cy, starRadius)} fill={white} />
                ))}
            </g>
        </FlagWrapper>
    );
};

const SouthYemenFlag: React.FC = () => {
    const w = 35, h = 20;
    const stripeH = h / 3;
    const trianglePointX = w * 0.4; 
    const starCX = trianglePointX * 0.45;
    const starCY = h / 2;

    const waveOffsetY = getWavedY(starCX, starCY, w, h) - starCY;
    
    const wavedTrianglePath = `M 0 ${getWavedY(0, 0, w, h)} L ${trianglePointX} ${getWavedY(trianglePointX, h/2, w, h)} L 0 ${getWavedY(0, h, w, h)} Z`;
    
    return (
        <FlagWrapper>
            <path d={createWavyPath(0, stripeH, w, h)} fill="#E4002B" />
            <path d={createWavyPath(stripeH, stripeH, w, h)} fill="#FFFFFF" />
            <path d={createWavyPath(2 * stripeH, stripeH, w, h)} fill="#000000" />
            <path d={wavedTrianglePath} fill="#75AADB" />
            <g transform={`translate(0, ${waveOffsetY})`}>
                <path d={createStarPath(starCX, starCY, h * 0.15)} fill="#E4002B" />
            </g>
        </FlagWrapper>
    );
};

const TibetFlag: React.FC = () => {
    const w = 35, h = 20;
    const sunX = w / 2;
    const sunY = 5.5;
    const sunR = 4.5;

    const redRays = [
        `M ${sunX} ${sunY} L 0 0 L 6 0 Z`,
        `M ${sunX} ${sunY} L ${w} 0 L ${w - 6} 0 Z`,
        `M ${sunX} ${sunY} L ${w * 0.3} 0 L ${w * 0.7} 0 Z`,
        `M ${sunX} ${sunY} L 0 ${h * 0.4} L 0 ${h * 0.7} Z`,
        `M ${sunX} ${sunY} L ${w} ${h * 0.4} L ${w} ${h * 0.7} Z`,
        `M ${sunX} ${sunY} L ${w * 0.25} ${h} L ${w * 0.75} ${h} Z`,
    ].map(path => path.replace(/w/g, w.toString()));

    const lionPath = "M10.5 13.5 C10.5 12.5 11 11.5 12 11.5 C13.5 11.5 14.5 12.5 15 13.5 C15.5 14.5 16 16 15 17 C13.5 18.5 11.5 18.5 10 17 C9 16 9.5 14.5 10.5 13.5 M12 11.5 C11 9.5 12.5 7.5 14 7.5 C15.5 7.5 16.5 9 16 10.5 M14 7.5 C16 6.5 17.5 7 18 8.5 M9 16 C7 17.5 6 17 5 15.5 C4 14 5 12 7 12";

    return (
        <FlagWrapper>
            <rect x="0" y="0" width={w} height={h} fill="#0033A0" />
            {redRays.map((path, i) => <path key={i} d={path} fill="#D52B1E" />)}
            <circle cx={sunX} cy={sunY} r={sunR} fill="#FFD700" />
            <path d={`M0,${h} L${sunX},${sunY} L${w},${h} Z`} fill="#FFFFFF" />

            <g transform="translate(4.5, 2.5) scale(0.45)">
                <path d={lionPath} fill="#006A4E" stroke="#004030" strokeWidth="0.5" />
            </g>
            <g transform={`translate(${w-4.5}, 2.5) scale(-0.45, 0.45)`}>
                <path d={lionPath} fill="#006A4E" stroke="#004030" strokeWidth="0.5" />
            </g>
            
            <g transform={`translate(${w/2}, 14)`}>
                <circle cx="0" cy="0" r="2.5" fill="white" stroke="black" strokeWidth="0.2" />
                <path d="M0,0 A2,2 0 0,1 1.73,-1 L0,0 Z" fill="#0033A0" transform="rotate(30)" />
                <path d="M0,0 A2,2 0 0,1 1.73,-1 L0,0 Z" fill="#D52B1E" transform="rotate(150)" />
                <path d="M0,0 A2,2 0 0,1 1.73,-1 L0,0 Z" fill="#FFD700" transform="rotate(270)" />
            </g>

            <g transform={`translate(${w/2}, 10.5)`}>
                <path d="M0,0 C-2,-3 2,-3 0,0" fill="#D52B1E" />
                <path d="M-1.5,0 C-3,-2.5 1,-2.5 -0.5,0" fill="#0033A0" />
                <path d="M1.5,0 C3,-2.5 -1,-2.5 0.5,0" fill="#006A4E" />
            </g>

            <path d={`M0.75,0.75 L0.75,${h-0.75} L${w-0.75},${h-0.75} L${w-0.75},0.75`} fill="none" stroke="#FFD700" strokeWidth="1.5" />
        </FlagWrapper>
    );
};

const AhwazFlag: React.FC = () => {
    const w = 35, h = 20, stripeH = h / 3;
    const starY = getWavedY(w / 2, h / 2, w, h);
    return (
        <FlagWrapper>
            <path d={createWavyPath(0, stripeH, w, h)} fill="#CD1117" />
            <path d={createWavyPath(stripeH, stripeH, w, h)} fill="#FFFFFF" />
            <path d={createWavyPath(2 * stripeH, stripeH, w, h)} fill="#000000" />
            <path d={createStarPath(w/2, starY, h * 0.12)} fill="#008D43" />
        </FlagWrapper>
    );
};

const TurkmenFlag: React.FC = () => {
    const w = 35, h = 20;
    const stripeH = h / 6;

    const cX_group = w / 2;
    const cY_group = h / 2;
    const waveOffsetY = getWavedY(cX_group, cY_group, w, h) - cY_group;

    const r1 = h * 0.25; // outer radius of crescent
    const r2 = h * 0.20; // inner radius of crescent
    const starR = h * 0.1; // star radius
    const c1x = w * 0.43; // crescent outer circle center x
    const c2x = w * 0.46; // crescent inner circle center x
    const starX = w * 0.55; // star center x

    return (
        <FlagWrapper>
            <path d={createWavyPath(0, stripeH, w, h)} fill="#FFFFFF" />
            <path d={createWavyPath(stripeH, h - 2 * stripeH, w, h)} fill="#5DADE2" />
            <path d={createWavyPath(h - stripeH, stripeH, w, h)} fill="#FFFFFF" />
            
            {/* Crescent and Star */}
            <g transform={`translate(0, ${waveOffsetY})`}>
                <defs>
                    <mask id="turkmen-crescent-mask">
                        <rect x="0" y="0" width={w} height={h} fill="white" />
                        <circle cx={c2x} cy={cY_group} r={r2} fill="black" />
                    </mask>
                </defs>
                <circle cx={c1x} cy={cY_group} r={r1} fill="white" mask="url(#turkmen-crescent-mask)" />
                <path d={createStarPath(starX, cY_group, starR)} fill="white" />
            </g>
        </FlagWrapper>
    );
};

const TRNCFlag: React.FC = () => {
    const w = 35, h = 20;
    const stripeH = h * 0.1;
    const cX_group = w / 2;
    const cY_group = h / 2;
    const waveOffsetY = getWavedY(cX_group, cY_group, w, h) - cY_group;

    const r1 = h * 0.25;
    const r2 = h * 0.20;
    const starR = h * 0.1;
    const c1x = w * 0.43;
    const c2x = w * 0.46;
    const starX = w * 0.55;

    return (
        <FlagWrapper>
            <path d={createWavyPath(0, h, w, h)} fill="#FFFFFF" />
            <path d={createWavyPath(h * 0.1, stripeH, w, h)} fill="#E4002B" />
            <path d={createWavyPath(h * 0.8, stripeH, w, h)} fill="#E4002B" />
            <g transform={`translate(0, ${waveOffsetY})`}>
                <defs>
                    <mask id="trnc-crescent-mask">
                        <rect x="0" y="0" width={w} height={h} fill="white" />
                        <circle cx={c2x} cy={cY_group} r={r2} fill="black" />
                    </mask>
                </defs>
                <circle cx={c1x} cy={cY_group} r={r1} fill="#E4002B" mask="url(#trnc-crescent-mask)" />
                <path d={createStarPath(starX, cY_group, starR)} fill="#E4002B" />
            </g>
        </FlagWrapper>
    );
};

const EastTurkestanFlag: React.FC = () => {
    const w = 35, h = 20;
    const r1 = (h / 2) / 2, r2 = (h * (2/5)) / 2;
    const c1x = h/2 + h/16, c2x = c1x + h/6;
    const starX = c2x + h * (1/15);
    const cY = h / 2;
    const waveOffsetY = getWavedY(c1x, cY, w, h) - cY;

    return(
        <FlagWrapper>
            <path d={createWavyPath(0, h, w, h)} fill="#5DADE2" />
            <g transform={`translate(0, ${waveOffsetY})`}>
                <circle cx={c1x} cy={cY} r={r1} fill="white"/>
                <circle cx={c2x} cy={cY} r={r2} fill="#5DADE2"/>
                <path d={createStarPath(starX, cY, (h/3)/2)} fill="white"/>
            </g>
        </FlagWrapper>
    );
};

const SomalilandFlag: React.FC = () => {
    const w = 35, h = 20, stripeH = h / 3;
    const starY = getWavedY(w/2, h/2, w, h);
    return (
        <FlagWrapper>
            <path d={createWavyPath(0, stripeH, w, h)} fill="#008D43" />
            <path d={createWavyPath(stripeH, stripeH, w, h)} fill="#FFFFFF" />
            <path d={createWavyPath(2 * stripeH, stripeH, w, h)} fill="#C72432" />
            <path d={createStarPath(w/2, starY, h * 0.12)} fill="#000000" />
            <text x="50%" y={getWavedY(w/2, h*0.18, w, h)} dominantBaseline="middle" textAnchor="middle" fill="white" fontSize={h * 0.18} fontWeight="bold" fontFamily="Arial">
                لا إله إلا الله
            </text>
        </FlagWrapper>
    );
};

const BirlandFlag: React.FC = () => {
    const w = 35, h = 20, stripeW = w / 3;
    const shieldX = w / 2, shieldY = h / 2;
    const waveOffsetX = getSlightWavedX(shieldX, shieldY, w, h) - shieldX;
    
    const shieldW = w * 0.28, shieldH = h * 0.45;
    const shieldPath = `M ${shieldX - shieldW/2} ${shieldY - shieldH/2} 
                       L ${shieldX + shieldW/2} ${shieldY - shieldH/2} 
                       L ${shieldX + shieldW/2} ${shieldY + shieldH * 0.1}
                       C ${shieldX + shieldW/2} ${shieldY + shieldH*0.4}, ${shieldX + shieldW/4} ${shieldY + shieldH/2}, ${shieldX} ${shieldY + shieldH/2}
                       C ${shieldX - shieldW/4} ${shieldY + shieldH/2}, ${shieldX - shieldW/2} ${shieldY + shieldH*0.4}, ${shieldX - shieldW/2} ${shieldY + shieldH*0.1}
                       Z`;

    const treeTrunk = `M ${shieldX} ${shieldY + shieldH*0.35} L ${shieldX} ${shieldY + shieldH * 0.1}`;
    const roots = `M ${shieldX - shieldW*0.2} ${shieldY + shieldH*0.4} C ${shieldX - shieldW*0.1} ${shieldY + h * 0.3}, ${shieldX} ${shieldY + shieldH*0.35}, ${shieldX} ${shieldY + shieldH*0.35} C ${shieldX} ${shieldY + shieldH*0.35}, ${shieldX + shieldW*0.1} ${shieldY + h * 0.3}, ${shieldX + shieldW*0.2} ${shieldY + shieldH*0.4}`;
    const treeCanopy = `M ${shieldX} ${shieldY + shieldH * 0.1} 
                        C ${shieldX - shieldW*0.5} ${shieldY + shieldH*0.15}, ${shieldX - shieldW*0.6} ${shieldY - shieldH*0.5}, ${shieldX} ${shieldY - shieldH*0.35}
                        C ${shieldX + shieldW * 0.6} ${shieldY - shieldH * 0.5}, ${shieldX + shieldW * 0.5} ${shieldY + shieldH * 0.15}, ${shieldX} ${shieldY + shieldH * 0.1} Z`;
    
    return (
        <FlagWrapper>
            <path d={createSlightWavyVerticalPath(0, stripeW, w, h)} fill="#004D99" />
            <path d={createSlightWavyVerticalPath(stripeW, stripeW, w, h)} fill="#FFFFFF" />
            <path d={createSlightWavyVerticalPath(2*stripeW, stripeW, w, h)} fill="#00994C" />
            <g transform={`translate(${waveOffsetX}, 0)`}>
                <path d={shieldPath} fill="#4B0082" stroke="#FFD700" strokeWidth="0.8" />
                <path d={treeTrunk} stroke="#FFD700" strokeWidth="1" strokeLinecap="round" />
                <path d={roots} stroke="#FFD700" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                <path d={treeCanopy} fill="#FFD700" />
            </g>
        </FlagWrapper>
    );
};

const AmazighFlag: React.FC = () => {
    const w = 35, h = 20, stripeH = h / 3;
    const symbolY = getWavedY(w / 2, h * 0.6, w, h);
    return (
        <FlagWrapper>
            <path d={createWavyPath(0, stripeH, w, h)} fill="#3FA2E3" />
            <path d={createWavyPath(stripeH, stripeH, w, h)} fill="#82C046" />
            <path d={createWavyPath(2 * stripeH, stripeH, w, h)} fill="#EBB92D" />
            <text x="50%" y={symbolY} dominantBaseline="middle" textAnchor="middle" fill="#E4002B" fontSize={h * 0.8} fontWeight="900">ⵣ</text>
        </FlagWrapper>
    );
};

const BalochistanFlag: React.FC = () => {
    const w = 35, h = 20, triangleBase = w * 0.4;
    const starCX = triangleBase * 0.4, starCY = h / 2;
    const waveOffsetY = getWavedY(starCX, starCY, w, h) - starCY;
    
    const wavedTriangle = `M 0 ${getWavedY(0, 0, w, h)} L ${triangleBase} ${getWavedY(triangleBase, h/2, w, h)} L 0 ${getWavedY(0, h, w, h)} Z`;
    
    return(
        <FlagWrapper>
            <path d={createWavyPath(0, h/2, w, h)} fill="#00994C" />
            <path d={createWavyPath(h/2, h/2, w, h)} fill="#DA291C" />
            <path d={wavedTriangle} fill="#0040C0" />
            <g transform={`translate(0, ${waveOffsetY})`}>
                <path d={createStarPath(starCX, starCY, h * 0.15)} fill="white" />
            </g>
        </FlagWrapper>
    );
};

const CaliforniaFlag: React.FC = () => {
    const w = 35, h = 20, redStripeH = h / 6;
    const starCX = w * 0.15, starCY = h * 0.25;
    const bearX = w / 2, bearY = h / 2;
    const textX = w / 2, textY = h * 0.8;
    return (
        <FlagWrapper>
            <path d={createWavyPath(0, h - redStripeH, w, h)} fill="white" />
            <path d={createWavyPath(h - redStripeH, redStripeH, w, h)} fill="#C72432" />
            <g transform={`translate(0, ${getWavedY(starCX, starCY, w, h) - starCY})`}>
                <path d={createStarPath(starCX, starCY, h*0.12)} fill="#C72432" />
            </g>
            <text x={bearX} y={getWavedY(bearX, bearY, w, h)} dominantBaseline="middle" textAnchor="middle" fontSize={h*0.5}>🐻</text>
            <text x={textX} y={getWavedY(textX, textY, w, h)} dominantBaseline="middle" textAnchor="middle" fontSize={h*0.11} fontWeight="bold" fill="#6E4A28">CALIFORNIA REPUBLIC</text>
        </FlagWrapper>
    );
};

const HadhramoutFlag: React.FC = () => {
    const w = 35, h = 20, redStripeW = w / 4, stripeH = h / 3;
    const treeX = redStripeW + (w-redStripeW)/2, treeY = h/2;
    const waveOffsetX = getSlightWavedX(treeX, treeY, w, h) - treeX;
    const waveOffsetY = getSlightWavedY(treeX, treeY, w, h) - treeY;
    
    return (
        <FlagWrapper>
            <path d={createSlightWavyPath(0, stripeH, w, h)} fill="#008D43" />
            <path d={createSlightWavyPath(stripeH, stripeH, w, h)} fill="white" />
            <path d={createSlightWavyPath(2*stripeH, stripeH, w, h)} fill="#0040C0" />
            <path d={createSlightWavyVerticalPath(0, redStripeW, w, h)} fill="#E4002B" />
            <g transform={`translate(${waveOffsetX}, ${waveOffsetY})`}>
                <text x={treeX} y={treeY} dominantBaseline="middle" textAnchor="middle" fontSize={h*0.3}>🌲</text>
            </g>
        </FlagWrapper>
    );
};

const KurdistanFlag: React.FC = () => {
    const w = 35, h = 20, stripeH = h / 3;
    const sunY = getWavedY(w / 2, h * 0.55, w, h);
    return(
        <FlagWrapper>
            <path d={createWavyPath(0, stripeH, w, h)} fill="#E4002B" />
            <path d={createWavyPath(stripeH, stripeH, w, h)} fill="#FFFFFF" />
            <path d={createWavyPath(2 * stripeH, stripeH, w, h)} fill="#008D43" />
            <text x="50%" y={sunY} dominantBaseline="middle" textAnchor="middle" fontSize={h * 0.6}>☀️</text>
        </FlagWrapper>
    );
};

const CataloniaFlag: React.FC = () => {
    const w = 35, h = 20, stripeCount = 9, stripeH = h / stripeCount, triangleBase = w * 0.4;
    const starCX = triangleBase * 0.33, starCY = h / 2;
    const waveOffsetY = getWavedY(starCX, starCY, w, h) - starCY;
    const wavedTriangle = `M 0 ${getWavedY(0, 0, w, h)} L ${triangleBase} ${getWavedY(triangleBase, h/2, w, h)} L 0 ${getWavedY(0, h, w, h)} Z`;
    
    return (
        <FlagWrapper>
            {Array.from({ length: stripeCount }).map((_, i) => (
                <path key={i} d={createWavyPath(i * stripeH, stripeH, w, h)} fill={i % 2 === 0 ? "#FFD900" : "#E4002B"} />
            ))}
            <path d={wavedTriangle} fill="#0040C0" />
            <g transform={`translate(0, ${waveOffsetY})`}>
                <path d={createStarPath(starCX, starCY, h * 0.15)} fill="white" />
            </g>
        </FlagWrapper>
    );
};

const AfrikanersFlag: React.FC = () => {
    const w = 35, h = 20;
    const greenW = w / 3;
    const stripeH = h / 3;
    return (
        <FlagWrapper>
            <path d={createSlightWavyPath(0, stripeH, w, h)} fill="#FF671F" />
            <path d={createSlightWavyPath(stripeH, stripeH, w, h)} fill="#FFFFFF" />
            <path d={createSlightWavyPath(2 * stripeH, stripeH, w, h)} fill="#002288" />
            <path d={createSlightWavyVerticalPath(0, greenW, w, h)} fill="#007A4D" />
        </FlagWrapper>
    );
};

const CrimeanTatarsFlag: React.FC = () => {
    const w = 35, h = 20;
    const tamgaX = w * 0.1;
    const tamgaY = h * 0.15;
    const tamgaW = w * 0.18;
    const tamgaH = h * 0.3;

    const transformX = getWavedX(tamgaX, tamgaY, w, h) - tamgaX;
    const transformY = getWavedY(tamgaX, tamgaY, w, h) - tamgaY;
    const tamgaPath = `M ${tamgaX} ${tamgaY} h ${tamgaW}
                       M ${tamgaX + tamgaW/2} ${tamgaY} v ${tamgaH}
                       M ${tamgaX + tamgaW/2 - tamgaW * 0.2} ${tamgaY+tamgaH} h ${tamgaW * 0.4}`;

    return (
        <FlagWrapper>
            <path d={createWavyPath(0, h, w, h)} fill="#5DADE2" />
            <g transform={`translate(${transformX} ${transformY})`}>
                <path d={tamgaPath} stroke="#FFD700" strokeWidth="1.2" strokeLinecap="round" />
            </g>
        </FlagWrapper>
    );
};

const BrittanyFlag: React.FC = () => {
    const w = 35, h = 20;
    const stripeCount = 9, stripeH = h / stripeCount;
    const cantonW = w * 0.4, cantonH = stripeH * 5;
    
    const ErmineSpot: React.FC<{x: number, y: number, s: number}> = ({x, y, s}) => {
        const path = `M${x} ${y-s*0.5} L ${x} ${y+s*0.3} M ${x-s*0.25} ${y+s*0.3} C ${x} ${y+s*0.1}, ${x} ${y+s*0.1}, ${x+s*0.25} ${y+s*0.3} Z M ${x} ${y+s*0.3} L ${x} ${y+s*0.6} M ${x-s*0.2} ${y+s*0.6} h ${s*0.4}`;
        return <path d={path} fill="black" stroke="black" strokeWidth="0.15" strokeLinejoin="round" strokeLinecap="round"/>;
    };
    
    const spotSize = 1.0;
    const spots = [];
    // Row 1
    for (let i = 0; i < 4; i++) spots.push({x: cantonW * (i + 1) / 5, y: cantonH * 1 / 4});
    // Row 2
    for (let i = 0; i < 3; i++) spots.push({x: cantonW * (i + 1.5) / 5, y: cantonH * 2 / 4});
    // Row 3
    for (let i = 0; i < 4; i++) spots.push({x: cantonW * (i + 1) / 5, y: cantonH * 3 / 4});
    
    return (
        <FlagWrapper>
            {Array.from({ length: stripeCount }).map((_, i) => (
                <path key={i} d={createWavyPath(i * stripeH, stripeH, w, h)} fill={i % 2 === 0 ? "#000000" : "#FFFFFF"} />
            ))}
            <path d={createWavyPath(0, cantonH, w, h)} fill="white" clipPath={`url(#brittanyCantonClip)`} />
            <defs>
                 <clipPath id="brittanyCantonClip">
                    <rect x="0" y="0" width={cantonW} height={h} />
                 </clipPath>
            </defs>
            {spots.map((spot, i) => (
                <g key={i} transform={`translate(${getWavedX(spot.x, spot.y, w, h) - spot.x}, ${getWavedY(spot.x, spot.y, w, h) - spot.y})`}>
                    <ErmineSpot x={spot.x} y={spot.y} s={spotSize} />
                </g>
            ))}
        </FlagWrapper>
    );
};

const TamilFlag: React.FC = () => {
    const w = 35, h = 20;
    const cx = w / 2, cy = h / 2;

    const waveOffsetY = getWavedY(cx, cy, w, h) - cy;

    const sunburstRays = Array.from({ length: 32 }).map((_, i) => {
        const angle = i * 11.25;
        const rayPath = `M 0 -7.2 L 0.5 -8.5 L -0.5 -8.5 Z`;
        return <path key={`ray-${i}`} d={rayPath} fill="#f9d71c" transform={`translate(${cx} ${cy}) rotate(${angle})`} />;
    });

    const bullets = Array.from({ length: 32 }).map((_, i) => {
        const angle = i * 11.25 + 5.625;
        const bulletPath = `M 0 -6.3 a 0.25 0.25 0 1 1 0.001 0 L 0.2 -7 L -0.2 -7 Z`;
        return <path key={`bullet-${i}`} d={bulletPath} fill="#f9d71c" stroke="#212121" strokeWidth="0.1" transform={`translate(${cx} ${cy}) rotate(${angle})`} />;
    });

    const riflePath = "m-11.8 1.4 l2.1-0.2c0.2,0.6 0.7,0.8 1.1,0.5l1-1.1 -0.5-0.5 8.8-0.8 0.6-0.3 3.3-0.2 0.4,0.4 -0.3,0.3 -2.7,0.2 -0.2,0.2 -8.9,0.8 0.5,0.5 -1.1,1.1c-0.4,0.3 -0.5,0.8 -0.1,1.2l-2.1,0.2c-0.2,-0.4 -0.5,-0.6 -0.8,-0.6 -0.3,0 -0.5,0.2 -0.6,0.4l-0.5-0.1z";

    return (
        <FlagWrapper>
            <path d={createWavyPath(0, h, w, h)} fill="#d81e05" />
            <g transform={`translate(0, ${waveOffsetY})`}>
                {sunburstRays}

                <g transform={`translate(${cx} ${cy}) rotate(45)`}>
                    <path d={riflePath} fill="#212121" />
                </g>
                <g transform={`translate(${cx} ${cy}) rotate(-45) scale(1, -1)`}>
                    <path d={riflePath} fill="#212121" />
                </g>

                <circle cx={cx} cy={cy} r="7" fill="none" stroke="#212121" strokeWidth="0.5" />
                {bullets}
                <circle cx={cx} cy={cy} r="5.7" fill="none" stroke="#212121" strokeWidth="0.5" />
                
                <g transform={`translate(${cx}, ${cy})`}>
                    <path fill="#f9d71c" d="m-5,2.5c0.5,1.5 2,2.5 5,2.5s4.5-1 5-2.5c1.5,0.5 2,-2 0,-3.5 -1.5,-1 -4,-2.5 -5,-2.5s-3.5,1.5 -5,2.5c-2,1.5 -1.5,4 0,3.5z" />
                    <path fill="#212121" d="m-5,2.5c0.1,0.3 0.2,0.6 0.4,0.8l0.5-0.2c-0.2-0.4 -0.3,-0.8 -0.4,-1.2 -0.4,-1.5 0,-3 1,-3.8 1.2,-1 3.2,-1.5 4,-1.5s2.8,0.5 4,1.5c1,0.8 1.5,2.2 1,3.8 -0.1,0.4 -0.2,0.8 -0.4,1.2l0.5,0.2c0.2-0.2 0.3-0.5 0.4-0.8 1.5,0.5 2,-2 0,-3.5 -1.5,-1 -4,-2.5 -5,-2.5s-3.5,1.5 -5,2.5c-2,1.5 -1.5,4 0,3.5z M-3,-1.5c-0.5-0.5 -0.8,-1.2 -0.5,-1.8 0.2,-0.5 0.8,-0.8 1.3,-0.5 0.5,0.2 0.8,0.8 0.5,1.2 -0.2,0.5 -0.8,0.8 -1.3,0.5z M3,-1.5c0.5-0.5 0.8,-1.2 0.5,-1.8 -0.2,-0.5 -0.8,-0.8 -1.3,-0.5 -0.5,0.2 -0.8,0.8 -1.3,0.5 -0.5,0.2 -0.8,0.8 -0.5,1.2 0.2,0.5 0.8,0.8 1.3,0.5z M-2,0.5 c-0.8,0 -1.2,-0.5 -1.2,-1 0,-0.8 0.5,-1.2 1,-1.2 0.2,0 1,0 1,0.8 M2,0.5c0.8,0 1.2,-0.5 1.2,-1 0,-0.8 -0.5,-1.2 -1,-1.2 -0.2,0 -1,0 -1,0.8 M0,0.8c-0.5,0 -1,0 -1.5-0.2 -0.5-0.2 -0.8-0.5 -0.5-1 0.2,-0.2 0.5,-0.2 0.8,0 M0,0.8c0.5,0 1,0 1.5-0.2 0.5-0.2 0.8-0.5 0.5-1 -0.2,-0.2 -0.5,-0.2 -0.8,0 -4.2,2.5c-0.2,0.5 0,1 0.5,1.2 M4.2,2.5c0.2,0.5 0,1 -0.5,1.2 M-1.8,2.8c-1.2,0.2 -2,1 -1.8,1.8 0.2,0.8 1,1.2 1.8,1 M1.8,2.8c1.2,0.2 2,1 1.8,1.8 -0.2,0.8 -1,1.2 -1.8,1 M-0.2,5.2 l-0.5,0.5 -0.5-0.2 -0.2,0.5 -0.5,0.2 0.2,0.5 0.5-0.2 0.2,0.5 0.5,0.2 0.2-0.5 0.5,0.2 -0.2-0.5z M0.2,5.2 l0.5,0.5 0.5-0.2 0.2,0.5 0.5,0.2 -0.2,0.5 -0.5-0.2 -0.2,0.5 -0.5,0.2 -0.2-0.5 -0.5,0.2 0.2-0.5z" />
                    <path fill="#fff" d="m-1.8,1.5a1,1 0 1,0 3.6,0 l-0.2,1c-0.5,0.8 -1,1 -1.5,1s-1-0.2 -1.5-1z M-2.2,-1.5 c-0.5,0.2 -1,0 -1.2,-0.5s0,-1 0.5,-1.2 1,0 1.2,0.5 0,1 -0.5,1.2z M2.2,-1.5c0.5,0.2 1,0 1.2,-0.5s0,-1 -0.5,-1.2 -1,0 -1.2,0.5 0,1 -0.5,1.2z M-1.2,2.8 l-0.2,0.5 -0.5,0.2 0.2,0.5 0.5-0.2 0.2,0.5 0.5-0.2 -0.2,-0.5 -0.5,0.2z M1.2,2.8 l0.2,0.5 0.5,0.2 -0.2,0.5 -0.5-0.2 -0.2,0.5 -0.5-0.2 0.2,-0.5 0.5,0.2z" />
                    <path fill="#d81e05" d="m-1.8,1.5a1,1 0 1,1 3.6,0 l-0.2,1c-0.5,0.8 -1,1 -1.5,1s-1-0.2 -1.5-1z" />
                    <path fill="#fff" d="m-0.8,2.5 l0.2,0.5 0.5-0.2 0.2,0.5 0.5-0.2 -0.2,-0.5 -0.5,0.2z m-1,-0.2 l0.2,0.5 0.5-0.2 0.2,0.5 0.5-0.2 -0.2,-0.5 -0.5,0.2z m2.8,0.2 l-0.2,0.5 -0.5-0.2 -0.2,0.5 -0.5-0.2 0.2,-0.5 0.5,0.2z m1,-0.2 l-0.2,0.5 -0.5-0.2 -0.2,0.5 -0.5-0.2 0.2,-0.5 0.5,0.2z" />
                </g>
            </g>
        </FlagWrapper>
    );
};

const KawthooleiFlag: React.FC = () => {
    const w = 35, h = 20;
    const stripeH = h / 3;
    const cantonW = w * 0.42;
    const cantonH = stripeH * 2;

    const symbolsCX = cantonW / 2;
    const symbolsCY = cantonH; // Position sun at the bottom of the kanton
    
    const waveOffsetY = getWavedY(symbolsCX, symbolsCY, w, h) - symbolsCY;

    // Rising Sun Rays
    const rays = [];
    const numRays = 11; // Increased for better density
    const rayLength = 16.5; // Even longer to definitely cover the corners
    for (let i = 0; i < numRays; i++) {
        // Spread rays from -175 to -5 degrees for a very wide look
        const angle = -175 + i * (170 / (numRays - 1));
        const rad = angle * Math.PI / 180;
        const x2 = Math.cos(rad) * rayLength;
        const y2 = Math.sin(rad) * rayLength;
        rays.push(<line key={i} x1="0" y1="0" x2={x2} y2={y2} stroke="#DA291C" strokeWidth="1.4" strokeLinecap="round" />);
    }

    return (
        <FlagWrapper>
            {/* Background Stripes */}
            <path d={createWavyPath(0, stripeH, w, h)} fill="#DA291C" />
            <path d={createWavyPath(stripeH, stripeH, w, h)} fill="#FFFFFF" />
            <path d={createWavyPath(2 * stripeH, stripeH, w, h)} fill="#004D99" />
            
            {/* Blue Canton */}
            <path d={`M 0 ${getWavedY(0, 0, w, h)} L ${cantonW} ${getWavedY(cantonW, 0, w, h)} L ${cantonW} ${getWavedY(cantonW, cantonH, w, h)} L 0 ${getWavedY(0, cantonH, w, h)} Z`} fill="#004D99" />
            
            {/* Sun and Drum Symbols Group */}
            <g transform={`translate(${cantonW / 2}, ${cantonH + waveOffsetY})`}>
                {/* Rays - clipped to the kanton area */}
                <g>
                    <defs>
                        <clipPath id="kawthoolei-rays-clip-long">
                            <rect x={-cantonW/2} y={-cantonH} width={cantonW} height={cantonH} />
                        </clipPath>
                    </defs>
                    <g clipPath="url(#kawthoolei-rays-clip-long)">
                        {rays}
                    </g>
                </g>
                
                {/* Sun Body (Rising Sun Circle) */}
                <circle r="2.2" fill="#DA291C" />
                
                {/* Stylized Karen Drum (Hpa-si) - Centered and slightly moved up */}
                <g transform="translate(0, -6.5) scale(0.65)">
                     {/* Drum Body */}
                     <path d="M -3 -1.5 C -4.5 -1.5, -4.5 1.5, -3 1.5 L 3 1.5 C 4.5 1.5, 4.5 -1.5, 3 -1.5 Z" fill="#EBB92D" stroke="#000" strokeWidth="0.3" />
                     {/* Side View Decoration */}
                     <ellipse cx="-3.2" cy="0" rx="0.6" ry="1.5" fill="#D4AF37" stroke="#000" strokeWidth="0.2" />
                     <ellipse cx="3.2" cy="0" rx="0.6" ry="1.5" fill="#D4AF37" stroke="#000" strokeWidth="0.2" />
                     {/* Horizontal lines */}
                     <path d="M -1.5 -1.4 L -1.5 1.4 M 0 -1.5 L 0 1.5 M 1.5 -1.4 L 1.5 1.4" stroke="#000" strokeWidth="0.2" />
                </g>
            </g>
        </FlagWrapper>
    );
};

const ArabLeagueFlag: React.FC = () => {
    const w = 35, h = 20;
    const cx = w / 2, cy = h / 2;
    const waveOffsetY = getWavedY(cx, cy, w, h) - cy;

    const gold = '#C5A021';
    const green = '#007A3D';

    // Stylized Laurel Wreath - WHITE as in the photo
    const renderWreath = () => {
        const leaves = [];
        const numLeaves = 15;
        for (let i = 0; i < numLeaves; i++) {
            const angleLeft = 110 + i * (140 / numLeaves);
            const radL = angleLeft * Math.PI / 180;
            const lx = Math.cos(radL) * 7.5;
            const ly = Math.sin(radL) * 7.5;
            leaves.push(<ellipse key={`l-${i}`} cx={lx} cy={ly} rx="0.4" ry="0.9" fill="white" transform={`rotate(${angleLeft + 90}, ${lx}, ${ly})`} />);

            const angleRight = 70 - i * (140 / numLeaves);
            const radR = angleRight * Math.PI / 180;
            const rx = Math.cos(radR) * 7.5;
            const ry = Math.sin(radR) * 7.5;
            leaves.push(<ellipse key={`r-${i}`} cx={rx} cy={ry} rx="0.4" ry="0.9" fill="white" transform={`rotate(${angleRight - 90}, ${rx}, ${ry})`} />);
        }
        return leaves;
    };

    return (
        <FlagWrapper>
            <path d={createWavyPath(0, h, w, h)} fill={green} />
            <g transform={`translate(${cx}, ${cy + waveOffsetY})`}>
                {/* Laurel Wreath */}
                {renderWreath()}
                <path d="M -1.2 7.2 C -1.2 8.5, 1.2 8.5, 1.2 7.2 Z" fill="white" /> {/* Bottom Ribbon */}

                {/* Golden Chain Circle - Dotted/Dashed */}
                <circle r="5.6" fill="none" stroke={gold} strokeWidth="0.4" strokeDasharray="0.8 0.5" />

                {/* Large White Crescent - Adjusted to wrap around the text correctly */}
                <path 
                    d="M -4.5,-1.2 A 4.8,4.8 0 1,0 4.5,-1.2 A 3.8,3.8 0 1,1 -4.5,-1.2 Z" 
                    fill="white" 
                    transform="rotate(-12)" 
                />

                {/* Arabic Calligraphy Placeholder Text - Repositioned inside the crescent */}
                <text y="-0.5" textAnchor="middle" fill="white" fontSize="1.8" fontWeight="bold" fontFamily="serif" transform="scale(1.1, 1)">جامعة</text>
                <text y="1.2" textAnchor="middle" fill="white" fontSize="1.8" fontWeight="bold" fontFamily="serif" transform="scale(1.1, 1)">الدول العربية</text>
            </g>
        </FlagWrapper>
    );
};

const AustralianWattleFlag: React.FC = () => {
    const w = 35, h = 20;
    const cx = w / 2, cy = h / 2;
    const waveOffsetY = getWavedY(cx, cy, w, h) - cy;

    const gold = "#FFD900";
    const darkGreen = "#004D40";

    const petals = [];
    const numPetals = 7;
    for (let i = 0; i < numPetals; i++) {
        const angle = (360 / numPetals) * i;
        // Adjusted teardrop shape with spacing (M 0,2.5 starts further out)
        petals.push(
            <path 
                key={i} 
                d="M 0,2.5 C -3,3.5 -3,6.5 0,7.5 C 3,6.5 3,3.5 0,2.5 Z" 
                fill={gold} 
                transform={`rotate(${angle})`} 
            />
        );
    }

    // 7-pointed Commonwealth Star in background color
    const starRadius = 1.3;
    let starPath = '';
    const points = 7;
    for (let i = 0; i < points * 2; i++) {
        const angle = (Math.PI / points) * i - (Math.PI / 2);
        const r = (i % 2 === 0) ? starRadius : starRadius / 2.3;
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        starPath += `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }
    starPath += ' Z';

    return (
        <FlagWrapper>
            <path d={createWavyPath(0, h, w, h)} fill={darkGreen} />
            <g transform={`translate(${cx}, ${cy + waveOffsetY})`}>
                {petals}
                <path d={starPath} fill={darkGreen} />
            </g>
        </FlagWrapper>
    );
};

const NewFlag: React.FC = () => {
    const w = 35, h = 20;
    const emojiY = getWavedY(w/2, h * 0.55, w, h);
    return (
        <FlagWrapper>
            <path d={createWavyPath(0, h, w, h)} fill="gray" />
            <text x="50%" y={emojiY} dominantBaseline="middle" textAnchor="middle" fontSize="16">🚩</text>
        </FlagWrapper>
    );
};

// --- New Flag Components ---

const AboriginalFlag: React.FC = () => {
    const w = 35, h = 20;
    const stripeH = h / 2;
    const circleY = getWavedY(w / 2, h / 2, w, h);

    return (
        <FlagWrapper>
            <path d={createWavyPath(0, stripeH, w, h)} fill="#000000" />
            <path d={createWavyPath(stripeH, stripeH, w, h)} fill="#E4002B" />
            <circle cx={w / 2} cy={circleY} r={h * 0.25} fill="#FFD700" />
        </FlagWrapper>
    );
};

const AfricanUnionFlag: React.FC = () => {
    const w = 35, h = 20;
    const cx = w / 2, cy = h / 2;
    const waveOffsetY = getWavedY(cx, cy, w, h) - cy;

    const africaPath = "M18.1,6.3c-0.6-0.3-1.3-0.2-1.8,0.3l-1.4,1.4l-0.4-1.3c-0.2-0.6-0.7-1-1.3-1s-1.1,0.4-1.3,1l-0.7,2.2l1,1.5l-0.3,1.9 c-0.1,0.6,0.2,1.2,0.8,1.4l1.3,0.5l1.5,1.5l1,1.4c0.4,0.5,1.1,0.7,1.7,0.4l1.4-0.7l0.8-2.4l0.2-2.7l-1.3-2.1L20,8.2 C19.5,7.3,18.7,6.6,18.1,6.3z";
    
    const numStars = 53;
    const outerRadius = h * 0.45;
    const starRadius = 0.4;
    const stars = [];
    const rays = [];

    for (let i = 0; i < numStars; i++) {
        const angle = (2 * Math.PI / numStars) * i - Math.PI / 2;
        
        const rayEndX = cx + (outerRadius - starRadius * 1.2) * Math.cos(angle);
        const rayEndY = cy + (outerRadius - starRadius * 1.2) * Math.sin(angle);
        rays.push(<line key={`ray-${i}`} x1={cx} y1={cy} x2={rayEndX} y2={rayEndY} stroke="white" strokeWidth="0.3" />);
        
        const starX = cx + outerRadius * Math.cos(angle);
        const starY = cy + outerRadius * Math.sin(angle);
        stars.push(<path key={`star-${i}`} d={createStarPath(starX, starY, starRadius)} fill="#FFD700" />);
    }

    return (
        <FlagWrapper>
            <path d={createWavyPath(0, h, w, h)} fill="#007A5E" />
            <g transform={`translate(0, ${waveOffsetY})`}>
                {rays}
                <path d={africaPath} fill="white" />
                {stars}
            </g>
        </FlagWrapper>
    );
};

const DagestanFlag: React.FC = () => {
    const w = 35, h = 20;
    const stripeH = h / 3;
    return (
        <FlagWrapper>
            <path d={createWavyPath(0, stripeH, w, h)} fill="#007A3D" />
            <path d={createWavyPath(stripeH, stripeH, w, h)} fill="#0033A0" />
            <path d={createWavyPath(2 * stripeH, stripeH, w, h)} fill="#CE1126" />
        </FlagWrapper>
    );
};

const Sudan1956Flag: React.FC = () => {
    const w = 35, h = 20;
    const stripeH = h / 3;
    return (
        <FlagWrapper>
            <path d={createWavyPath(0, stripeH, w, h)} fill="#0047AB" />
            <path d={createWavyPath(stripeH, stripeH, w, h)} fill="#FCD116" />
            <path d={createWavyPath(2 * stripeH, stripeH, w, h)} fill="#009E49" />
        </FlagWrapper>
    );
};

const CircassianFlag: React.FC = () => {
    const w = 35, h = 20;
    const green = '#004B23';
    const gold = '#FFD700';

    const starRadius = 1.0;
    const arcStars = Array.from({ length: 9 }).map((_, i) => {
        const angle = -160 + i * (140 / 8);
        const angleRad = angle * Math.PI / 180;
        const starX = (w / 2) + (w * 0.35) * Math.cos(angleRad);
        const starY = (h * 0.25) + (h * 0.2) * Math.sin(angleRad);
        return { x: starX, y: starY };
    });
    const rowStars = Array.from({ length: 3 }).map((_, i) => {
        return { x: (w / 2) - (w * 0.15) + (i * w * 0.1), y: h * 0.35 };
    });
    const allStars = [...arcStars, ...rowStars];

    const arrowCX = w / 2;
    const arrowCY = h * 0.70;
    const waveOffsetX = getWavedX(arrowCX, arrowCY, w, h) - arrowCX;
    const waveOffsetY = getWavedY(arrowCX, arrowCY, w, h) - arrowCY;

    const L = 4.2;
    const headH = 1.2;
    const headW = 0.84;
    const fletchH = 1.2;
    const fletchW = 1.2;
    const fullArrowPath = `
        M 0 ${-L} L 0 ${L}
        M ${-headW} ${-L + headH} L 0 ${-L} L ${headW} ${-L + headH}
        M ${-fletchW} ${L - fletchH} L 0 ${L} L ${fletchW} ${L - fletchH}
    `;

    return (
        <FlagWrapper>
            <path d={createWavyPath(0, h, w, h)} fill={green} />
            
            {allStars.map((star, i) => (
                <path key={`star-${i}`} d={createStarPath(star.x, getWavedY(star.x, star.y, w, h), starRadius)} fill={gold} />
            ))}

            <g transform={`translate(${arrowCX + waveOffsetX}, ${arrowCY + waveOffsetY})`} stroke={gold} strokeWidth="0.6" fill="none" strokeLinecap="round">
                <g transform="rotate(0)">
                    <path d={fullArrowPath} />
                </g>
                <g transform="rotate(135)">
                    <path d={fullArrowPath} />
                </g>
                <g transform="rotate(-135)">
                    <path d={fullArrowPath} />
                </g>
            </g>
        </FlagWrapper>
    );
};

const SyrianOppositionFlag: React.FC = () => {
    const w = 35, h = 20;
    const stripeH = h / 3;

    // Star positions
    const starY_center = h / 2;
    const starRadius = h * 0.1;
    const starPositions = [w * 0.3, w * 0.5, w * 0.7];

    return (
        <FlagWrapper>
            <path d={createWavyPath(0, stripeH, w, h)} fill="#007A3D" />
            <path d={createWavyPath(stripeH, stripeH, w, h)} fill="#FFFFFF" />
            <path d={createWavyPath(2 * stripeH, stripeH, w, h)} fill="#000000" />
            {starPositions.map((starX, i) => (
                <path 
                    key={i} 
                    d={createStarPath(starX, getWavedY(starX, starY_center, w, h), starRadius)} 
                    fill="#CE1126" 
                />
            ))}
        </FlagWrapper>
    );
};

const RomaniFlag: React.FC = () => {
    const w = 35, h = 20;
    const stripeH = h / 2;
    const blue = '#0077C8';
    const green = '#007A3D';
    const red = '#D20000';

    const cx = w / 2;
    const cy = h / 2;
    const wheelY = getWavedY(cx, cy, w, h);
    
    const R_outer = h * 0.4;
    const R_inner = h * 0.12;
    const numSpokes = 16;
    const angleStep = 360 / numSpokes;
    const petalWidthAngle = angleStep * 0.4;

    let pathData = `M ${cx + R_outer} ${wheelY} A ${R_outer} ${R_outer} 0 1 1 ${cx - R_outer} ${wheelY} A ${R_outer} ${R_outer} 0 1 1 ${cx + R_outer} ${wheelY} Z`;
    pathData += ` M ${cx + R_inner} ${wheelY} A ${R_inner} ${R_inner} 0 1 0 ${cx - R_inner} ${wheelY} A ${R_inner} ${R_inner} 0 1 0 ${cx + R_inner} ${wheelY} Z`;

    for (let i = 0; i < numSpokes; i++) {
        const angle = i * angleStep;
        const rad = angle * Math.PI / 180;
        
        const midRadius = (R_inner + R_outer) / 2;
        const p_inner_x = cx + R_inner * Math.cos(rad);
        const p_inner_y = wheelY + R_inner * Math.sin(rad);
        const p_outer_x = cx + R_outer * Math.cos(rad);
        const p_outer_y = wheelY + R_outer * Math.sin(rad);

        const c_angle1 = (angle - petalWidthAngle) * Math.PI / 180;
        const c_angle2 = (angle + petalWidthAngle) * Math.PI / 180;
        
        const cp1x = cx + midRadius * Math.cos(c_angle1);
        const cp1y = wheelY + midRadius * Math.sin(c_angle1);
        
        const cp2x = cx + midRadius * Math.cos(c_angle2);
        const cp2y = wheelY + midRadius * Math.sin(c_angle2);

        pathData += ` M ${p_inner_x} ${p_inner_y} Q ${cp1x} ${cp1y}, ${p_outer_x} ${p_outer_y} Q ${cp2x} ${cp2y}, ${p_inner_x} ${p_inner_y} Z`;
    }

    return (
        <FlagWrapper>
            <path d={createWavyPath(0, stripeH, w, h)} fill={blue} />
            <path d={createWavyPath(stripeH, stripeH, w, h)} fill={green} />
            <path d={pathData} fill={red} fillRule="evenodd" />
        </FlagWrapper>
    );
};

const BougainvilleFlag: React.FC = () => {
    const w = 35, h = 20;
    const blue = '#002072';
    const white = '#FFFFFF';
    const green = '#009A44';
    const black = '#000000';
    const red = '#D21034';

    const cx = w / 2;
    const cy = h / 2;
    const waveOffsetY = getWavedY(cx, cy, w, h) - cy;

    const r_white_outer = h * 0.45;
    const r_green_outer = h * 0.40;
    const r_black_outer = h * 0.30;
    
    const upeHeight = 8;
    const upeTopWidth = 6;
    const upeMidWidth = 2;
    const upePath = `
        M ${cx - upeTopWidth / 2}, ${cy - upeHeight / 2}
        Q ${cx}, ${cy - upeHeight / 2 - 1}, ${cx + upeTopWidth / 2}, ${cy - upeHeight / 2}
        C ${cx + upeMidWidth * 0.75}, ${cy - upeHeight / 4}, ${cx + upeMidWidth * 0.75}, ${cy + upeHeight / 4}, ${cx}, ${cy + upeHeight / 2 + 0.5}
        C ${cx - upeMidWidth * 0.75}, ${cy + upeHeight / 4}, ${cx - upeMidWidth * 0.75}, ${cy - upeHeight / 4}, ${cx - upeTopWidth / 2}, ${cy - upeHeight / 2}
        Z
    `;

    return (
        <FlagWrapper>
            <path d={createWavyPath(0, h, w, h)} fill={blue} />
            
            <g transform={`translate(0, ${waveOffsetY})`}>
                <circle cx={cx} cy={cy} r={r_white_outer} fill={white} />
                <circle cx={cx} cy={cy} r={r_green_outer} fill={green} />
                
                <g>
                    {Array.from({ length: 24 }).map((_, i) => {
                        const angle = i * 15;
                        const angleRad = angle * Math.PI / 180;
                        const angleWidth = 5.5;
                        
                        const p1x = cx + r_green_outer * Math.cos((angle - angleWidth) * Math.PI / 180);
                        const p1y = cy + r_green_outer * Math.sin((angle - angleWidth) * Math.PI / 180);
                        const p2x = cx + r_green_outer * Math.cos((angle + angleWidth) * Math.PI / 180);
                        const p2y = cy + r_green_outer * Math.sin((angle + angleWidth) * Math.PI / 180);
                        const p3x = cx + r_black_outer * Math.cos(angleRad);
                        const p3y = cy + r_black_outer * Math.sin(angleRad);
                        
                        return <path key={i} d={`M ${p1x} ${p1y} L ${p2x} ${p2y} L ${p3x} ${p3y} Z`} fill={white} />
                    })}
                </g>
                
                <circle cx={cx} cy={cy} r={r_black_outer} fill={black} />
                
                <g>
                    <defs>
                        <clipPath id="bougainville-upe-clip">
                            <path d={upePath} />
                        </clipPath>
                    </defs>
                    <g clipPath="url(#bougainville-upe-clip)">
                        {Array.from({ length: 7 }).map((_, i) => {
                             const stripeWidth = (upeTopWidth + 1) / 7;
                             const x = cx - (upeTopWidth + 1)/2 + i * stripeWidth;
                             const stripeColor = i % 2 === 0 ? white : red;
                             return <rect key={i} x={x} y={cy - upeHeight/2 -1} width={stripeWidth} height={upeHeight + 2} fill={stripeColor} />;
                        })}
                    </g>
                    <path d={upePath} fill="none" stroke={black} strokeWidth="0.2" />
                </g>
            </g>
        </FlagWrapper>
    );
};

const TransnistriaFlag: React.FC = () => {
    const w = 35, h = 20;
    const topRedH = h / 4;
    const midGreenH = h / 2;
    const bottomRedH = h / 4;
    const red = '#DE2133';
    const green = '#00A35A';
    const gold = '#FFD200';

    const emblemCenterX = w / 5;
    const emblemCenterY = topRedH / 2;

    const waveOffsetX = getWavedX(emblemCenterX, emblemCenterY, w, h) - emblemCenterX;
    const waveOffsetY = getWavedY(emblemCenterX, emblemCenterY, w, h) - emblemCenterY;
    
    const starPath = createStarPath(0, -1.2, 0.8);
    
    return (
        <FlagWrapper>
            <path d={createWavyPath(0, topRedH, w, h)} fill={red} />
            <path d={createWavyPath(topRedH, midGreenH, w, h)} fill={green} />
            <path d={createWavyPath(topRedH + midGreenH, bottomRedH, w, h)} fill={red} />
            
            <g transform={`translate(${emblemCenterX + waveOffsetX}, ${emblemCenterY + waveOffsetY})`}>
                <g fill={gold}>
                    <path d={starPath} />
                    <text 
                        x="0" 
                        y="1" 
                        dominantBaseline="middle" 
                        textAnchor="middle" 
                        fontSize="4"
                        fontFamily="Arial, sans-serif"
                        fontWeight="normal"
                    >
                        ☭
                    </text>
                </g>
            </g>
        </FlagWrapper>
    );
};

const SouthOssetiaFlag: React.FC = () => {
    const w = 35, h = 20;
    const stripeH = h / 3;
    return (
        <FlagWrapper>
            <path d={createWavyPath(0, stripeH, w, h)} fill="#FFFFFF" />
            <path d={createWavyPath(stripeH, stripeH, w, h)} fill="#DA291C" />
            <path d={createWavyPath(2 * stripeH, stripeH, w, h)} fill="#FFD700" />
        </FlagWrapper>
    );
};

const DonetskFlag: React.FC = () => {
    const w = 35, h = 20;
    const stripeH = h / 3;
    return (
        <FlagWrapper>
            <path d={createWavyPath(0, stripeH, w, h)} fill="#000000" />
            <path d={createWavyPath(stripeH, stripeH, w, h)} fill="#0033A0" />
            <path d={createWavyPath(2 * stripeH, stripeH, w, h)} fill="#D52B1E" />
        </FlagWrapper>
    );
};

const LuhanskFlag: React.FC = () => {
    const w = 35, h = 20;
    const stripeH = h / 3;
    return (
        <FlagWrapper>
            <path d={createWavyPath(0, stripeH, w, h)} fill="#61ADE0" />
            <path d={createWavyPath(stripeH, stripeH, w, h)} fill="#0033A0" />
            <path d={createWavyPath(2 * stripeH, stripeH, w, h)} fill="#D52B1E" />
        </FlagWrapper>
    );
};

const SrpskaFlag: React.FC = () => {
    const w = 35, h = 20;
    const stripeH = h / 3;
    return (
        <FlagWrapper>
            <path d={createWavyPath(0, stripeH, w, h)} fill="#D52B1E" />
            <path d={createWavyPath(stripeH, stripeH, w, h)} fill="#0033A0" />
            <path d={createWavyPath(2 * stripeH, stripeH, w, h)} fill="#FFFFFF" />
        </FlagWrapper>
    );
};

const RifFlag: React.FC = () => {
    const w = 35, h = 20;
    const red = '#DA291C';
    const white = '#FFFFFF';
    const green = '#006A4E';

    // Wavy rhombus path
    const p1 = `${w/2},${getWavedY(w/2, 0, w, h)}`; // top
    const p2 = `${w},${getWavedY(w, h/2, w, h)}`;   // right
    const p3 = `${w/2},${getWavedY(w/2, h, w, h)}`;   // bottom
    const p4 = `0,${getWavedY(0, h/2, w, h)}`;     // left
    const rhombusPath = `M ${p1} L ${p2} L ${p3} L ${p4} Z`;

    // Center point and wave offset for symbols
    const cx = w / 2;
    const cy = h / 2;
    const waveOffsetY = getWavedY(cx, cy, w, h) - cy;

    // Crescent properties
    const crescentOuterR = h * 0.2;
    const crescentInnerR = h * 0.18;
    const crescentCenterX = cx - 2.5; // Shift left a bit
    const crescentOuterCx = crescentCenterX;
    const crescentInnerCx = crescentCenterX + 0.8;

    // Star properties
    const starRadius = h * 0.12;
    const starCx = cx + 2.5; // Shift right
    const starCy = cy;

    const createHexagramPath = (cx: number, cy: number, r: number): string => {
        const p = (angle: number) => `${cx + r * Math.cos(angle * Math.PI / 180)},${cy + r * Math.sin(angle * Math.PI / 180)}`;
        // Upward triangle
        const tri1 = `M ${p(-90)} L ${p(30)} L ${p(150)} Z`;
        // Downward triangle
        const tri2 = `M ${p(90)} L ${p(-30)} L ${p(-150)} Z`;
        return `${tri1} ${tri2}`;
    };
    const starPath = createHexagramPath(starCx, starCy, starRadius);


    return (
        <FlagWrapper>
            <path d={createWavyPath(0, h, w, h)} fill={red} />
            <path d={rhombusPath} fill={white} />
            <g transform={`translate(0, ${waveOffsetY})`}>
                <defs>
                    <mask id="rif-crescent-mask">
                        <rect x="0" y="0" width={w} height={h} fill="white" />
                        <circle cx={crescentInnerCx} cy={cy} r={crescentInnerR} fill="black" />
                    </mask>
                </defs>
                <circle cx={crescentOuterCx} cy={cy} r={crescentOuterR} fill={green} mask="url(#rif-crescent-mask)" />
                <path d={starPath} fill={green} />
            </g>
        </FlagWrapper>
    );
};

const SindhFlag: React.FC = () => {
    const w = 35, h = 20;
    const cx = w / 2, cy = h / 2;
    const waveOffsetY = getWavedY(cx, cy, w, h) - cy;
    
    // Path for the Sindh axe symbol
    const axePath = "M 19.5 15.5 C 18 14.5, 17 13.5, 17 12 L 16 9.5 C 12 8, 11 11, 14 11.5 L 15 12 C 15.5 11, 16.5 10, 17 9 C 18 10, 17 11, 16 11.5 L 17 13 C 17.5 15, 18.5 16, 19.5 15.5 Z";

    return (
        <FlagWrapper>
            <path d={createWavyPath(0, h, w, h)} fill="#D52B1E" />
            <g transform={`translate(0, ${waveOffsetY})`}>
                <circle cx={cx} cy={cy} r="7" fill="#FFFFFF" />
                <path d={axePath} fill="#000000" />
            </g>
        </FlagWrapper>
    );
};


// --- Data Export ---

export type FlagComponent = React.FC;

interface FlagInfo {
    name: string;
    textCode: string;
    component: FlagComponent;
}

export const flagData: FlagInfo[] = [
    { name: 'Pahlavi Flag', textCode: ' [Pahlavi 🦁☀️] ', component: PahlaviFlag },
    { name: 'Kawthoolei Flag', textCode: ' [Kawthoolei 🥁] ', component: KawthooleiFlag },
    { name: 'Arab League Flag', textCode: ' [Arab League 🟢] ', component: ArabLeagueFlag },
    { name: 'Australia flag', textCode: ' [Australia 🇦🇺] ', component: AustralianWattleFlag },
    { name: 'Aboriginal Flag', textCode: ' [Aboriginal 🖤💛❤️] ', component: AboriginalFlag },
    { name: 'African Union Flag', textCode: ' [African Union 🌍] ', component: AfricanUnionFlag },
    { name: 'Circassian Flag', textCode: ' [Circassian ⚔️] ', component: CircassianFlag },
    { name: 'Dagestan Flag', textCode: ' [Dagestan 🦅] ', component: DagestanFlag },
    { name: 'Sudan-1956', textCode: ' [Sudan-1956 🇸🇩] ', component: Sudan1956Flag },
    { name: 'Syrian Flag', textCode: ' [Syrian Flag 🇸🇾] ', component: SyrianOppositionFlag },
    { name: 'Gypsy Flag', textCode: ' [Gypsy ☸️] ', component: RomaniFlag },
    { name: 'Bougainville Flag', textCode: ' [Bougainville 🇵🇬] ', component: BougainvilleFlag },
    { name: 'Transdinyester Flag', textCode: ' [Transdinyester ☭] ', component: TransnistriaFlag },
    { name: 'South Ossetia Flag', textCode: ' [South Ossetia ⚪️🔴🟡] ', component: SouthOssetiaFlag },
    { name: 'Donetsk Flag', textCode: ' [Donetsk 🏴] ', component: DonetskFlag },
    { name: 'Luhansk Flag', textCode: ' [Luhansk 🔵] ', component: LuhanskFlag },
    { name: 'Srpska Flag', textCode: ' [Srpska 🇷🇸] ', component: SrpskaFlag },
    { name: 'Rif Flag', textCode: ' [Rif ⵣ] ', component: RifFlag },
    { name: 'Sindh Flag', textCode: ' [Sindh 🪓] ', component: SindhFlag },
    { name: 'Chechen Flag', textCode: ' [Chechen 🐺] ', component: ChechenFlag },
    { name: 'Abkhazia Flag', textCode: ' [Abkhazia ✋] ', component: AbkhaziaFlag },
    { name: 'South Yemen Flag', textCode: ' [South Yemen 🇾🇪⭐️] ', component: SouthYemenFlag },
    { name: 'Tibet Flag', textCode: ' [Tibet 🏔️] ', component: TibetFlag },
    { name: 'Brittany Flag', textCode: ' [Brittany ⚓️] ', component: BrittanyFlag },
    { name: 'Crimean Tatars Flag', textCode: ' [Crimean Tatars 𐱃] ', component: CrimeanTatarsFlag },
    { name: 'Afrikaners Flag', textCode: ' [Afrikaners 🇿🇦] ', component: AfrikanersFlag },
    { name: 'Catalonia Flag', textCode: ' [Catalonia ⭐️] ', component: CataloniaFlag },
    { name: 'Kurdistan Flag', textCode: ' [Kurdistan ☀️] ', component: KurdistanFlag },
    { name: 'Hadhramout Flag', textCode: ' [Hadramout 🌲] ', component: HadhramoutFlag },
    { name: 'California Flag', textCode: ' [California 🐻] ', component: CaliforniaFlag },
    { name: 'Balochistan Flag', textCode: ' [Balochistan 🌟] ', component: BalochistanFlag },
    { name: 'Amazigh Flag', textCode: ' [Amazigh ⵣ] ', component: AmazighFlag },
    { name: 'Birland Flag', textCode: ' [Birland 🌳] ', component: BirlandFlag },
    { name: 'Somaliland Flag', textCode: ' [Somaliland 🇸🇴] ', component: SomalilandFlag },
    { name: 'East Turkestan Flag', textCode: ' [East Turkestan ☪️] ', component: EastTurkestanFlag },
    { name: 'Turkmen Flag', textCode: ' [Turkmen 🌟] ', component: TurkmenFlag },
    { name: 'TRNC Flag', textCode: ' [TRNC 🇹🇷🇨🇾] ', component: TRNCFlag },
    { name: 'Ahwaz Flag', textCode: ' [Ahwaz 🇮🇷] ', component: AhwazFlag },
    { name: 'Tamil Eelam Flag', textCode: ' [Tamil Eelam 🐅] ', component: TamilFlag },
    { name: 'New flags coming soon....', textCode: ' [Soon... 🚩] ', component: NewFlag },
];
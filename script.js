const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const fileInput = document.getElementById('fileInput');
const svgInput = document.getElementById('svgInput');
const dropHint = document.getElementById('dropHint');
const loader = document.getElementById('loader');
const panel = document.getElementById('panel');

let customSVGPath = null;
let customSVGViewBox = { x: 0, y: 0, w: 100, h: 100 };

// Image State
let sourceImage = new Image();
sourceImage.crossOrigin = "Anonymous";

sourceImage.onload = () => { dropHint.classList.add('hidden'); render(); };
sourceImage.onerror = () => {
    loader.textContent = 'Could not load the reference image — upload one instead';
    loader.classList.remove('hidden');
};
// Lorem Picsum: free-to-use, non-copyright placeholder photography, stable via seed.
sourceImage.src = 'https://picsum.photos/seed/dither-studio/1000/1250';

// --- CONFIGURATION ---
const DEFAULTS = {
    mode: 'halftone',
    shape: 'circle',
    cellSize: 10,
    baseScale: 0.9,
    gap: 1,
    bgColor: '#111111',
    useColor: true,
    monoColor: '#ffffff',
    contrast: 0,
    intensity: 1.0
};
const params = { ...DEFAULTS };

// Throttle renders to one per animation frame so dragging a slider
// doesn't queue up dozens of full-image redraws.
let renderQueued = false;
function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
        renderQueued = false;
        render();
    });
}

// --- CONTROL BINDING ---
const el = {
    cellSize: document.getElementById('cellSize'),
    gap: document.getElementById('gap'),
    contrast: document.getElementById('contrast'),
    bgColor: document.getElementById('bgColor'),
    useColor: document.getElementById('useColor'),
    monoColor: document.getElementById('monoColor'),
    monoColorField: document.getElementById('monoColorField'),
    mode: document.getElementById('mode'),
    baseScale: document.getElementById('baseScale'),
    intensity: document.getElementById('intensity'),
    shapeGrid: document.getElementById('shapeGrid'),
    moreShapesBtn: document.getElementById('moreShapesBtn'),
    loadSvgBtn: document.getElementById('loadSvgBtn')
};

function bindRange(key, format) {
    const input = el[key];
    const valueLabel = document.getElementById('val-' + key);
    input.addEventListener('input', () => {
        params[key] = parseFloat(input.value);
        if (valueLabel) valueLabel.textContent = format(params[key]);
        scheduleRender();
    });
}

bindRange('cellSize', v => String(v));
bindRange('gap', v => v.toFixed(2));
bindRange('contrast', v => (v > 0 ? '+' : '') + v);
bindRange('baseScale', v => v.toFixed(3));
bindRange('intensity', v => v.toFixed(2));

el.bgColor.addEventListener('input', () => { params.bgColor = el.bgColor.value; scheduleRender(); });
el.monoColor.addEventListener('input', () => { params.monoColor = el.monoColor.value; scheduleRender(); });

el.useColor.addEventListener('change', () => {
    params.useColor = el.useColor.checked;
    el.monoColorField.classList.toggle('disabled', params.useColor);
    scheduleRender();
});

el.mode.addEventListener('change', () => { params.mode = el.mode.value; scheduleRender(); });

// --- SHAPE GRID ---
// 6 "popular" shapes up front, the rest revealed 6 at a time via "More Shapes".
const SHAPES = [
    ['circle', 'Circle'], ['rect', 'Square'], ['triangle', 'Triangle'],
    ['star', 'Star'], ['hex_v', 'Hexagon'], ['cross', 'Cross'],
    ['octagon', 'Octagon'], ['rect_v', 'Rect Vertical'], ['rect_h', 'Rect Horizontal'],
    ['line_diag_r', 'Diagonal /'], ['line_diag_l', 'Diagonal \\'], ['chevron', 'Chevron'],
    ['trapezoid', 'Trapezoid'], ['semi_top', 'Semi-Circle Top'], ['semi_bottom', 'Semi-Circle Bottom'],
    ['rect_hollow', 'Square Hollow'], ['spiral', 'Spiral'], ['concentric', 'Concentric Circles'],
    ['gear', 'Gear'], ['flower', 'Flower'], ['shuriken', 'Shuriken'],
    ['lightning', 'Lightning'], ['diamond_hollow', 'Diamond Hollow'], ['windmill', 'Windmill'],
    ['leaf', 'Leaf'], ['ghost', 'Pacman Ghost']
];
const SHAPES_PER_REVEAL = 6;
let shapesRevealed = SHAPES_PER_REVEAL;

function buildShapeGrid() {
    el.shapeGrid.innerHTML = '';
    SHAPES.forEach(([type, label], i) => {
        const tile = document.createElement('button');
        tile.className = 'shape-tile';
        tile.type = 'button';
        tile.title = label;
        tile.dataset.shape = type;
        if (i >= shapesRevealed) tile.classList.add('hidden');
        if (type === params.shape) tile.classList.add('selected');

        const icon = document.createElement('canvas');
        icon.width = 40; icon.height = 40;
        const iconCtx = icon.getContext('2d');
        iconCtx.fillStyle = '#e7e7ea';
        iconCtx.strokeStyle = '#e7e7ea';
        drawShape(iconCtx, 20, 20, 30, type);

        tile.appendChild(icon);
        tile.addEventListener('click', () => selectShape(type));
        el.shapeGrid.appendChild(tile);
    });
    el.moreShapesBtn.classList.toggle('hidden', shapesRevealed >= SHAPES.length);
}

function selectShape(type) {
    params.shape = type;
    [...el.shapeGrid.children].forEach(tile => tile.classList.toggle('selected', tile.dataset.shape === type));
    scheduleRender();
}

el.moreShapesBtn.addEventListener('click', () => {
    shapesRevealed += SHAPES_PER_REVEAL;
    buildShapeGrid();
});

el.loadSvgBtn.addEventListener('click', () => svgInput.click());

document.getElementById('uploadBtn').addEventListener('click', () => fileInput.click());
document.getElementById('saveBtn').addEventListener('click', saveImage);

document.getElementById('resetBtn').addEventListener('click', () => {
    Object.assign(params, DEFAULTS);
    el.cellSize.value = params.cellSize; document.getElementById('val-cellSize').textContent = String(params.cellSize);
    el.gap.value = params.gap; document.getElementById('val-gap').textContent = params.gap.toFixed(2);
    el.contrast.value = params.contrast; document.getElementById('val-contrast').textContent = String(params.contrast);
    el.bgColor.value = params.bgColor;
    el.monoColor.value = params.monoColor;
    el.useColor.checked = params.useColor;
    el.monoColorField.classList.toggle('disabled', params.useColor);
    el.mode.value = params.mode;
    el.baseScale.value = params.baseScale; document.getElementById('val-baseScale').textContent = params.baseScale.toFixed(3);
    el.intensity.value = params.intensity; document.getElementById('val-intensity').textContent = params.intensity.toFixed(2);
    shapesRevealed = SHAPES_PER_REVEAL;
    buildShapeGrid();
    scheduleRender();
});

buildShapeGrid();

// Mobile panel toggle
document.getElementById('panelToggle').addEventListener('click', () => panel.classList.toggle('open'));

// --- IMAGE LOADING ---
function loadImageFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => { sourceImage = img; dropHint.classList.add('hidden'); render(); };
        img.onerror = () => alert('Could not read this image file.');
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}

fileInput.addEventListener('change', (e) => loadImageFile(e.target.files[0]));

// Drag & drop anywhere on the page
['dragenter', 'dragover'].forEach(evt =>
    document.addEventListener(evt, (e) => { e.preventDefault(); document.body.classList.add('dragover'); })
);
['dragleave', 'drop'].forEach(evt =>
    document.addEventListener(evt, (e) => { e.preventDefault(); document.body.classList.remove('dragover'); })
);
document.addEventListener('drop', (e) => loadImageFile(e.dataTransfer.files[0]));

// --- SVG UPLOAD & PARSING ---
svgInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const svgContent = ev.target.result;
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, "image/svg+xml");

        const pathElem = doc.querySelector('path');
        const svgElem = doc.querySelector('svg');

        if (!pathElem) {
            alert("Could not find a <path> element in this SVG. Please convert shapes to paths.");
            return;
        }

        const d = pathElem.getAttribute('d');
        customSVGPath = new Path2D(d);

        if (svgElem) {
            const viewBox = svgElem.getAttribute('viewBox');
            if (viewBox) {
                const parts = viewBox.split(/\s+|,/).map(parseFloat);
                customSVGViewBox = { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
            } else {
                const w = parseFloat(svgElem.getAttribute('width')) || 100;
                const h = parseFloat(svgElem.getAttribute('height')) || 100;
                customSVGViewBox = { x: 0, y: 0, w: w, h: h };
            }
        }
        params.shape = 'custom';
        [...el.shapeGrid.children].forEach(tile => tile.classList.remove('selected'));
        scheduleRender();
    };
    reader.readAsText(file);
});

// --- RENDER ENGINE ---
function render() {
    if (!sourceImage.width) return;
    loader.textContent = 'Rendering…';
    loader.classList.remove('hidden');
    canvas.classList.add('rendering');

    // Calculate Aspect Ratio & Dimensions
    const maxDisplay = 1600;
    const aspect = sourceImage.width / sourceImage.height;
    let dw = sourceImage.width;
    let dh = sourceImage.height;
    if (dw > maxDisplay) { dw = maxDisplay; dh = dw / aspect; }

    canvas.width = dw;
    canvas.height = dh;

    // Background
    ctx.fillStyle = params.bgColor;
    ctx.fillRect(0, 0, dw, dh);

    // Temp Canvas for pixel reading
    const tmpCnvs = document.createElement('canvas');
    tmpCnvs.width = dw; tmpCnvs.height = dh;
    const tmpCtx = tmpCnvs.getContext('2d');
    tmpCtx.drawImage(sourceImage, 0, 0, dw, dh);
    const imgData = tmpCtx.getImageData(0, 0, dw, dh).data;
    const step = params.cellSize;

    // Prepare Colors
    const hex = params.monoColor.replace(/^#/, '');
    const mR = parseInt(hex.substring(0, 2), 16);
    const mG = parseInt(hex.substring(2, 4), 16);
    const mB = parseInt(hex.substring(4, 6), 16);

    // Calculate Contrast Factor
    const contrastFactor = (259 * (params.contrast + 255)) / (255 * (259 - params.contrast));

    // --- GRID LOOP ---
    for (let y = 0; y < dh; y += step) {
        for (let x = 0; x < dw; x += step) {

            const pIdx = ((y + Math.floor(step/2)) * dw + (x + Math.floor(step/2))) * 4;
            if (pIdx >= imgData.length) continue;

            let r = imgData[pIdx];
            let g = imgData[pIdx + 1];
            let b = imgData[pIdx + 2];
            const a = imgData[pIdx + 3];

            if (a < 20) continue;

            // Apply Contrast
            r = contrastFactor * (r - 128) + 128;
            g = contrastFactor * (g - 128) + 128;
            b = contrastFactor * (b - 128) + 128;

            // Clamp 0-255
            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));

            // Calculate Luma
            const luma = (0.299*r + 0.587*g + 0.114*b) / 255;

            // Algorithm Variables
            let scX = params.baseScale;
            let scY = params.baseScale;
            let rot = 0;
            let offX = 0;
            let offY = 0;
            let alpha = 1.0;

            // --- ALGORITHM SWITCH ---
            switch (params.mode) {
                case 'flat': break;
                case 'halftone': scX = scY = luma * params.baseScale * 1.5; break;
                case 'inv_halftone': scX = scY = (1.0 - luma) * params.baseScale * 1.5; break;
                case 'rotation': rot = luma * Math.PI; break;
                case 'random_size': scX = scY = Math.random() * params.baseScale; break;
                case 'random_rot': rot = Math.random() * Math.PI * 2; break;
                case 'glitch': offX = (luma - 0.5) * step * 1.5 * params.intensity; break;
                case 'opacity': alpha = luma; break;
                case 'inv_opacity': alpha = 1.0 - luma; break;
                case 'threshold': if (luma < 0.5) scX = scY = 0; break;
                case 'crosshatch':
                    rot = (luma > 0.5) ? Math.PI/4 : -Math.PI/4;
                    scY = params.baseScale * 1.5; scX = params.baseScale * 0.2; break;
                case 'stretch_v': scX = params.baseScale * 0.5; scY = luma * params.baseScale * 3; break;
                case 'stretch_h': scX = luma * params.baseScale * 3; scY = params.baseScale * 0.5; break;

                case 'flow':
                    const iR = pIdx + step * 4;
                    const iB = pIdx + (dw * step) * 4;

                    let rR = imgData[iR] || 0; let gR = imgData[iR+1] || 0; let bR = imgData[iR+2] || 0;
                    let rB = imgData[iB] || 0; let gB = imgData[iB+1] || 0; let bB = imgData[iB+2] || 0;

                    const lR = (0.299*rR + 0.587*gR + 0.114*bR) / 255;
                    const lB = (0.299*rB + 0.587*gB + 0.114*bB) / 255;

                    const dx = lR - (0.299*imgData[pIdx]+0.587*imgData[pIdx+1]+0.114*imgData[pIdx+2])/255;
                    const dy = lB - (0.299*imgData[pIdx]+0.587*imgData[pIdx+1]+0.114*imgData[pIdx+2])/255;

                    rot = Math.atan2(dy, dx) * params.intensity;
                    scX = scY = luma * params.baseScale * 1.2;
                    break;

                case 'edges':
                    const idxNext = pIdx + step*4;
                    let rN = imgData[idxNext] || 0; let gN = imgData[idxNext+1] || 0; let bN = imgData[idxNext+2] || 0;
                    rN = contrastFactor * (rN - 128) + 128;
                    const lumaN = (0.299*rN + 0.587*gN + 0.114*bN) / 255;

                    const diff = Math.abs(luma - lumaN);
                    scX = scY = diff * 5 * params.baseScale * params.intensity;
                    break;

                case 'melt':
                    offY = luma * step * 2 * params.intensity;
                    scX = scY = luma * params.baseScale;
                    break;

                case 'jitter':
                    const jit = (Math.random() - 0.5) * step * 2;
                    if (luma > 0.5) {
                        offX = jit * params.intensity;
                        offY = jit * params.intensity;
                    }
                    scX = scY = luma * params.baseScale;
                    break;

                case 'checker':
                    const gridX = Math.floor(x/step);
                    const gridY = Math.floor(y/step);
                    if ((gridX + gridY) % 2 === 0) scX = scY = luma * params.baseScale * 1.5;
                    else scX = scY = (1.0 - luma) * params.baseScale * 1.5;
                    break;

                case 'posterize':
                    let level = 0.2;
                    if (luma > 0.3) level = 0.5;
                    if (luma > 0.6) level = 0.8;
                    if (luma > 0.8) level = 1.0;
                    scX = scY = level * params.baseScale;
                    break;

                case 'interference':
                    const pattern = Math.sin((x * y) * 0.0001 * params.intensity);
                    scX = scY = (luma + pattern) * 0.5 * params.baseScale * 1.5;
                    break;

                case 'crt_scan':
                    const line = Math.floor(y/step);
                    if (line % 2 === 0) {
                        scX = params.baseScale * 1.2;
                        scY = params.baseScale * 0.2;
                        offX = 2 * params.intensity;
                    } else {
                        scX = luma * params.baseScale;
                        scY = params.baseScale * 0.8;
                    }
                    break;

                case 'bio':
                    rot = Math.sin(luma * Math.PI * 2) + (Math.random()*0.5);
                    scX = scY = (luma + 0.2) * params.baseScale;
                    break;

                case 'eraser':
                    if (Math.random() > luma * params.intensity) scX = scY = 0;
                    break;
            }

            // --- DRAWING ---
            ctx.save();
            const cx = x + step/2 + offX;
            const cy = y + step/2 + offY;
            const size = Math.max(0, step - params.gap);

            ctx.translate(cx, cy);
            ctx.rotate(rot);
            ctx.scale(scX, scY);

            if (params.useColor) {
                ctx.fillStyle = `rgba(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)},${alpha})`;
                ctx.strokeStyle = `rgba(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)},${alpha})`;
            } else {
                ctx.fillStyle = `rgba(${mR},${mG},${mB},${alpha})`;
                ctx.strokeStyle = `rgba(${mR},${mG},${mB},${alpha})`;
            }

            drawShape(ctx, 0, 0, size, params.shape);
            ctx.restore();
        }
    }

    canvas.classList.remove('rendering');
    loader.classList.add('hidden');
}

// --- SHAPE LIBRARY ---
function drawShape(ctx, x, y, size, type) {
    const r = size / 2;

    if (type === 'custom') {
        if (customSVGPath) {
            const maxDim = Math.max(customSVGViewBox.w, customSVGViewBox.h);
            const scale = size / maxDim;

            ctx.save();
            ctx.scale(scale, scale);
            ctx.translate(-customSVGViewBox.w / 2, -customSVGViewBox.h / 2);
            ctx.translate(-customSVGViewBox.x, -customSVGViewBox.y);

            ctx.fill(customSVGPath);
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.rect(x-r, y-r, size, size);
            ctx.fillText("?", x, y);
        }
        return;
    }

    ctx.beginPath();
    switch (type) {
        case 'circle': ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); break;
        case 'rect': ctx.rect(x-r, y-r, size, size); ctx.fill(); break;
        case 'triangle': ctx.moveTo(x, y-r); ctx.lineTo(x+r, y+r); ctx.lineTo(x-r, y+r); ctx.closePath(); ctx.fill(); break;
        case 'octagon': drawPoly(ctx, x, y, r, 8, Math.PI/8); ctx.fill(); break;
        case 'star': drawStar(ctx, x, y, 5, r, r*0.4); ctx.fill(); break;
        case 'cross': const w = r/3; ctx.rect(x-w, y-r, w*2, size); ctx.rect(x-r, y-w, size, w*2); ctx.fill(); break;
        case 'rect_v': ctx.rect(x - r*0.3, y - r, size*0.3, size); ctx.fill(); break;
        case 'rect_h': ctx.rect(x - r, y - r*0.3, size, size*0.3); ctx.fill(); break;
        case 'hex_v': drawPoly(ctx, x, y, r, 6, Math.PI/6); ctx.fill(); break;
        case 'line_diag_r': ctx.moveTo(x - r, y + r); ctx.lineTo(x - r + size*0.2, y + r); ctx.lineTo(x + r, y - r); ctx.lineTo(x + r - size*0.2, y - r); ctx.closePath(); ctx.fill(); break;
        case 'line_diag_l': ctx.moveTo(x - r, y - r); ctx.lineTo(x - r + size*0.2, y - r); ctx.lineTo(x + r, y + r); ctx.lineTo(x + r - size*0.2, y + r); ctx.closePath(); ctx.fill(); break;
        case 'chevron': const chW = r * 0.4; ctx.moveTo(x - r, y + r*0.5); ctx.lineTo(x, y - r*0.5); ctx.lineTo(x + r, y + r*0.5); ctx.lineTo(x + r, y + r*0.5 - chW); ctx.lineTo(x, y - r*0.5 - chW); ctx.lineTo(x - r, y + r*0.5 - chW); ctx.closePath(); ctx.fill(); break;
        case 'trapezoid': ctx.moveTo(x - r * 0.6, y - r); ctx.lineTo(x + r * 0.6, y - r); ctx.lineTo(x + r, y + r); ctx.lineTo(x - r, y + r); ctx.closePath(); ctx.fill(); break;
        case 'semi_top': ctx.arc(x, y + r*0.1, r, Math.PI, 0); ctx.closePath(); ctx.fill(); break;
        case 'semi_bottom': ctx.arc(x, y - r*0.1, r, 0, Math.PI); ctx.closePath(); ctx.fill(); break;
        case 'rect_hollow': ctx.rect(x - r, y - r, size, size); ctx.rect(x + r*0.5, y - r*0.5, -size*0.5, size*0.5); ctx.fill(); break;

        case 'spiral':
            ctx.lineWidth = size * 0.15; ctx.lineCap = 'round';
            const loops = 2; const increment = (r) / (loops * 10);
            ctx.moveTo(x, y);
            for (let i = 0; i < loops * 20; i++) {
                const angle = 0.5 * i; const dist = increment * i;
                ctx.lineTo(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist);
            }
            ctx.stroke();
            break;
        case 'concentric':
            ctx.arc(x, y, r, 0, Math.PI*2); ctx.arc(x, y, r*0.7, 0, Math.PI*2, true);
            ctx.arc(x, y, r*0.4, 0, Math.PI*2); ctx.arc(x, y, r*0.15, 0, Math.PI*2, true); ctx.fill();
            break;
        case 'gear':
            const teeth = 8; const outerR = r; const innerR = r * 0.7; const holeR = r * 0.3;
            for (let i = 0; i < teeth * 2; i++) {
                const a = (Math.PI * 2 * i) / (teeth * 2); const rad = (i % 2 === 0) ? outerR : innerR;
                const px = x + Math.cos(a) * rad; const py = y + Math.sin(a) * rad;
                i===0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath(); ctx.moveTo(x + holeR, y); ctx.arc(x, y, holeR, 0, Math.PI*2, true); ctx.fill();
            break;
        case 'flower':
            for (let i = 0; i < 5; i++) {
                const a = (Math.PI * 2 * i) / 5; const px = x + Math.cos(a) * (r * 0.6); const py = y + Math.sin(a) * (r * 0.6);
                ctx.moveTo(x, y); ctx.arc(px, py, r * 0.4, 0, Math.PI * 2);
            }
            ctx.fill(); break;
        case 'shuriken':
            const spikes = 4; const outer = r; const inner = r * 0.2; ctx.moveTo(x, y - outer);
            for(let i=0; i<spikes; i++){
                let rot = (Math.PI / 2 * i);
                ctx.quadraticCurveTo(x + Math.cos(rot + Math.PI/4)*r*0.5, y + Math.sin(rot + Math.PI/4)*r*0.5, x + Math.cos(rot + Math.PI/2)*outer, y + Math.sin(rot + Math.PI/2)*outer);
                ctx.lineTo(x + Math.cos(rot + Math.PI/2 + Math.PI/4)*inner, y + Math.sin(rot + Math.PI/2 + Math.PI/4)*inner);
            }
            ctx.fill(); break;
        case 'lightning':
            const w2 = r * 0.6; ctx.moveTo(x + w2, y - r); ctx.lineTo(x - w2*0.2, y - r*0.1); ctx.lineTo(x + w2, y - r*0.1);
            ctx.lineTo(x - w2, y + r); ctx.lineTo(x + w2*0.2, y + r*0.1); ctx.lineTo(x - w2, y + r*0.1); ctx.closePath(); ctx.fill();
            break;
        case 'diamond_hollow':
            ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
            const hr = r * 0.5; ctx.moveTo(x - hr, y); ctx.lineTo(x, y + hr); ctx.lineTo(x + hr, y); ctx.lineTo(x, y - hr); ctx.closePath(); ctx.fill();
            break;
        case 'windmill':
            for(let i=0; i<4; i++){
                const ang = (Math.PI/2)*i;
                ctx.moveTo(x,y); ctx.lineTo(x + Math.cos(ang)*r*0.2, y + Math.sin(ang)*r*0.2);
                ctx.lineTo(x + Math.cos(ang)*r, y + Math.sin(ang)*r); ctx.lineTo(x + Math.cos(ang + 0.5)*r, y + Math.sin(ang + 0.5)*r); ctx.closePath();
            }
            ctx.fill(); break;
        case 'leaf':
            ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r, y - r*0.5, x + r, y); ctx.quadraticCurveTo(x + r, y + r*0.5, x, y + r);
            ctx.quadraticCurveTo(x - r, y + r*0.5, x - r, y); ctx.quadraticCurveTo(x - r, y - r*0.5, x, y - r);
            ctx.rect(x-size*0.05, y-r, size*0.1, size*1.8); ctx.fill(); break;
        case 'ghost':
            ctx.arc(x, y - r*0.2, r*0.8, Math.PI, 0); ctx.lineTo(x + r*0.8, y + r); ctx.lineTo(x + r*0.4, y + r*0.7);
            ctx.lineTo(x, y + r); ctx.lineTo(x - r*0.4, y + r*0.7); ctx.lineTo(x - r*0.8, y + r); ctx.closePath();
            ctx.moveTo(x - r*0.3, y - r*0.2); ctx.arc(x - r*0.3, y - r*0.2, r*0.2, 0, Math.PI*2);
            ctx.moveTo(x + r*0.3, y - r*0.2); ctx.arc(x + r*0.3, y - r*0.2, r*0.2, 0, Math.PI*2); ctx.fill(); break;
    }
}

function drawPoly(ctx, x, y, rad, sides, offset) {
    const step = (Math.PI*2)/sides;
    for(let i=0; i<sides; i++){
        const ang = i*step + offset;
        i===0 ? ctx.moveTo(x + Math.cos(ang)*rad, y + Math.sin(ang)*rad) : ctx.lineTo(x + Math.cos(ang)*rad, y + Math.sin(ang)*rad);
    }
    ctx.closePath();
}

function drawStar(ctx, cx, cy, spikes, outer, inner) {
    let rot = Math.PI/2*3, x=cx, y=cy, step=Math.PI/spikes;
    ctx.moveTo(cx, cy-outer);
    for(let i=0; i<spikes; i++){
        x=cx+Math.cos(rot)*outer; y=cy+Math.sin(rot)*outer; ctx.lineTo(x,y); rot+=step;
        x=cx+Math.cos(rot)*inner; y=cy+Math.sin(rot)*inner; ctx.lineTo(x,y); rot+=step;
    }
    ctx.lineTo(cx, cy-outer); ctx.closePath();
}

function saveImage() {
    const l = document.createElement('a');
    l.download = `dither-ascii-studio-${Date.now()}.png`;
    l.href = canvas.toDataURL();
    l.click();
}

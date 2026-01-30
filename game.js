// --- Canvas setup ---
const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Ridimensiona canvas al resize
window.onresize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawMap();
};

// --- Stato dati ---
let countriesData = [];

// --- Carica GeoJSON ---
fetch("data/countries.geojson")
    .then(res => res.json())
    .then(geojson => {
        countriesData = geojson.features.filter(f => f.geometry); // filtra geometrie valide
        drawMap();
    })
    .catch(err => console.error("Errore caricamento GeoJSON:", err));

// --- Proiezione equirettangolare ---
function proj(lon, lat) {
    const x = (lon + 180) / 360 * canvas.width;
    const y = (90 - lat) / 180 * canvas.height;
    return [x, y];
}

// --- Colore unico per ogni nazione ---
function color(name) {
    if (!name) name = "Unknown"; // fallback
    let h = 0;
    for (let i = 0; i < name.length; i++) {
        h = name.charCodeAt(i) + ((h << 5) - h);
    }
    return "#" + (h & 0xffffff).toString(16).padStart(6, "0");
}

// --- Disegna mappa ---
function drawMap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!countriesData.length) return;

    countriesData.forEach(c => {
        ctx.beginPath();
        const geom = c.geometry;

        if (geom.type === "Polygon") drawPolygon(geom.coordinates);
        else if (geom.type === "MultiPolygon") geom.coordinates.forEach(poly => drawPolygon(poly));

        const name = c.properties.ADMIN || "Unknown";
        ctx.fillStyle = color(name);
        ctx.strokeStyle = "#000"; // confini
        ctx.lineWidth = 0.5;
        ctx.fill();
        ctx.stroke();
    });
}

// --- Disegna singolo poligono ---
function drawPolygon(coords) {
    coords.forEach(ring => {
        ring.forEach(([lon, lat], i) => {
            const [x, y] = proj(lon, lat);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.closePath();
    });
}

// --- Loop rendering opzionale per animazioni/futuro ---
function loop() {
    drawMap();
    requestAnimationFrame(loop);
}

// Avvia loop (puoi anche chiamare solo drawMap() se vuoi mappa statica)
loop();

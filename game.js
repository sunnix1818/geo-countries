const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.onresize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawMap();
};

// Stato dati
let countriesData = [];

// Carica GeoJSON
fetch("data/countries.geojson")
    .then(res => res.json())
    .then(geojson => {
        countriesData = geojson.features;
        drawMap();
    });

// Proiezione equirettangolare semplice
function proj(lon, lat) {
    const x = (lon + 180) / 360 * canvas.width;
    const y = (90 - lat) / 180 * canvas.height;
    return [x, y];
}

// Colore casuale per ogni nazione
function color(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return "#" + (h & 0xffffff).toString(16).padStart(6, "0");
}

// Disegna la mappa con confini
function drawMap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    countriesData.forEach(c => {
        ctx.beginPath();
        const geom = c.geometry;

        if (geom.type === "Polygon") drawPolygon(geom.coordinates);
        else if (geom.type === "MultiPolygon") geom.coordinates.forEach(poly => drawPolygon(poly));

        ctx.fillStyle = color(c.properties.ADMIN);
        ctx.strokeStyle = "#000"; // confini
        ctx.lineWidth = 0.5;
        ctx.fill();
        ctx.stroke();
    });
}

// Disegna singolo poligono
function drawPolygon(coords) {
    coords.forEach(ring => {
        ring.forEach(([lon, lat], i) => {
            const [x, y] = proj(lon, lat);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
    });
}

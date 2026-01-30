const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.onresize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawMap();
};

let countriesData = [];

fetch("data/countries.geojson")
    .then(res => res.json())
    .then(geojson => {
        countriesData = geojson.features.filter(f => f.geometry && (f.properties.ADMIN || f.properties.NAME));
        drawMap();
    })
    .catch(err => console.error("Errore caricamento GeoJSON:", err));

function proj(lon, lat) {
    const x = (lon + 180) / 360 * canvas.width;
    const y = (90 - lat) / 180 * canvas.height;
    return [x, y];
}

function color(name){
    if (typeof name !== "string") name = "Unknown";
    let h = 0;
    for (let i = 0; i < name.length; i++) {
        h = name.charCodeAt(i) + ((h << 5) - h);
    }
    return "#" + (h & 0xffffff).toString(16).padStart(6, "0");
}

function drawMap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!countriesData.length) return;

    countriesData.forEach(c => {
        ctx.beginPath();
        const geom = c.geometry;
        if (geom.type === "Polygon") drawPolygon(geom.coordinates);
        else if (geom.type === "MultiPolygon") geom.coordinates.forEach(poly => drawPolygon(poly));

        const name = c.properties.ADMIN || c.properties.NAME || "Unknown";
        ctx.fillStyle = color(name);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 0.5;
        ctx.fill();
        ctx.stroke();
    });
}

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

drawMap();

const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.onresize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
};

// --- Stato calendario e giocatore
let day = 1, month = 1, year = 2026;
let player = "Italy";
let zoom = 1, offsetX = 0, offsetY = 0;
let countriesData = [], capitalsData = [];
let S = {}; // Stato globale delle nazioni
let logDiv = document.getElementById("log");

// --- Carica dati
Promise.all([
    fetch("data/countries.geojson").then(r => r.json()),
    fetch("capital.json").then(r => r.json())
]).then(([geojson, capitals]) => {
    countriesData = geojson.features;
    capitalsData = capitals;
    initGame();
});

// --- Proiezione equirettangolare
function proj(lon, lat) {
    const x = (lon + 180) / 360 * canvas.width * zoom + offsetX;
    const y = (90 - lat) / 180 * canvas.height * zoom + offsetY;
    return [x, y];
}

// --- Inizializza stato
function initGame() {
    countriesData.forEach(c => {
        const name = c.properties.ADMIN;
        S[name] = {
            gdp: 1000 + Math.random() * 5000,
            army: 50 + Math.random() * 200,
            gov: ["Democrazia", "Monarchia", "Dittatura", "Repubblica"][Math.floor(Math.random()*4)],
            leader: { name: "Leader_" + Math.floor(Math.random()*999), age: 40 + Math.floor(Math.random()*20) }
        };
        c.owner = name; // ognuno possiede se stesso
    });
    draw();
    updateUI();
    log("🚀 Gioco iniziato! Seleziona una nazione per iniziare la conquista.");
}

// --- Disegna mappa + capitali
function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);

    countriesData.forEach(c => {
        ctx.beginPath();
        const geom = c.geometry;
        if(geom.type === "Polygon") drawPolygon(geom.coordinates);
        else if(geom.type === "MultiPolygon") geom.coordinates.forEach(poly => drawPolygon(poly));
        ctx.fillStyle = color(c.owner);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 0.5;
        ctx.fill();
        ctx.stroke();
    });

    capitalsData.forEach(cap=>{
        const [x,y] = proj(cap.lon, cap.lat);
        ctx.fillStyle = "yellow";
        ctx.beginPath();
        ctx.arc(x,y,5,0,Math.PI*2);
        ctx.fill();
    });
}

// --- Disegna poligono
function drawPolygon(coords){
    coords.forEach(ring=>{
        ring.forEach(([lon,lat],i)=>{
            const [x,y] = proj(lon,lat);
            if(i===0) ctx.moveTo(x,y);
            else ctx.lineTo(x,y);
        });
    });
}

// --- Colore nazione
function color(name){
    let h=0;
    for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h);
    return "#" + (h & 0xffffff).toString(16).padStart(6,"0");
}

// --- Centroid nazione
function getCentroid(c){
    let coords = c.geometry.type==="Polygon"?c.geometry.coordinates[0]:c.geometry.coordinates[0][0];
    let sumX=0,sumY=0;
    coords.forEach(([lon,lat])=>{
        const [x,y] = proj(lon,lat);
        sumX+=x; sumY+=y;
    });
    return [sumX/coords.length, sumY/coords.length];
}

// --- Log dinamico
function log(text){
    logDiv.innerHTML = text + "<br>" + logDiv.innerHTML;
}

// --- Aggiorna UI
function updateUI(){
    document.getElementById("nation").textContent = player;
    document.getElementById("date").textContent = day + "/" + month + "/" + year;
    document.getElementById("gdp").textContent = Math.floor(S[player].gdp);
    document.getElementById("army").textContent = Math.floor(S[player].army);
    document.getElementById("gov").textContent = S[player].gov;
    document.getElementById("regions").textContent = countriesData.filter(c=>c.owner===player).length;
}

// --- Conquista capitale solo se adiacente
function canConquer(targetCountry){
    let target = countriesData.find(c=>c.properties.ADMIN===targetCountry);
    if(!target) return false;
    let neighbors = countriesData.filter(c=>c.owner===player && c.properties.ADMIN!==targetCountry);
    let [tx,ty] = getCentroid(target);
    return neighbors.some(n=>{
        let [nx,ny]=getCentroid(n);
        return Math.hypot(tx-nx,ty-ny)<150;
    });
}

function conquer(targetCountry){
    if(canConquer(targetCountry)){
        countriesData.forEach(c=>{ if(c.properties.ADMIN===targetCountry) c.owner=player });
        log(`🏰 Hai conquistato ${targetCountry}!`);
        updateUI();
        draw();
    } else log(`❌ Non puoi conquistare ${targetCountry}, nessun confine posseduto!`);
}

// --- Reclutamento e ricerca
function recruit(){
    S[player].army+=50;
    S[player].gdp-=100;
    updateUI();
    log("⚔️ Hai reclutato 50 truppe!");
}

function research(){
    S[player].gdp-=200;
    updateUI();
    log("🧪 Ricerca completata!");
}

// --- Avanza giorno/mese/anno
function nextDay(){ day++; if(day>30){day=1; nextMonth()} updateUI(); }
function nextMonth(){ month++; monthTick(); if(month>12){month=1; nextYear()} updateUI(); }
function nextYear(){ year++; }
function monthTick(){ Object.keys(S).forEach(n=>{ S[n].gdp*=1.01; S[n].army+=S[n].gdp/1000; }); }

// --- Loop rendering
function loop(){ draw(); requestAnimationFrame(loop); }
loop();

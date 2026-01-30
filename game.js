const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// variabili per pan/zoom
let offsetX = 0, offsetY = 0, scale = 1;
let isDragging = false, dragStart = {x:0,y:0};

// tooltip
let hoveredNation = null;

// carica GeoJSON
let countriesData = [];
fetch("data/countries.geojson")
  .then(res => res.json())
  .then(geojson => {
    countriesData = geojson.features.filter(f => f && f.geometry && Array.isArray(f.geometry.coordinates));
    drawMap();
  })
  .catch(err => console.error("Errore caricamento GeoJSON:", err));

// funzione per proiezione equirettangolare
function proj(lon, lat){
    const x = (lon + 180)/360 * canvas.width * scale + offsetX;
    const y = (90 - lat)/180 * canvas.height * scale + offsetY;
    return [x, y];
}

// colore sicuro
function color(name){
    if (!name || typeof name !== "string") name = "Unknown";
    let h = 0;
    for(let i=0;i<name.length;i++){
        h = name.charCodeAt(i)+((h<<5)-h);
    }
    return "#" + ((h & 0xffffff)>>>0).toString(16).padStart(6,"0");
}

// disegna poligono
function drawPolygon(coords){
    coords.forEach(ring=>{
        if(!Array.isArray(ring)) return;
        ring.forEach(([lon,lat],i)=>{
            const [x,y] = proj(lon,lat);
            if(i===0) ctx.moveTo(x,y);
            else ctx.lineTo(x,y);
        });
        ctx.closePath();
    });
}

// disegna la mappa
function drawMap(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(!countriesData.length) return;

    countriesData.forEach(c=>{
        const geom = c.geometry;
        if(!geom || !Array.isArray(geom.coordinates)) return;

        ctx.beginPath();
        if(geom.type==="Polygon") drawPolygon(geom.coordinates);
        else if(geom.type==="MultiPolygon") geom.coordinates.forEach(poly=>drawPolygon(poly));

        const name = (c.properties && (c.properties.ADMIN || c.properties.NAME)) || "Unknown";
        ctx.fillStyle = color(name);
        ctx.fill();
    });

    // disegna confini
    countriesData.forEach(c=>{
        const geom = c.geometry;
        if(!geom || !Array.isArray(geom.coordinates)) return;

        ctx.beginPath();
        if(geom.type==="Polygon") drawPolygon(geom.coordinates);
        else if(geom.type==="MultiPolygon") geom.coordinates.forEach(poly=>drawPolygon(poly));

        ctx.strokeStyle="#222";
        ctx.lineWidth=1;
        ctx.stroke();
    });

    // disegna capitali
    countriesData.forEach(c=>{
        const geom = c.geometry;
        if(!geom) return;
        const props = c.properties || {};
        if(!props.CAPITAL_LAT || !props.CAPITAL_LON) return;

        const [x,y] = proj(parseFloat(props.CAPITAL_LON), parseFloat(props.CAPITAL_LAT));
        ctx.fillStyle="#ff0000";
        ctx.beginPath();
        ctx.arc(x,y,5*scale,0,Math.PI*2);
        ctx.fill();
    });

    // disegna tooltip
    if(hoveredNation){
        ctx.fillStyle="rgba(0,0,0,0.7)";
        ctx.fillRect(10,10,200,30);
        ctx.fillStyle="#fff";
        ctx.font = "16px Arial";
        ctx.fillText(hoveredNation,15,30);
    }
}

// rileva hover sulle nazioni
canvas.addEventListener("mousemove",e=>{
    const mx = (e.offsetX - offsetX)/scale;
    const my = (e.offsetY - offsetY)/scale;
    hoveredNation = null;

    for(const c of countriesData){
        const geom = c.geometry;
        if(!geom) continue;
        const name = (c.properties && (c.properties.ADMIN || c.properties.NAME)) || "Unknown";

        // semplice check su bounding box
        let coords = [];
        if(geom.type==="Polygon") coords=[geom.coordinates.flat()];
        else if(geom.type==="MultiPolygon") coords=geom.coordinates.flat(2);

        for(const [lon,lat] of coords){
            const [x,y] = proj(lon,lat);
            if(Math.abs(x-mx*scale-offsetX)<5 && Math.abs(y-my*scale-offsetY)<5){
                hoveredNation=name;
                break;
            }
        }
        if(hoveredNation) break;
    }
    drawMap();
});

// pan con mouse
canvas.addEventListener("mousedown",e=>{
    isDragging=true;
    dragStart={x:e.clientX-offsetX, y:e.clientY-offsetY};
});
canvas.addEventListener("mouseup",e=>{isDragging=false;});
canvas.addEventListener("mouseleave",e=>{isDragging=false;});
canvas.addEventListener("mousemove",e=>{
    if(isDragging){
        offsetX=e.clientX-dragStart.x;
        offsetY=e.clientY-dragStart.y;
        drawMap();
    }
});

// zoom con scroll
canvas.addEventListener("wheel",e=>{
    e.preventDefault();
    const oldScale=scale;
    scale *= e.deltaY>0?0.9:1.1;
    scale=Math.max(0.2,Math.min(5,scale));
    // zoom sul mouse
    offsetX -= (e.offsetX-offsetX)*(scale/oldScale-1);
    offsetY -= (e.offsetY-offsetY)*(scale/oldScale-1);
    drawMap();
});

// selezione click
canvas.addEventListener("click",e=>{
    if(hoveredNation) alert("Hai selezionato: "+hoveredNation);
});

drawMap();

const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let scale = 1, offsetX = 0, offsetY = 0;
let isDragging=false, dragStart={x:0,y:0};
let hoveredNation = null;
let selectedNation = null;

// dati delle nazioni (qui potresti usare GeoJSON completo)
let countriesData = [];

fetch("data/countries.geojson")
  .then(res => res.json())
  .then(geojson => {
    countriesData = geojson.features.filter(f=>f.geometry && Array.isArray(f.geometry.coordinates));
    // aggiungi campi di gioco
    countriesData.forEach(c=>{
        c.controlled=false;
        c.playerOwned=false;
        // calcolo centro per capitale
        c.capitalX = 0; c.capitalY = 0;
        const coords = c.geometry.type==="Polygon"? c.geometry.coordinates : c.geometry.coordinates.flat(2);
        let lons=[], lats=[];
        coords.forEach(([lon,lat])=>{ lons.push(lon); lats.push(lat);});
        c.capitalLon = (Math.min(...lons)+Math.max(...lons))/2;
        c.capitalLat = (Math.min(...lats)+Math.max(...lats))/2;
        [c.capitalX,c.capitalY]=proj(c.capitalLon,c.capitalLat);
        // valori demo
        c.gdp = Math.floor(Math.random()*1000)+500;
        c.pop = Math.floor(Math.random()*200)+50;
        c.military = Math.floor(Math.random()*200)+50;
    });
    drawMap();
  })
  .catch(err=>console.error(err));

window.onresize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawMap();
};

// proiezione equirettangolare semplice
function proj(lon, lat){
    const x = (lon+180)/360 * canvas.width*scale + offsetX;
    const y = (90-lat)/180 * canvas.height*scale + offsetY;
    return [x,y];
}

function color(name){
    let h=0;
    for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h);
    return "#" + ((h & 0xffffff)>>>0).toString(16).padStart(6,"0");
}

function drawPolygon(coords){
    coords.forEach(ring=>{
        if(!Array.isArray(ring)) return;
        ring.forEach(([lon,lat],i)=>{
            const [x,y]=proj(lon,lat);
            if(i===0) ctx.moveTo(x,y);
            else ctx.lineTo(x,y);
        });
        ctx.closePath();
    });
}

function drawMap(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(!countriesData.length) return;

    // fill nazioni
    countriesData.forEach(c=>{
        ctx.beginPath();
        if(c.geometry.type==="Polygon") drawPolygon(c.geometry.coordinates);
        else if(c.geometry.type==="MultiPolygon") c.geometry.coordinates.forEach(poly=>drawPolygon(poly));
        ctx.fillStyle = c.playerOwned? "rgba(0,255,0,0.5)" : color(c.properties.ADMIN || c.properties.NAME);
        ctx.fill();
    });

    // confini
    countriesData.forEach(c=>{
        ctx.beginPath();
        if(c.geometry.type==="Polygon") drawPolygon(c.geometry.coordinates);
        else if(c.geometry.type==="MultiPolygon") c.geometry.coordinates.forEach(poly=>drawPolygon(poly));
        ctx.strokeStyle="#222";
        ctx.lineWidth=1;
        ctx.stroke();
    });

    // capitali
    countriesData.forEach(c=>{
        ctx.fillStyle="#ff0000";
        ctx.beginPath();
        ctx.arc(c.capitalX,c.capitalY,5,0,Math.PI*2);
        ctx.fill();
    });

    updateUI();
}

// click per selezione/conquista
canvas.addEventListener("click",e=>{
    const mx = e.offsetX;
    const my = e.offsetY;
    countriesData.forEach(c=>{
        const dx=c.capitalX-mx;
        const dy=c.capitalY-my;
        if(Math.sqrt(dx*dx+dy*dy)<8){
            // controllo confine: deve confinare con playerOwned
            if(!c.playerOwned){
                if(!selectedNation || sharesBorder(c,selectedNation)){
                    c.playerOwned=true;
                    selectedNation=c;
                } else {
                    alert("Non puoi conquistare questa nazione: non confina con il tuo territorio!");
                }
            } else {
                selectedNation=c;
            }
        }
    });
    drawMap();
});

// funzione demo confine semplice (qui puoi fare controllo reale con GeoJSON dei vicini)
function sharesBorder(c1,c2){
    if(!c2) return true; // prima conquista libera
    // per demo, basta vicinanza capitale < 100 px
    const dx=c1.capitalX-c2.capitalX;
    const dy=c1.capitalY-c2.capitalY;
    return Math.sqrt(dx*dx+dy*dy)<120;
}

// pan e zoom
canvas.addEventListener("mousedown",e=>{isDragging=true; dragStart={x:e.clientX-offsetX, y:e.clientY-offsetY};});
canvas.addEventListener("mouseup",e=>{isDragging=false;});
canvas.addEventListener("mouseleave",e=>{isDragging=false;});
canvas.addEventListener("mousemove",e=>{
    if(isDragging){ offsetX=e.clientX-dragStart.x; offsetY=e.clientY-dragStart.y; drawMap(); }
});
canvas.addEventListener("wheel",e=>{
    e.preventDefault();
    const oldScale=scale;
    scale *= e.deltaY>0?0.9:1.1;
    scale=Math.max(0.2,Math.min(5,scale));
    offsetX -= (e.offsetX-offsetX)*(scale/oldScale-1);
    offsetY -= (e.offsetY-offsetY)*(scale/oldScale-1);
    drawMap();
});

// UI
function updateUI(){
    if(!selectedNation) return;
    document.getElementById("nationName").textContent=selectedNation.properties.ADMIN || selectedNation.properties.NAME;
    document.getElementById("gdp").textContent=selectedNation.gdp;
    document.getElementById("pop").textContent=selectedNation.pop;
    document.getElementById("military").textContent=selectedNation.military;
    document.getElementById("controlled").textContent=countriesData.filter(c=>c.playerOwned).length;
    const pct = countriesData.filter(c=>c.playerOwned).length/countriesData.length*100;
    document.getElementById("controlledBar").style.width=pct+"%";
}

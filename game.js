const canvas=document.getElementById('map');
const ctx=canvas.getContext('2d');
canvas.width=window.innerWidth;
canvas.height=window.innerHeight;
window.onresize=()=>{canvas.width=window.innerWidth;canvas.height=window.innerHeight;}

let day=1, month=1, year=2026;
let player="Italy";
let countriesData=[], capitalsData=[];
let S={}; // stato globale

// Carica GeoJSON e capitali
Promise.all([
  fetch("data/countries.geojson").then(r=>r.json()),
  fetch("data/capitals.json").then(r=>r.json())
]).then(([geojson, capitals])=>{
  countriesData=geojson.features;
  capitalsData=capitals;
  initGame();
});

// Proiezione semplice (equirettangolare)
function proj(lon,lat){return [(lon+180)/360*canvas.width, (90-lat)/180*canvas.height];}

// Inizializza stato nazioni
function initGame(){
  countriesData.forEach(c=>{
    const name=c.properties.ADMIN;
    S[name]={
      gdp:2000+Math.random()*5000,
      army:100+Math.random()*200,
      gov:["Democrazia","Monarchia","Dittatura","Repubblica"][Math.floor(Math.random()*4)],
      leader:{name:"Leader_"+Math.floor(Math.random()*999),age:40+Math.floor(Math.random()*20)}
    };
    c.owner=name; // inizialmente ogni nazione possiede se stessa
  });
  draw(); updateUI();
}

// Disegna mappa e capitali
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  countriesData.forEach(c=>{
    ctx.beginPath();
    let coords=c.geometry.coordinates;
    coords.forEach(poly=>{poly.forEach(([lon,lat],i)=>{const [x,y]=proj(lon,lat); i?ctx.lineTo(x,y):ctx.moveTo(x,y);});});
    ctx.fillStyle=color(c.owner); ctx.strokeStyle="#000"; ctx.fill(); ctx.stroke();
  });
  capitalsData.forEach(cap=>{const [x,y]=proj(cap.lon,cap.lat); ctx.fillStyle="yellow"; ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fill();});
}

// Colore unico per nazione
function color(name){let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h); return "#"+(h&0xffffff).toString(16).padStart(6,"0");}

// Aggiorna UI
function updateUI(){
  document.getElementById("nation").textContent=player;
  document.getElementById("date").textContent=day+"/"+month+"/"+year;
  document.getElementById("gdp").textContent=Math.floor(S[player].gdp);
  document.getElementById("army").textContent=Math.floor(S[player].army);
  document.getElementById("gov").textContent=S[player].gov;
  document.getElementById("regions").textContent=countriesData.filter(c=>c.owner===player).length;
}

// Log messaggi
function log(t){document.getElementById("log").innerHTML=t+"<br>"+document.getElementById("log").innerHTML;}

// Calendario
function nextDay(){day++; if(day>30){day=1; nextMonth();} updateUI();}
function nextMonth(){month++; monthTick(); if(month>12){month=1; nextYear();} updateUI();}
function nextYear(){year++;}

// Aggiornamento mensile di GDP/army
function monthTick(){Object.keys(S).forEach(n=>{S[n].gdp*=1.01; S[n].army+=S[n].gdp/1000;});}

// Azioni giocatore
function recruit(){S[player].army+=50; S[player].gdp-=100; updateUI(); log("⚔️ Truppe reclutate");}
function research(){S[player].gdp-=200; updateUI(); log("🧪 Ricerca completata");}

// Loop grafico
function loop(){draw(); requestAnimationFrame(loop);}
loop();

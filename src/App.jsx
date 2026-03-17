import { useState, useEffect, useRef } from "react";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@300;400;600;700;900&family=DM+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow-x:hidden}
body{background:#050608;color:#e8eaf0;font-family:'Barlow Condensed',sans-serif}
::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-track{background:#0a0b0f}
::-webkit-scrollbar-thumb{background:#C9A84C;border-radius:2px}
input,select,textarea,button{font-family:'Barlow Condensed',sans-serif;outline:none}
button{cursor:pointer}
@keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes countUp{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}
@keyframes holo{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes glow{0%,100%{box-shadow:0 0 20px #C9A84C40}50%{box-shadow:0 0 50px #C9A84C80}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
.fu {animation:fadeUp .5s cubic-bezier(.16,1,.3,1) both}
.fu1{animation:fadeUp .5s .08s cubic-bezier(.16,1,.3,1) both}
.fu2{animation:fadeUp .5s .16s cubic-bezier(.16,1,.3,1) both}
.fu3{animation:fadeUp .5s .24s cubic-bezier(.16,1,.3,1) both}
.fu4{animation:fadeUp .5s .32s cubic-bezier(.16,1,.3,1) both}
.fi {animation:fadeIn .4s ease both}
`;

const API_KEY = import.meta.env.VITE_API_KEY;


const C = {
  bg:"#050608", surf:"#0c0d12", surf2:"#121420", surf3:"#181b26",
  border:"#1c2030", gold:"#C9A84C", goldLight:"#F0D080",
  text:"#e8eaf0", muted:"#4a5270", red:"#F44336",
};

const clamp = (v,mn,mx) => Math.min(mx,Math.max(mn,v));
const lerp  = (a,b,t)   => a+(b-a)*t;

function scoreFromTable(val,table){
  const sorted=[...table].sort((a,b)=>a[0]-b[0]);
  if(val<=sorted[0][0]) return sorted[0][1];
  if(val>=sorted[sorted.length-1][0]) return sorted[sorted.length-1][1];
  for(let i=0;i<sorted.length-1;i++){
    const [v0,s0]=sorted[i],[v1,s1]=sorted[i+1];
    if(val>=v0&&val<=v1) return Math.round(lerp(s0,s1,(val-v0)/(v1-v0)));
  }
  return sorted[sorted.length-1][1];
}

const SCORE_TABLES = {
  force:    [[0.4,35],[0.8,50],[1.0,60],[1.3,70],[1.6,78],[2.0,86],[2.5,93],[3.0,99]],
  detente:  [[10,35],[20,48],[30,58],[40,68],[50,76],[60,84],[70,91],[80,99]],
  sprint30: [[6.5,35],[6.0,48],[5.5,58],[5.0,68],[4.7,76],[4.4,84],[4.1,91],[3.8,99]],
  sprint10: [[2.5,35],[2.2,48],[2.0,58],[1.85,68],[1.75,76],[1.65,84],[1.55,91],[1.45,99]],
  endurance:[[1200,35],[1600,48],[2000,58],[2400,68],[2800,76],[3000,84],[3200,91],[3600,99]],
  gainage:  [[20,35],[45,48],[70,58],[100,68],[130,76],[165,84],[200,91],[240,99]],
};

function calcScore(attr,val){
  const table=SCORE_TABLES[attr];
  if(!table) return 50;
  if(attr==="sprint30"||attr==="sprint10"){
    const inv=table.map(([v,s])=>[-v,s]);
    return scoreFromTable(-val,inv);
  }
  return scoreFromTable(val,table);
}

function calcOVR(scores){
  const vals=Object.values(scores).filter(v=>v>0);
  return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0;
}

function getTier(score){
  if(score>=90) return{label:"S",color:"#FFD700",bg:"#FFD70020",name:"ÉLITE"};
  if(score>=80) return{label:"A",color:"#4CAF50",bg:"#4CAF5020",name:"EXCELLENT"};
  if(score>=70) return{label:"B",color:"#2196F3",bg:"#2196F320",name:"BON NIVEAU"};
  if(score>=60) return{label:"C",color:"#FF9800",bg:"#FF980020",name:"CORRECT"};
  if(score>=50) return{label:"D",color:"#FF5722",bg:"#FF572220",name:"EN PROGRESSION"};
  return{label:"F",color:"#F44336",bg:"#F4433620",name:"DÉBUTANT"};
}

function getOVRColor(ovr){
  if(ovr>=90) return "#FFD700";
  if(ovr>=80) return "#69F0AE";
  if(ovr>=70) return "#40C4FF";
  if(ovr>=60) return "#FF9800";
  return "#F44336";
}

const TESTS = [
  {id:"force", label:"FORCE MAXIMALE", unit:"ratio moyen / poids corps", icon:"💪",
   placeholder:"ex: 1.2",
   desc:"(Squat + Bench + Poids corps + Lest traction) — calculé automatiquement",
   hint:"1.0 = débutant · 1.4 = bon · 1.8 = élite", min:0.3, max:3.5, step:0.05},
  {id:"detente", label:"DÉTENTE VERTICALE", unit:"centimètres", icon:"🦘",
   placeholder:"ex: 45", desc:"Hauteur de ton saut vertical pieds décollés du sol",
   hint:"30 cm = moyen · 50 cm = bon · 70 cm = élite", min:5, max:100, step:1},
  {id:"sprint30", label:"VITESSE 30 M", unit:"secondes", icon:"💨",
   placeholder:"ex: 4.5", desc:"Temps sur 30 m départ arrêté",
   hint:"5.0 s = moyen · 4.5 s = bon · 4.0 s = élite", min:3.5, max:8, step:0.1},
  {id:"sprint10", label:"ACCÉLÉRATION 10 M", unit:"secondes", icon:"⚡",
   placeholder:"ex: 1.7", desc:"Temps sur 10 m départ arrêté",
   hint:"2.0 s = moyen · 1.8 s = bon · 1.5 s = élite", min:1.3, max:3, step:0.05},
  {id:"endurance", label:"TEST DE COOPER", unit:"mètres en 12 minutes", icon:"🏃",
   placeholder:"ex: 2400", desc:"Sur tapis : cours le plus loin possible en 12 minutes",
   hint:"1600 m = débutant · 2400 m = bon · 3200 m = élite", min:800, max:4000, step:50},
  {id:"gainage", label:"GAINAGE CORE", unit:"secondes (planche)", icon:"🧱",
   placeholder:"ex: 120", desc:"Temps tenu en position de planche avant",
   hint:"60 s = moyen · 120 s = bon · 200 s = élite", min:10, max:300, step:5},
];

const SPORTS = [
  {id:"football",name:"Football",icon:"⚽",color:"#4CAF50",
   weights:{force:0.8,detente:0.9,sprint30:1.2,sprint10:1.1,endurance:1.0,gainage:0.9},
   contexte:"Le footballeur effectue 150-200 sprints/match, des frappes rotatives, des dribbles explosifs et des duels physiques.",
   patterns:["triple_extension","rotation_hanche","frappe_balistique","deceleration_excentrique"],
   cardio:{volume:85,type:"Intervalles courts 85-95% FCmax",methodes:["Sprints 10-40m","Intermittent 15-15","SSG cardio"]},
   equipement:["Barre olympique","Haltères","Kettlebell","Médecine ball","Box pliométrique"]},
  {id:"tennis",name:"Tennis",icon:"🎾",color:"#CDDC39",
   weights:{force:0.8,detente:0.8,sprint30:0.9,sprint10:1.0,endurance:1.0,gainage:1.1},
   contexte:"Le tennisman réalise 400-500 frappes/match avec chaîne cinétique complète. Le service atteint 2000°/s.",
   patterns:["chaine_cinetique_frappe","service_overhead","rotation_differentielle","split_step"],
   cardio:{volume:82,type:"Intermittent aléatoire 78-95% FCmax",methodes:["Simulation de points","Spider drill","Lateral sprints"]},
   equipement:["Haltères","Médecine ball","Câble poulie","Élastiques","Kettlebell"]},
  {id:"mma",name:"MMA",icon:"🥊",color:"#F44336",
   weights:{force:1.1,detente:0.9,sprint30:0.8,sprint10:0.9,endurance:1.2,gainage:1.3},
   contexte:"Le combattant MMA intègre frappes en rotation, wrestling, sol isométrique et grappling sur 3-5 rounds.",
   patterns:["frappe_rotation","projection_wrestling","gainage_multidirectionnel","explosion_releve"],
   cardio:{volume:92,type:"Rounds 3-5 min à 85-100% FCmax",methodes:["Rounds sac","Battle ropes","Grappling rolls"]},
   equipement:["Barre olympique","Haltères","Kettlebell","Battle ropes","Sled","Médecine ball"]},
  {id:"sprint",name:"Sprint",icon:"💨",color:"#FFD600",
   weights:{force:1.1,detente:1.2,sprint30:1.5,sprint10:1.3,endurance:0.5,gainage:0.9},
   contexte:"Le sprinter produit 5× le poids du corps à l'impulsion, fréquence de pas 4.5-5 Hz.",
   patterns:["triple_extension_maximale","mecanique_bras_sprint","frequence_pas","depart_blocs"],
   cardio:{volume:50,type:"Lactique pur 95-100% FCmax + repos long",methodes:["Séries 60-120m max","Hill sprints","Flying sprints"]},
   equipement:["Barre olympique","Sled/traineau","Élastiques","Box pliométrique","Haltères"]},
  {id:"basket",name:"Basketball",icon:"🏀",color:"#FF7043",
   weights:{force:0.9,detente:1.3,sprint30:1.0,sprint10:1.1,endurance:0.9,gainage:0.9},
   contexte:"Le basketteur enchaîne accélérations/décélérations brutales sur parquet dur, sauts répétés, changements de direction à 180°.",
   patterns:["detente_verticale","deceleration_excentrique","crossover_lateral","tir_stability"],
   cardio:{volume:72,type:"Intervalles courts 82-95% FCmax",methodes:["Suicide runs","Jump rope HIIT","Zigzag sprints"]},
   equipement:["Barre olympique","Haltères","Box pliométrique","Élastiques","Médecine ball"]},
  {id:"rugby",name:"Rugby",icon:"🏉",color:"#A1887F",
   weights:{force:1.3,detente:0.9,sprint30:1.1,sprint10:1.0,endurance:1.1,gainage:1.3},
   contexte:"Le rugbyman réalise des placages, mêlées isométriques intenses, rucks et courses avec balle sur 80 min.",
   patterns:["poussee_horizontale","absorption_choc","mele_isometrique","rotation_tronc_charge"],
   cardio:{volume:78,type:"Intervals longs + sprints avec charge 80-92% FCmax",methodes:["Intervals porteur","Circuit haute intensité","Sled sprint"]},
   equipement:["Barre olympique","Haltères","Sled","Battle ropes","Kettlebell"]},
  {id:"crossfit",name:"CrossFit",icon:"🏋️",color:"#E91E63",
   weights:{force:1.1,detente:1.0,sprint30:0.8,sprint10:0.8,endurance:1.2,gainage:1.1},
   contexte:"L'haltérophile/crossfitter développe puissance globale maximale: arraché, épaulé-jeté, mouvements gymnastics.",
   patterns:["arrachee_epaule","muscle_up","kb_swing_hinge","clean_and_jerk"],
   cardio:{volume:88,type:"Métabolique intégré 80-100% FCmax",methodes:["AMRAP/EMOM","Assault bike Tabata","Rowing intervalles"]},
   equipement:["Barre olympique","Kettlebell","Anneaux","Haltères","Box","Corde"]},
  {id:"natation",name:"Natation",icon:"🏊",color:"#0288D1",
   weights:{force:0.9,detente:0.7,sprint30:0.6,sprint10:0.6,endurance:1.3,gainage:1.2},
   contexte:"Le nageur réalise jusqu'à 1 million de cycles/an. Gainage streamline et endurance cardiovasculaire dominent.",
   patterns:["rotation_corps_nage","pull_adduction_epaule","kick_cheville","virage_culbute"],
   cardio:{volume:88,type:"Aérobie soutenu + intervalles 70-88% FCmax",methodes:["Cardio croisé vélo","Rowing machine","Natation intervalles"]},
   equipement:["Câble poulie","Haltères","Élastiques","TRX","Médecine ball"]},
];

const ATHLETE_SVG = {
  football:<svg viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="gf" cx="50%" cy="70%" r="50%"><stop offset="0%" stopColor="#4CAF50" stopOpacity=".5"/><stop offset="100%" stopColor="#050608" stopOpacity="0"/></radialGradient></defs><ellipse cx="100" cy="220" rx="80" ry="50" fill="url(#gf)"/><ellipse cx="100" cy="255" rx="40" ry="7" fill="#000" opacity=".5"/><line x1="90" y1="180" x2="70" y2="230" stroke="#2E7D32" strokeWidth="18" strokeLinecap="round"/><line x1="70" y1="230" x2="55" y2="255" stroke="#2E7D32" strokeWidth="14" strokeLinecap="round"/><ellipse cx="52" cy="257" rx="14" ry="7" fill="#111" transform="rotate(-10 52 257)"/><line x1="110" y1="180" x2="150" y2="185" stroke="#2E7D32" strokeWidth="20" strokeLinecap="round"/><line x1="150" y1="185" x2="172" y2="170" stroke="#2E7D32" strokeWidth="16" strokeLinecap="round"/><ellipse cx="178" cy="167" rx="16" ry="9" fill="#111" transform="rotate(-20 178 167)"/><path d="M80 120 Q100 110 122 120 L128 180 Q100 190 75 180Z" fill="#4CAF50"/><text x="100" y="157" textAnchor="middle" fill="white" fontSize="18" fontFamily="'Bebas Neue',sans-serif">9</text><line x1="80" y1="134" x2="55" y2="158" stroke="#81C784" strokeWidth="13" strokeLinecap="round"/><line x1="122" y1="134" x2="148" y2="152" stroke="#81C784" strokeWidth="13" strokeLinecap="round"/><rect x="92" y="105" width="14" height="18" rx="5" fill="#FFCC80"/><ellipse cx="99" cy="95" rx="20" ry="23" fill="#FFCC80"/><ellipse cx="99" cy="78" rx="20" ry="10" fill="#1a1a1a"/><circle cx="91" cy="95" r="3" fill="#333"/><circle cx="107" cy="95" r="3" fill="#333"/><circle cx="175" cy="160" r="13" fill="white" opacity=".9"/></svg>,
  mma:<svg viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="gm" cx="50%" cy="65%" r="55%"><stop offset="0%" stopColor="#F44336" stopOpacity=".6"/><stop offset="100%" stopColor="#050608" stopOpacity="0"/></radialGradient></defs><ellipse cx="100" cy="215" rx="85" ry="55" fill="url(#gm)"/><ellipse cx="100" cy="255" rx="42" ry="7" fill="#000" opacity=".5"/><line x1="92" y1="182" x2="72" y2="238" stroke="#7B1FA2" strokeWidth="20" strokeLinecap="round"/><line x1="72" y1="238" x2="58" y2="256" stroke="#7B1FA2" strokeWidth="15" strokeLinecap="round"/><line x1="108" y1="182" x2="148" y2="145" stroke="#7B1FA2" strokeWidth="20" strokeLinecap="round"/><line x1="148" y1="145" x2="178" y2="112" stroke="#7B1FA2" strokeWidth="16" strokeLinecap="round"/><ellipse cx="185" cy="106" rx="17" ry="9" fill="#1a1a1a" transform="rotate(-40 185 106)"/><path d="M72 118 Q100 104 130 118 L136 182 Q100 194 68 182Z" fill="#EF9A9A"/><path d="M73 160 Q100 170 130 160 L132 182 Q100 190 72 182Z" fill="#B71C1C"/><line x1="72" y1="130" x2="44" y2="152" stroke="#EF9A9A" strokeWidth="15" strokeLinecap="round"/><rect x="18" y="163" width="24" height="18" rx="6" fill="#F44336"/><line x1="130" y1="130" x2="155" y2="145" stroke="#EF9A9A" strokeWidth="15" strokeLinecap="round"/><rect x="163" y="152" width="24" height="18" rx="6" fill="#F44336"/><rect x="90" y="103" width="18" height="18" rx="6" fill="#FFCC80"/><ellipse cx="99" cy="90" rx="24" ry="27" fill="#FFCC80"/><ellipse cx="99" cy="68" rx="24" ry="12" fill="#2e1a0f"/><circle cx="88" cy="90" r="4" fill="#1a1a1a"/><circle cx="110" cy="90" r="4" fill="#1a1a1a"/></svg>,
  sprint:<svg viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="gs" cx="50%" cy="60%" r="50%"><stop offset="0%" stopColor="#FFD600" stopOpacity=".4"/><stop offset="100%" stopColor="#050608" stopOpacity="0"/></radialGradient></defs><ellipse cx="100" cy="210" rx="80" ry="50" fill="url(#gs)"/><line x1="95" y1="180" x2="65" y2="225" stroke="#E65100" strokeWidth="20" strokeLinecap="round"/><line x1="65" y1="225" x2="45" y2="252" stroke="#E65100" strokeWidth="16" strokeLinecap="round"/><line x1="108" y1="180" x2="148" y2="190" stroke="#E65100" strokeWidth="22" strokeLinecap="round"/><line x1="148" y1="190" x2="172" y2="238" stroke="#E65100" strokeWidth="18" strokeLinecap="round"/><path d="M82 122 Q105 110 128 122 L134 180 Q105 192 78 180Z" fill="#FFF176"/><rect x="94" y="107" width="14" height="18" rx="5" fill="#FFCC80"/><ellipse cx="101" cy="96" rx="20" ry="23" fill="#FFCC80"/><ellipse cx="101" cy="79" rx="20" ry="10" fill="#1a1a1a"/><line x1="12" y1="130" x2="55" y2="130" stroke="#FFD600" strokeWidth="3" opacity=".7" strokeLinecap="round"/></svg>,
};

function Tag({children,color}){
  return <span style={{background:`${color}18`,border:`1px solid ${color}35`,color,borderRadius:4,padding:"3px 10px",fontSize:13,fontWeight:700,letterSpacing:.5}}>{children}</span>;
}

function Btn({children,onClick,variant="gold",disabled,full,style:s2={}}){
  const styles={
    gold:{background:`linear-gradient(135deg,${C.gold},#a07830)`,color:"#000",boxShadow:`0 4px 20px ${C.gold}40`},
    ghost:{background:"transparent",border:`1px solid ${C.border}`,color:C.muted},
    outline:{background:"transparent",border:`1px solid ${C.gold}`,color:C.gold},
    red:{background:"#E53935",color:"#fff"},
  };
  return(
    <button onClick={onClick} disabled={disabled} style={{border:"none",borderRadius:10,fontWeight:700,letterSpacing:1.5,fontSize:15,padding:"12px 24px",transition:"all .2s",cursor:disabled?"not-allowed":"pointer",opacity:disabled?.45:1,fontFamily:"'Bebas Neue',sans-serif",width:full?"100%":undefined,...styles[variant],...s2}}>
      {children}
    </button>
  );
}

function VoltraLogo({size=22}){
  return(
    <div style={{fontFamily:"'Bebas Neue'",fontSize:size,letterSpacing:4,display:"flex",alignItems:"center",gap:4}}>
      <span style={{color:C.gold}}>⚡</span>
      <span style={{color:C.text}}>VOL</span><span style={{color:C.gold}}>TRA</span>
    </div>
  );
}

function PlayerCard({scores,ovr,playerName,sport,compact=false}){
  const ovrColor=getOVRColor(ovr);
  const tier=getTier(ovr);
  const sp=SPORTS.find(s=>s.id===sport)||SPORTS[0];
  const attrs=[
    {key:"force",label:"FOR"},
    {key:"detente",label:"DET"},
    {key:"sprint30",label:"VIT"},
    {key:"sprint10",label:"ACC"},
    {key:"endurance",label:"END"},
    {key:"gainage",label:"GAI"},
  ];
  return(
    <div style={{position:"relative",width:compact?220:320,background:"linear-gradient(145deg,#0d0e18 0%,#1a1520 40%,#0d0e18 100%)",border:`1.5px solid ${C.gold}50`,borderRadius:compact?16:20,overflow:"hidden",boxShadow:`0 0 60px ${ovrColor}25,inset 0 0 80px ${ovrColor}05`}}>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:1,background:`linear-gradient(135deg,${ovrColor}08 0%,transparent 40%,${C.gold}06 60%,transparent 80%,${ovrColor}05 100%)`,backgroundSize:"200% 200%",animation:"holo 4s ease infinite"}}/>
      <div style={{position:"absolute",top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,transparent,${ovrColor},${C.gold},${ovrColor},transparent)`}}/>
      <div style={{padding:compact?"14px 14px 8px":"18px 18px 10px",position:"relative",zIndex:2}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:compact?60:84,lineHeight:1,color:ovrColor,textShadow:`0 0 30px ${ovrColor}80`,animation:"countUp .6s cubic-bezier(.16,1,.3,1) both"}}>{ovr||"—"}</div>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:compact?10:13,letterSpacing:3,color:C.gold,marginTop:-4}}>OVR</div>
            <div style={{background:tier.bg,border:`1px solid ${tier.color}50`,borderRadius:6,padding:"3px 8px",marginTop:5,fontFamily:"'Bebas Neue'",fontSize:compact?12:15,letterSpacing:2,color:tier.color}}>{tier.label} · {tier.name}</div>
          </div>
          <div style={{flex:1,paddingLeft:compact?10:14}}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:compact?18:24,letterSpacing:2,color:sp.color,lineHeight:1}}>{sp.name.toUpperCase()}</div>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:compact?12:16,color:C.muted,letterSpacing:1,marginBottom:6}}>VOLTRA</div>
            {!compact&&<div style={{width:90,height:72,opacity:.85}}>{ATHLETE_SVG[sport]||ATHLETE_SVG.mma}</div>}
            <div style={{marginTop:4}}><span style={{fontFamily:"'Bebas Neue'",fontSize:compact?14:18,color:C.goldLight,letterSpacing:1}}>{playerName||"ATHLÈTE"}</span></div>
          </div>
        </div>
      </div>
      <div style={{height:1,background:`linear-gradient(90deg,transparent,${C.gold}50,transparent)`,margin:"0 14px"}}/>
      <div style={{padding:compact?"10px 14px 12px":"13px 18px 18px",position:"relative",zIndex:2}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:compact?5:7}}>
          {attrs.map(({key,label})=>{
            const val=scores[key]||0;const t=getTier(val);
            return(
              <div key={key} style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{fontFamily:"'Bebas Neue'",fontSize:compact?17:21,color:t.color,width:compact?26:32,textAlign:"right",textShadow:val>=80?`0 0 10px ${t.color}80`:"none"}}>{val||"—"}</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:compact?8:10,color:C.muted,letterSpacing:1.5,marginBottom:2}}>{label}</div>
                  <div style={{height:3,background:C.surf3,borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${val}%`,background:t.color,borderRadius:2,transition:"width 1.2s ease"}}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{background:`${C.gold}08`,borderTop:`1px solid ${C.gold}20`,padding:compact?"5px 14px":"7px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative",zIndex:2}}>
        <span style={{fontFamily:"'DM Mono'",fontSize:compact?8:10,color:C.muted}}>VOLTRA.APP</span>
        <span style={{fontSize:compact?15:19}}>{sp.icon}</span>
        <span style={{fontFamily:"'Bebas Neue'",fontSize:compact?9:11,color:C.gold,letterSpacing:2}}>2026</span>
      </div>
    </div>
  );
}

export default function App(){
  const [screen,setScreen]=useState("home");
  const [testValues,setTestValues]=useState({});
  const [forceInputs,setForceInputs]=useState({squat:"",bench:"",traction:"",poids:""});
  const [scores,setScores]=useState({});
  const [ovr,setOvr]=useState(0);
  const [playerName,setPlayerName]=useState("");
  const [selSport,setSelSport]=useState(null);
  const [athlete,setAthlete]=useState({niveau:"Intermédiaire (1-3 ans)",objectif:"Performance sportive",jours:"3",saison:"Préparation générale",blessures:""});
  const [programme,setProgramme]=useState(null);
  const [genProgress,setGenProgress]=useState(0);
  const [genMsg,setGenMsg]=useState("");
  const [activeSeance,setActiveSeance]=useState(0);
  const [expandedExo,setExpandedExo]=useState(null);
  const [liveMode,setLiveMode]=useState(false);
  const [liveBloc,setLiveBloc]=useState(0);
  const [liveExo,setLiveExo]=useState(0);
  const [liveSerie,setLiveSerie]=useState(1);
  const [restTimer,setRestTimer]=useState(0);
  const [restActive,setRestActive]=useState(false);
  const [copied,setCopied]=useState(false);
  const [error,setError]=useState("");
  const progRef=useRef(null);
  const timerRef=useRef(null);

  useEffect(()=>{
    const st=document.createElement("style");st.textContent=CSS;document.head.appendChild(st);
    return()=>document.head.removeChild(st);
  },[]);

  // Calcul force : (squat + bench + poids+lest) / 3 / poids
  useEffect(()=>{
    const s=parseFloat(forceInputs.squat);
    const b=parseFloat(forceInputs.bench);
    const t=parseFloat(forceInputs.traction)||0;
    const p=parseFloat(forceInputs.poids);
    if(!isNaN(s)&&!isNaN(b)&&!isNaN(p)&&p>0){
      const tractionTotal=p+t; // poids corps + lest
      const ratio=((s+b+tractionTotal)/3)/p;
      setTestValues(prev=>({...prev,force:ratio.toFixed(2)}));
    }
  },[forceInputs]);

  useEffect(()=>{
    const s={};
    TESTS.forEach(t=>{const v=parseFloat(testValues[t.id]);if(!isNaN(v)&&v>0)s[t.id]=clamp(calcScore(t.id,v),35,99);});
    setScores(s);setOvr(calcOVR(s));
  },[testValues]);

  useEffect(()=>{
    if(restActive&&restTimer>0){timerRef.current=setTimeout(()=>setRestTimer(t=>t-1),1000);}
    else if(restTimer===0&&restActive){setRestActive(false);}
    return()=>clearTimeout(timerRef.current);
  },[restActive,restTimer]);

  const startRest=secs=>{setRestTimer(secs);setRestActive(true);};

  // Partage natif iOS
  const shareCard=()=>{
    const lines=[`⚡ MA CARTE VOLTRA`,`⭐ OVR: ${ovr} — ${getTier(ovr).name}`];
    TESTS.forEach(t=>{if(scores[t.id])lines.push(`${t.icon} ${t.label}: ${scores[t.id]}`);});
    lines.push(`💪 Sport: ${selSport?.name||"—"}`,`\nGénère ta carte sur VOLTRA.APP`);
    const text=lines.join("\n");
    if(navigator.share){
      navigator.share({title:"Ma carte VOLTRA",text}).catch(()=>{});
    } else {
      navigator.clipboard.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);});
    }
  };

  const GEN_MSGS=["Analyse du profil biomécanique…","Calcul des faiblesses prioritaires…","Création d'exercices sur-mesure…","Construction des blocs cardio…","Calibration des intensités…","Intégration de la périodisation…","Finalisation du programme…"];

  const generateProgram=async()=>{
    setScreen("generating");setGenProgress(0);setError("");
    let idx=0;setGenMsg(GEN_MSGS[0]);
    progRef.current=setInterval(()=>{idx++;if(idx<GEN_MSGS.length){setGenMsg(GEN_MSGS[idx]);setGenProgress(Math.round(idx/GEN_MSGS.length*85));}},1600);
    const weak=TESTS.filter(t=>scores[t.id]&&scores[t.id]<70).map(t=>`${t.label}: ${scores[t.id]}/99`).join(", ");
    const strong=TESTS.filter(t=>scores[t.id]&&scores[t.id]>=80).map(t=>`${t.label}: ${scores[t.id]}/99`).join(", ");
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-api-key":API_KEY,
          "anthropic-version":"2023-06-01",
          "anthropic-dangerous-direct-browser-access":"true",
        },
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",max_tokens:8000,
          system:`Tu es un préparateur physique expert de niveau international.
SPORT: ${selSport.name}
CONTEXTE: ${selSport.contexte}
PATTERNS: ${selSport.patterns.join(", ")}
CARDIO: Volume ${selSport.cardio.volume}/100 — ${selSport.cardio.type}
OVR ATHLÈTE: ${ovr}/99 — ${getTier(ovr).name}
FAIBLESSES À CIBLER: ${weak||"Aucune — profil équilibré"}
POINTS FORTS: ${strong||"Profil en développement"}
NIVEAU: ${athlete.niveau} | OBJECTIF: ${athlete.objectif} | JOURS: ${athlete.jours}j/sem | SAISON: ${athlete.saison}
BLESSURES: ${athlete.blessures||"Aucune"}
ÉQUIPEMENT: ${selSport.equipement.join(", ")}

RÈGLES:
1. Exercices SPÉCIFIQUES au ${selSport.name} — jamais génériques
2. Cible EN PRIORITÉ les faiblesses identifiées
3. Cardio adapté au volume ${selSport.cardio.volume}/100 : >80→2 blocs/séance | 50-80→1 bloc | <50→cardio léger
4. Pour chaque exercice: nom créatif, geste sportif répliqué, position départ, exécution, 3 focus, séries×reps×tempo, récup, intention, progression
5. Nomme une focus_faiblesse par séance

Réponds UNIQUEMENT en JSON valide sans backticks.
{
  "programme_titre":"string","programme_sous_titre":"string",
  "logique_programme":"string","strategie_cardio":"string",
  "seances":[{
    "num":number,"titre":"string","focus_sportif":"string","focus_faiblesse":"string",
    "duree_min":number,"ratio":"string",
    "blocs":[{
      "bloc_nom":"string",
      "bloc_type":"MUSCU|CARDIO_ACTIVATION|CARDIO_SPECIFIQUE|CARDIO_FINISHER|CARDIO_RECUPERATION",
      "bloc_desc":"string","duree_min":number,
      "exercices":[{
        "nom":"string","type_exercice":"MUSCU|CARDIO","geste_sportif":"string",
        "position_depart":"string","execution":"string",
        "focus_technique":["string","string","string"],
        "series_reps":"string","recuperation":"string","zone_fc":"string",
        "structure_cardio":"string","intention":"string","progression":"string"
      }]
    }]
  }],
  "conseils_specifiques":["string","string","string"],
  "conseils_cardio":["string","string","string"]
}`,
          messages:[{role:"user",content:`Génère le programme ${athlete.jours} séances pour cet athlète de ${selSport.name} OVR ${ovr}. Faiblesses: ${weak||"équilibré"}. JSON uniquement.`}]
        })
      });
      const data=await res.json();
      clearInterval(progRef.current);setGenProgress(100);
      const parsed=JSON.parse((data.content?.[0]?.text||"").replace(/```json|```/g,"").trim());
      setTimeout(()=>{setProgramme(parsed);setScreen("program");setActiveSeance(0);},600);
    }catch(e){
      clearInterval(progRef.current);setError("Erreur de génération. Réessaie.");setScreen("profile");
    }
  };

  /* ══ HOME ══ */
  if(screen==="home") return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,textAlign:"center",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:"20%",left:"50%",transform:"translateX(-50%)",width:600,height:600,background:`radial-gradient(circle,${C.gold}08 0%,transparent 70%)`,pointerEvents:"none"}}/>
      <div className="fu" style={{marginBottom:36}}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:80,letterSpacing:8,lineHeight:.9,marginBottom:10}}>
          <span style={{color:C.gold}}>⚡</span>VOL<span style={{color:C.gold}}>TRA</span>
        </div>
        <div style={{fontFamily:"'DM Mono'",fontSize:12,color:C.muted,letterSpacing:3}}>AI ATHLETIC PERFORMANCE SYSTEM</div>
      </div>
      <div className="fu1" style={{marginBottom:36,animation:"float 3s ease-in-out infinite"}}>
        <PlayerCard scores={{force:85,detente:78,sprint30:82,sprint10:79,endurance:71,gainage:76}} ovr={80} playerName="EXEMPLE" sport="football"/>
      </div>
      <div className="fu2" style={{marginBottom:28,maxWidth:460}}>
        <div style={{fontSize:18,color:"#aaa",lineHeight:1.7}}>
          Passe les tests physiques. Obtiens ta <span style={{color:C.gold,fontWeight:700}}>carte athlète</span>. Reçois un programme IA calibré sur tes faiblesses réelles.
        </div>
      </div>
      <div className="fu3" style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",marginBottom:40}}>
        <Btn onClick={()=>setScreen("tests")} style={{fontSize:18,padding:"14px 40px",animation:"glow 2s infinite"}}>⚡ DÉCOUVRIR MON OVR</Btn>
      </div>
      <div className="fu4" style={{display:"flex",gap:32,flexWrap:"wrap",justifyContent:"center"}}>
        {[["🏆","Système OVR","Comme NBA 2K"],["🤖","Programme IA","100% personnalisé"],["📊","6 Attributs","Force, Vitesse, Endurance…"],["🔥","Cardio Intelligent","Adapté à ton sport"]].map(([icon,title,sub])=>(
          <div key={title} style={{textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:6}}>{icon}</div>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:16,letterSpacing:2,color:C.gold}}>{title}</div>
            <div style={{fontSize:12,color:C.muted}}>{sub}</div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ══ TESTS ══ */
  if(screen==="tests"){
    const filled=Object.keys(scores).length;
    return(
      <div style={{minHeight:"100vh",background:C.bg}}>
        <header style={{background:C.surf,borderBottom:`1px solid ${C.border}`,padding:"0 24px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
          <button onClick={()=>setScreen("home")} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 12px",color:C.muted,fontSize:13}}>← Retour</button>
          <VoltraLogo/>
          <div style={{fontFamily:"'DM Mono'",fontSize:12,color:C.muted}}>{filled}/6</div>
        </header>
        <div style={{maxWidth:960,margin:"0 auto",padding:"28px 24px",display:"grid",gridTemplateColumns:"1fr 300px",gap:24}}>
          <div>
            <div className="fu" style={{marginBottom:20}}>
              <div style={{fontFamily:"'Bebas Neue'",fontSize:40,letterSpacing:2,lineHeight:1}}>TESTS<span style={{color:C.gold}}> PHYSIQUES</span></div>
              <div style={{color:C.muted,marginTop:6,fontSize:15}}>Entre tes résultats — laisse vide si tu ne sais pas</div>
            </div>

            {/* Prénom */}
            <div className="fu1" style={{marginBottom:16}}>
              <label style={{display:"block",fontFamily:"'Bebas Neue'",fontSize:12,letterSpacing:2,color:C.muted,marginBottom:5}}>TON PRÉNOM</label>
              <input value={playerName} onChange={e=>setPlayerName(e.target.value.toUpperCase())} placeholder="ex: LUCAS"
                style={{background:C.surf2,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:15,width:"100%",fontFamily:"'Bebas Neue'",letterSpacing:2}}/>
            </div>

            {/* FORCE BLOC SPÉCIAL */}
            <div className="fu1" style={{background:C.surf,border:`1px solid ${scores.force?getTier(scores.force).color+"40":C.border}`,borderRadius:12,padding:16,marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:22}}>💪</span>
                  <div>
                    <div style={{fontFamily:"'Bebas Neue'",fontSize:14,letterSpacing:2,color:scores.force?getTier(scores.force).color:C.text}}>FORCE MAXIMALE</div>
                    <div style={{fontSize:11,color:C.muted}}>Squat + Bench + Traction</div>
                  </div>
                </div>
                {scores.force&&(
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"'Bebas Neue'",fontSize:32,color:getTier(scores.force).color,lineHeight:1}}>{scores.force}</div>
                    <div style={{fontFamily:"'Bebas Neue'",fontSize:12,color:getTier(scores.force).color}}>{getTier(scores.force).label}</div>
                  </div>
                )}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                {[
                  {key:"squat",   label:"🦵 SQUAT 1RM (kg)",            ph:"ex: 100"},
                  {key:"bench",   label:"🏋️ BENCH PRESS 1RM (kg)",      ph:"ex: 80"},
                  {key:"traction",label:"⬆️ LEST TRACTION (kg)",         ph:"0 si poids corps seul"},
                  {key:"poids",   label:"⚖️ TON POIDS DE CORPS (kg)",   ph:"ex: 80"},
                ].map(f=>(
                  <div key={f.key}>
                    <div style={{fontFamily:"'Bebas Neue'",fontSize:10,letterSpacing:1.5,color:C.muted,marginBottom:3}}>{f.label}</div>
                    <input type="number" value={forceInputs[f.key]} onChange={e=>setForceInputs(p=>({...p,[f.key]:e.target.value}))}
                      placeholder={f.ph}
                      style={{width:"100%",background:C.surf2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.text,fontSize:14}}/>
                  </div>
                ))}
              </div>
              {testValues.force&&(
                <div style={{background:`${C.gold}10`,border:`1px solid ${C.gold}30`,borderRadius:8,padding:"8px 12px",fontSize:12,color:C.gold}}>
                  ⚡ ({forceInputs.squat} + {forceInputs.bench} + {parseFloat(forceInputs.poids||0)+parseFloat(forceInputs.traction||0)}) ÷ 3 ÷ {forceInputs.poids} = <strong>{testValues.force}</strong>
                </div>
              )}
              {scores.force&&<div style={{height:5,background:C.surf3,borderRadius:3,overflow:"hidden",marginTop:8}}><div style={{height:"100%",width:`${scores.force}%`,background:getTier(scores.force).color,borderRadius:3,transition:"width 1s ease"}}/></div>}
              <div style={{fontSize:10,color:C.muted,marginTop:4}}>Traction = poids corps + lest · 1.0 = débutant · 1.4 = bon · 1.8 = élite</div>
            </div>

            {/* AUTRES TESTS */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {TESTS.slice(1).map((t,i)=>{
                const v=parseFloat(testValues[t.id]);
                const sc=!isNaN(v)&&v>0?clamp(calcScore(t.id,v),35,99):null;
                const tier=sc?getTier(sc):null;
                return(
                  <div key={t.id} className={`fu${Math.min(i%4+1,4)}`} style={{background:C.surf,border:`1px solid ${sc?tier.color+"40":C.border}`,borderRadius:12,padding:16,transition:"border .2s"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:22}}>{t.icon}</span>
                        <div>
                          <div style={{fontFamily:"'Bebas Neue'",fontSize:14,letterSpacing:2,color:sc?tier.color:C.text}}>{t.label}</div>
                          <div style={{fontSize:11,color:C.muted}}>{t.unit}</div>
                        </div>
                      </div>
                      {sc&&<div style={{textAlign:"right"}}>
                        <div style={{fontFamily:"'Bebas Neue'",fontSize:32,color:tier.color,lineHeight:1,textShadow:sc>=80?`0 0 16px ${tier.color}`:"none"}}>{sc}</div>
                        <div style={{fontFamily:"'Bebas Neue'",fontSize:12,color:tier.color}}>{tier.label}</div>
                      </div>}
                    </div>
                    <div style={{fontSize:11,color:"#666",marginBottom:8,lineHeight:1.4}}>{t.desc}</div>
                    <input type="number" value={testValues[t.id]||""} onChange={e=>setTestValues(p=>({...p,[t.id]:e.target.value}))}
                      placeholder={t.placeholder} min={t.min} max={t.max} step={t.step}
                      style={{width:"100%",background:C.surf2,border:`1px solid ${sc?tier.color+"50":C.border}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:15}}/>
                    {sc&&<div style={{height:5,background:C.surf3,borderRadius:3,overflow:"hidden",marginTop:8}}><div style={{height:"100%",width:`${sc}%`,background:tier.color,borderRadius:3,transition:"width 1s ease"}}/></div>}
                    <div style={{fontSize:10,color:C.muted,marginTop:4}}>{t.hint}</div>
                  </div>
                );
              })}
            </div>

            <div style={{marginTop:20}}>
              <Btn onClick={()=>setScreen("card")} full disabled={filled<3} style={{fontSize:17,padding:"14px"}}>
                {filled<3?`Remplis encore ${3-filled} test(s) minimum`:"VOIR MA CARTE VOLTRA →"}
              </Btn>
            </div>
          </div>

          {/* Preview */}
          <div style={{position:"sticky",top:76,height:"fit-content"}}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:11,letterSpacing:3,color:C.muted,marginBottom:8}}>PREVIEW</div>
            <PlayerCard scores={scores} ovr={ovr} playerName={playerName||"TOI"} sport={selSport?.id||"football"} compact/>
            {ovr>0&&(
              <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginTop:12}}>
                <div style={{fontFamily:"'Bebas Neue'",fontSize:11,letterSpacing:2,color:C.muted,marginBottom:8}}>FAIBLESSES DÉTECTÉES</div>
                {TESTS.filter(t=>scores[t.id]&&scores[t.id]<70).length>0
                  ?TESTS.filter(t=>scores[t.id]&&scores[t.id]<70).map(t=>(
                    <div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.border}`}}>
                      <span style={{fontSize:13}}>{t.icon} {t.label}</span>
                      <span style={{fontFamily:"'Bebas Neue'",fontSize:18,color:getTier(scores[t.id]).color}}>{scores[t.id]}</span>
                    </div>
                  ))
                  :<div style={{fontSize:13,color:C.gold}}>✅ Profil équilibré !</div>
                }
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ══ CARD ══ */
  if(screen==="card") return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",padding:24}}>
      <header style={{position:"fixed",top:0,left:0,right:0,background:`${C.bg}e0`,borderBottom:`1px solid ${C.border}`,padding:"0 24px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",zIndex:100,backdropFilter:"blur(8px)"}}>
        <button onClick={()=>setScreen("tests")} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 12px",color:C.muted,fontSize:13}}>← Modifier</button>
        <VoltraLogo/>
        <div/>
      </header>
      <div style={{paddingTop:76,textAlign:"center",width:"100%",maxWidth:600}}>
        <div className="fu" style={{marginBottom:10}}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:18,letterSpacing:3,color:C.muted}}>TA CARTE VOLTRA</div>
        </div>
        <div className="fu1" style={{display:"flex",justifyContent:"center",marginBottom:24}}>
          <PlayerCard scores={scores} ovr={ovr} playerName={playerName||"ATHLÈTE"} sport={selSport?.id||"football"}/>
        </div>
        <div className="fu2" style={{marginBottom:20}}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:26,color:getOVRColor(ovr),textShadow:`0 0 30px ${getOVRColor(ovr)}60`}}>
            {ovr>=85?"🔥 NIVEAU ÉLITE !":ovr>=75?"💪 TRÈS BON ATHLÈTE":ovr>=65?"📈 BON NIVEAU":ovr>=55?"🎯 EN PROGRESSION":"🌱 FORT POTENTIEL"}
          </div>
          <div style={{fontSize:14,color:C.muted,marginTop:6,lineHeight:1.6}}>
            {ovr>=80?"Tu es dans le top tier. Le programme va optimiser tes points forts et combler les lacunes.":ovr>=65?"Bon profil. Le programme va cibler tes faiblesses pour passer au niveau supérieur.":"Excellent potentiel. Le programme va construire tes bases et développer tes qualités clés."}
          </div>
        </div>
        <div className="fu3" style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:20}}>
          <Btn onClick={shareCard} variant="outline" style={{fontSize:14}}>{copied?"✅ COPIÉ !":"📤 PARTAGER MA CARTE"}</Btn>
          <Btn onClick={()=>setScreen("sport")} style={{fontSize:16,padding:"12px 32px"}}>GÉNÉRER MON PROGRAMME →</Btn>
        </div>
        <div className="fu4">
          <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:14,padding:18}}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:11,letterSpacing:3,color:C.muted,marginBottom:12}}>DÉTAIL DES 6 ATTRIBUTS</div>
            {TESTS.map(t=>{
              const sc=scores[t.id]||0;const tier=getTier(sc);
              return(
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <span style={{width:22,textAlign:"center"}}>{t.icon}</span>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:12,color:C.muted,width:130}}>{t.label}</div>
                  <div style={{flex:1,height:6,background:C.surf3,borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${sc}%`,background:tier.color,borderRadius:3,transition:"width 1s ease"}}/>
                  </div>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:20,color:tier.color,width:36,textAlign:"right"}}>{sc||"—"}</div>
                  <div style={{background:tier.bg,border:`1px solid ${tier.color}40`,borderRadius:4,padding:"2px 6px",fontFamily:"'Bebas Neue'",fontSize:11,color:tier.color,width:22,textAlign:"center"}}>{tier.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  /* ══ SPORT ══ */
  if(screen==="sport"){
    const recommended=SPORTS.map(sp=>{
      const w=Object.entries(sp.weights).reduce((sum,[k,v])=>sum+(scores[k]||60)*v,0)/Object.values(sp.weights).reduce((a,b)=>a+b,0);
      return{...sp,match:Math.round(w)};
    }).sort((a,b)=>b.match-a.match);
    return(
      <div style={{minHeight:"100vh",background:C.bg}}>
        <header style={{background:C.surf,borderBottom:`1px solid ${C.border}`,padding:"0 24px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
          <button onClick={()=>setScreen("card")} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 12px",color:C.muted,fontSize:13}}>← Retour</button>
          <VoltraLogo/>
          <Tag color={getOVRColor(ovr)}>OVR {ovr}</Tag>
        </header>
        <div style={{maxWidth:960,margin:"0 auto",padding:"28px 24px"}}>
          <div className="fu" style={{marginBottom:20}}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:40,letterSpacing:2}}>CHOISIS<span style={{color:C.gold}}> TON SPORT</span></div>
            <div style={{color:C.muted,fontSize:15}}>Le programme sera calibré sur tes faiblesses réelles</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(195px,1fr))",gap:12}}>
            {recommended.map((sp,i)=>{
              const sel=selSport?.id===sp.id;
              return(
                <button key={sp.id} onClick={()=>setSelSport(sp)} style={{background:sel?`${sp.color}15`:C.surf,border:`1.5px solid ${sel?sp.color:C.border}`,borderRadius:14,padding:"16px 14px",textAlign:"left",transition:"all .2s",cursor:"pointer",boxShadow:sel?`0 0 24px ${sp.color}30`:"none",animation:`fadeUp .4s ${i*.05}s cubic-bezier(.16,1,.3,1) both`}}>
                  <div style={{fontSize:34,marginBottom:8}}>{sp.icon}</div>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:20,letterSpacing:1,color:sel?sp.color:C.text}}>{sp.name}</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:2}}>Cardio {sp.cardio.volume}/100</div>
                  {i===0&&<div style={{marginTop:8}}><Tag color={C.gold}>⭐ RECOMMANDÉ</Tag></div>}
                </button>
              );
            })}
          </div>
          {selSport&&(
            <div className="fu" style={{marginTop:18}}>
              <Btn onClick={()=>setScreen("profile")} style={{fontSize:16,padding:"13px 36px"}}>
                CONTINUER AVEC {selSport.name.toUpperCase()} →
              </Btn>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ══ PROFILE ══ */
  if(screen==="profile"){
    const inp={width:"100%",background:C.surf2,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:15,appearance:"none"};
    return(
      <div style={{minHeight:"100vh",background:C.bg}}>
        <header style={{background:C.surf,borderBottom:`1px solid ${C.border}`,padding:"0 24px",height:56,display:"flex",alignItems:"center",gap:14,position:"sticky",top:0,zIndex:100}}>
          <button onClick={()=>setScreen("sport")} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 12px",color:C.muted,fontSize:13}}>← Retour</button>
          <VoltraLogo/>
        </header>
        <div style={{maxWidth:860,margin:"0 auto",padding:"28px 24px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:28}}>
          <div>
            <div className="fu" style={{marginBottom:18}}>
              <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:5}}>
                <span style={{fontSize:30}}>{selSport.icon}</span>
                <div style={{fontFamily:"'Bebas Neue'",fontSize:30,letterSpacing:2,color:selSport.color}}>{selSport.name.toUpperCase()}</div>
              </div>
              <div style={{color:C.muted}}>Paramètre final avant la génération IA</div>
            </div>
            {[
              {label:"Niveau musculation",key:"niveau",opts:["Débutant (< 1 an)","Intermédiaire (1-3 ans)","Avancé (3-5 ans)","Expert (5+ ans)"]},
              {label:"Objectif",key:"objectif",opts:["Performance sportive","Prévention blessures","Puissance explosive","Endurance de force"]},
              {label:"Jours / semaine",key:"jours",opts:["2","3","4","5"]},
              {label:"Phase de saison",key:"saison",opts:["Hors-saison (construction)","Préparation générale","Préparation spécifique","Pré-compétition","En compétition","Récupération"]},
            ].map(f=>(
              <div key={f.key} className="fu1" style={{marginBottom:13}}>
                <label style={{display:"block",fontFamily:"'Bebas Neue'",fontSize:11,letterSpacing:2,color:C.muted,marginBottom:4}}>{f.label.toUpperCase()}</label>
                <select value={athlete[f.key]} onChange={e=>setAthlete(p=>({...p,[f.key]:e.target.value}))} style={inp}>
                  {f.opts.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div className="fu2" style={{marginBottom:13}}>
              <label style={{display:"block",fontFamily:"'Bebas Neue'",fontSize:11,letterSpacing:2,color:C.muted,marginBottom:4}}>BLESSURES / CONTRAINTES</label>
              <textarea value={athlete.blessures} onChange={e=>setAthlete(p=>({...p,blessures:e.target.value}))} placeholder="Ex: ancienne entorse cheville, tendinite épaule…" style={{...inp,height:76,resize:"vertical"}}/>
            </div>
            {error&&<div style={{background:"#F4433618",border:"1px solid #F4433640",borderRadius:8,padding:12,color:"#F44336",fontSize:13,marginBottom:12}}>{error}</div>}
            <Btn onClick={generateProgram} full style={{fontSize:17,padding:"14px"}}>⚡ GÉNÉRER MON PROGRAMME VOLTRA</Btn>
          </div>
          <div className="fu1">
            <PlayerCard scores={scores} ovr={ovr} playerName={playerName||"ATHLÈTE"} sport={selSport.id} compact/>
            <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginTop:12}}>
              <div style={{fontFamily:"'Bebas Neue'",fontSize:11,letterSpacing:2,color:C.muted,marginBottom:8}}>FAIBLESSES CIBLÉES PAR L'IA</div>
              {TESTS.filter(t=>scores[t.id]&&scores[t.id]<70).length>0
                ?TESTS.filter(t=>scores[t.id]&&scores[t.id]<70).map(t=>(
                  <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
                    <span style={{fontSize:13}}>{t.icon} {t.label}</span>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <span style={{fontFamily:"'Bebas Neue'",fontSize:20,color:getTier(scores[t.id]).color}}>{scores[t.id]}</span>
                      <Tag color={C.red}>À AMÉLIORER</Tag>
                    </div>
                  </div>
                ))
                :<div style={{fontSize:13,color:C.gold}}>✅ Profil équilibré</div>
              }
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ══ GENERATING ══ */
  if(screen==="generating") return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",maxWidth:460,padding:32}}>
        <div style={{width:80,height:80,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.gold}`,borderRadius:"50%",margin:"0 auto 28px",animation:"spin 1s linear infinite"}}/>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:34,letterSpacing:3,color:C.gold,marginBottom:8}}>⚡ VOLTRA GÉNÈRE</div>
        <div style={{color:C.muted,fontSize:15,marginBottom:24}}>{genMsg}</div>
        <div style={{height:4,background:C.surf2,borderRadius:2,overflow:"hidden",marginBottom:10}}>
          <div style={{height:"100%",background:`linear-gradient(90deg,${C.gold},#a07830)`,width:`${genProgress}%`,borderRadius:2,transition:"width .8s ease"}}/>
        </div>
        <div style={{fontFamily:"'DM Mono'",fontSize:12,color:C.muted}}>{genProgress}%</div>
        <div style={{marginTop:20,fontSize:13,color:C.muted}}>OVR {ovr} · {selSport?.name} · {athlete.jours}j/semaine</div>
      </div>
    </div>
  );

  /* ══ PROGRAM ══ */
  if(screen==="program"&&programme){
    const seance=programme.seances?.[activeSeance];
    const CARDIO_COLORS={CARDIO_ACTIVATION:"#FFC107",CARDIO_SPECIFIQUE:"#FF6D00",CARDIO_FINISHER:"#F44336",CARDIO_RECUPERATION:"#4CAF50"};
    const CARDIO_LABELS={CARDIO_ACTIVATION:"🔥 ACTIVATION",CARDIO_SPECIFIQUE:"❤️ CARDIO SPÉCIFIQUE",CARDIO_FINISHER:"💥 FINISHER",CARDIO_RECUPERATION:"🌿 RÉCUPÉRATION",MUSCU:"💪 MUSCULATION"};

    if(liveMode&&seance){
      const bloc=seance.blocs?.[liveBloc];
      const exo=bloc?.exercices?.[liveExo];
      const totalExos=seance.blocs?.reduce((a,b)=>a+(b.exercices?.length||0),0)||0;
      let exoCount=0,currentTotal=0;
      seance.blocs?.forEach((b,bi)=>b.exercices?.forEach((_,ei)=>{exoCount++;if(bi<liveBloc||(bi===liveBloc&&ei<=liveExo))currentTotal=exoCount;}));
      const nextExo=()=>{
        const b=seance.blocs?.[liveBloc];
        if(liveExo<(b?.exercices?.length||0)-1){setLiveExo(liveExo+1);setLiveSerie(1);}
        else if(liveBloc<(seance.blocs?.length||0)-1){setLiveBloc(liveBloc+1);setLiveExo(0);setLiveSerie(1);}
        else setLiveMode(false);
        setRestActive(false);setRestTimer(0);
      };
      const getRestSecs=()=>{const m=(exo?.recuperation||"90s").match(/(\d+)/);return m?parseInt(m[1]):90;};
      return(
        <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column"}}>
          <div style={{background:selSport.color,padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <button onClick={()=>setLiveMode(false)} style={{background:"rgba(0,0,0,.3)",border:"none",borderRadius:6,padding:"6px 14px",color:"#fff",fontSize:13,fontWeight:700}}>⏹ ARRÊTER</button>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:18,letterSpacing:2,color:"#fff"}}>⚡ VOLTRA LIVE</div>
            <div style={{fontFamily:"'DM Mono'",fontSize:12,color:"rgba(255,255,255,.8)"}}>{currentTotal}/{totalExos}</div>
          </div>
          <div style={{height:4,background:"rgba(255,255,255,.2)"}}>
            <div style={{height:"100%",background:"white",width:`${(currentTotal/totalExos)*100}%`,transition:"width .4s"}}/>
          </div>
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
            {restActive?(
              <div className="fu" style={{textAlign:"center"}}>
                <div style={{fontFamily:"'Bebas Neue'",fontSize:20,color:C.muted,marginBottom:8,letterSpacing:2}}>REPOS</div>
                <div style={{position:"relative",width:180,height:180,margin:"0 auto 24px"}}>
                  <svg viewBox="0 0 180 180" width="180" height="180">
                    <circle cx="90" cy="90" r="70" fill="none" stroke={C.surf3} strokeWidth="8"/>
                    <circle cx="90" cy="90" r="70" fill="none" stroke={C.gold} strokeWidth="8"
                      strokeDasharray="440" strokeDashoffset={440-(restTimer/getRestSecs())*440}
                      strokeLinecap="round" transform="rotate(-90 90 90)" style={{transition:"stroke-dashoffset 1s linear"}}/>
                  </svg>
                  <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                    <div style={{fontFamily:"'Bebas Neue'",fontSize:56,color:C.gold,lineHeight:1}}>{restTimer}</div>
                    <div style={{fontFamily:"'Bebas Neue'",fontSize:13,color:C.muted,letterSpacing:2}}>SECONDES</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:12,justifyContent:"center"}}>
                  <Btn variant="ghost" onClick={()=>{setRestActive(false);setRestTimer(0);}} style={{fontSize:14}}>Passer</Btn>
                  <Btn onClick={nextExo} style={{fontSize:14}}>Suivant →</Btn>
                </div>
              </div>
            ):exo?(
              <div className="fu" style={{maxWidth:500,width:"100%",textAlign:"center"}}>
                <div style={{marginBottom:8}}><Tag color={CARDIO_COLORS[bloc.bloc_type]||selSport.color}>{CARDIO_LABELS[bloc.bloc_type]||bloc.bloc_nom}</Tag></div>
                <div style={{fontFamily:"'Bebas Neue'",fontSize:34,letterSpacing:2,color:selSport.color,lineHeight:1.1,marginBottom:5}}>{exo.nom}</div>
                <div style={{fontSize:14,color:C.muted,marginBottom:18}}>🎯 {exo.geste_sportif}</div>
                <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:18}}>
                  {Array.from({length:parseInt(exo.series_reps?.split("×")[0])||3}).map((_,i)=>(
                    <div key={i} style={{width:36,height:36,borderRadius:"50%",background:i<liveSerie-1?C.gold:i===liveSerie-1?`${C.gold}30`:C.surf3,border:`2px solid ${i===liveSerie-1?C.gold:"transparent"}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue'",fontSize:16,color:i<liveSerie-1?"#000":i===liveSerie-1?C.gold:C.muted}}>
                      {i<liveSerie-1?"✓":i+1}
                    </div>
                  ))}
                </div>
                <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:14,padding:18,marginBottom:14,textAlign:"left"}}>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:13,letterSpacing:2,color:C.muted,marginBottom:5}}>EXÉCUTION</div>
                  <div style={{fontSize:14,color:"#ccc",lineHeight:1.7,marginBottom:10}}>{exo.execution}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {exo.focus_technique?.map((f,fi)=><span key={fi} style={{background:C.surf3,border:`1px solid ${C.border}`,borderRadius:4,padding:"3px 9px",fontSize:12,color:"#ccc"}}>→ {f}</span>)}
                  </div>
                </div>
                <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:14,flexWrap:"wrap"}}>
                  <Tag color={selSport.color}>{exo.series_reps}</Tag>
                  <Tag color={C.gold}>{exo.recuperation}</Tag>
                </div>
                <div style={{display:"flex",gap:10,justifyContent:"center"}}>
                  {liveSerie<(parseInt(exo.series_reps?.split("×")[0])||3)
                    ?<Btn onClick={()=>{setLiveSerie(s=>s+1);startRest(getRestSecs());}} style={{fontSize:15}}>✅ SÉRIE {liveSerie} FAITE → REPOS</Btn>
                    :<Btn onClick={nextExo} style={{fontSize:15,padding:"12px 32px"}}>✅ EXERCICE TERMINÉ →</Btn>
                  }
                </div>
              </div>
            ):(
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:64,marginBottom:16}}>🏆</div>
                <div style={{fontFamily:"'Bebas Neue'",fontSize:42,color:C.gold}}>SÉANCE TERMINÉE !</div>
                <Btn onClick={()=>setLiveMode(false)} style={{marginTop:20,fontSize:16}}>Voir le programme</Btn>
              </div>
            )}
          </div>
        </div>
      );
    }

    return(
      <div style={{minHeight:"100vh",background:C.bg}}>
        <header style={{background:C.surf,borderBottom:`1px solid ${C.border}`,padding:"0 24px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <button onClick={()=>{setScreen("home");setProgramme(null);setSelSport(null);}} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"5px 12px",color:C.muted,fontSize:13}}>← Nouveau</button>
            <VoltraLogo/>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:18}}>{selSport.icon}</span>
            <Tag color={selSport.color}>{selSport.name}</Tag>
            <Tag color={getOVRColor(ovr)}>OVR {ovr}</Tag>
          </div>
        </header>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"24px"}}>
          <div className="fu" style={{marginBottom:18}}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:36,letterSpacing:2,lineHeight:1}}>{programme.programme_titre}</div>
            <div style={{color:C.muted,fontSize:15,marginTop:3}}>{programme.programme_sous_titre}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
              {programme.logique_programme&&<div style={{background:C.surf,border:`1px solid ${selSport.color}30`,borderLeft:`3px solid ${selSport.color}`,borderRadius:8,padding:"11px 13px",fontSize:12,color:"#bbb",lineHeight:1.7}}>💪 <strong style={{color:selSport.color}}>Logique : </strong>{programme.logique_programme}</div>}
              {programme.strategie_cardio&&<div style={{background:C.surf,border:`1px solid #FF6D0030`,borderLeft:`3px solid #FF6D00`,borderRadius:8,padding:"11px 13px",fontSize:12,color:"#bbb",lineHeight:1.7}}>❤️ <strong style={{color:"#FF6D00"}}>Cardio : </strong>{programme.strategie_cardio}</div>}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"195px 1fr",gap:18}}>
            <div>
              <div style={{fontFamily:"'Bebas Neue'",fontSize:11,letterSpacing:3,color:C.muted,marginBottom:8}}>SÉANCES</div>
              {programme.seances?.map((s,i)=>(
                <button key={i} onClick={()=>{setActiveSeance(i);setExpandedExo(null);setLiveBloc(0);setLiveExo(0);setLiveSerie(1);}}
                  style={{width:"100%",background:activeSeance===i?`${selSport.color}18`:C.surf,border:`1.5px solid ${activeSeance===i?selSport.color:C.border}`,borderRadius:10,padding:"11px 13px",marginBottom:7,textAlign:"left",transition:"all .18s",cursor:"pointer"}}>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:13,letterSpacing:1,color:activeSeance===i?selSport.color:C.text}}>SÉANCE {s.num}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2,lineHeight:1.3}}>{s.titre}</div>
                  {s.focus_faiblesse&&<div style={{fontSize:10,color:C.gold,marginTop:3}}>🎯 {s.focus_faiblesse}</div>}
                  <div style={{fontSize:10,color:C.muted,marginTop:3}}>⏱ {s.duree_min} min</div>
                </button>
              ))}
              <div style={{marginTop:10}}>
                <PlayerCard scores={scores} ovr={ovr} playerName={playerName||"ATHLÈTE"} sport={selSport.id} compact/>
              </div>
              {programme.conseils_cardio?.length>0&&(
                <div style={{background:C.surf,border:`1px solid #FF6D0030`,borderLeft:`3px solid #FF6D00`,borderRadius:10,padding:13,marginTop:10}}>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:10,letterSpacing:2,color:"#FF6D00",marginBottom:7}}>CONSEILS CARDIO</div>
                  {programme.conseils_cardio.map((c,i)=><div key={i} style={{fontSize:11,color:"#aaa",marginBottom:6,lineHeight:1.5,paddingBottom:6,borderBottom:i<programme.conseils_cardio.length-1?`1px solid ${C.border}`:"none"}}>❤️ {c}</div>)}
                </div>
              )}
            </div>
            {seance&&(
              <div className="fu" key={activeSeance}>
                <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:13,borderTop:`3px solid ${selSport.color}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                    <div>
                      <div style={{fontFamily:"'Bebas Neue'",fontSize:26,letterSpacing:2,color:selSport.color}}>SÉANCE {seance.num} — {seance.titre}</div>
                      <div style={{color:C.muted,fontSize:13,marginTop:2}}>🎯 {seance.focus_sportif}</div>
                      {seance.focus_faiblesse&&<div style={{color:C.gold,fontSize:12,marginTop:2}}>📈 Améliore : {seance.focus_faiblesse}</div>}
                    </div>
                    <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
                      <Tag color={selSport.color}>⏱ {seance.duree_min} min</Tag>
                      {seance.ratio&&<Tag color="#FF6D00">📊 {seance.ratio}</Tag>}
                      <Btn onClick={()=>{setLiveMode(true);setLiveBloc(0);setLiveExo(0);setLiveSerie(1);setRestActive(false);}} variant="gold" style={{fontSize:13,padding:"7px 15px"}}>▶ MODE LIVE</Btn>
                    </div>
                  </div>
                </div>
                {seance.blocs?.map((bloc,bi)=>{
                  const isCardio=bloc.bloc_type&&bloc.bloc_type!=="MUSCU";
                  const bColor=isCardio?(CARDIO_COLORS[bloc.bloc_type]||"#FF6D00"):selSport.color;
                  return(
                    <div key={bi} style={{background:C.surf,border:`1px solid ${isCardio?bColor+"28":C.border}`,borderLeft:`4px solid ${bColor}`,borderRadius:12,padding:16,marginBottom:11}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
                        <div>
                          <div style={{fontFamily:"'Bebas Neue'",fontSize:15,letterSpacing:2,color:bColor}}>{CARDIO_LABELS[bloc.bloc_type]||"BLOC"}</div>
                          <div style={{fontSize:14,fontWeight:700,color:C.text}}>{bloc.bloc_nom}</div>
                        </div>
                        {bloc.duree_min&&<Tag color={bColor}>⏱ {bloc.duree_min} min</Tag>}
                      </div>
                      {bloc.bloc_desc&&<div style={{fontSize:12,color:C.muted,lineHeight:1.6,marginBottom:11,padding:"7px 9px",background:`${bColor}07`,borderRadius:5}}>{bloc.bloc_desc}</div>}
                      {bloc.exercices?.map((exo,ei)=>{
                        const key=`${bi}-${ei}`;
                        const open=expandedExo===key;
                        const isC=exo.type_exercice==="CARDIO";
                        const eColor=isC?bColor:selSport.color;
                        return(
                          <div key={ei} style={{background:C.surf2,border:`1px solid ${open?eColor+"50":C.border}`,borderRadius:10,marginBottom:8,overflow:"hidden",transition:"border .2s"}}>
                            <button onClick={()=>setExpandedExo(open?null:key)} style={{width:"100%",background:"transparent",border:"none",padding:"12px 13px",display:"flex",alignItems:"center",justifyContent:"space-between",color:C.text,textAlign:"left",cursor:"pointer"}}>
                              <div style={{display:"flex",alignItems:"center",gap:9,flex:1}}>
                                <div style={{width:25,height:25,background:`${eColor}20`,border:`1px solid ${eColor}40`,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue'",fontSize:12,color:eColor,flexShrink:0}}>{isC?"♥":ei+1}</div>
                                <div style={{flex:1}}>
                                  <div style={{fontWeight:700,fontSize:14}}>{exo.nom}</div>
                                  <div style={{fontSize:11,color:C.muted,marginTop:1}}>🎯 {exo.geste_sportif}</div>
                                </div>
                              </div>
                              <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}>
                                {isC&&exo.zone_fc&&<Tag color={eColor}>{exo.zone_fc}</Tag>}
                                <Tag color={eColor}>{exo.series_reps}</Tag>
                                <span style={{color:C.muted,fontSize:12}}>{open?"▲":"▼"}</span>
                              </div>
                            </button>
                            {open&&(
                              <div className="fi" style={{padding:"0 13px 13px",borderTop:`1px solid ${C.border}`}}>
                                {isC&&exo.structure_cardio&&(
                                  <div style={{marginTop:11,background:`${eColor}10`,border:`1px solid ${eColor}30`,borderRadius:8,padding:"9px 11px"}}>
                                    <div style={{fontFamily:"'Bebas Neue'",fontSize:10,color:eColor,letterSpacing:1.5,marginBottom:3}}>⏱ STRUCTURE</div>
                                    <div style={{fontFamily:"'DM Mono'",fontSize:13,color:"#ccc"}}>{exo.structure_cardio}</div>
                                  </div>
                                )}
                                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginTop:11}}>
                                  <div><div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:1.5,marginBottom:3}}>📍 POSITION</div><div style={{fontSize:12,color:"#bbb",background:C.surf3,borderRadius:6,padding:"7px 9px",lineHeight:1.6}}>{exo.position_depart}</div></div>
                                  <div><div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:1.5,marginBottom:3}}>⚡ EXÉCUTION</div><div style={{fontSize:12,color:"#bbb",background:C.surf3,borderRadius:6,padding:"7px 9px",lineHeight:1.6}}>{exo.execution}</div></div>
                                </div>
                                {exo.focus_technique?.length>0&&(
                                  <div style={{marginTop:9}}>
                                    <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:1.5,marginBottom:4}}>🔍 FOCUS</div>
                                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                                      {exo.focus_technique.map((f,fi)=><span key={fi} style={{background:C.surf3,border:`1px solid ${C.border}`,borderRadius:4,padding:"3px 8px",fontSize:11,color:"#ccc"}}>→ {f}</span>)}
                                    </div>
                                  </div>
                                )}
                                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginTop:9}}>
                                  <div style={{background:`${eColor}0d`,border:`1px solid ${eColor}25`,borderRadius:8,padding:"9px 10px"}}>
                                    <div style={{fontSize:10,fontWeight:700,color:eColor,letterSpacing:1.5,marginBottom:3}}>🏆 POURQUOI</div>
                                    <div style={{fontSize:11,color:"#bbb",lineHeight:1.6}}>{exo.intention}</div>
                                  </div>
                                  <div style={{background:C.surf3,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 10px"}}>
                                    <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:1.5,marginBottom:3}}>📈 PROGRESSION</div>
                                    <div style={{fontSize:11,color:"#bbb",lineHeight:1.6}}>{exo.progression}</div>
                                  </div>
                                </div>
                                <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                                  <Tag color={eColor}>{exo.series_reps}</Tag>
                                  {exo.recuperation&&<Tag color={C.gold}>⏸ {exo.recuperation}</Tag>}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

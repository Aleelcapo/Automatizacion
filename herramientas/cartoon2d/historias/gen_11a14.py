import sys; sys.path.insert(0,'historias')
from _gen import *
def IC(i,items,x=540,y=820,s=1.15,cols=None,value=None,hidden=False,ring=None,marks=None,ls=None,gap=None):
    d={"id":i,"type":"icons","x":x,"y":y,"s":s,"items":items}
    for k,v in (("cols",cols),("value",value),("ring",ring),("marks",marks),("ls",ls),("gap",gap)):
        if v is not None: d[k]=v
    if hidden: d["hidden"]=True
    return d
PH={"reachL":[110,-760],"handL":"grip"}
# ======================= EP 11 – CAPGRAS =======================
sc={
 "pareja":{"bg":"officeB","actors":[ACT("mujer",x=330,y=2400,s=1.85,expr="angry",pose={"reachL":[150,-460],"handL":"grip"},i="m"),ACT("hombre",x=770,y=2400,s=1.85,expr="worried",i="h")]},
 "mujerC":{"bg":"officeB","actors":[ACT("mujer",x=540,y=2420,s=2.0,expr="angry",i="m")]},
 "esposoC":{"bg":"officeB","actors":[ACT("hombre",x=540,y=2420,s=2.0,expr="worried",i="h")]},
 "telefono":{"bg":"bedroom","actors":[ACT("mujer",x=540,y=2450,s=2.1,expr="happy",pose=PH,i="m")],"props":[IC("tel",[["phone","",""]],x=700,y=820,s=0.42,ring="#3ddc84")]},
 "scan":MG("#20242c","#08090c",[{"id":"sc","type":"brainscan","x":540,"y":800,"s":1.25,"value":1}]),
 "zonas":MG("#3b2a5e","#120c22",[{"id":"z","type":"twozones","x":540,"y":820,"s":1.35,"broken":0}]),
 "sentir":MG("#5e1a2a","#1d0810",[IC("i",[["face","CARA",""],["heart","CARIÑO",""]],y=800,cols=2,value=0)]),
 "impostor":MG("#20242c","#08090c",[IC("i",[["face","",""]],y=760,s=2.0,ring="#ff4d5e"),K("k","IMPOSTOR",1260,120,"#ff4d5e")]),
 "voz":MG("#1a4a5e","#0a1a24",[{"id":"ea","type":"ear","x":620,"y":700,"s":1.2},IC("ok",[["heart","OTRO CAMINO","ok"]],y=1300,s=0.9,ring="#3ddc84")]),
 "titulo":TITLE("SÍNDROME","DE CAPGRAS",c1="#3b2a5e",c2="#120c22"),
}
beats=[
 {"text":"Una mujer llegó furiosa, agarrada del brazo de su esposo, y me dijo: este hombre no es mi marido. Es un impostor.","shots":[
   {"scene":"pareja","cam":{"on":["m","h"],"shot":"medium","move":"push"}},
   {"scene":"mujerC","from":"este","cam":ON("m","face"),"do":[{"on":"este","target":"m","talk":3.0,"arms":"explainL"}]}]},
 {"text":"Ana pensó que era una pelea de pareja.","shots":[ANA("smug",1.6)]},
 {"text":"Leo dijo que quizás él la estaba engañando.","shots":[LEO("think",1.8)]},
 {"text":"Pero ella reconocía todo: su cara, su voz, su ropa.","shots":[{"scene":"esposoC","cam":ON("h","close","drift")}]},
 {"text":"Decía que era idéntico... demasiado idéntico.","shots":[{"scene":"mujerC","cam":ON("m","face"),"do":[{"at":0,"target":"m","expr":"confused","talk":2.0,"look":[0.6,0]}]}]},
 {"text":"Y por teléfono, en cambio, lo reconocía perfectamente.","shots":[{"scene":"telefono","cam":ON("m","close"),"do":[{"on":"reconocía","target":"m","talk":1.6}]}]},
 {"text":"Le hicimos estudios. Había tenido un pequeño golpe en la cabeza meses atrás.","shots":[H("","serious",1.2),{"scene":"scan","from":"Había","cam":F(540,800)}]},
 {"text":"Cuando ves a alguien que querés, tu cerebro hace dos cosas al mismo tiempo.","shots":[{"scene":"zonas","flash":True,"cam":F(540,820)}]},
 {"text":"Una zona reconoce la cara. Y otra, la de las emociones, te hace sentir algo: cariño, confianza, familiaridad.","shots":[
   {"scene":"sentir","cam":F(540,800),"do":[{"on":"cara","target":"i","value":1,"dur":0.3,"sfx":"pop"},{"on":"cariño","target":"i","value":2,"dur":0.3,"sfx":"pop"}]}]},
 {"text":"En ella, el cable entre esas dos zonas se había dañado.","shots":[{"scene":"zonas","cam":F(540,820,1.15),"do":[{"on":"dañado","target":"z","broken":1,"dur":0.3,"sfx":"thud","camshake":10}]}]},
 {"text":"Veía la cara de su esposo... pero no sentía nada.","shots":[{"scene":"esposoC","cam":ON("h","face")},{"scene":"mujerC","from":"pero","cam":ON("m","face"),"do":[{"at":0,"target":"m","expr":{"mood":"neutral","lid":0.3}}]}]},
 {"text":"Y el cerebro odia no tener explicación. Así que inventó una:","shots":[{"scene":"zonas","cam":F(540,820,1.0,"drift"),"do":[{"at":0,"target":"z","broken":1,"dur":0.01}]}]},
 {"text":"si se ve igual pero no lo siento, entonces es un impostor.","shots":[{"scene":"impostor","cam":F(540,820),"do":[{"on":"impostor","target":"k","pop":True,"camshake":10,"sfx":"thud"}]}]},
 {"text":"Por teléfono no pasaba, porque la voz viaja por otro camino que sí estaba sano.","shots":[{"scene":"voz","cam":F(540,900)}]},
 {"text":"Se llama síndrome de Capgras.","shots":[TSHOT()]},
 {"text":"Con medicación y tiempo, la conexión mejoró y volvió a reconocerlo de verdad.","shots":[{"scene":"zonas","cam":F(540,820),"do":[{"at":0,"target":"z","broken":1,"dur":0.01},{"on":"mejoró","target":"z","broken":0,"dur":0.3,"sfx":"ding"}]},
   {"scene":"pareja","from":"volvió","cam":{"on":["m","h"],"shot":"medium","move":"drift"},"do":[{"at":0,"target":"m","expr":"happy","look":[0.8,0]},{"at":0,"target":"h","expr":"happy","look":[-0.8,0]}]}]},
 {"text":"El esposo me preguntó qué podía hacer mientras tanto.","shots":[{"scene":"esposoC","cam":ON("h","close"),"do":[{"at":0,"target":"h","talk":2.0,"expr":"worried"}]}]},
 {"text":"Le dije: llamala por teléfono. Al menos así le caés bien.","shots":[H("","smirk",2.6,{"armR":[14,92],"handR":"open"})]},
]
save('ep11_capgras','Doctor_ep11','La mujer que decía que su esposo era un impostor','../audios/medico_1.m4a',sc,beats)

# ======================= EP 12 – HIDROCEFALIA =======================
sc={
 "hombre":{"bg":"officeB","actors":[ACT("hombre8",x=540,y=2420,s=2.0,expr="neutral",i="h")]},
 "pierna":{"bg":"officeB","actors":[ACT("hombre8",x=540,y=2420,s=2.0,expr="worried",i="h")]},
 "familia":{"bg":"kitchen","actors":[ACT("hombre8",x=380,y=2380,s=1.8,expr="happy",i="h"),ACT("madre",x=720,y=2380,s=1.75,expr="happy",i="f")]},
 "mri":{"bg":"mriroom"},
 "scan":MG("#20242c","#08090c",[{"id":"sc","type":"hydroscan","x":540,"y":800,"s":1.25,"value":0}]),
 "bebe":MG("#1a4a6e","#0a1a2a",[IC("i",[["baby","HIDROCEFALIA",""]],y=780,s=2.0)]),
 "liquido":MG("#1a4a6e","#0a1a2a",[{"id":"f","type":"fluidbrain","x":540,"y":820,"s":1.2,"value":0}]),
 "adapta":MG("#3b2a5e","#120c22",[{"id":"n","type":"neurons","x":540,"y":820,"s":1.25,"value":0}]),
 "titulo":TITLE("SE LLAMA","PLASTICIDAD","CEREBRAL",c1="#3b2a5e",c2="#120c22"),
 "mundo":MG("#1a2a5e","#080c22",[{"id":"g","type":"globe","x":540,"y":800,"s":1.25,"value":1},K("k","DIO LA VUELTA AL MUNDO",1300,72,"#ffcf3a")]),
}
beats=[
 {"text":"Un hombre de 44 años vino por algo simple: le fallaba un poco la pierna.","shots":[{"scene":"hombre","cam":ON("h","medium")},{"scene":"pierna","from":"pierna","cam":{"x":560,"y":1900,"z":1.5,"move":"push"},"do":[{"on":"pierna","target":"h","sway":0.6,"dur":0.3}]}]},
 {"text":"Trabajaba, estaba casado, tenía dos hijos. Una vida completamente normal.","shots":[{"scene":"familia","cam":{"on":["h","f"],"shot":"medium","move":"drift"},"do":[{"at":0.2,"target":"h","look":[0.8,0]},{"at":0.2,"target":"f","look":[-0.8,0]}]}]},
 {"text":"Leo pidió una resonancia de rutina.","shots":[{"scene":"mri","cam":F(540,900)}]},
 {"text":"Cuando la vio, pensó que la máquina estaba rota.","shots":[LEO("shock",0)]},
 {"text":"Ana pensó que habían cargado la imagen de otra persona.","shots":[ANA("confused",2.0)]},
 {"text":"Pero no. La cabeza del hombre estaba casi vacía. Llena de líquido. Y su cerebro... era una capa finita, aplastada contra el cráneo.","shots":[{"scene":"scan","flash":True,"cam":F(540,800),"do":[{"on":"vacía","target":"sc","value":1,"dur":1.2,"sfx":"ding"}]},{"scene":"scan","from":"capa","cam":{"x":700,"y":700,"z":1.6,"move":"push"},"do":[{"at":0,"target":"sc","value":1,"dur":0.01}]}]},
 {"text":"De bebé había tenido hidrocefalia: el líquido que protege al cerebro no se drenaba bien y se iba acumulando.","shots":[{"scene":"bebe","cam":F(540,800)},{"scene":"liquido","from":"líquido","cam":F(540,820),"do":[{"on":"acumulando","target":"f","value":0.5,"dur":1.4}]}]},
 {"text":"Le habían puesto un tubo para sacarlo. Pero con los años, el líquido siguió empujando, despacio, durante décadas.","shots":[{"scene":"liquido","cam":F(540,820),"do":[{"at":0,"target":"f","value":0.5,"dur":0.01},{"on":"siguió","target":"f","value":1,"dur":3.0}]}]},
 {"text":"Y acá está lo increíble. Como pasó tan lento, su cerebro se fue adaptando.","shots":[H("","serious",1.2),{"scene":"adapta","from":"Como","cam":F(540,820),"do":[{"on":"adaptando","target":"n","value":0.4,"dur":1.0}]}]},
 {"text":"Las funciones se reacomodaron en el espacio que quedaba. Las neuronas que sobrevivieron aprendieron a hacer el trabajo de las que faltaban.","shots":[{"scene":"adapta","cam":F(540,820,1.1,"drift"),"do":[{"at":0,"target":"n","value":0.4,"dur":0.01},{"on":"neuronas","target":"n","value":1,"dur":2.4,"sfx":"pop"}]}]},
 {"text":"Se llama plasticidad cerebral.","shots":[TSHOT()]},
 {"text":"Y este caso dio la vuelta al mundo porque demostró lo que el cerebro es capaz de hacer para no rendirse.","shots":[{"scene":"mundo","cam":F(540,820),"do":[{"on":"mundo","target":"k","pop":True,"sfx":"pop"}]}]},
 {"text":"Le volvimos a drenar el líquido y su pierna mejoró.","shots":[{"scene":"hombre","cam":ON("h","close"),"do":[{"at":0,"target":"h","expr":"happy"}]}]},
 {"text":"Leo todavía no lo puede creer.","shots":[LEO("confused",0)]},
 {"text":"Yo le dije: tranquilo. Conozco gente con el cerebro completo que lo usa bastante menos.","shots":[H("","smirk",3.0,{"armR":[14,92],"handR":"open"})]},
]
save('ep12_hidro','Doctor_ep12','El hombre que vivía casi sin cerebro','../audios/medico_2.m4a',sc,beats)

# ======================= EP 13 – GAGE =======================
sc={
 "vias":{"bg":"railroad","sepia":True,"actors":[ACT("gage",x=540,y=2350,s=1.8,expr="neutral",i="g")],"props":[{"id":"bum","type":"burst","x":540,"y":1300,"s":1.0,"value":0,"hidden":True,"z":5}]},
 "gageC":{"bg":"railroad","sepia":True,"actors":[ACT("gage",x=540,y=2500,s=2.3,expr="neutral",i="g")]},
 "rayos":MG("#20242c","#08090c",[{"id":"x","type":"skullbar","x":540,"y":800,"s":1.15,"value":0}]),
 "frontal":MG("#3b2a5e","#120c22",[{"id":"br","type":"brain","x":540,"y":820,"s":1.35,"zone":[-200,-60],"glow":0}]),
 "freno":MG("#5e1a2a","#1d0810",[IC("i",[["brake","",""],["wheel","",""]],y=800,cols=2,value=0)]),
 "cambio":MG("#20242c","#08090c",[K("k1","IMPULSIVO",500,110,"#ff4d5e"),K("k2","GROSERO",800,110,"#ff4d5e"),K("k3","SIN TERMINAR NADA",1100,84,"#ff4d5e")]),
 "corazon":MG("#5e1a2a","#1d0810",[IC("i",[["heart","CORAZÓN","x"],["brain","CEREBRO","ok"]],y=800,cols=2,value=0)]),
 "barra":{"bg":"railroad","sepia":True,"actors":[ACT("gage",x=480,y=2400,s=2.0,expr="happy",pose={"armL":[10,-20],"handL":"grip"},i="g")],"props":[{"id":"b","type":"ironbar","x":700,"y":1400,"s":0.85,"r":-8,"z":2}]},
 "titulo":MG("#20242c","#08090c",[{"id":"t","type":"title2","x":540,"y":760,"s":1.0,"value":0,"l1":"SUS AMIGOS DECÍAN","l2":"GAGE YA","l3":"NO ES GAGE"}]),
}
beats=[
 {"text":"Este es el caso que todo médico estudia.","shots":[H("","serious",1.6)]},
 {"text":"1848. Un capataz llamado Phineas Gage trabajaba con explosivos en las vías del tren.","shots":[{"scene":"vias","flash":True,"cam":F(540,1000,1.0,"push")},{"scene":"gageC","from":"Phineas","cam":ON("g","close")}]},
 {"text":"Una chispa. Una explosión.","shots":[{"scene":"vias","cam":F(540,1100,1.0,"crash"),"do":[{"on":"explosión","target":"bum","show":True,"dur":0.05},{"on":"explosión","target":"bum","value":1,"dur":0.8,"camshake":22,"sfx":"thud"}]}]},
 {"text":"Y una barra de hierro de más de un metro le entró por la mejilla... y le salió por arriba de la cabeza.","shots":[{"scene":"rayos","cam":F(540,800),"do":[{"on":"entró","target":"x","value":1,"dur":1.6,"sfx":"thud"}]}]},
 {"text":"Ana dijo que tenía que haber muerto en el acto.","shots":[ANA("shock",1.8)]},
 {"text":"Leo dijo que mínimo quedaba en coma.","shots":[LEO("worried",1.4)]},
 {"text":"Pero minutos después, Phineas estaba sentado... hablando. Sobrevivió.","shots":[{"scene":"gageC","cam":ON("g","face"),"do":[{"on":"hablando","target":"g","talk":1.8,"expr":"neutral"}]}]},
 {"text":"El problema vino después. Sus amigos decían: Gage ya no es Gage.","shots":[H("","serious"),{"scene":"titulo","from":"Sus","cam":F(540,800),"do":[{"on":"Gage","target":"t","value":1,"dur":0.45,"camshake":12,"sfx":"thud"}]}]},
 {"text":"La barra destruyó una parte de su lóbulo frontal, la zona que está justo detrás de la frente.","shots":[{"scene":"frontal","flash":True,"cam":F(540,820),"do":[{"on":"frontal","target":"br","glow":1,"dur":0.5,"sfx":"pop"}]}]},
 {"text":"Esa zona es como el freno y el volante de tu personalidad.","shots":[{"scene":"freno","cam":F(540,800),"do":[{"on":"freno","target":"i","value":1,"dur":0.3,"sfx":"pop"},{"on":"volante","target":"i","value":2,"dur":0.3,"sfx":"pop"}]}]},
 {"text":"Te ayuda a controlar impulsos, a pensar antes de hablar, a planear, a respetar a los demás.","shots":[{"scene":"frontal","cam":{"x":360,"y":760,"z":1.4,"move":"push"},"do":[{"at":0,"target":"br","glow":1,"dur":0.01}]}]},
 {"text":"Phineas había sido un hombre responsable y respetado.","shots":[{"scene":"gageC","cam":ON("g","close","drift"),"do":[{"at":0,"target":"g","expr":"happy"}]}]},
 {"text":"Después del accidente se volvió impulsivo, grosero, incapaz de terminar lo que empezaba.","shots":[{"scene":"cambio","cam":F(540,800),"do":[{"on":"impulsivo","target":"k1","pop":True,"sfx":"pop"},{"on":"grosero","target":"k2","pop":True,"sfx":"pop"},{"on":"incapaz","target":"k3","pop":True,"sfx":"pop"}]}]},
 {"text":"Su caso le enseñó al mundo algo que hoy parece obvio: que la personalidad no está en el corazón... está en el cerebro.","shots":[{"scene":"corazon","cam":F(540,800),"do":[{"on":"corazón","target":"i","value":1,"dur":0.3,"sfx":"pop"},{"on":"cerebro","target":"i","value":2,"dur":0.3,"sfx":"ding"}]}]},
 {"text":"Vivió doce años más. Y la barra lo acompañó a todas partes, como su posesión más preciada.","shots":[{"scene":"barra","cam":ON("g","medium","drift")}]},
 {"text":"Ana me preguntó qué aprendimos de él.","shots":[ANA("think",1.6)]},
 {"text":"Le dije: que se puede sobrevivir a un hierro en la cabeza... pero no a perder el filtro.","shots":[H("","smirk",3.0,{"armR":[14,92],"handR":"open"})]},
]
save('ep13_gage','Doctor_ep13','El hombre al que una barra le atravesó la cabeza','../audios/medico_3.m4a',sc,beats)

# ======================= EP 14 – PROSOPAGNOSIA =======================
sc={
 "fiesta":{"bg":"party","actors":[ACT("hombre",x=1350,y=2350,s=1.8,expr="neutral",i="h"),ACT("mujer",x=420,y=2350,s=1.75,expr="happy",i="m")]},
 "fiestaC":{"bg":"party","actors":[ACT("mujer",x=540,y=2450,s=2.1,expr="happy",i="m")]},
 "hombreC":{"bg":"officeB","actors":[ACT("hombre",x=540,y=2420,s=2.0,expr="worried",i="h")]},
 "vista":MG("#1a4a6e","#0a1a2a",[IC("i",[["eye","VISTA PERFECTA","ok"]],y=800,s=2.0,ring="#3ddc84")]),
 "foto":{"bg":"officeB","actors":[ACT("hombre",x=540,y=2420,s=2.0,expr="confused",i="h")],"props":[{"id":"f","type":"photo","x":540,"y":1500,"s":0.9,"value":0.25,"z":3}]},
 "zona":MG("#3b2a5e","#120c22",[{"id":"br","type":"brain","x":540,"y":820,"s":1.35,"zone":[150,110],"glow":0}]),
 "puzzle":MG("#1a3a6e","#0a1428",[{"id":"p","type":"facepuzzle","x":540,"y":780,"s":1.0,"value":0}]),
 "mama":MG("#5e1a4a","#1d0818",[IC("i",[["face","MAMÁ",""],["face","MI JEFE",""]],y=800,cols=2,value=0)]),
 "roto":MG("#20242c","#08090c",[{"id":"p","type":"facepuzzle","x":540,"y":780,"s":1.0,"value":0.15}]),
 "titulo":TITLE("SE LLAMA","PROSOPAGNOSIA",c1="#3b2a5e",c2="#120c22"),
 "pistas":MG("#1a5e3a","#08180f",[IC("i",[["voice","VOZ",""],["hair","PELO",""],["walk","CAMINAR",""],["perfume","PERFUME",""]],y=820,cols=2,value=0,gap=460)]),
}
beats=[
 {"text":"Un hombre llegó preocupado.","shots":[{"scene":"hombreC","cam":ON("h","close")}]},
 {"text":"En una fiesta había pasado al lado de su esposa... y no la reconoció.","shots":[{"scene":"fiesta","flash":True,"cam":F(540,1000,1.0,"panL"),"do":[{"at":0,"target":"h","move":{"x":250,"dur":2.6}},{"at":0.3,"target":"m","look":[0.9,0]}]}]},
 {"text":"Le habló como a una desconocida.","shots":[{"scene":"fiestaC","cam":ON("m","face"),"do":[{"at":0,"target":"m","expr":"shock"}]}]},
 {"text":"Ana dijo que tenía un problema en la vista. Le hicimos un examen: veía perfecto.","shots":[ANA("think",1.8),{"scene":"vista","from":"Le","cam":F(540,820)}]},
 {"text":"Leo dijo que era pérdida de memoria. Recordaba todo sin problema.","shots":[LEO("serious",1.6),{"scene":"hombreC","from":"Recordaba","cam":ON("h","close"),"do":[{"at":0,"target":"h","talk":1.2}]}]},
 {"text":"Entonces le mostré una foto de su propia cara.","shots":[H("","serious",1.4)]},
 {"text":"La miró un rato largo... y me preguntó quién era.","shots":[{"scene":"foto","cam":{"x":540,"y":1300,"z":1.2,"move":"push"}},{"scene":"foto","from":"preguntó","cam":ON("h","face"),"do":[{"on":"preguntó","target":"h","talk":1.0}]}]},
 {"text":"Había tenido un pequeño derrame semanas antes.","shots":[{"scene":"zona","cam":F(540,820),"do":[{"on":"derrame","target":"br","glow":1,"dur":0.4,"sfx":"thud"}]}]},
 {"text":"Nuestro cerebro tiene una zona especializada solo en reconocer caras. Está en la parte de abajo, cerca de la nuca.","shots":[{"scene":"zona","flash":True,"cam":F(540,820),"do":[{"at":0,"target":"br","glow":0,"dur":0.01},{"on":"caras","target":"br","glow":1,"dur":0.4,"sfx":"pop"}]},{"scene":"zona","from":"abajo","cam":{"x":700,"y":940,"z":1.6,"move":"push"},"do":[{"at":0,"target":"br","glow":1,"dur":0.01}]}]},
 {"text":"Esa zona no mira ojos, nariz y boca por separado: los une en un todo,","shots":[{"scene":"puzzle","cam":F(540,820),"do":[{"on":"une","target":"p","value":1,"dur":0.8,"sfx":"pop"}]}]},
 {"text":"y en una fracción de segundo te dice: esa es mamá, ese es mi jefe.","shots":[{"scene":"mama","cam":F(540,800),"do":[{"on":"mamá","target":"i","value":1,"dur":0.3,"sfx":"pop"},{"on":"jefe","target":"i","value":2,"dur":0.3,"sfx":"pop"}]}]},
 {"text":"En él, el derrame había dañado justo esa zona.","shots":[{"scene":"zona","cam":F(540,820,1.1),"do":[{"at":0,"target":"br","glow":1,"dur":0.01},{"on":"dañado","target":"br","burst":1,"dur":0.3,"sfx":"thud"}]}]},
 {"text":"Veía cada parte de la cara con detalle... pero su cerebro no podía armar el rompecabezas.","shots":[{"scene":"roto","cam":F(540,800,1.0,"drift")}]},
 {"text":"Se llama prosopagnosia, o ceguera para las caras.","shots":[TSHOT()]},
 {"text":"Y lo más sorprendente: hay personas que nacen así, y muchas nunca se enteran.","shots":[{"scene":"mundo2","cam":F(540,820)}]},
 {"text":"Aprendió a reconocer a la gente por la voz, el pelo, la forma de caminar. A su esposa, por su perfume.","shots":[{"scene":"pistas","cam":F(540,820),"do":[{"on":"voz","target":"i","value":1,"dur":0.3,"sfx":"pop"},{"on":"pelo","target":"i","value":2,"dur":0.3,"sfx":"pop"},{"on":"caminar","target":"i","value":3,"dur":0.3,"sfx":"pop"},{"on":"perfume","target":"i","value":4,"dur":0.3,"sfx":"pop"}]}]},
 {"text":"Leo me preguntó si es grave.","shots":[LEO("worried",1.2)]},
 {"text":"Le dije: depende. Si tu suegra se corta el pelo... es lo mejor que te puede pasar.","shots":[H("","smirk",3.2,{"armR":[14,92],"handR":"open"})]},
]
sc["mundo2"]=MG("#1a2a5e","#080c22",[{"id":"g","type":"globe","x":540,"y":800,"s":1.25,"value":1},K("k","1 DE CADA 50",1300,90,"#ffcf3a")])
for b in beats:
  for s in b['shots']:
    if s['scene']=='mundo2': s['do']=[{"on":"nacen","target":"k","pop":True,"sfx":"pop"}]
save('ep14_caras','Doctor_ep14','El hombre que no reconocía a su esposa','../audios/medico_4.m4a',sc,beats)
print('ok')

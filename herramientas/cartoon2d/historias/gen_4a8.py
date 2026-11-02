import sys; sys.path.insert(0,'historias')
from _gen import *
# ======================= EP 4 – MANO AJENA =======================
TIED={"armL":[4,-20],"handL":"fist"}
sc={
 "casa":{"bg":"kitchen","actors":[ACT("hombre",x=540,y=2380,s=1.8,expr="worried",pose=TIED,i="h")]},
 "boton":{"bg":"bedroom","actors":[ACT("hombre",x=540,y=2700,s=2.6,expr="neutral",pose={"reachR":[-10,-640],"reachL":[30,-600],"handR":"grip","handL":"grip"},i="h")]},
 "agarra":{"bg":"kitchen","actors":[ACT("hombre",x=500,y=2420,s=2.0,expr="surprised",pose={"armL":[40,60],"handL":"grip"},i="h")],"props":[{"id":"taza","type":"icons","x":860,"y":1080,"s":0.55,"items":[["cup","",""]],"ik":0.9,"ring":"#ffcf3a"}]},
 "cafe":{"bg":"kitchen","actors":[ACT("esposa",x=600,y=2400,s=1.95,expr="neutral",i="e")],"props":[{"id":"sp","type":"icons","x":560,"y":1180,"s":1.0,"hidden":True,"items":[["coffee","",""]],"ring":"#ff4d5e","z":5}]},
 "hist":{"bg":"desk","props":[{"id":"r","type":"report","x":540,"y":800,"s":1.6,"rot":-3,"value":0,"title":"HISTORIAL","rows":[["Epilepsia","grave"],["Convulsiones","diarias"],["Cirugía","cerebro"]],"result":["","CALLOSOTOMÍA","#ff4d5e"]}]},
 "mitades":MG("#2a3a6e","#0c1430",[{"id":"b","type":"brainhalves","x":540,"y":780,"s":1.25,"cut":0,"signal":-1},K("k","CUERPO CALLOSO",1300,84,"#ffcf3a")]),
 "cruce":MG("#2a3a6e","#0c1430",[{"id":"c","type":"crossbody","x":540,"y":860,"s":1.05,"value":0,"cut":0}]),
 "senal":MG("#3b2a5e","#120c22",[{"id":"b","type":"brainhalves","x":540,"y":780,"s":1.25,"cut":1,"signal":1}]),
 "titulo":TITLE("SÍNDROME DE LA","MANO AJENA",c1="#3b2a5e",c2="#120c22"),
 "pelota":{"bg":"officeB","actors":[ACT("hombre",x=540,y=2420,s=2.0,expr="happy",pose={"armL":[10,-30],"handL":"grip"},i="h")],"props":[{"id":"ball","type":"icons","x":610,"y":1470,"s":0.32,"items":[["ball","",""]],"ring":"#ffcf3a","z":3}]},
}
beats=[
 {"text":"Un hombre llegó con la mano izquierda atada a la cintura con su propio cinturón.","shots":[
   {"scene":"casa","cam":F(540,960,1.0,"push")},{"scene":"casa","from":"atada","cam":{"x":620,"y":1430,"z":2.0,"move":"push"}}]},
 {"text":"Nos contó que mientras se abotonaba la camisa con la derecha, la izquierda se la desabotonaba.","shots":[
   {"scene":"boton","cam":ON("h","medium"),"do":[
     {"on":"abotonaba","target":"h","arms":{"reachR":[-10,-560]},"dur":0.4},{"on":"camisa","target":"h","arms":{"reachR":[-10,-640]},"dur":0.4},
     {"on":"izquierda","target":"h","arms":{"reachL":[60,-520]},"dur":0.3,"expr":"surprised","sfx":"pop"},{"on":"desabotonaba","target":"h","arms":{"reachL":[90,-600]},"dur":0.3}]}]},
 {"text":"Que agarraba cosas sin que él quisiera.","shots":[{"scene":"agarra","cam":F(640,900,1.05,"panR"),"do":[{"on":"agarraba","target":"h","arms":{"reachL":[230,-500],"handL":"grip"},"dur":0.4,"sfx":"pop"},{"on":"quisiera","target":"h","expr":"shock"}]}]},
 {"text":"Una noche le tiró el café encima a su esposa.","shots":[{"scene":"cafe","cam":ON("e","close"),"do":[{"on":"café","target":"sp","pop":True,"sfx":"thud","camshake":12},{"on":"café","target":"e","expr":"shock","jolt":True}]}]},
 {"text":"Leo dijo que era un problema psiquiátrico.","shots":[LEO("serious",1.8)]},
 {"text":"Ana pensó que quería una excusa para no lavar los platos.","shots":[ANA("smug",2.2,{"armL":[10,52],"handL":"open"})]},
 {"text":"Revisé su historial.","shots":[H("","serious")]},
 {"text":"Años atrás, por una epilepsia muy grave, le habían hecho una cirugía en el cerebro.","shots":[{"scene":"hist","cam":F(540,850),"do":[{"on":"epilepsia","target":"r","value":0.6,"dur":0.8,"sfx":"tick"},{"on":"cirugía","target":"r","value":1,"dur":0.6,"sfx":"ding"}]}]},
 {"text":"Nuestro cerebro tiene dos mitades. Y están conectadas por un puente de millones de fibras llamado cuerpo calloso.","shots":[
   {"scene":"mitades","flash":True,"cam":F(540,800,1.0,"push")},
   {"scene":"mitades","from":"puente","cam":{"x":540,"y":800,"z":1.6,"move":"push"},"do":[{"on":"calloso","target":"k","pop":True,"sfx":"pop"}]}]},
 {"text":"Para frenar las convulsiones, los cirujanos cortaron ese puente.","shots":[{"scene":"mitades","cam":F(540,800,1.2,"push"),"do":[{"on":"cortaron","target":"b","cut":1,"dur":0.6,"sfx":"thud","camshake":10},{"at":0,"target":"k","hide":True,"dur":0.01}]}]},
 {"text":"El problema es que cada mitad controla el lado opuesto del cuerpo.","shots":[{"scene":"cruce","cam":F(540,860),"do":[{"on":"mitad","target":"c","value":1,"dur":0.8,"sfx":"pop"},{"on":"opuesto","target":"c","value":2,"dur":0.8,"sfx":"pop"}]}]},
 {"text":"La mitad derecha mueve la mano izquierda... pero ya no puede avisarle a la otra mitad lo que está haciendo.","shots":[
   {"scene":"cruce","cam":{"x":300,"y":1000,"z":1.3,"move":"push"},"do":[{"at":0,"target":"c","value":2,"cut":1,"dur":0.01}]},
   {"scene":"senal","from":"pero","cam":F(540,800)}]},
 {"text":"Así que la mano izquierda hacía cosas, y él se enteraba recién cuando las veía.","shots":[
   {"scene":"agarra","cam":{"x":700,"y":1200,"z":1.6,"move":"drift"},"do":[{"on":"hacía","target":"h","arms":{"reachL":[200,-560]},"dur":0.5}]},
   {"scene":"agarra","from":"enteraba","cam":ON("h","face"),"do":[{"on":"veía","target":"h","look":[0.8,0.3],"expr":"shock"}]}]},
 {"text":"Se llama síndrome de la mano ajena.","shots":[TSHOT()]},
 {"text":"Le recomendamos algo simple: tener siempre un objeto en esa mano, para mantenerla ocupada.","shots":[
   H("","serious",1.5),{"scene":"pelota","from":"objeto","cam":ON("h","medium"),"do":[{"on":"ocupada","target":"h","look":[0.6,0.6]}]}]},
 {"text":"Con el tiempo, muchas veces mejora.","shots":[{"scene":"pelota","cam":ON("h","close","drift")}]},
 {"text":"Leo me preguntó qué se siente.","shots":[LEO("confused",1.4)]},
 {"text":"Le dije: imaginate tener un compañero de cuarto... que vive dentro de tu brazo.","shots":[H("","smirk",3.4,{"armR":[14,92],"handR":"open"}),{"scene":"agarra","from":"vive","cam":ON("h","medium","pull"),"do":[{"at":0,"target":"h","expr":"confused","arms":{"armL":[110,40],"handL":"open"},"dur":0.4}]}]},
]
save('ep4_mano','Doctor_ep4','La mano que tenía vida propia','../audios/doctor_4.m4a',sc,beats)

# ======================= EP 5 – COTARD =======================
sc={
 "consulta":{"bg":"officeB","actors":[ACT("muerto",x=540,y=2420,s=2.0,expr={"mood":"neutral","lid":0.45},i="m")]},
 "nocome":{"bg":"desk","props":[{"id":"bandeja","type":"tray","x":540,"y":900,"s":1.45,"value":3},{"id":"x","type":"xmark","x":540,"y":880,"s":1.6,"hidden":True,"z":5}]},
 "ducha":{"bg":"bathroom","props":[{"id":"x","type":"xmark","x":540,"y":800,"s":1.8,"hidden":True,"z":5}]},
 "cementerio":{"bg":"cemetery","warm":0.3,"cool":1.2,"actors":[ACT("muerto",x=560,y=2250,s=1.6,expr={"mood":"sad","lid":0.5},i="m")]},
 "pulso":{"bg":"officeA","actors":[ACT("leo",x=380,y=2450,s=2.0,expr="happy",pose={"propR":"notebook","armR":[8,-116],"armL":[40,60],"handL":"open"},i="leo"),ACT("muerto",x=800,y=2450,s=2.0,expr={"lid":0.45},i="m")],"props":[{"id":"mon","type":"monitor","x":560,"y":520,"s":0.9,"z":2}]},
 "depre":{"bg":"bedroom","bgOpts":{"night":True},"actors":[ACT("muerto",x=540,y=2350,s=1.75,expr="sad",i="m")]},
 "pet":MG("#20242c","#08090c",[{"id":"p","type":"pet","x":540,"y":800,"s":1.25,"act":1}]),
 "compara":MG("#20242c","#08090c",[{"id":"a","type":"pet","x":290,"y":760,"s":0.75,"act":1,"label":"NORMAL"},{"id":"b","type":"pet","x":790,"y":760,"s":0.75,"act":0.05,"label":"ÉL"},K("k","COMO EN COMA",1250,90,"#4fd1ff")]),
 "yo":MG("#3b2a5e","#120c22",[{"id":"s","type":"selflink","x":540,"y":820,"s":0.95,"link":1}]),
 "muerte":MG("#20242c","#08090c",[{"id":"i","type":"icons","x":540,"y":760,"s":2.0,"items":[["tomb","",""]],"ring":"#ff4d5e"},K("k","ESTOY MUERTO",1250,110,"#ff4d5e")]),
 "titulo":TITLE("SÍNDROME","DE COTARD",c1="#20242c",c2="#08090c"),
 "depre2":MG("#2a3a6e","#0c1430",[{"id":"i","type":"icons","x":540,"y":800,"s":2.0,"items":[["cloud","DEPRESIÓN GRAVE",""]],"value":0}]),
 "familia":{"bg":"kitchen","actors":[ACT("muerto",x=330,y=2350,s=1.75,expr="happy",i="m"),ACT("madre",x=760,y=2350,s=1.75,expr="happy",i="f")]},
}
beats=[
 {"text":"Un hombre se sentó frente a mí y me dijo, muy tranquilo: doctor, yo estoy muerto.","shots":[
   {"scene":"consulta","cam":ON("m","medium")},{"scene":"consulta","from":"doctor","cam":ON("m","face"),"do":[{"on":"doctor","target":"m","talk":1.6}]}]},
 {"text":"No comía porque decía que no lo necesitaba.","shots":[{"scene":"nocome","cam":F(540,900),"do":[{"on":"comía","target":"x","pop":True,"sfx":"boing","vol":0.6}]}]},
 {"text":"No se bañaba porque decía que no tenía sentido.","shots":[{"scene":"ducha","cam":F(540,900),"do":[{"on":"bañaba","target":"x","pop":True,"sfx":"boing","vol":0.6}]}]},
 {"text":"Pasaba horas en el cementerio, porque sentía que ahí era donde tenía que estar.","shots":[{"scene":"cementerio","flash":True,"cam":F(560,900,1.0,"push")},{"scene":"cementerio","from":"sentía","cam":ON("m","face","drift")}]},
 {"text":"Ana pensó que era una broma.","shots":[ANA("smug",1.4)]},
 {"text":"Leo le tomó el pulso, le mostró que su corazón latía.","shots":[{"scene":"pulso","cam":{"on":["leo","m"],"shot":"medium","move":"drift"},"do":[{"at":0,"target":"leo","talk":2.0},{"at":0,"target":"m","look":[-0.6,-0.5]}]}]},
 {"text":"Él respondió: eso no prueba nada.","shots":[{"scene":"pulso","cam":ON("m","face"),"do":[{"on":"eso","target":"m","talk":1.4}]}]},
 {"text":"Venía de pasar por una depresión muy profunda.","shots":[{"scene":"depre","cam":ON("m","close","push")}]},
 {"text":"Le hicimos un estudio de su actividad cerebral.","shots":[{"scene":"pet","cam":F(540,800),"do":[{"at":0.3,"target":"p","act":0.05,"dur":1.6}]}]},
 {"text":"El resultado nos dejó helados. Varias zonas de su cerebro trabajaban tan poco... como las de una persona en coma.","shots":[
   H("","shock"),{"scene":"compara","from":"Varias","cam":F(540,800),"do":[{"on":"coma","target":"k","pop":True,"sfx":"ding"}]}]},
 {"text":"Justamente las zonas que nos hacen sentir que existimos: las que conectan lo que pasa en el cuerpo con la sensación de ser uno mismo.","shots":[{"scene":"yo","flash":True,"cam":F(540,820,1.0,"push")}]},
 {"text":"Si esa conexión se apaga, tu cerebro recibe la señal de que estás vivo... pero ya no la siente como tuya.","shots":[{"scene":"yo","cam":F(540,820,1.1,"drift"),"do":[{"on":"apaga","target":"s","link":0,"dur":0.8,"sfx":"thud"}]}]},
 {"text":"Y busca una explicación: estoy muerto.","shots":[{"scene":"muerte","cam":F(540,800),"do":[{"on":"estoy","target":"k","pop":True,"camshake":10,"sfx":"thud"}]}]},
 {"text":"Se llama síndrome de Cotard.","shots":[TSHOT()]},
 {"text":"Es rarísimo, y casi siempre aparece junto a una depresión grave.","shots":[{"scene":"depre2","cam":F(540,820),"do":[{"on":"depresión","target":"i","value":1,"dur":0.4,"sfx":"pop"}]}]},
 {"text":"Con medicación y terapia, su cerebro se fue encendiendo otra vez.","shots":[{"scene":"pet","cam":F(540,800),"do":[{"at":0,"target":"p","act":0.05,"dur":0.01},{"on":"encendiendo","target":"p","act":1,"dur":1.4,"sfx":"ding"}]}]},
 {"text":"Volvió a comer, a bañarse, a ver a su familia.","shots":[{"scene":"familia","cam":{"on":["m","f"],"shot":"medium","move":"drift"},"do":[{"at":0.2,"target":"m","look":[0.8,0]},{"at":0.2,"target":"f","look":[-0.8,0]}]}]},
 {"text":"Un día volvió al consultorio y me dijo: doctor, creo que estoy vivo.","shots":[{"scene":"consulta","cam":ON("m","close"),"do":[{"at":0,"target":"m","expr":"happy"},{"on":"doctor","target":"m","talk":1.6}]}]},
 {"text":"Le dije: lamentablemente, sí. Ahora le toca pagar la consulta.","shots":[H("","smirk",3.2,{"armR":[14,92],"handR":"open"})]},
]
save('ep5_cotard','Doctor_ep5','El hombre que juraba estar muerto','../audios/doctor_5.m4a',sc,beats)

# ======================= EP 6 – AGUA =======================
HIV={"hives":1}
sc={
 "chica":{"bg":"er","actors":[ACT("chica",x=540,y=2420,s=2.1,expr={"mood":"sad","browL":-12,"browR":-12,"hives":1},i="c")]},
 "bano":{"bg":"bathroom","actors":[ACT("chica",x=330,y=2350,s=1.75,expr={"mood":"sad","hives":0},i="c")]},
 "jabon":MG("#5e1a4a","#1d0818",[{"id":"i","type":"icons","x":540,"y":800,"s":2.0,"items":[["soap","JABÓN","x"]],"marks":0}]),
 "cloro":MG("#1a3a6e","#0a1428",[{"id":"i","type":"icons","x":540,"y":800,"s":2.0,"items":[["chlorine","CLORO","x"]],"marks":0}]),
 "llanto":{"bg":"bedroom","actors":[ACT("chica",x=540,y=2650,s=2.6,expr={"mood":"sad","browL":-14,"browR":-14,"tears":0,"hives":0},i="c")]},
 "brazo":MG("#3b1a2a","#120810",[{"id":"s","type":"skinlayer","x":540,"y":820,"s":1.0,"value":0}]),
 "agua":MG("#1a4a6e","#0a1a2a",[{"id":"i","type":"icons","x":540,"y":620,"s":1.15,"cols":2,"gap":440,"items":[["soap","JABÓN","x"],["chlorine","CLORO","x"]],"value":2,"marks":0},
   {"id":"d","type":"icons","x":540,"y":1240,"s":1.3,"items":[["drop","AGUA","ok"]],"ring":"#3ddc84","hidden":True}]),
 "todas":MG("#1a4a6e","#0a1a2a",[{"id":"i","type":"icons","x":540,"y":820,"s":1.15,"cols":2,"gap":460,"gapy":520,"items":[["shower","DUCHA",""],["rain","LLUVIA",""],["sweat","SUDOR",""],["tear","LÁGRIMAS",""]],"value":0}]),
 "titulo":TITLE("URTICARIA","ACUAGÉNICA",c1="#1a4a6e",c2="#0a1a2a"),
 "duda":MG("#2a3a6e","#0c1430",[{"id":"q","type":"qmark","x":540,"y":800,"s":2.2},K("k","CASI NO HAY CASOS",1300,84,"#ffcf3a")]),
 "piel":MG("#3b1a2a","#120810",[{"id":"s","type":"skinlayer","x":540,"y":800,"s":1.0,"value":0}]),
 "beber":MG("#1a4a6e","#0a1a2a",[{"id":"i","type":"icons","x":540,"y":800,"s":2.0,"items":[["glass","TOMAR AGUA","ok"]],"ring":"#3ddc84","marks":0}]),
 "trat":MG("#1a5e3a","#08180f",[{"id":"i","type":"icons","x":540,"y":820,"s":0.98,"cols":3,"gap":330,"items":[["pill","ANTIALÉRGICOS",""],["cream","CREMAS",""],["timer","< 1 MINUTO",""]],"value":0,"ls":38}]),
 "lluvia":MG("#2a3a6e","#0c1430",[{"id":"i","type":"icons","x":540,"y":800,"s":2.0,"items":[["rain","",""]]}]),
}
beats=[
 {"text":"Una chica de 15 años llegó con ronchas rojas por todo el cuerpo.","shots":[{"scene":"chica","cam":ON("c","medium")},{"scene":"chica","from":"ronchas","cam":ON("c","face")}]},
 {"text":"Le picaban, le ardían, y aparecían siempre igual: después de bañarse.","shots":[
   {"scene":"chica","cam":ON("c","close","drift"),"do":[{"on":"picaban","target":"c","arms":{"reachR":[-40,-560],"handR":"open"},"dur":0.3}]},
   {"scene":"bano","from":"después","cam":F(540,900,1.0,"push"),"do":[{"on":"bañarse","target":"c","expr":{"mood":"sad","hives":1},"dur":1.0}]}]},
 {"text":"Ana dijo que era alergia al jabón.","shots":[ANA("think",1.6)]},
 {"text":"Cambiaron el jabón. Las ronchas seguían.","shots":[{"scene":"jabon","cam":F(540,800),"do":[{"on":"seguían","target":"i","marks":9,"dur":0.01,"sfx":"boing","vol":0.6}]}]},
 {"text":"Leo dijo que era el cloro del agua.","shots":[LEO("think",1.6)]},
 {"text":"Usaron agua filtrada. Seguían.","shots":[{"scene":"cloro","cam":F(540,800),"do":[{"on":"Seguían","target":"i","marks":9,"dur":0.01,"sfx":"boing","vol":0.6}]}]},
 {"text":"Entonces le pedí que llorara.","shots":[H("","smug",1.4)]},
 {"text":"Bueno... le pusimos una película triste.","shots":[{"scene":"llanto","cam":ON("c","close"),"do":[{"on":"película","target":"c","expr":{"mood":"sad","browL":-14,"browR":-14,"tears":1},"dur":1.2}]}]},
 {"text":"Donde caían sus lágrimas, aparecían ronchas.","shots":[{"scene":"llanto","cam":ON("c","face"),"do":[{"on":"aparecían","target":"c","expr":{"mood":"sad","tears":1,"hives":1},"dur":0.8,"sfx":"pop"}]}]},
 {"text":"Le pusimos un paño con agua pura en el brazo. A los pocos minutos: ronchas.","shots":[{"scene":"brazo","cam":F(540,820),"do":[{"on":"ronchas","target":"s","value":5,"dur":0.6,"sfx":"pop"}]}]},
 {"text":"No era el jabón. No era el cloro. Era el agua.","shots":[{"scene":"agua","flash":True,"cam":F(540,900),"do":[{"on":"jabón","target":"i","marks":1,"dur":0.01,"sfx":"pop"},{"on":"cloro","target":"i","marks":2,"dur":0.01,"sfx":"pop"},{"on":"agua","target":"d","pop":True,"sfx":"ding","lead":0}]}]},
 {"text":"Cualquier agua: la de la ducha, la lluvia, su propio sudor y sus lágrimas.","shots":[{"scene":"todas","cam":F(540,820),"do":[{"on":"ducha","target":"i","value":1,"dur":0.3,"sfx":"pop"},{"on":"lluvia","target":"i","value":2,"dur":0.3,"sfx":"pop"},{"on":"sudor","target":"i","value":3,"dur":0.3,"sfx":"pop"},{"on":"lágrimas","target":"i","value":4,"dur":0.3,"sfx":"pop"}]}]},
 {"text":"Se llama urticaria acuagénica.","shots":[TSHOT()]},
 {"text":"Hay tan pocos casos descritos que todavía no se sabe exactamente por qué pasa.","shots":[{"scene":"duda","cam":F(540,850),"do":[{"on":"casos","target":"k","pop":True,"sfx":"pop"}]}]},
 {"text":"La teoría más aceptada: el agua reacciona con algo en su piel y forma una sustancia que su sistema de defensa toma como un enemigo.","shots":[{"scene":"piel","cam":F(540,820),"do":[{"on":"reacciona","target":"s","value":1,"dur":0.5,"sfx":"pop"},{"on":"defensa","target":"s","value":2,"dur":0.5,"sfx":"pop"}]}]},
 {"text":"Entonces libera histamina... y aparecen las ronchas.","shots":[{"scene":"piel","cam":F(540,840,1.1,"push"),"do":[{"at":0,"target":"s","value":2,"dur":0.01},{"on":"histamina","target":"s","value":3,"dur":0.5,"sfx":"ding"},{"on":"ronchas","target":"s","value":5,"dur":0.6,"sfx":"pop"}]}]},
 {"text":"Lo increíble es que tomar agua, en la mayoría de los casos, no le hace nada. El problema es la piel.","shots":[{"scene":"beber","cam":F(540,800),"do":[{"on":"nada","target":"i","marks":9,"dur":0.01,"sfx":"ding"}]},{"scene":"brazo","from":"problema","cam":F(540,820,1.15,"push"),"do":[{"at":0,"target":"s","value":5,"dur":0.01}]}]},
 {"text":"Con antialérgicos, cremas protectoras y duchas de menos de un minuto, puede tener una vida casi normal.","shots":[{"scene":"trat","cam":F(540,820),"do":[{"on":"antialérgicos","target":"i","value":1,"dur":0.3,"sfx":"pop"},{"on":"cremas","target":"i","value":2,"dur":0.3,"sfx":"pop"},{"on":"duchas","target":"i","value":3,"dur":0.3,"sfx":"pop"}]},
   {"scene":"chica","from":"vida","cam":ON("c","close"),"do":[{"at":0,"target":"c","expr":{"mood":"smile","hives":0},"dur":0.01}]}]},
 {"text":"Leo me preguntó qué pasa si llueve.","shots":[LEO("confused",1.4),{"scene":"lluvia","from":"llueve","cam":F(540,800)}]},
 {"text":"Le dije: lo mismo que a ti cuando ves trabajo: sales corriendo.","shots":[H("","smirk",3.0,{"armR":[14,92],"handR":"open"})]},
]
save('ep6_agua','Doctor_ep6','La chica alérgica al agua','../audios/doctor_6.m4a',sc,beats)

# ======================= EP 7 – DOLOR =======================
sc={
 "calle":{"bg":"street","actors":[ACT("nino2",x=540,y=2350,s=1.9,expr="happy",i="n")],"props":[{"id":"fuego","type":"icons","x":540,"y":1820,"s":0.9,"items":[["fire","",""]],"ring":"#ff8a2a","z":3},{"id":"cu","type":"icons","x":850,"y":1100,"s":0.55,"items":[["knife","",""]],"ring":"#ffcf3a","hidden":True,"z":3}]},
 "ninoC":{"bg":"street","actors":[ACT("nino2",x=540,y=2650,s=2.7,expr="happy",i="n")]},
 "familia":{"bg":"street","actors":[ACT("nino2",x=330,y=2380,s=1.9,expr={"scars":1},i="n"),ACT("nino",x=760,y=2380,s=1.9,expr={"scars":1},i="p")]},
 "cicat":MG("#3b1a2a","#120810",[{"id":"i","type":"icons","x":540,"y":820,"s":1.15,"cols":2,"gap":460,"gapy":520,"items":[["bone","HUESOS ROTOS",""],["tear","CICATRICES",""]],"value":0}]),
 "olfato":MG("#2a3a6e","#0c1430",[{"id":"i","type":"icons","x":540,"y":800,"s":2.0,"items":[["flower","SIN OLFATO","x"]],"marks":0}]),
 "nervio":MG("#3b2a5e","#120c22",[{"id":"n","type":"nerve","x":540,"y":860,"s":1.0,"open":1}]),
 "canal":MG("#3b1a2a","#120810",[{"id":"c","type":"channel","x":540,"y":820,"s":1.0,"open":1}]),
 "adn":MG("#1a3a6e","#0a1428",[{"id":"d","type":"dna","x":540,"y":760,"s":1.0,"value":0}]),
 "nariz":MG("#2a3a6e","#0c1430",[{"id":"i","type":"icons","x":540,"y":800,"s":2.0,"items":[["nose","OLFATO","x"]],"marks":0}]),
 "titulo":TITLE("INSENSIBILIDAD","CONGÉNITA","AL DOLOR",c1="#5e1a2a",c2="#1d0810"),
 "alarma":MG("#5e1a2a","#1d0810",[K("k","¿SUPERPODER?",360,110,"#ffcf3a"),{"id":"i","type":"icons","x":540,"y":900,"s":2.0,"items":[["siren","",""]],"ring":"#ff4d5e","hidden":True}]),
 "triste":{"bg":"street","sepia":True,"warm":0.3,"cool":1.2},
 "ciencia":MG("#1a5e3a","#08180f",[{"id":"i","type":"icons","x":540,"y":820,"s":1.15,"cols":2,"gap":460,"items":[["dna","GEN",""],["pill","ANALGÉSICOS",""]],"value":0}]),
}
beats=[
 {"text":"Me contaron el caso de un niño que trabajaba en la calle haciendo shows.","shots":[{"scene":"calle","cam":F(540,1000,1.0,"push")}]},
 {"text":"Caminaba sobre carbones encendidos.","shots":[{"scene":"calle","cam":{"x":540,"y":1600,"z":1.7,"move":"push"}}]},
 {"text":"Se atravesaba el brazo con cuchillos.","shots":[{"scene":"calle","cam":{"x":700,"y":1150,"z":1.5,"move":"push"},"do":[{"at":0,"target":"n","arms":{"armL":[50,40],"handL":"open"}},{"on":"cuchillos","target":"cu","pop":True,"sfx":"pop"}]}]},
 {"text":"Y sonreía. No era un truco: de verdad no sentía nada.","shots":[{"scene":"ninoC","cam":ON("n","face"),"do":[{"at":0,"target":"n","expr":"happy"}]}]},
 {"text":"Ana dijo que era imposible.","shots":[ANA("shock",1.2)]},
 {"text":"Leo pensó que tenía algún tipo de anestesia natural.","shots":[LEO("think",2.0)]},
 {"text":"Revisamos a su familia. Varios primos tenían lo mismo:","shots":[{"scene":"familia","cam":{"on":["n","p"],"shot":"medium","move":"drift"}}]},
 {"text":"cicatrices por todas partes, huesos rotos que se habían curado solos, lenguas lastimadas de tanto morderlas sin darse cuenta.","shots":[{"scene":"cicat","cam":F(540,820),"do":[{"on":"cicatrices","target":"i","value":2,"dur":0.01},{"at":0,"target":"i","value":0,"dur":0.01},{"on":"cicatrices","target":"i","value":1,"dur":0.3,"sfx":"pop"},{"on":"huesos","target":"i","value":2,"dur":0.3,"sfx":"pop"}]},{"scene":"familia","from":"lenguas","cam":ON("p","face")}]},
 {"text":"Y había una pista más: ninguno podía sentir olores.","shots":[H("","serious"),{"scene":"olfato","from":"ninguno","cam":F(540,800),"do":[{"on":"olores","target":"i","marks":9,"dur":0.01,"sfx":"boing","vol":0.6}]}]},
 {"text":"Cuando te quemás, tus nervios mandan una señal al cerebro.","shots":[{"scene":"nervio","flash":True,"cam":F(540,860)}]},
 {"text":"Para salir, esa señal tiene que pasar por una puerta: un canal diminuto en la punta de los nervios.","shots":[{"scene":"nervio","cam":{"x":300,"y":1260,"z":1.8,"move":"push"}},{"scene":"canal","from":"canal","cam":F(540,820)}]},
 {"text":"Ellos tenían una mutación en el gen que fabrica esa puerta.","shots":[{"scene":"adn","cam":F(540,800),"do":[{"on":"mutación","target":"d","value":1,"dur":0.4,"sfx":"ding"}]}]},
 {"text":"La puerta nunca se abría. La señal de dolor nunca salía.","shots":[{"scene":"canal","cam":F(540,820,1.1),"do":[{"at":0,"target":"c","open":0,"dur":0.3,"sfx":"thud"}]}]},
 {"text":"Y como el olfato usa la misma puerta... tampoco podían oler.","shots":[{"scene":"nariz","cam":F(540,800),"do":[{"on":"oler","target":"i","marks":9,"dur":0.01,"sfx":"boing","vol":0.6}]}]},
 {"text":"Se llama insensibilidad congénita al dolor.","shots":[TSHOT()]},
 {"text":"Suena a superpoder, pero es una de las condiciones más peligrosas que existen.","shots":[{"scene":"alarma","cam":F(540,800),"do":[{"on":"superpoder","target":"k","pop":True,"sfx":"pop"}]}]},
 {"text":"El dolor es la alarma que te salva la vida.","shots":[{"scene":"alarma","cam":F(540,860,1.1),"do":[{"at":0,"target":"k","hide":True,"dur":0.01},{"on":"alarma","target":"i","pop":True,"sfx":"ding"}]}]},
 {"text":"Lamentablemente, aquel niño murió muy joven, después de saltar de un techo para impresionar a sus amigos.","shots":[{"scene":"triste","cam":{"x":540,"y":700,"z":1.0,"to":{"y":1000},"move":"hold"}}]},
 {"text":"Hoy los científicos estudian ese gen para crear analgésicos nuevos.","shots":[{"scene":"ciencia","cam":F(540,820),"do":[{"on":"gen","target":"i","value":1,"dur":0.3,"sfx":"pop"},{"on":"analgésicos","target":"i","value":2,"dur":0.3,"sfx":"pop"}]}]},
 {"text":"Ana me preguntó si yo quisiera no sentir dolor.","shots":[ANA("worried",1.8)]},
 {"text":"Le dije: con la pierna que tengo, todos los días.","shots":[H("","smug",2.0),{"scene":"houseC","from":"todos","cam":{"x":760,"y":2000,"z":1.4,"move":"push"}}]},
]
save('ep7_dolor','Doctor_ep7','El niño que no sentía dolor','../audios/doctor_7.m4a',sc,beats)

# ======================= EP 8 – GUSANO =======================
HH={"reachR":[-62,-830],"reachL":[62,-830],"handR":"open","handL":"open"}
sc={
 "urg":{"bg":"er","actors":[ACT("hombre8",x=540,y=2400,s=2.0,expr={"mood":"sad","browL":-16,"browR":-16,"lid":0.4},pose=HH,i="h")]},
 "recuerdo":{"bg":"street","wobble":0.04,"tint":"#9a5cff","tintA":0.3,"sepia":False},
 "scan":MG("#20242c","#08090c",[{"id":"sc","type":"brainscan","x":540,"y":800,"s":1.25,"value":1}]),
 "scans":MG("#20242c","#08090c",[{"id":"s","type":"scans","x":540,"y":800,"s":1.0,"value":0}]),
 "quiro":{"bg":"surgery"},
 "gusano":MG("#1a3a2e","#08140f",[{"id":"w","type":"worm","x":540,"y":800,"s":1.3},K("k","1 CM",1300,110,"#ffcf3a")]),
 "animales":MG("#1a5e3a","#08180f",[{"id":"i","type":"icons","x":540,"y":820,"s":1.15,"cols":2,"gap":460,"items":[["frog","RANAS",""],["snake","SERPIENTES",""]],"value":0}]),
 "contagio":MG("#5e1a2a","#1d0810",[{"id":"i","type":"icons","x":540,"y":820,"s":1.15,"cols":2,"gap":460,"items":[["meat","MAL COCIDA",""],["bandage","REMEDIO CASERO",""]],"value":0,"ls":40}]),
 "viaje":MG("#3b2a5e","#120c22",[{"id":"b","type":"bodypath","x":540,"y":900,"s":1.0,"value":0}]),
 "rastro":MG("#3b2a5e","#120c22",[{"id":"b","type":"braintrail","x":540,"y":820,"s":1.35,"value":0},{"id":"i","type":"icons","x":540,"y":1380,"s":0.7,"items":[["calendar","",""]],"ring":"#ff4d5e","hidden":True}]),
 "titulo":TITLE("SE LLAMA","ESPARGANOSIS",c1="#1a3a2e",c2="#08140f"),
 "europa":MG("#1a2a5e","#080c22",[{"id":"g","type":"globe","x":540,"y":800,"s":1.25,"value":0.17},K("k","CASI NUNCA EN EUROPA",1300,80,"#ffcf3a")]),
 "bien":{"bg":"officeB","actors":[ACT("hombre8",x=540,y=2420,s=2.0,expr="happy",i="h")]},
 "vaca":MG("#1a4a6e","#0a1a2a",[{"id":"v","type":"wormvac","x":540,"y":800,"s":1.3}]),
}
beats=[
 {"text":"Un hombre de 50 años llevaba cuatro años con dolores de cabeza, convulsiones y recuerdos extraños que aparecían de la nada.","shots":[
   {"scene":"urg","cam":ON("h","medium")},
   {"scene":"urg","from":"convulsiones","cam":ON("h","close","drift"),"do":[{"on":"convulsiones","target":"h","sway":2.5,"dur":0.2,"camshake":8},{"on":"recuerdos","target":"h","sway":0,"dur":0.3}]},
   {"scene":"recuerdo","from":"recuerdos","cam":{"x":540,"y":900,"z":1.3,"to":{"z":1.0},"move":"hold"}}]},
 {"text":"Ningún médico encontraba la causa.","shots":[{"scene":"urg","cam":ON("h","face"),"do":[{"at":0,"target":"h","expr":"sad"}]}]},
 {"text":"Le habían hecho varias resonancias. En cada una aparecía una mancha en el cerebro.","shots":[{"scene":"scan","flash":True,"cam":F(540,800,1.0,"push")}]},
 {"text":"Leo dijo que era un tumor.","shots":[LEO("serious",1.2)]},
 {"text":"Ana dijo que era una inflamación.","shots":[ANA("think",1.4)]},
 {"text":"Pero puse las resonancias una al lado de la otra.","shots":[H("","serious",1.6)]},
 {"text":"La mancha no estaba en el mismo lugar. Cada año aparecía en otro sitio. Se había movido cinco centímetros.","shots":[{"scene":"scans","cam":F(540,800),"do":[{"at":0,"target":"s","value":1,"dur":2.4,"sfx":"pop"},{"on":"movido","target":"s","value":1.5,"dur":0.8,"sfx":"ding"}]}]},
 {"text":"Los tumores no caminan.","shots":[H("","smirk",1.3)]},
 {"text":"Lo operamos.","shots":[{"scene":"quiro","flash":True,"cam":F(540,900,1.0,"push")}]},
 {"text":"Y adentro encontramos a un gusano de un centímetro. Vivo.","shots":[{"scene":"gusano","cam":F(540,850),"do":[{"on":"centímetro","target":"k","pop":True,"sfx":"pop"}]},{"scene":"gusano","from":"Vivo","cam":F(540,800,1.6,"push")}]},
 {"text":"Era la larva de un parásito que normalmente vive en animales como ranas y serpientes.","shots":[{"scene":"animales","cam":F(540,820),"do":[{"on":"ranas","target":"i","value":1,"dur":0.3,"sfx":"pop"},{"on":"serpientes","target":"i","value":2,"dur":0.3,"sfx":"pop"}]}]},
 {"text":"Puede llegar a las personas cuando comen esa carne mal cocida... o la ponen sobre heridas como remedio casero.","shots":[{"scene":"contagio","cam":F(540,820),"do":[{"on":"carne","target":"i","value":1,"dur":0.3,"sfx":"pop"},{"on":"heridas","target":"i","value":2,"dur":0.3,"sfx":"pop"}]}]},
 {"text":"Una vez adentro, la larva viaja por el cuerpo buscando dónde vivir. Esta eligió el cerebro.","shots":[{"scene":"viaje","cam":F(540,900),"do":[{"on":"viaja","target":"b","value":1,"dur":3.0,"linear":True},{"on":"cerebro","target":"b","value":1,"dur":0.01,"sfx":"ding"}]}]},
 {"text":"Durante cuatro años se fue arrastrando de a poco, dejando un camino de inflamación.","shots":[{"scene":"rastro","cam":F(540,820),"do":[{"on":"años","target":"i","pop":True,"sfx":"pop"},{"on":"arrastrando","target":"b","value":1,"dur":2.4}]}]},
 {"text":"Por eso los síntomas cambiaban.","shots":[{"scene":"urg","cam":ON("h","close"),"do":[{"at":0,"target":"h","expr":"confused"}]}]},
 {"text":"Se llama esparganosis.","shots":[TSHOT()]},
 {"text":"Y es tan rara que en Europa casi no se había visto nunca.","shots":[{"scene":"europa","cam":F(540,820),"do":[{"on":"Europa","target":"k","pop":True,"sfx":"pop"}]}]},
 {"text":"Sin el gusano, el hombre se recuperó.","shots":[{"scene":"bien","cam":ON("h","close")}]},
 {"text":"Leo me preguntó cómo supe que no era un tumor.","shots":[LEO("confused",1.8)]},
 {"text":"Le dije: porque un tumor no se toma vacaciones en el otro lado del cerebro.","shots":[H("","smirk",3.4,{"armR":[14,92],"handR":"open"}),{"scene":"vaca","from":"vacaciones","cam":F(540,800)}]},
]
save('ep8_gusano','Doctor_ep8','El gusano que viajaba por su cerebro','../audios/doctor_8.m4a',sc,beats)
print('ok')

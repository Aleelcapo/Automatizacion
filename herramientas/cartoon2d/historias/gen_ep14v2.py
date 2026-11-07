import sys, json; sys.path.insert(0,'historias')
from _gen import *
old=json.load(open('historias/ep14_caras.json'))
BOARD={"title":"SÍNTOMAS","lines":["- no reconoce caras","- vista: perfecta","- memoria: perfecta"],"q":"¿DERRAME?"}
sc={k:v for k,v in old['scenes'].items() if k not in ('houseC','aula','anaC')}
sc.update({
 "ext":{"bg":"hospitalExt"},
 "espera":{"bg":"waiting","actors":[ACT("hombre",x=540,y=2380,s=1.9,expr="worried",pose="hips2",i="h")]},
 "equipo":{"bg":"officeA","bgOpts":BOARD,"actors":[
    ACT("house",x=290,y=2080,s=1.55,expr="smug",pose={"propL":"cane","armL":[8,-6],"turn":0.55},i="house"),
    ACT("ana",x=650,y=2080,s=1.5,expr="neutral",pose={"propR":"clipboard","armR":[10,-118],"turn":-0.55},i="ana"),
    ACT("leo",x=900,y=2080,s=1.5,expr="neutral",pose={"propR":"notebook","armR":[8,-116],"turn":-0.6},i="leo")]},
 "houseB":{"bg":"officeA","bgOpts":BOARD,"actors":[ACT("house",x=690,y=2560,s=2.25,expr="smug",pose={"propL":"cane","armL":[8,-6]},i="house")]},
 "anaCaf":{"bg":"cafeteria","actors":[ACT("ana",x=540,y=2560,s=2.2,expr="neutral",pose={"turn":0.4},i="ana")]},
 "leoLab":{"bg":"lab","actors":[ACT("leo",x=540,y=2560,s=2.2,expr="neutral",pose={"propR":"notebook","armR":[8,-116],"turn":-0.4},i="leo")]},
 "cuarto":{"bg":"patientroom","actors":[ACT("hombre",x=540,y=2300,s=1.9,expr="neutral",i="h")],"props":[{"id":"cama","type":"bed","x":540,"y":1640,"s":1.15,"z":5}]},
})
sc["foto"]["bg"]="patientroom"
sc["fiesta"]["actors"][0]["pose"]={"turn":-0.6}
sc["fiesta"]["actors"][1]["pose"]={"turn":0.6}
def HB(expr="smug",talk=None,arms=None,shot="face",turn=0,extra=None):
    d={"at":0,"target":"house","expr":expr,"turn":turn}
    if talk: d["talk"]=talk
    if arms: d["arms"]=arms
    r={"scene":"houseB","cam":ON("house",shot),"do":[d]+(extra or [])}
    return r
beats=[
 {"text":"Un hombre llegó preocupado.","shots":[{"scene":"ext","cam":F(540,900,1.0,"push")},{"scene":"espera","from":"preocupado","cam":ON("h","medium"),"do":[{"on":"preocupado","target":"h","no":True,"turn":0.3}]}]},
 {"text":"En una fiesta había pasado al lado de su esposa... y no la reconoció.","shots":[{"scene":"fiesta","flash":True,"cam":F(540,1000,1.0,"panL"),"do":[{"at":0,"target":"h","move":{"x":250,"dur":2.6}},{"at":0.3,"target":"m","look":[0.9,0],"turn":0.8}]}]},
 {"text":"Le habló como a una desconocida.","shots":[{"scene":"fiestaC","cam":ON("m","face"),"do":[{"at":0,"target":"m","expr":"shock","jolt":0.6},{"at":0.4,"target":"m","arms":"hips2","expr":"angry","dur":0.4}]}]},
 {"text":"Ana dijo que tenía un problema en la vista. Le hicimos un examen: veía perfecto.","shots":[
   {"scene":"equipo","cam":ON("ana","close"),"do":[{"at":0,"target":"ana","talk":1.6,"arms":"pointAtL","expr":"think"},{"at":0.3,"target":"house","no":True}]},
   {"scene":"vista","from":"Le","cam":F(540,820)}]},
 {"text":"Leo dijo que era pérdida de memoria. Recordaba todo sin problema.","shots":[
   {"scene":"leoLab","cam":ON("leo","close"),"do":[{"at":0,"target":"leo","talk":1.6,"expr":"serious","arms":{"reachL":[60,-690],"handL":"fist"}}]},
   {"scene":"cuarto","from":"Recordaba","cam":ON("h","close"),"do":[{"at":0,"target":"h","talk":1.2,"turn":-0.4,"expr":"happy"}]}]},
 {"text":"Entonces le mostré una foto de su propia cara.","shots":[HB("serious",1.4,{"armR":[34,122],"handR":"point"},turn=0.3)]},
 {"text":"La miró un rato largo... y me preguntó quién era.","shots":[{"scene":"foto","cam":{"x":540,"y":1300,"z":1.2,"move":"push"}},{"scene":"foto","from":"preguntó","cam":ON("h","face"),"do":[{"on":"preguntó","target":"h","talk":1.0,"arms":"facepalm","dur":0.4}]}]},
 {"text":"Había tenido un pequeño derrame semanas antes.","shots":[{"scene":"equipo","cam":{"on":["house","ana","leo"],"shot":"full","move":"drift"},"do":[{"at":0,"target":"ana","expr":"surprised","turn":-0.7},{"at":0.1,"target":"leo","expr":"surprised","turn":-0.7},{"at":0,"target":"house","talk":1.6,"arms":{"armR":[60,70],"handR":"open"}}]},{"scene":"zona","from":"derrame","cam":F(540,820),"do":[{"on":"derrame","target":"br","glow":1,"dur":0.4,"sfx":"thud"}]}]},
]
oldb=old['beats']
beats+=oldb[8:16]
beats+=[
 {"text":"Leo me preguntó si es grave.","shots":[{"scene":"equipo","cam":ON("leo","close"),"do":[{"at":0,"target":"leo","talk":1.2,"expr":"worried","turn":-0.7}]}]},
 {"text":"Le dije: depende. Si tu suegra se corta el pelo... es lo mejor que te puede pasar.","shots":[
   HB("smirk",3.2,"cross",turn=0.2),
   {"scene":"equipo","from":"suegra","cam":{"on":["ana","leo"],"shot":"medium","move":"push"},"do":[{"at":0,"target":"ana","arms":"facepalm","expr":"confused","dur":0.4},{"at":0.2,"target":"leo","expr":"happy","turn":-0.3}]}]},
]
S=dict(sc); json.dump({"out":"Doctor_ep14","title":old['title'],"audio":old['audio'],"sfx_gain":0.38,"maxShot":2.0,"tail":1.2,"scenes":S,"beats":beats},open('historias/ep14_caras_v2.json','w'),ensure_ascii=False,indent=1)
print(len(beats))

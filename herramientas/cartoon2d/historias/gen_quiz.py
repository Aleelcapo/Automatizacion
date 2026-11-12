import sys, json; sys.path.insert(0,'historias')
from _gen import *
e6=json.load(open('historias/ep6_agua.json'))
sc={k:e6['scenes'][k] for k in ('chica','bano','llanto','agua','piel','titulo','houseC')}
sc['titulo']['props'][0].update({"l1":"ES LA B","l2":"URTICARIA","l3":"ACUAGÉNICA"})
sc['quiz']=MG("#1a2a5e","#080c22",[{"id":"q","type":"quiz","x":540,"y":980,"s":0.98,"value":0,"answer":1,"reveal":0,"q":"¿QUÉ TIENE?","options":["Alergia al jabón","Alergia al agua","Estrés"]}])
sc['cuenta']=MG("#5e1a2a","#1d0810",[{"id":"c","type":"countdown","x":540,"y":820,"s":1.05,"n":3,"total":3}])
sc['final']=MG("#1a2a5e","#080c22",[K("k1","¿ACERTASTE?",640,140,"#ffcf3a"),K("k2","DÍMELO EN LOS COMENTARIOS",900,64,"#ffffff"),{"id":"i","type":"icons","x":540,"y":1250,"s":1.2,"items":[["tear","",""]],"hidden":True}])
beats=[
 {"text":"Una chica de quince años tiene ronchas rojas cada vez que se baña.","shots":[
   {"scene":"chica","cam":ON("c","face","push"),"do":[{"at":0,"target":"c","expr":{"mood":"sad","browL":-12,"browR":-12,"hives":1}}]},
   {"scene":"bano","from":"cada","cam":F(540,900,1.0,"push"),"do":[{"on":"baña","target":"c","expr":{"mood":"sad","hives":1},"dur":0.6}]}]},
 {"text":"Cambiaron el jabón. Cambiaron el agua. Las ronchas siguen.","shots":[{"scene":"agua","cam":F(540,700),"do":[{"on":"jabón","target":"i","marks":1,"dur":0.01,"sfx":"boing","vol":0.5},{"on":"agua","target":"i","marks":2,"dur":0.01,"sfx":"boing","vol":0.5}]}]},
 {"text":"Hasta sus propias lágrimas le dejan marcas.","shots":[{"scene":"llanto","cam":ON("c","face"),"do":[{"at":0,"target":"c","expr":{"mood":"sad","browL":-14,"browR":-14,"tears":1,"hives":1},"dur":0.8}]}]},
 {"text":"¿Qué tiene? A: alergia al jabón. B: alergia al agua. O C: estrés.","shots":[{"scene":"quiz","flash":True,"cam":F(540,900),"do":[
   {"on":"A","target":"q","value":1,"dur":0.3,"sfx":"pop"},{"on":"B","target":"q","value":2,"dur":0.3,"sfx":"pop"},{"on":"C","target":"q","value":3,"dur":0.3,"sfx":"pop"}]}]},
 {"text":"Comenta tu respuesta antes de que te lo diga. Tres, dos, uno.","shots":[{"scene":"cuenta","cam":F(540,860),"do":[
   {"at":0,"target":"c","n":3,"dur":0.01},{"on":"Tres","target":"c","n":2,"dur":0.9,"linear":True,"sfx":"tick"},{"on":"dos","target":"c","n":1,"dur":0.9,"linear":True,"sfx":"tick"},{"on":"uno","target":"c","n":0,"dur":0.6,"linear":True,"sfx":"ding"}]}]},
 {"text":"Es la B. Alergia al agua: urticaria acuagénica.","shots":[{"scene":"quiz","cam":F(540,900),"do":[{"at":0,"target":"q","value":3,"dur":0.01},{"at":0.15,"target":"q","reveal":1,"dur":0.5,"sfx":"ding","camshake":10}]},
   {"scene":"titulo","from":"urticaria","cam":F(540,800),"do":[{"on":"urticaria","target":"t","value":1,"dur":0.45,"sfx":"thud","camshake":14}]}]},
 {"text":"Su piel reacciona con cualquier agua, incluso con el sudor.","shots":[{"scene":"piel","cam":F(540,820),"do":[{"at":0.1,"target":"s","value":5,"dur":2.2,"sfx":"pop"}]}]},
 {"text":"¿Acertaste? Dímelo en los comentarios.","shots":[{"scene":"final","cam":F(540,900),"do":[{"at":0,"target":"k1","pop":True,"sfx":"pop"},{"on":"Dímelo","target":"k2","pop":True,"sfx":"pop"}]}]},
]
save('quiz_agua','Quiz_prueba_agua','¿Cuál es el diagnóstico? – alergia al agua',None,sc,beats)
d=json.load(open('historias/quiz_agua.json')); d.pop('audio'); d['voice']='es-MX-JorgeNeural'; d['rate']='+8%'; json.dump(d,open('historias/quiz_agua.json','w'),ensure_ascii=False,indent=1)
print('ok')

import json
e1=json.load(open('historias/ep1_final.json'))
BASE={k:e1['scenes'][k] for k in ['houseC','entrada','aula','anaC']}
def MG(c1=None,c2=None,props=()): 
    d={"bg":"diagram","warm":0.2,"cool":0.3,"props":list(props)}
    if c1: d["bgOpts"]={"c1":c1,"c2":c2}
    return d
def K(i,text,y,size=90,color="#ffffff"): return {"id":i,"type":"kicker","x":540,"y":y,"text":text,"size":size,"color":color,"hidden":True}
def F(x=540,y=850,z=1.0,mv="push"): return {"x":x,"y":y,"z":z,"move":mv}
def ON(a,shot="close",mv="push"): return {"on":a,"shot":shot,"move":mv}
def ACT(char,x=540,y=2420,s=2.0,expr="neutral",pose=None,i=None):
    d={"id":i or char,"char":char,"x":x,"y":y,"s":s,"expr":expr}
    if pose: d["pose"]=pose
    return d
def H(text,expr="smirk",talk=None,arms=None,shot="face"):
    do=[{"at":0,"target":"house","expr":expr}]
    if talk: do[0]["talk"]=talk
    if arms: do[0]["arms"]=arms
    return {"scene":"houseC","cam":ON("house",shot),"do":do}
def ANA(expr="worried",talk=None,arms=None):
    d={"at":0,"target":"ana","expr":expr}
    if talk: d["talk"]=talk
    if arms: d["arms"]=arms
    return {"scene":"anaC","cam":ON("ana"),"do":[d]}
def LEO(expr="serious",talk=None,arms=None):
    d={"at":0,"target":"leo","expr":expr}
    if talk: d["talk"]=talk
    if arms: d["arms"]=arms
    return {"scene":"aula","cam":ON("leo"),"do":[d]}
TITLE=lambda l1,l2,l3=None,c1="#5e1a2a",c2="#1d0810": MG(c1,c2,[{"id":"t","type":"title2","x":540,"y":760,"s":1.0,"value":0,"l1":l1,"l2":l2,**({"l3":l3} if l3 else {})}])
TSHOT=lambda: {"scene":"titulo","cam":F(540,800),"do":[{"on":"Se","target":"t","value":1,"dur":0.45,"camshake":16,"sfx":"thud","lead":-0.25}]}
def save(name,out,title,audio,sc,beats):
    S=dict(BASE); S.update(sc)
    json.dump({"out":out,"title":title,"audio":audio,"sfx_gain":0.38,"maxShot":2.4,"tail":1.2,"scenes":S,"beats":beats},open(f'historias/{name}.json','w'),ensure_ascii=False,indent=1)

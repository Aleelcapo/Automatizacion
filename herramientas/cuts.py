# Detect hard cuts and gradual transitions; output json of "unsafe" intervals
import sys, json, subprocess, numpy as np
f, out = sys.argv[1], sys.argv[2]
fps = float(eval(subprocess.check_output(['ffprobe','-v','error','-select_streams','v','-show_entries','stream=r_frame_rate','-of','csv=p=0',f]).decode().strip()))
raw = subprocess.run(['ffmpeg','-v','error','-i',f,'-vf','scale=64:36,format=gray','-f','rawvideo','-'],capture_output=True).stdout
fr = np.frombuffer(raw,np.uint8).reshape(-1,36,64).astype(np.float32)
n=len(fr)
d1 = np.r_[0, np.abs(fr[1:]-fr[:-1]).mean((1,2))]
k=8
dk = np.r_[np.zeros(k), np.abs(fr[k:]-fr[:-k]).mean((1,2))]
med = np.median(d1)+1e-3
bad=[]
for i in range(n):
    hard = d1[i] > max(12, 6*med)
    grad = dk[i] > 18 and d1[i] > 1.2*med and dk[i] > 4*np.median(dk[max(0,i-60):i+60]+1e-3)
    if hard or grad: bad.append(i)
# merge into intervals
iv=[]
for i in bad:
    if iv and i-iv[-1][1] <= 3: iv[-1][1]=i
    else: iv.append([i,i])
res=[[round((a-1)/fps,3), round((b+1)/fps,3)] for a,b in iv]
json.dump(dict(fps=fps,n=n,cuts=res),open(out,'w'))
print(f, fps, n, len(res))

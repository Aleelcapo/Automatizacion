import sys, json, subprocess, numpy as np
from faster_whisper import WhisperModel
m = WhisperModel('small', device='cpu', compute_type='int8', cpu_threads=4)
for f in sys.argv[1:]:
    raw = subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar','16000','-f','s16le','-'],capture_output=True).stdout
    audio = np.frombuffer(raw, np.int16).astype(np.float32)/32768
    segs, info = m.transcribe(audio, vad_filter=True, word_timestamps=False)
    out = [dict(s=round(s.start,2), e=round(s.end,2), t=s.text.strip()) for s in segs]
    json.dump(dict(lang=info.language, segs=out), open(f.replace('.mp4','.json'),'w'), ensure_ascii=False, indent=0)
    print(f, info.language, len(out), flush=True)

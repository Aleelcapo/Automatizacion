import sys, json, subprocess, numpy as np
from faster_whisper import WhisperModel
f, out, size = sys.argv[1], sys.argv[2], sys.argv[3]
m = WhisperModel(size, device='cpu', compute_type='int8', cpu_threads=4)
raw = subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar','16000','-f','s16le','-'],capture_output=True).stdout
audio = np.frombuffer(raw, np.int16).astype(np.float32)/32768
segs, info = m.transcribe(audio, language='es', word_timestamps=True, beam_size=5,
  initial_prompt="La Torre de Pisa sigue en pie solo porque su ciudad no paraba de ir a la guerra.")
words=[]
for s in segs:
    for w in s.words: words.append(dict(w=w.word.strip(), s=round(w.start,3), e=round(w.end,3)))
json.dump(words, open(out,'w'), ensure_ascii=False, indent=0)
print(len(words), info.language)

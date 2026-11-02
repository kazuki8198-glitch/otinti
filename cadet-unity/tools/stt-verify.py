from faster_whisper import WhisperModel
import av, numpy as np, json
container = av.open("/tmp/jfk.flac")
resampler = av.AudioResampler(format="fltp", layout="mono", rate=16000)
frames = []
for frame in container.decode(audio=0):
    for rf in resampler.resample(frame):
        frames.append(rf.to_ndarray().reshape(-1))
audio = np.concatenate(frames).astype(np.float32)
print("decoded samples:", len(audio))
m = WhisperModel("tiny", device="cpu", compute_type="int8")
segs, info = m.transcribe(audio)
text = "".join(s.text for s in segs).strip()
print(json.dumps({"language": info.language, "text": text}, ensure_ascii=False))

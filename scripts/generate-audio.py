"""Original STILL sound design. Deterministic synthesis, no third-party samples.
Outputs are dedicated to CC0-1.0. Render offline; browser plays real audio files.
"""
import numpy as np, wave, subprocess, pathlib, json
out=pathlib.Path('public/audio'); out.mkdir(parents=True,exist_ok=True)
sr=24000; duration=48; n=sr*duration; t=np.arange(n)/sr
rng=np.random.default_rng(41028)
def noise(cut, low=30):
    f=np.fft.rfftfreq(n,1/sr)
    s=np.fft.rfft(rng.normal(size=n))
    s*=np.minimum(1,(cut/np.maximum(f,1))**2)*np.minimum(1,(f/low)**2)
    a=np.fft.irfft(s,n); return a/(np.std(a)+1e-9)
def render(name, a):
    # A cyclic signal with tapered seam prevents loop clicks.
    ramp=int(sr*.08); a[:ramp]*=np.linspace(0,1,ramp); a[-ramp:]*=np.linspace(1,0,ramp)
    a=np.tanh(a); a=a/(max(np.max(np.abs(a)),.01))*0.58
    stereo=np.column_stack([a,np.roll(a,137)*.96])
    wav=out/(name+'.wav')
    with wave.open(str(wav),'wb') as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((stereo*32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg','-y','-v','error','-i',str(wav),'-codec:a','libmp3lame','-b:a','128k',str(out/(name+'.mp3'))],check=True)
    wav.unlink()
render('ocean',noise(1100)*(.12+.18*(.5+.5*np.sin(2*np.pi*t/8))**2)+noise(3000)*.025)
render('rain',noise(6200,300)*.18+noise(250)*.025)
render('wind',noise(420)*(.12+.07*np.sin(2*np.pi*t/16))+.015*np.sin(2*np.pi*170*t)*np.sin(2*np.pi*t/12)**2)
a=noise(320)*.08
for start in rng.integers(0,n-sr//5,180):
    l=sr//5; a[start:start+l]+=rng.normal(size=l)*np.exp(-np.arange(l)/(sr*.012))*.17
render('fire',a)
a=np.zeros(n)
# Original slow pentatonic phrase, damped inharmonic partials and stereo echo.
notes=[48,55,60,64,67,64,60,55,45,52,57,60,64,60,57,52]
for i,midi in enumerate(notes):
    start=int(i*2.8*sr); tt=np.arange(min(6*sr,n-start))/sr; f=440*2**((midi-69)/12)
    tone=sum((1/k**1.8)*np.sin(2*np.pi*f*k*(1+.00012*k*k)*tt)*np.exp(-tt*(.6+.2*k)) for k in range(1,9))
    tone*=np.minimum(tt/.008,1)*.28;a[start:start+len(tone)]+=tone
render('piano',a+np.roll(a,int(sr*.34))*.13+np.roll(a,int(sr*.71))*.07)
a=noise(700)*.025
for f,cycle in [(2800,3),(3400,4),(4100,6)]:
    env=np.maximum(0,np.sin(2*np.pi*t/cycle))**12*(.5+.5*np.sin(2*np.pi*t*18))
    a+=np.sin(2*np.pi*f*t)*env*.035
render('night',a)
(out/'LICENSE.txt').write_text('STILL original synthesized soundscapes, 2026. No third-party samples.\nDedicated to the public domain under CC0 1.0 Universal.\nhttps://creativecommons.org/publicdomain/zero/1.0/\nSource: scripts/generate-audio.py\nThese are synthesized interpretations, not field recordings.\n')
print('Six original stereo audio loops rendered.')

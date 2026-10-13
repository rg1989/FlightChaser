# tools/scenarios/align_lines.py
# The sync check for a scenario's recording: where in the audio is each transcript line heard? Whisper is given the
# known words of the lines in a 30-s window and its cross-attention is traced (DTW), as its word timestamps are, but
# with our text. A line counts when most of its windows agree within 0.6 s. It reads radio and announcements to about
# half a second; through cockpit noise single lines scatter by a second or two, so judge a stretch by its median.
# usage: align_lines.py in.wav T0_clock_s transcript.csv out.json channels(comma) [shift_s]
#   in.wav starts at clock second T0 (seconds since midnight); shift_s delays the audio, to check the check itself:
#   the result must not change. Needs torch, transformers (openai/whisper-large-v3-turbo) and ffmpeg; a GPU helps.
import sys, os, json, csv, subprocess
import numpy as np, torch
os.environ.setdefault('HF_HUB_OFFLINE', '1')
from transformers import WhisperProcessor, WhisperForConditionalGeneration
wav, T0, tr, outp, chans = sys.argv[1], float(sys.argv[2]), sys.argv[3], sys.argv[4], set(sys.argv[5].split(','))
shift = float(sys.argv[6]) if len(sys.argv) > 6 else 0.0
SR = 16000
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', wav, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
a = np.frombuffer(raw, dtype=np.float32)
if shift: a = np.concatenate([np.zeros(int(shift * SR), np.float32), a])
lines = []
for r in csv.DictReader(open(tr, encoding='utf-8')):
    h, m, s = r['time'].split(':'); t = int(h) * 3600 + int(m) * 60 + float(s)
    txt = r['original'] or r['text']
    if r['channel'] not in chans or r['q'] == 'U' or txt.startswith('['): continue
    txt = txt.replace('[unintelligible]', ' ').replace('・・・', ' ').replace('+++', ' ').strip()
    if len(txt) < 2: continue
    lines.append(dict(t=t, text=txt, lang='ja' if r['original'] else 'en', speaker=r['speaker'], channel=r['channel'], en=r['text']))
M = 'openai/whisper-large-v3-turbo'
proc = WhisperProcessor.from_pretrained(M)
model = WhisperForConditionalGeneration.from_pretrained(M, dtype=torch.float16, attn_implementation='eager').cuda().eval()
tok = proc.tokenizer
heads = model.generation_config.alignment_heads
def dtw(x):
    N, Mm = x.shape
    cost = np.full((N + 1, Mm + 1), np.inf, np.float32); trace = np.zeros((N + 1, Mm + 1), np.int8); cost[0, 0] = 0
    for j in range(1, Mm + 1):
        for i in range(1, N + 1):
            c0, c1, c2 = cost[i - 1, j - 1], cost[i - 1, j], cost[i, j - 1]
            if c0 <= c1 and c0 <= c2: c, t = c0, 0
            elif c1 <= c0 and c1 <= c2: c, t = c1, 1
            else: c, t = c2, 2
            cost[i, j] = x[i - 1, j - 1] + c; trace[i, j] = t
    i, j = N, Mm; ti, tj = [], []
    trace[0, :] = 2; trace[:, 0] = 1
    while i > 0 or j > 0:
        ti.append(i - 1); tj.append(j - 1)
        t = trace[i, j]
        if t == 0: i -= 1; j -= 1
        elif t == 1: i -= 1
        else: j -= 1
    return np.array(ti[::-1]), np.array(tj[::-1])
def medfilt(x, w=7):
    pad = w // 2
    xp = torch.nn.functional.pad(x, (pad, pad), mode='reflect')
    return xp.unfold(-1, w, 1).median(-1).values
res = {}
WIN, HOP = 30.0, float(os.environ.get('HOP', '6'))
tA = T0; tEnd = T0 + len(a) / SR
w0 = tA
while w0 < tEnd - 2:
    sel = [L for L in lines if w0 + 1.0 <= L['t'] <= w0 + WIN - 6.0]
    if sel:
        seg = a[int((w0 - T0) * SR):int((w0 - T0 + WIN) * SR)]
        if len(seg) > SR and float(np.sqrt((seg ** 2).mean())) > 1e-4:
            nja = sum(1 for L in sel if L['lang'] == 'ja')
            lang = 'ja' if nja * 2 >= len(sel) else 'en'
            ids = tok.convert_tokens_to_ids(['<|startoftranscript|>', f'<|{lang}|>', '<|transcribe|>', '<|notimestamps|>'])
            starts = []
            for L in sel:
                starts.append(len(ids) - 4)
                ids += tok.encode((' ' if L['lang'] == 'en' else '') + L['text'], add_special_tokens=False)
            ids.append(tok.eos_token_id)
            if len(ids) < 440:
                feat = proc(seg, sampling_rate=SR, return_tensors='pt').input_features.to('cuda', torch.float16)
                with torch.no_grad():
                    o = model(input_features=feat, decoder_input_ids=torch.tensor([ids], device='cuda'), output_attentions=True)
                nfr = min(1500, int(len(seg) / SR * 50))
                w = torch.stack([o.cross_attentions[l][0, h] for l, h in heads]).float()[:, :, :nfr]
                w = (w - w.mean(-2, keepdim=True)) / (w.std(-2, keepdim=True) + 1e-6)
                w = medfilt(w)
                mat = w.mean(0)[3:-1].cpu().numpy()
                ti, tj = dtw(-mat)
                jumps = np.pad(np.diff(ti), (1, 0), constant_values=1).astype(bool)
                jt = tj[jumps] / 50.0
                lp = torch.log_softmax(o.logits[0].float(), -1)  # row i predicts ids[i + 1]
                tgt = torch.tensor(ids[1:], device='cuda')
                tok_lp = lp[:-1].gather(1, tgt[:, None])[:, 0].cpu().numpy()  # tok_lp[i]: log p of ids[i + 1]
                ends = starts[1:] + [len(ids) - 5]
                for L, st, en in zip(sel, starts, ends):
                    # row k of the matrix predicts text token k; a first token that swallowed a pause is cut to 0.3 s
                    t_first = float(jt[st]); t_next = float(jt[st + 1]) if st + 1 < len(jt) else t_first
                    if t_next - t_first > 0.8: t_first = t_next - 0.3
                    heard = w0 + t_first - shift
                    conf = float(tok_lp[3 + st:3 + en].mean())
                    key = '%.1f|%s|%s' % (L['t'], L['speaker'], L['text'][:30])
                    res.setdefault(key, dict(t=L['t'], speaker=L['speaker'], channel=L['channel'], text=L['text'][:40], en=L['en'][:60], est=[]))['est'].append([round(heard - L['t'], 2), round(conf, 2)])
    w0 += HOP
out = []
for r in sorted(res.values(), key=lambda x: x['t']):
    ds = [e[0] for e in r['est']]
    med = float(np.median(ds)); near = [d for d in ds if abs(d - med) <= 0.6]
    r['d'] = round(float(np.median(near)), 2); r['agree'] = len(near) >= 2 and len(near) * 2 > len(ds); r['conf'] = max(e[1] for e in r['est'])
    out.append(r)
json.dump(out, open(outp, 'w'), ensure_ascii=False, indent=0)
ds = np.array([r['d'] for r in out if r['agree']])
print('lines', len(out), 'agreeing', len(ds), 'median %.2f' % np.median(ds), 'p10 %.2f p90 %.2f' % (np.percentile(ds, 10), np.percentile(ds, 90)), 'within 1.5s: %.0f%%' % (100 * (np.abs(ds) <= 1.5).mean()))

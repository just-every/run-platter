import re,json
from pathlib import Path
p=Path.home()/'rer-consolidation/work/sx-platter-ci-critical-path-1/packet'
text=(p/'baseline-lifecycle.log').read_text()
rows=[]
contexts={}
lines=text.splitlines()
for i,line in enumerate(lines):
 m=re.match(r'^( *)# Subtest: (.*)$',line)
 if m:
  indent=len(m[1]);contexts={k:v for k,v in contexts.items() if k<indent};contexts[indent]=m[2]
 m=re.match(r'^( *)(ok|not ok) \d+ - (.*)$',line)
 if m:
  indent=len(m[1]);details='\n'.join(lines[i+1:i+7])
  duration=re.search(r'duration_ms: ([\d.]+)',details)
  suite=re.search(r"type: 'suite'",details)
  if duration and not suite:
   parents=[v for k,v in sorted(contexts.items()) if k<indent]
   rows.append({'name':' '.join([*parents,m[3]]),'seconds':float(duration[1])/1000,'passed':m[2]=='ok'})
groups={}
for r in rows:
 k=(r['name'].split('-')[0] if re.match(r'^[A-Z]+-',r['name']) else 'other')
 groups[k]=groups.get(k,0)+r['seconds']
print(json.dumps({'completed':len(rows),'seconds':sum(r['seconds'] for r in rows),'groups':groups},indent=2))
(p/'baseline-test-timings.json').write_text(json.dumps(rows,indent=2)+'\n')

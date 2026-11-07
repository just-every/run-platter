import datetime,json,subprocess,time
from pathlib import Path
p=Path.home()/'rer-consolidation/work/sx-platter-ci-critical-path-1/packet'
watch=json.loads((p/'watch-receipt.json').read_text())
def wait_until(epoch,stage):
 while time.time()<epoch:
  delay=min(45,max(0,epoch-time.time()))
  time.sleep(delay)
  print('CI_WAIT stage='+stage+' remaining_seconds='+str(max(0,round(epoch-time.time())))+'; no GitHub call',flush=True)
def call(args,filename,budget_no):
 started=time.time()
 with (p/filename).open('w') as stream:
  subprocess.run(['python3','/tmp/fleet-gh.py',*args],stdout=stream,check=True)
 budget=json.loads((p/'github-budget.json').read_text())
 budget['used']=budget_no;budget['calls'].append('gh '+' '.join(args));(p/'github-budget.json').write_text(json.dumps(budget,indent=2)+'\n')
 return started
wait_until(watch['planned_status_epoch'],'full-run')
started=call(['api','repos/just-every/run-platter/actions/runs/'+str(watch['run_id']),'--jq','{status,conclusion,head_sha,html_url}'],'candidate-status.json',9)
status=json.loads((p/'candidate-status.json').read_text())
assert status['head_sha']==watch['head']
watch['last_status']=status;watch['last_api_epoch']=started
(p/'watch-receipt.json').write_text(json.dumps(watch,indent=2)+'\n')
print('CI_STATUS '+json.dumps(status),flush=True)
wait_until(started+301,'job-duration-spacing')
started=call(['api','repos/just-every/run-platter/actions/runs/'+str(watch['run_id'])+'/jobs?filter=latest&per_page=100'],'candidate-jobs.json',10)
jobs=json.loads((p/'candidate-jobs.json').read_text())['jobs']
summary=[]
for j in jobs:
 assert j['head_sha']==watch['head']
 start=datetime.datetime.fromisoformat(j['started_at'].replace('Z','+00:00'))
 end=datetime.datetime.fromisoformat(j['completed_at'].replace('Z','+00:00')) if j['completed_at'] else None
 summary.append(dict(id=j['id'],name=j['name'],status=j['status'],conclusion=j['conclusion'],seconds=(end-start).total_seconds() if end else None))
print('CI_JOBS '+json.dumps(summary),flush=True)
(p/'candidate-job-summary.json').write_text(json.dumps(summary,indent=2)+'\n')

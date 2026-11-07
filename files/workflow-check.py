import json,subprocess,yaml
from pathlib import Path
old=yaml.safe_load(subprocess.check_output(['git','show','HEAD:.github/workflows/verify.yml'],text=True))
new=yaml.safe_load(Path('.github/workflows/verify.yml').read_text())
assert old['jobs']['plan']==new['jobs']['plan']
assert old['concurrency']==new['concurrency']
assert old.get('on',old.get(True))==new.get('on',new.get(True))
assert new['jobs']['shards']['strategy']==old['jobs']['shards']['strategy']
assert len(new['jobs']['shards']['strategy']['matrix']['shard'])==8
assert all(j['runs-on']=='ubuntu-24.04' for j in new['jobs'].values())
assert new['jobs']['shards']['timeout-minutes']==old['jobs']['shards']['timeout-minutes']
assert set(new['jobs']['verify']['needs'])=={'plan','core','shards'}
assert new['jobs']['shards']['needs']==['plan','core']
upload=[s for s in new['jobs']['core']['steps'] if s.get('uses','').startswith('actions/upload-artifact@')]
download=[s for s in new['jobs']['shards']['steps'] if s.get('uses','').startswith('actions/download-artifact@')]
assert len(upload)==len(download)==1
assert upload[0]['with']['name']==download[0]['with']['name']
assert upload[0]['with']['path']==download[0]['with']['path']=='dist/'
assert upload[0]['with']['include-hidden-files']
assert upload[0]['with']['if-no-files-found']=='error'
source=Path('scripts/verification/run.mjs').read_text()
assert source.count("'pnpm build'")==1
assert source.count("'pnpm exec rer build --site'")==1
assert source.count("'pnpm typecheck'")==1
assert source.count("'node src/base/contract-docs.mjs check'")==1
changed=subprocess.check_output(['git','diff','--name-only'],text=True).splitlines()
assert set(changed)<={'.github/workflows/verify.yml','scripts/verification/run.mjs','sources.lock.json'}
p=Path.home()/'rer-consolidation/work/sx-platter-ci-critical-path-1/packet'
(p/'workflow-check.json').write_text(json.dumps({'passed':True,'plan_unchanged':True,'concurrency_unchanged':True,'shards':8,'builds':{'product':1,'site':1},'checks':'equal matrix, no timeout increase, ubuntu-24.04, core/shard aggregate dependency, artifact name/path/hidden files/failure policy, allowed files only'},indent=2)+'\n')
print('workflow invariants passed')

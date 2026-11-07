import hashlib,json,tarfile,tempfile
from pathlib import Path
root=Path('dist')
with tempfile.TemporaryDirectory(prefix='platter-build-transfer-') as temporary:
 archive=Path(temporary)/'dist.tar'
 with tarfile.open(archive,'w') as bundle:bundle.add(root,arcname='dist')
 with tarfile.open(archive) as bundle:bundle.extractall(Path(temporary)/'restored',filter='data')
 files={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file()}
 copy=Path(temporary)/'restored/dist'
 assert files=={str(p.relative_to(copy)):hashlib.sha256(p.read_bytes()).hexdigest() for p in copy.rglob('*') if p.is_file()}
 assert 'client/.assetsignore' in files and 'server/index.js' in files
 p=Path.home()/'rer-consolidation/work/sx-platter-ci-critical-path-1/packet'
 (p/'artifact-check.json').write_text(json.dumps({'passed':True,'files':len(files),'hidden_asset_manifest_preserved':True,'all_content_hashes_equal':True},indent=2)+'\n')
 print('artifact transfer check passed:',len(files),'files including .assetsignore')

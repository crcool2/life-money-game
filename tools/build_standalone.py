import os,re,base64,json,zipfile
import sys
G=os.path.abspath(os.path.join(os.path.dirname(__file__),'..')); OUT=os.path.join(G,'dist'); os.makedirs(OUT,exist_ok=True)
html=open(G+'/index.html').read()
assets={}
mime={'.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}
for root,_,fs in os.walk(G+'/assets'):
    for f in fs:
        p=os.path.join(root,f); rel=os.path.relpath(p,G); ext=os.path.splitext(f)[1].lower()
        if 'furniture_png' in rel: continue
        if ext in mime: assets[rel]='data:'+mime[ext]+';base64,'+base64.b64encode(open(p,'rb').read()).decode()
shim="<script>window.__ASSETS="+json.dumps(assets)+""";
(function(){const d=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
Object.defineProperty(HTMLImageElement.prototype,'src',{get(){return d.get.call(this)},set(v){const k=String(v).replace(/^\\.\\//,'');d.set.call(this,window.__ASSETS[k]||v)},configurable:true});
const sa=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){if(n==='src'&&this instanceof HTMLImageElement&&window.__ASSETS[v])v=window.__ASSETS[v];return sa.call(this,n,v)};})();</script>"""
def inl(m):
    src=m.group(1); return '<script>\n'+open(G+'/'+src).read().replace('</script','<\\/script')+'\n</script>'
html=re.sub(r'<script src="([^"]+)"></script>',inl,html)
html=html.replace('url(assets/scenes/citymap.webp)','url('+assets['assets/scenes/citymap.webp']+')')
i=html.index('<script>'); html=html[:i]+shim+'\n'+html[i:]
open(OUT+'/life-money-game.html','w').write(html)
print('html MB',round(len(html)/1e6,2),'assets',len(assets))
z=zipfile.ZipFile(OUT+'/life-money-game.zip','w',zipfile.ZIP_DEFLATED)
for root,dirs,fs in os.walk(G):
    dirs[:]=[d for d in dirs if d not in ('.git','dist','tools','node_modules')]
    for f in fs:
        p=os.path.join(root,f); rel=os.path.relpath(p,G)
        if rel.startswith('js/_data') or rel.startswith('assets/furniture_png'): continue
        z.write(p,'life-money-game/'+rel)
z.write(OUT+'/life-money-game.html','life-money-game/life-money-game-ไฟล์เดียว.html'); z.close()
print('zip MB',round(os.path.getsize(OUT+'/life-money-game.zip')/1e6,2))

"""Generate an ALIGNED test chest sheet from the body frames, as a stand-in for
extracted gear art.  For every body sheet public/sprites/player/<pose>-<dir>.png
it outputs public/sprites/gear/chest/testplate/<pose>-<dir>.png with the torso
recolored steel + the body outline kept, transparent everywhere else.  Because
it's derived from the body it is pixel-aligned to each frame, which is exactly
what the layered renderer expects -- so it validates the whole pipeline without
new art."""
from PIL import Image
import numpy as np, glob, os
STEEL=(120,130,148)
def masks(a):
    r=a[:,:,0].astype(int);g=a[:,:,1].astype(int);b=a[:,:,2].astype(int);al=a[:,:,3]
    op=al>40
    skin=op&(r>g)&(g>=b)&((r-b)>30)&(r>90)&((r-g)>25)
    pants=(al>180)&(g>=r-10)&(g>b+8)&(r<150)
    return op,skin,pants
def plate_frame(fr):
    a=np.array(fr.convert('RGBA')); op,skin,pants=masks(a); H,W=op.shape
    out=np.zeros((H,W,4),np.uint8)
    if skin.sum()<20: return Image.fromarray(out,'RGBA')
    crown=np.where(skin.any(1))[0].min(); bottom=np.where(op.any(1))[0].max()
    mid=(crown+bottom)//2; pr=np.where(pants.any(1))[0]; pr2=pr[(pr>=mid)&(pr<bottom)]
    waist=pr2.min() if len(pr2) else int(crown+0.55*(bottom-crown))
    collar=int(round(crown+0.30*(waist-crown)))
    for x in range(W):
        cw=waist
        cp=np.where(pants[mid:bottom,x])[0]
        if len(cp): cw=mid+cp[0]
        for y in range(collar,cw):
            if skin[y,x]:
                out[y,x]=[STEEL[0],STEEL[1],STEEL[2],255]   # plate body
            elif op[y,x] and not pants[y,x]:
                out[y,x]=[a[y,x,0],a[y,x,1],a[y,x,2],255]    # keep dark outline
    return Image.fromarray(out,'RGBA')
def process(path):
    sheet=Image.open(path).convert('RGBA'); W=sheet.width; n=max(1,W//256)
    out=Image.new('RGBA',(n*256,256),(0,0,0,0))
    for i in range(n):
        fr=sheet.crop((i*256,0,(i+1)*256,256))
        out.paste(plate_frame(fr),(i*256,0))
    name=os.path.basename(path)
    out.save(f'public/sprites/gear/chest/testplate/{name}')
    return name,n
for p in sorted(glob.glob('public/sprites/player/*-*.png')):
    base=os.path.basename(p)
    if any(base.startswith(pose+'-') for pose in ['stand','jog','hit','pickup','attack']):
        nm,n=process(p); print(f'{nm}: {n} frames')

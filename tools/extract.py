import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
import colorsys, random, os
R='/Users/vivekshankar/Desktop/hungry-catrpillar/'
OUT='/Users/vivekshankar/rishi-caterpillar/assets/'
os.makedirs(OUT+'tex',exist_ok=True)
r1=np.asarray(Image.open('/tmp/ref1.png').convert('RGB')).astype(np.float32)
r2=np.asarray(Image.open(R+'il_1588xN.8249044203_pwj7.jpg').convert('RGB')).astype(np.float32)
bf=np.asarray(Image.open(R+'butterfly.jpeg').convert('RGB')).astype(np.float32)

def cutout(img, box, t0=22, t1=48, minarea=400, keep_largest=False, pad=6, sat_boost=True, name=None, scale=1.0, kill=None, post=None):
    x0,y0,x1,y1=box; c=img[y0:y1,x0:x1].copy()
    border=np.concatenate([c[0],c[-1],c[:,0],c[:,-1]])
    bg=np.median(border,axis=0)
    d=np.sqrt(((c-bg)**2).sum(-1))
    mx=c.max(-1); mn=c.min(-1); sat=(mx-mn)/(mx+1e-3)
    bgsat=(bg.max()-bg.min())/(bg.max()+1e-3)
    score=np.maximum(d, (sat-bgsat)*255*1.1)
    a=np.clip((score-t0)/(t1-t0),0,1)
    hard=a>0.5
    hard=ndimage.binary_opening(hard,iterations=1)
    lab,n=ndimage.label(hard)
    sizes=ndimage.sum(hard,lab,range(1,n+1))
    keep=np.zeros_like(hard)
    if keep_largest:
        keep=lab==(np.argmax(sizes)+1)
    else:
        for i,s in enumerate(sizes):
            if s>=minarea: keep|=lab==(i+1)
    if kill is not None:
        for (kx0,ky0,kx1,ky1) in kill: keep[ky0:ky1,kx0:kx1]=False
    keep=ndimage.binary_dilation(keep,iterations=2)
    a=a*keep
    a=ndimage.gaussian_filter(a,0.6)
    a=np.minimum(a, ndimage.grey_erosion(a,size=(3,3))*0.6+a*0.4)
    if post is not None: a=post(c,a)
    # un-premultiply bg fringe: push edge colors away from bg
    aa=np.clip(a,0.05,1)[...,None]
    col=np.clip((c-bg*(1-aa))/aa,0,255)
    col=np.where(a[...,None]>0.95,c,col)
    rgba=np.dstack([col,a*255]).astype(np.uint8)
    im=Image.fromarray(rgba,'RGBA')
    bb=im.getbbox(); im=im.crop((max(0,bb[0]-pad),max(0,bb[1]-pad),min(im.width,bb[2]+pad),min(im.height,bb[3]+pad)))
    if scale!=1.0: im=im.resize((int(im.width*scale),int(im.height*scale)),Image.LANCZOS)
    if name: im.save(OUT+name+'.png',optimize=True); print(name,im.size)
    return im

# caterpillar head from r2 (head + antennae)
def headpost(c,a):
    H,W=a.shape; yy,xx=np.mgrid[0:H,0:W]
    g=c[...,1]; r=c[...,0]
    bad=((g>r*0.9)&(yy>95)&(xx<W*0.16))|((xx<W*0.12)&(yy>55))
    bad=ndimage.binary_dilation(bad,iterations=2)
    return a*(~bad)
cutout(r2,(955,545,1050,775),name='cat_head',minarea=60,post=headpost)
# fruits from ref1
def satpost(c,a):
    mx=c.max(-1); mn=c.min(-1); sat=(mx-mn)/(mx+1e-3)
    return a*np.clip((sat-0.34)/0.1,0,1)
cutout(r1,(392,1500,553,1720),name='f_apple')
cutout(r1,(648,1580,758,1735),name='f_plum')
cutout(r1,(798,1565,918,1722),name='f_strawberry')
cutout(r1,(955,1545,1105,1715),name='f_orange')
cutout(r1,(1215,1455,1365,1700),name='f_pear')
cutout(r1,(345,385,605,640),name='sun',minarea=150,kill=[(235,195,260,260),(0,0,40,30)],t0=30,t1=60,post=satpost)
cutout(r1,(1025,312,1255,540),name='branch',minarea=300)
cutout(bf,(0,0,881,348),name='butterfly',t0=14,t1=40,minarea=30)

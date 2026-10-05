import numpy as np, random, colorsys
from PIL import Image
from scipy import ndimage
R='/Users/vivekshankar/Desktop/hungry-catrpillar/'
OUT='/Users/vivekshankar/rishi-caterpillar/assets/tex/'
L=lambda p: np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
r1=L('/tmp/ref1.png'); r2=L(R+'il_1588xN.8249044203_pwj7.jpg'); bf=L(R+'butterfly.jpeg')
def hsv(img):
    x=img/255.; mx=x.max(-1); mn=x.min(-1); d=mx-mn+1e-6
    r,g,b=x[...,0],x[...,1],x[...,2]
    h=np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60
    s=d/(mx+1e-6); return h,s,mx
def synth(name, img, box, hue, smin=.3, vmin=.15, T=384, P=60, N=260, seed=1):
    x0,y0,x1,y1=box; c=img[y0:y1,x0:x1]
    h,s,v=hsv(c)
    if hue[0]<=hue[1]: hm=(h>=hue[0])&(h<=hue[1])
    else: hm=(h>=hue[0])|(h<=hue[1])
    m=hm&(s>=smin)&(v>=vmin)
    r=P//2
    valid=ndimage.binary_erosion(m,iterations=r)
    ys,xs=np.nonzero(valid)
    if len(ys)<20:
        P=max(14,P//2); r=P//2; valid=ndimage.binary_erosion(m,iterations=r); ys,xs=np.nonzero(valid)
    print(name,'valid',len(ys),'P',P)
    rnd=random.Random(seed)
    med=np.median(c[m],axis=0)
    out=np.ones((T,T,3),np.float32)*med
    yy,xx=np.mgrid[0:P,0:P]-(P-1)/2
    for i in range(N):
        k=rnd.randrange(len(ys)); cy,cx=ys[k],xs[k]
        patch=c[cy-r:cy-r+P,cx-r:cx-r+P]
        if patch.shape[:2]!=(P,P): continue
        if rnd.random()<.5: patch=patch[:,::-1]
        if rnd.random()<.5: patch=patch[::-1,:]
        # irregular soft blob alpha
        ang=np.arctan2(yy,xx); rad=np.hypot(yy,xx)/(P/2)
        wob=1+.12*np.sin(ang*2+rnd.random()*6)+.08*np.sin(ang*3+rnd.random()*6)
        a=np.clip((wob*.95-rad)/.45,0,1)[...,None]
        ty,tx=rnd.randrange(T),rnd.randrange(T)
        for dy in (0,-T):
            for dx in (0,-T):
                Y0,X0=ty+dy,tx+dx
                ys0,ys1=max(0,Y0),min(T,Y0+P); xs0,xs1=max(0,X0),min(T,X0+P)
                if ys1<=ys0 or xs1<=xs0: continue
                pa=patch[ys0-Y0:ys1-Y0, xs0-X0:xs1-X0]; aa=a[ys0-Y0:ys1-Y0, xs0-X0:xs1-X0]
                out[ys0:ys1,xs0:xs1]=out[ys0:ys1,xs0:xs1]*(1-aa)+pa*aa
    im=Image.fromarray(np.clip(out,0,255).astype(np.uint8))
    im.save(OUT+name+'.jpg',quality=86); return im
S={}
S['green']=synth('green',r2,(545,455,960,805),(85,160),smin=.35,seed=2)
S['teal']=synth('teal',r2,(545,455,960,805),(160,215),smin=.3,seed=3)
S['red']=synth('red',r2,(965,640,1045,775),(345,15),smin=.55,P=30,seed=4,N=1400)
S['redone']=synth('redone',r1,(720,480,960,950),(350,22),smin=.5,seed=5)
S['orange']=synth('orange',r1,(955,1545,1105,1715),(15,40),smin=.5,seed=6)
S['yellow']=synth('yellow',r1,(400,440,560,600),(30,55),smin=.45,seed=7)
S['plum']=synth('plum',r1,(648,1580,758,1735),(215,300),smin=.25,P=40,seed=8)
S['apple']=synth('apple',r1,(392,1500,553,1720),(345,20),smin=.45,seed=9)
S['pear']=synth('pear',r1,(1215,1455,1365,1700),(55,120),smin=.3,seed=10)
S['leaf']=synth('leaf',r1,(1025,312,1255,540),(70,150),smin=.35,P=34,seed=11)
S['bfblue']=synth('bfblue',bf,(0,0,881,348),(180,235),smin=.4,P=34,seed=12,N=1600)
S['bfpurple']=synth('bfpurple',bf,(0,0,881,348),(258,295),smin=.45,P=26,seed=13,N=2400)
S['bflime']=synth('bflime',bf,(0,0,881,348),(65,115),smin=.45,P=30,seed=14,N=1800)
S['bfyellow']=synth('bfyellow',bf,(0,0,881,348),(42,64),smin=.45,P=22,seed=15,N=3000)
S['strawberry']=synth('strawberry',r1,(798,1565,918,1722),(345,15),smin=.5,P=40,seed=16)
# gradient-mapped colours from real stroke structure
def gmap(name, src, stops):
    a=np.asarray(src).astype(np.float32)
    lum=(a[...,0]*.3+a[...,1]*.59+a[...,2]*.11)
    lo,hi=np.percentile(lum,2),np.percentile(lum,98); t=np.clip((lum-lo)/(hi-lo),0,1)
    xs=np.linspace(0,1,len(stops)); st=np.array(stops,np.float32)
    out=np.stack([np.interp(t,xs,st[:,i]) for i in range(3)],-1)
    Image.fromarray(out.astype(np.uint8)).save(OUT+name+'.jpg',quality=86)
gmap('brown',S['green'],[(70,38,18),(110,64,30),(150,95,48),(176,124,70)])
gmap('choc',S['teal'],[(48,24,14),(78,42,24),(104,60,34),(130,82,50)])
gmap('pink',S['redone'],[(196,40,96),(232,84,140),(244,130,176),(252,176,206)])
gmap('cream',S['yellow'],[(232,214,180),(244,230,200),(250,242,222),(255,250,238)])
gmap('tan',S['yellow'],[(180,120,50),(210,150,70),(230,180,100),(240,204,130)])
gmap('pickle',S['pear'],[(40,80,20),(70,112,30),(104,140,44),(140,170,70)])
gmap('blue',S['bfblue'],[(20,50,140),(30,80,180),(50,120,210),(90,160,230)])
gmap('navy',S['plum'],[(14,20,60),(26,34,90),(40,50,120),(60,72,150)])
gmap('violet',S['plum'],[(70,30,120),(100,50,160),(130,80,190),(160,110,210)])
gmap('salami',S['apple'],[(130,20,30),(170,40,48),(200,70,70),(220,100,96)])
gmap('lgreen',S['leaf'],[(60,130,30),(100,170,40),(140,200,60),(180,220,90)])

# real segment swatches from the reference caterpillar body (r2)
x0,y0,x1,y1=545,455,960,805; c=r2[y0:y1,x0:x1]; h,sv,v=hsv(c)
m=(h>=80)&(h<=215)&(sv>=.3)&(v>=.15)
P=52; valid=ndimage.binary_erosion(m,iterations=P//2)
ys,xs=np.nonzero(valid); rnd=random.Random(7); picks=[]
idx=list(range(len(ys))); rnd.shuffle(idx)
for k in idx:
    y,x=ys[k],xs[k]
    if all((y-py)**2+(x-px)**2>(P*0.8)**2 for py,px in picks): picks.append((y,x))
    if len(picks)>=24: break
print('swatches',len(picks))
atlas=Image.new('RGB',(P*len(picks),P))
for i,(y,x) in enumerate(picks):
    atlas.paste(Image.fromarray(c[y-P//2:y-P//2+P,x-P//2:x-P//2+P].astype(np.uint8)),(i*P,0))
atlas.save('/Users/vivekshankar/rishi-caterpillar/assets/segments.jpg',quality=90)

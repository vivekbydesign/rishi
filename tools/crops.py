from PIL import Image, ImageDraw
R='/Users/vivekshankar/Desktop/hungry-catrpillar/'
r1=Image.open('/tmp/ref1.png').convert('RGB'); r2=Image.open(R+'il_1588xN.8249044203_pwj7.jpg').convert('RGB')
boxes={'r1_sun':(r1,(345,385,615,650)),'r1_branch':(r1,(1025,310,1290,540)),'r1_fruits':(r1,(395,1460,1370,1740)),
'r1_one':(r1,(720,480,960,950)),'r2_cat':(r2,(545,455,1065,805)),'r1_cat':(r1,(600,640,1050,960)),'r2_foods':(r2,(650,955,960,1030))}
for k,(im,b) in boxes.items():
  im.crop(b).save(f'/tmp/c_{k}.png')

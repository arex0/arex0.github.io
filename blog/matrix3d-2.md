---
title: "CSS matrix3d 旋转3D物体（实践篇）"
keywords: [Javascript,3D]
description: "use css matrix3d rotate object in 3d"
created: "2020-04-06"
modified: "2020-04-08"
markdown: true
share: true
---

# CSS matrix3d 旋转3D物体（实践篇）
***让3d物体按照用户想法，跟随指尖旋转***

## 前言
我在设计页面的时候，试图从3d的角度审视页面组件，因此构建了app [design 3d](/apps/design)。但是简单的右滑绕Y轴旋转逻辑并不正确。在绕Z轴旋转`180deg`后，Y轴反转了。我猛然醒悟，原来需要矩阵运算！！！
经过[CSS matrix3d 旋转3D物体（原理篇）](/blog/matrix3d)的努力后，我们初步理解了`matrix3d`的原理，现在我们从实际出发，构建一个能够操作3d物体的js库吧。
## 开始
### perspective & perspective()
操作3d物体的第一步是拥有观察3d物体的空间。原理篇讲过，`perspective`用于调整观察内部元素的距离，`perspective()`用于调整元素本身距离我们的距离。因此我们考虑实际需求，物体必须和我们保持一定的`safe`距离，否则会穿透到我们后面，这样就观察不到了。距离和`translateZ`有关，考虑到物体会旋转，因此动态距离为`object.maxWidth/2`，所以`perspective`的值应该为`translateZ+object.maxWidth/2+safe`。

只是为了观察单个物体，[design 3d](/apps/design)中我们不需要平移物体，`safe`距离和屏幕成比例关系，元素最大宽度和屏幕最大宽度一致，因此我将`perspective`的值设为`100vmax`。
```css
    #zero-3d,
    #zero-3d * {
        transform-style: preserve-3d;
        perspective: 100vmax;
    }
```
### Proxy
Proxy代理能够直接从数据驱动视图，让数据和视图保持一致，会给代码和操作带来很多便利。因此我们构建一个控制器用来代理。
```js
function zero3d(ele,opts){
    let root = (opts&&opts.root),
        O = Object.create(null)
    O.m = new DOMMatrix([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])
    O.x = (opts&&opts.x) || 0
    O.y = (opts&&opts.y) || 0
    O.z = (opts&&opts.z) || 0
    O.rx = (opts&&opts.rx) || 0
    O.ry = (opts&&opts.ry) || 0
    O.rz = (opts&&opts.rz) || 0
    O.rzc = (opts&&opts.rzc) || null
    O.size = (opts&&opts.size) || 1
    O.p = (opts&&opts.p) || 0

    function render(){
        /* render update */
    };
    requestAnimationFrame(render) // first render

    /* bind event */
    return new Proxy(O, {
        set: (t, p, v) => {
            t[p] = v
            requestAnimationFrame(render)
        }
    })
}
```
(因为firefox还不支持`?.`语法，所以上面的代码有些丑陋)
### scale3d(sx, sy, sz)
然后我们从简单的开始，缩放是我们整个应用最简单的操作。

对于电脑，我们用滚轮缩放。由于滚动值很大，我们对其进行了比例缩放,为了防止它太小甚至变成负值，我们设置最小值，同理推论，设定了最大值
```js
function scale(e) {
  O.size = Math.min(1000,Math.max(O.size + e.wheelDelta / 1200,0.001))
  requestAnimationFrame(render)
}
root.addEventListener("wheel", scale)
```
对于手机等触屏设备，我们用双指缩放。所以需要管理手指状态。
```js
const ArrayMethods = Array.prototype
const hypot = (p1, p2) => Math.hypot(p1.pageX - p2.pageX, p1.pageY - p2.pageY)
const copyTouch = touch => ({ id: touch.identifier, pageX: touch.pageX, pageY: touch.pageY })
const findTouch = (touches, id) => ArrayMethods.find.call(touches, ({ identifier }) => identifier == id)
let touches = []

let startTouch = function(e){
    ArrayMethods.push.apply(touches, ArrayMethods.map.call(e.changedTouches, copyTouch))
}
let endTouch = function(e) {
    ArrayMethods.forEach.call(e.changedTouches, touch => touches.splice(touches.findIndex(({ id }) => id == touch.identifier), 1))
}

root.addEventListener('touchstart', startTouch)
root.addEventListener('touchend', endTouch)
root.addEventListener('touchcancel', endTouch)
```
为了和手指保持一致，触屏缩放我们不采用加法，而是采用乘法。而且我们希望响应集中在1附近，避免高频响应带来极快的变化。
```js
function scaleByTouches(e) {
    if (touches.length >= 2) {
        stopRotateXY()
        O.size *= (hypot(findTouch(e.changedTouches, touches[0].id) || touches[0], findTouch(e.changedTouches, touches[1].id) || touches[1]) / hypot(touches[0], touches[1])) ** 0.05
        requestAnimationFrame(render)
    }
}
```
留意到对于触屏设备，手指有相当多的作用，为了避免多个注册事件，我们采用包装的方法对其添加`EventListener`
```js
let start = startTouch,end = endTouch
startTouch = e =>{
    start(e)
    if(touches.length>=2) root.addEventListener('touchmove', scaleByTouches)
}
endTouch = e =>{
    end(e)
    if(touches.length<2) root.removeEventListener('touchmove', scaleByTouches)
}
```
和变换结果很容易理解一样，缩放的代码实现也很简单
### rotate控制
普通的操作绕X轴旋转和绕Y轴旋转，不需要考虑设备类型，因为都是通过一个点来交互
```js
let X = 0, Y = 0
function startRotateXY(e) {
    X = e.clientX
    Y = e.clientY
    root.removeEventListener('pointerdown', startRotateXY)
    document.addEventListener('pointermove', rotateXY)
    document.addEventListener('pointerup', stopRotateXY)
}
function stopRotateXY() {
    document.removeEventListener('pointerup', stopRotateXY)
    document.removeEventListener('pointermove', rotateXY)
    root.addEventListener('pointerdown', startRotateXY)
}
root.addEventListener('pointerdown', startRotateXY)
```
因为屏幕是二维的，对于鼠标用户只能操作绕X轴旋转和绕Y轴旋转，因此需要添加一个控制器用于控制绕Z轴旋转。
```html
<div id='rotate-controller' style='font-size:2em;width:5em; height:5em; border:solid .2em; border-radius:50%; line-height:5em; transform:rotateZ(-60deg);user-select:none;'>⬤</div>
```
```js
let Zx = 0, Zy = 0
function startRotateZ() {
    let p = O.rzc.getBoundingClientRect()
    Zx = p.x + (p.width >> 1)
    Zy = p.y + (p.height >> 1)
    O.rzc.removeEventListener('pointerdown', startRotateZ)
    document.addEventListener('pointermove', rotateZ)
    document.addEventListener('pointerup', stopRotateZ)
    document.addEventListener('pointercancel', stopRotateZ)
}
function stopRotateZ() {
    document.removeEventListener('pointercancel', stopRotateZ)
    document.removeEventListener('pointerup', stopRotateZ)
    document.removeEventListener('pointermove', rotateZ)
    O.rzc.addEventListener('pointerdown', startRotateZ)
}
O.rzc && O.rzc.addEventListener('pointerdown', startRotateZ)
```
而对于触屏用户，可以用两根手指轻松控制绕Z轴旋转，更直观易于使用。
```js
let start = startTouch,end = endTouch
startTouch = e =>{
    start(e)
    if(touches.length>=2) root.addEventListener('touchmove', rotateZByTouches)
}
endTouch = e =>{
    end(e)
    if(touches.length<2) root.removeEventListener('touchmove', rotateZByTouches)
}
```
### rotate计算
和上面的为了避免高频突变，设定的固定缩放比例不同。旋转操作我选择使用与屏幕宽度成反比的变量，这样在所有屏幕完整滑动都旋转相同的角度。

我选定角度为200，这样从左到右滑动一次就能旋转差不多180度。
```js
const speed =  (200 / window.innerWidth)
function rotateXY(e) {
    if (touches.length >= 2) return
    O.rx -= (e.pageY - Y) * speed
    O.ry += (e.pageX - X) * speed
    X = e.pageX
    Y = e.pageY
    requestAnimationFrame(render)
}
```

```js
const PI = Math.PI / 180
function rotateZ(e){
  O.rz = Math.atan2(e.pageY - Zy, e.pageX - Zx) / PI + 180
  requestAnimationFrame(render)
}
function rotateZByTouches(e) {
  if (touches.length >= 2) {
      let s1 = touches[0],
          s2 = touches[1],
          t1 = findTouch(e.changedTouches, touches[0].id) || touches[0],
          t2 = findTouch(e.changedTouches, touches[1].id) || touches[1]
          O.rz += (Math.atan2(t1.pageY-t2.pageY,t1.pageX-t2.pageX)-Math.atan2(s1.pageY-s2.pageY,s1.pageX-s2.pageX))/PI *0.05
      requestAnimationFrame(render)
  }
}
```
### Render
一开始我写出了这样的代码
```js
let style = ele.style
function render(){
    style.transform = `translateX(${O.x}) translateY(${O.y}) translateZ(${O.z}) rotateX(${O.rx}deg) rotateY(${O.ry}deg) rotateZ(${O.rz-90}deg) scale3d(${O.size},${O.size},${O.size})`
    style.setProperty('--zero3d-separation', O.p + 'px')
    O.rzc&&O.rzc.style&&(O.rzc.style.transform = `rotateZ(${O.rz}deg)`)
}
```
问题是什么呢？当绕X轴旋转90度时,如果我们再做绕原Y轴旋转90度会怎么样？
```
    | z                                              z   
    |           x                          +-------------
    +-------------                       /|              
   /                rotateY(90deg)     y/ |              
 y/   html         ----------------->  /  |              
 /                                    /   | x            
                                     /html|                         
```
在用户的视觉效果中，是整个页面绕Z轴旋转了90度，这一点也不符合直觉。我们的目标可是***让3d物体按照用户想法，跟随指尖旋转***，所以我们的旋转操作必须是根据新的坐标系来操作的。

我们需要使用矩阵乘法，缩放`(O.size,0,0,0,0,O.size,0,0,0,0,O.size,0,0,0,0,1)`，平移`(1,0,0,0,0,1,0,0,0,0,1,0,O.x,O.y,O.z,1)`和每个轴变换`(1,0,0,0,0,cx,sx,0,0,-sx,cx,0,0,0,0,1)`,`(cy,0,-sy,0,0,1,0,0,sy,0,cy,0,0,0,0,1)`,`(cz,sz,0,0,-sz,cz,0,0,0,0,1,0,0,0,0,1)`
```
+-                                                                    -+
|       cy*cz*O.size            -cy*sz*O.size         sy*O.size    O.x |
| (cx*sz+sx*sy*cz)*O.size  (cx*cz-sx*sy*sz)*O.size  -sx*cy*O.size  O.y |
| (sx*sz-cx*sy*cz)*O.size  (sx*cz+cx*sy*sz)*O.size   cx*cy*O.size  O.z |
|            0                        0                   0         1  |
+-                                                                    -+
```
```js
let style = ele.style
let rzcv = 0

function rotateZ(e){
  O.rz = Math.atan2(e.pageY - Zy, e.pageX - Zx) / PI + 180 - rzcv
  requestAnimationFrame(render)
}
function render(){
    let x = O.rx*PI, y = O.ry*PI, z = O.rz*PI
    let cx = cos(x), sx = sin(x), cy = cos(y), sy = sin(y), cz = cos(z), sz = sin(z)
    
    O.m.preMultiplySelf(
    new DOMMatrix([
            cy*cz*O.size,   (cx*sz+sx*sy*cz)*O.size,    (sx*sz-cx*sy*cz)*O.size,    0,
            -cy*sz*O.size,  (cx*cz-sx*sy*sz)*O.size,    (sx*cz+cx*sy*sz)*O.size,    0,
            sy*O.size,      -sx*cy*O.size,              cx*cy*O.size,               0,
            O.x,            O.y,                        O.z,                        1
    ]))
    style.transform = O.m.toString()
    rzcv = (rzcv+O.rz)%360
    O.rzc&&O.rzc.style&&(O.rzc.style.transform = `rotateZ(${rzcv}deg)`)

    O.x = 0
    O.y = 0
    O.z = 0
    O.rx = 0
    O.ry = 0
    O.rz = 0
    O.size = 1

    style.setProperty('--zero3d-separation', O.p + 'px')
}
```
### 可选择
不是每个人都需要完整的实现，所以我们可以加上开关
```js
if(opts&&opts.rotatable){
  /* listen rotate */
}
if(opts&&opts.scalable){
  /* listen scale */
}
```
### 其它
让前面调整粒度很细，又不会限制可调范围的大小。
```
ctl_3d.p = 1/(1.001-(d/1000)**.1) - 1/1.001
```
其中1000指定最大值，.1指定前部缓度，当前结果

d      | p
------ | -----
  100  |  3.8
  200  |  5.7
  300  |  7.7
  400  |  10 
  500  |  14 
  600  |  18 
  700  |  26 
  800  |  42 
  900  |  86 
  1000 |  999
  
## 总结
了解原理后我们又进行了实践，且完成了一个js库[zero-3d.js](https://github.com/arex0/zero-3d.js)，似乎3D也并非普通前端不能攻克的障碍。接下来让我们把这些技术应用到所有我们用的到的地方吧。
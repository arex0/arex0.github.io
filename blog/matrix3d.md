---
title: "CSS Matrix3d 旋转3D物体"
keywords: [CSS,Math]
description: "use css matrix3d rotate object in 3d"
created_time: "2020-04-06"
modified_time: "2020-04-05"
markdown: true
share: true
---

# CSS Matrix3d 旋转3D物体
***让3d物体按照用户想法，跟随指尖旋转***

## 前言
我在设计页面的时候，试图从3d的角度审视页面组件，因此构建了app [design 3d](/apps/design)。但是简单的右滑绕Y轴旋转逻辑并不正确。在绕Z轴旋转`180deg`后，Y轴反转了。我猛然醒悟，原来需要矩阵运算！！！
## 开始
### 2d 页面坐标系
在笛卡尔坐标系中，每个 欧氏空间 里的点都由横坐标和纵坐标这两个值来确定。 在CSS（和大部分的计算机图形学）中，原点 (0, 0) 在元素的左上角。每个点都使用数学上的向量符号(x,y)来描述。
```
        x
    +------->
    | 
  y |   html
    |
    v
```
### matrix2d
CSS 函数 matrix() 用六个指定的值来指定一个均匀的二维（2D）变换矩阵。这个矩形中的常量值是不作为参数进行传递的，其他的参数顺序和主列顺序一致。
```
matrix2d(a,b,0,c,d,0,tx,ty,1)
=== matrix(a,b,c,d,tx,ty);
--------------------
+-        -+
| a  c  tx |
| b  d  ty |
| 0  0  1  |
+-        -+
--------------------

        *(a,b,c,d,tx,ty)
(x, y)--------------------->(a*x+c*y+tx, b*x+d*y+ty)

+-        -+   +- -+   +-          -+
| a  c  tx |   | x |   | a*x+c*y+tx |
| b  d  ty | . | y | = | b*x+d*y+ty |
| 0  0  1  |   | 1 |   |     1      |
+-        -+   +- -+   +-          -+
```
### matrix3d
`matrix(a,b,c,d,tx,ty)` 是 `matrix3d(a,b,0,0,c,d,0,0,0,0,1,0,tx,ty,0,1)` 的简写。
所以上面又可以写为
```
matrix3d(a,b,0,0,c,d,0,0,0,0,1,0,tx,ty,0,1)
=== matrix2d(a,b,0,c,d,0,tx,ty,1)
=== matrix(a,b,c,d,tx,ty);
--------------------
+-           -+
| a  c  0  tx |
| b  d  0  ty |
| 0  0  1  0  |
| 0  0  0  1  |
+-           -+   
--------------------

            *(a,b,c,d,tx,ty)
(x, y, z)--------------------->(a*x+c*y+tx, b*x+d*y+ty, z)

+-           -+   +- -+   +-          -+
| a  c  0  tx |   | x |   | a*x+c*y+tx |
| b  d  0  ty | . | y | = | b*x+d*y+ty |
| 0  0  1  0  |   | z |   |     z      |
| 0  0  0  1  |   | 1 |   |     1      |
+-           -+   +- -+   +-          -+
```
### 3d 页面坐标系
3d看时页面增加了一个z轴指向屏幕外
```
            x
        +------->
       /|
    z / |  html
     / y|
        v
```
### perspective & perspective()
页面默认处于z=0处，要调整页面位置可以设置`perspective`，这个`css`属性用于控制元素距离我们的距离。可能有人已经注意到`transform`里有一个`perspective()`，他们表示不同的含义。`perspective`用于调整观察内部元素的距离，`perspective()`用于调整元素本身距离我们的距离。
```
perspective(d) === matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,−1/d,1)
--------------------
+-             -+
| 1  0    0   0 |
| 0  1    0   0 |
| 0  0    1   0 |
| 0  0  −1/d  1 |
+-             -+ 

               *perspective(d)
(x, y, z, 1)-------------------->(x, y, z, 1-z/d)
+-             -+   +- -+   +-     -+
| 1  0    0   0 |   | x |   |   x   |
| 0  1    0   0 | . | y | = |   y   |
| 0  0    1   0 |   | z |   |   z   |
| 0  0  −1/d  1 |   | 1 |   | 1-z/d |
+-             -+   +- -+   +-     -+

                   *(a,b,c,d,tx,ty)
(x, y, z, 1-z/d)--------------------->(a*x+c*y+tx, b*x+d*y+ty, z, 1-z/d)

+-           -+   +-     -+   +-                  -+
| a  c  0  tx |   |   x   |   | a*x+c*y+tx*(1-z/d) |
| b  d  0  ty | . |   y   | = | b*x+d*y+ty*(1-z/d) |
| 0  0  1  0  |   |   z   |   |         z          |
| 0  0  0  1  |   | 1-z/d |   |       1-z/d        |
+-           -+   +-     -+   +-                  -+
```
可见`perspective()`并不直接改变元素大小，而是通过改变`tx`,`ty`,`tz`的比例间接改变元素大小。
#### 
## 总结
(function() {
if (!window.CSSTransformValue) {
  document.querySelector('#box').remove();
  document.querySelector('#support').classList.add('show');
  return;
}

const transform = new CSSTransformValue([
  new CSSRotate(0, 0, 1, CSS.deg(0)),
  // new CSSScale(0.5, 0.5)
  // new CSSTranslate(CSS.px(0), CSS.px(0))
]);

const box = document.querySelector('#box');
box.attributeStyleMap.set('transform', transform);

let rafId;

function draw() {
  rafId = requestAnimationFrame(draw);
  transform[0].angle.value = (transform[0].angle.value + 5) % 360;
  transform[1].x.value += 1;
  box.attributeStyleMap.set('transform', transform); // commit it.
}
box.addEventListener('mouseenter', function(e) {
  draw();
});

box.addEventListener('mouseleave', function(e) {
  cancelAnimationFrame(rafId);
});
})();

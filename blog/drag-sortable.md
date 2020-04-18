---
title: "Drag API (Part 1: Sortable)"
keywords: [Javascript,API,Drag]
description: "everything about drag api."
created: "2020-04-14"
modified: "2020-04-18"
markdown: true
share: true
---

# Drag API (Part 1: Sortable)
***通过拖动更直观的表示行为***

## 前言
前端胜在所见即所得，直观即是最重要的因素。为了直观，需要用虚拟的元素去模拟现实世界的事物。现代设计的各种手势操作，是很重要的一部分，其中有一种操作就是拖动。

这是`Drag API`系列的第一篇文章，本篇内容会说明如何实现拖动排序。

## 开始
### 原理
原本浏览器就支持拖动，但是只是针对特定元素，文本，链接，图片，但是HTML5 中存在一个`Drag API`,只要令元素的`draggable`属性为`true`,元素就变成可拖动的了。
```html
<div id='sorter'>
    <span draggable='true'>created</span>
    <span draggable='true'>modified</span>
    <span draggable='true'>like</span>
    <span draggable='true'>visit</span>
</div>
```
我们需要通过`dataTransfer`传递信息，目前还只支持文本内容`(plain/url/html)`
```js
on(ele,'dragstart',e=>{
    e.dataTransfer.setData('text/plain', ele.getAttribute('sort-id'))
})
```
为了接受传递过来的信息，我们需要定义一个放置区，阻止默认行为（打开链接，不可放置文字）以允许`drop`事件。
```js
on(DropZone,'dragover',e=>e.preventDefault())
```
然后在`drop`事件中处理传递到目标的信息
```js
on(DropZone,'drop',e=>{
    let t = e.target
    /* ... */
})
```
拖动事件的触发对象和触发顺序为:
```
dragged element: dragstart -> drag (when move) -> dragend
if dragging:
    drop zone: dragenter -> dragover (350ms/p when in zone + when move) -> dragleave
```
### 可拖动排序
为了方便我们可以为每个元素加上sort-id便于处理，根据上一节内容可以很容易写出以下代码
```js
let sortID = 0
document.querySelectorAll('#sorter [draggable="true"]').forEach(ele=>{
    ele.setAttribute('sort-id', sortID++)
    on(ele,'dragstart',e=>{
        e.dataTransfer.setData('text/plain', ele.getAttribute('sort-id'))
    })
    on(ele,'dragover',e=>e.preventDefault())
    on(ele,'drop',e=>{
        let t = e.target, rect = t.getBoundingClientRect(), next = (e.clientY - rect.top)/(rect.bottom - rect.top) > .5
        if(next&&!t.nextElementSibling){
            t.parentNode.appendChild(document.querySelector(`[sort-id="${e.dataTransfer.getData('text/plain')}"]`))
        }else{
            t.parentNode.insertBefore(document.querySelector(`[sort-id="${e.dataTransfer.getData('text/plain')}"]`), next && t.nextElementSibling || t)
        }
    })
})
```
这里做了一个优化，根据鼠标位置调整插入位置。但在实际使用中，如果对象太小不好把握指针位置，应该采用以下逻辑处理
```
    a = dragged element
    b = drop zone
    if a == b 
        return
    if a before b
        a insert after b
    else 
        a insert before b
```
### 处理变化
对于处理变化有很多方式，我们可以在`drop`事件中注入处理函数，也可以用`MutationObserver`来监听变化。
```js
const sortObserver = new MutationObserver(e=>{
    /* deal with here */
})
sortObserver.observe(document.getElementById('sorter'),{childList: true})
```
利用`MutationObserver`我们可以处理不限定于drag产生的位置改变。
### polyfill
手机对`Drag API`的[支持](https://caniuse.com/#search=Drag)几乎没有，所以必须用`touch`事件来模拟。
```js
const ArrayMethods = Array.prototype
const hypot = (p1, p2) => Math.hypot(p1.pageX - p2.pageX, p1.pageY - p2.pageY)
const copyTouch = touch => ({ id: touch.identifier, pageX: touch.pageX, pageY: touch.pageY })
const findTouch = (touches, id) => ArrayMethods.find.call(touches, ({ identifier }) => identifier == id)
function on(ele,type,handle,opts){ele.addEventListener(type,handle,opts)}
function un(ele,type,handle,opts){ele.removeEventListener(type,handle,opts)}
function draggable(ele){
    let touch = null
    on(ele,'contextmenu',e=>e.preventDefault())
    on(ele,'touchstart',e=>{
        if (touch) return
        let cancel = false,
            u = e.changedTouches.length-1,
            tc = e.changedTouches[u]
        touch = copyTouch(tc)
        function cancelDrag(e){
            if(e.type!='touchstart'&&touch&&e.type=='touchmove'&&ArrayMethods.every.call(e.changedTouches,tc=>hypot(tc,touch)>50)) return
            cancel = true
            touch = null
        }
        on(document,'touchstart',()=>on(document,'touchstart',cancelDrag,{once:true}),{once:true})
        on(document,'touchmove',cancelDrag,{passive:false})
        on(document,'touchend',cancelDrag,{once:true})
        on(document,'touchcancel',cancelDrag,{once:true})
        setTimeout(()=>{
            un(document,'touchcancel',cancelDrag,{once:true})
            un(document,'touchend',cancelDrag,{once:true})
            un(document,'touchmove',cancelDrag,{passive:false})
            un(document,'touchstart',cancelDrag,{once:true})
            if(!cancel){
                let shadow = ele.cloneNode(true), style = shadow.style
                    src = ele.getBoundingClientRect(), srcX = src.x, srcY = src.y,
                    baseX = tc.pageX, baseY = tc.pageY,
                    data = new DataTransfer()
                Object.entries(getComputedStyle(ele)).forEach(([attr,val])=>{style[attr] = val})
                style.position = 'fixed'
                style.left = srcX+'px'
                style.top = srcY+'px'
                style.opacity = parseFloat(document.body.style.opacity||1) * 0.5
                style.pointerEvents = 'none'
                style.zIndex = 999
                document.body.appendChild(shadow)

                let target = null, overTimer = null, fireover = true
                function getElementByPoint(e){
                    let el = document.elementFromPoint(e.clientX, e.clientY)
                    while (el && getComputedStyle(el).pointerEvents == 'none') {
                        el = el.parentElement;
                    }
                    return el;
                }
                function dispatchEvent(e){
                    shadow.remove()
                    let t = getElementByPoint(e)
                    document.body.appendChild(shadow)
                    let init = {
                        screenX: e.screenX,
                        screenY: e.screenY,
                        clientX: e.clientX,
                        clientY: e.clientY,
                        pageX: e.pageX,
                        pageY: e.pageY,
                        dataTransfer: data
                    }
                    if(t!=target){
                        init.relatedTarget = target
                        t.dispatchEvent(new DragEvent('dragenter',init))
                        init.relatedTarget = t
                        target.dispatchEvent(new DragEvent('dragleave',init))
                        target = t
                        init.relatedTarget = null
                    }
                    clearInterval(overTimer)
                    target.dispatchEvent(new DragEvent('dragover',init))
                    overTimer = setInterval(()=>target.dispatchEvent(new DragEvent('dragover',init)),350)
                }
                function RenderDragMove(e){
                    ele.dispatchEvent(new DragEvent('drag',e))
                    shadow.style.left = srcX-baseX+e.pageX+'px'
                    shadow.style.top  = srcY-baseY+e.pageY+'px'
                }
                function DragMove(e){
                    let t = findTouch(e.changedTouches,touch.id)
                    if (t){
                        e.preventDefault()
                        e.stopPropagation()
                        requestAnimationFrame(()=>{
                            dispatchEvent(t)
                            RenderDragMove(t)
                        })
                    }
                }
                function DragEnd(e){
                    let t = findTouch(e.changedTouches,touch.id)
                    if(t&&(t.identifier==touch.id)){
                        touch = null
                        shadow.remove()
                        shadow = null
                        clearInterval(overTimer)
                        target.dispatchEvent(new DragEvent('drop',{
                            screenX: t.screenX,
                            screenY: t.screenY,
                            clientX: t.clientX,
                            clientY: t.clientY,
                            pageX: t.pageX,
                            pageY: t.pageY,
                            dataTransfer: data
                        }))
                        ele.dispatchEvent(new DragEvent('dragend',t))
                        un(document,'touchcancel',DragEnd)
                        un(document,'touchend',DragEnd)
                        un(document,'touchmove',DragMove,{passive:false})
                    }
                }
                ele.dispatchEvent(new DragEvent('dragstart', {
                    screenX: tc.screenX,
                    screenY: tc.screenY,
                    clientX: tc.clientX,
                    clientY: tc.clientY,
                    pageX: tc.pageX,
                    pageY: tc.pageY,
                    dataTransfer: data
                }))
                ele.dispatchEvent(new DragEvent('dragenter',tc))
                target = ele
                let evt = new DragEvent('dragover',{
                    screenX: e.screenX,
                    screenY: e.screenY,
                    clientX: e.clientX,
                    clientY: e.clientY,
                    pageX: e.pageX,
                    pageY: e.pageY,
                    dataTransfer: data
                })
                ele.dispatchEvent(evt)
                overTimer = setInterval(()=>ele.dispatchEvent(evt),350)
                on(document,'touchmove',DragMove,{passive:false})
                on(document,'touchend',DragEnd)
                on(document,'touchcancel',DragEnd)
            }
        },300)
    })
}
document.querySelectorAll('[draggable="true"]').forEach(draggable)
```
上述代码实现了手机端多点拖动，可在[github](https://github.com/arex0/web-mobile-drag)找到
## 总结
利用现代API，我们可以轻松实现，拖动排序，但需要注意的是代码的兼容性，特别是移动端，可能需要polyfill。一般来说我们可以使用第三方的库，但这会增多请求消耗，而且会引入许多不需要的代码，此时如果能够自己简单实现需要的polyfill，会提高页面响应速度，优化用户体验。

本篇文章简单介绍了如何实现拖动排序，下面我们继续了解`Drag API`，用它快速导入文件[Drag API (Part 2: Files)](/blog/drag-files)。
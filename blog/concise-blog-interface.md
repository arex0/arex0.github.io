---
title: "设计简洁的博客界面"
keywords: [Design,Blog,Concise]
description: "Design a concise blog interface"
created_time: "2020-04-05"
modified_time: "2020-04-07"
markdown: true
share: true
---

# 设计简洁的博客界面
***当其他人拜访你的博客时，我们更希望他关注的是文章***

## 前言
我们写博客，是为了分享内容。为了不分散客人的注意力，我们需要一个足够简单的界面，但是为了便于客人能够获取我们的其他内容，我们不得不添加页面控件，导航或是浮动按钮。

那么怎么设计足够精炼简明博客界面呢？

## 开始
### 文章宽度
我们首先考虑的是文章本身，除了老生常谈的字体（风格，大小，颜色），其实还有一个大家默认会遵循的原则，视宽合适。

现在的电脑屏幕很宽，但我们不需要整个屏幕宽度来展示，手机屏幕很小，我们需要整个屏幕来展示。最佳的宽度是A4纸左右的宽度。但如果是电视屏幕这么大的屏幕呢？也是A4左右吗？显然不是。

对于不同的屏幕，最佳使用距离是不同的，手机很近，平板中等，电脑稍远，电视很远，广告屏极远。为了适应不同的屏幕最佳的方法是使用响应式文字和响应式宽度。
```css
main{
    width: 60vw;
    font-size: 3vh;
}
```
上述CSS实现了不同屏幕有相同的表现，但这是不够的，事实上，手机屏幕和电脑屏幕的差距被放大了。所以我们必须根据不同的屏幕使用不同的值，或者提供一个基础值和相应比例，使用类似下面的代码。
```css
main{
    width: 95vmin;
    padding: 0 2.5vw;
    color: hsl(var(--color));
    font: calc(16px + 1vh) monaco,consolas,monospace;
}
@media only screen and (max-width: 500px){
    main {
        width: 100vw;
        padding: 0 2.5vw;
    }
}
```
### 附加内容不突出
一篇博客除了主体必然还有创建时间，分类标签，分享按钮，甚至donate按钮。既要保证他们的作用，又要他们不能喧宾夺主，必须控制让他们的颜色和位置。

创建时间，分类标签这类元素，我们不强调他们的作用，只是在用户寻找时能够找到即可。所以设置半透明，位置置于顶部角落即可。
```css
.info {
    opacity: .3;
    position: absolute;
    right: 0;
    top: 0;
    font-size: .8em;
}
```
Share和Donate是我们希望每个用户点击的按钮。但是只要考虑到未阅读完的用户不可能分享也不可能送你钱，我们将他放在文章后面，保证每个阅读的人都能看到，同时不会影响阅读体验。同时为了突出它们，我们采用和背景相反的颜色。
```css
.share {
    background: hsl(var(--color));
    color: hsla(var(--background),.9);
    width: 6em;
    height: 2.2em;
    font: inherit;
    line-height: 2em;
    cursor: pointer;
    border: none;
    outline: none;
    border-radius: 1.1em;
}
```
### Focus模式
既然控件是必须的，为了不影响阅读，我们可以考虑将控件隐藏。
```html
<body id='focus'>
    <main></main>
</body>
```
```css
#focus:target> * {
    display:none !important;
}
#focus:target main{
    margin-top:0 !important;
    display:flex !important;
}
```
上述代码构建了`Focus`模式，只要访问`$url#focus`就能应用样式，此模式下只保留文章主体。在分享单一文章这种场景下，没有比这个更合适的方法了，它甚至不依赖JS。

用户按下`F11`全屏时，我们能够感受到他有强烈的要关注文章的意愿，此时自动进入`focus`模式，按下`ESC`则可以选择退出此模式。
```js
document.addEventListener('keydown',e=>e.keyCode==122&&(location.href=(((location.hash!='#focus')&&(location.hash.length))?location.href.slice(0,-location.hash.length):location.href)+'#focus'),{passive:true})
document.addEventListener('keydown',e=>e.keyCode==27&&(location.hash=='#focus')&&(location.href=location.href.slice(0,-location.hash.length)+'#'),{passive:true})
```
### 控件智能隐藏
`Foucs`模式虽然很好，但对于想要浏览我们其他内容的用户来说是否太过不便？频繁的`F11`让人生厌。

我们可以通过类似`F11`的方法进行预测，用户往下滚动时是想阅读，此时隐藏控件，往上则显示控件。同时注意到导航在顶部时，往下滚动一点点不应该隐藏导航。
```html
<nav>...</nav>
<div class='fabs'>...</div>
<main>...</main>
```
```css
nav{
    z-index: 2;
    position: fixed;
    top: 0px;
    left: 0px;
    right: 0px;
    display: flex;
    contain: layout style;
    transition: transform 0.3s ease;
    transform: translate(0px, 0px);
}
.fabs{
    z-index: 2;
    position: fixed;
    right: 0px;
    bottom: 0px;
    display: flex;
    contain: layout style;
    transition: transform 0.3s ease;
    transform: translate(0px, 0px);
}
```
```js
window.StylePropertyMap&&document.addEventListener('DOMContentLoaded',()=>{
    let nav=document.querySelector('nav'),
        fabs=document.querySelector('.fabs'),
        h=nav.offsetHeight,
        pre=document.documentElement.scrollTop,
        nhidden = new CSSTransformValue([new CSSTranslate(CSS.px(0),CSS.percent(-100))]),
        fhidden = new CSSTransformValue([new CSSTranslate(CSS.percent(100),CSS.px(0))]),
        show = new CSSTransformValue([new CSSTranslate(CSS.px(0),CSS.px(0))]),
        showing = true
    function autoShowControls() {
        let cur=document.documentElement.scrollTop
        if(cur>pre+h){
            pre=cur
            if(showing){
                nav.attributeStyleMap.set('transform',nhidden)
                fabs.attributeStyleMap.set('transform',fhidden)
                showing = false
            }
        }else if(cur<pre){
            pre=cur
            if(showing) return
            nav.attributeStyleMap.set('transform',show)
            fabs.attributeStyleMap.set('transform',show)
            showing = true
        }
    }
    window.addEventListener('scroll',()=>requestAnimationFrame(autoShowControls));
},{once:true})
```
### 可访问性
在保证正常用户能够使用的同时我们还需要考虑什么？控件依赖于js，如果用户禁用js控件能否使用（比如不执行js的搜索引擎爬虫）？是否还能导航？用户想打印你的文章后拿去分享，控件是否太碍眼？

为了保证无js环境能够正常显示，而且不显示无效内容我们可以利用`<noscript>`标签
```html
<noscript><style id='nojs'>
    .js {
        display:none !important;
    }
    .nojs {
        display:unset !important;
        opacity:1 !important;
    }
    main.nojs {
        display:flex !important;
        opacity:1 !important;
    }
</style></noscript>

<main class='nojs'>
    <button class='js' onclick='...'>
</main>
```
事实上，一开始搜索引擎的爬虫是不会执行js的，那么对于利用js进行跳转（添加跳转动画）的链接不会被搜索引擎抓取。所以必须如下处理链接
```html
<li><a href='/blog/' onclick='event.preventDefault(),jump("/blog/")'>Blog</a></li>
```
对于打印，我们希望能够和focus模式保持一致，但没有分享按钮等元素。
```css
@media print{
    @page {
        margin: 0;
        padding: 0;
    }
    body>*,body>*.nojs,.noprint{display:none !important}
    .print,.print.nojs{display: block !important}
    main,main.nojs{
        margin-top:0 !important;
        display:flex !important;
        font-size: .8em !important;
    }
}
```
## 总结
为了让我们的博客拥有良好的阅读体验，必须抓住客人的注意力，减少与阅读无关的视觉效果，增强交互体验，提高可访问性。这是一个持续努力的过程，不断审查博客，看看其他人的设计和最先进的设计，同时建立留言本听听客人的想法吧。
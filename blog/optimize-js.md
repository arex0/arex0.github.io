---
title: "怎么优化 Javascript 代码"
keywords: [Javascript,Optimize]
description: "从 Javascript 的运行原理角度，考虑如何优化 Javascript 代码。"
created: "2020-11-03"
modified: "2020-11-07"
markdown: true
share: true
---

# 怎么优化 Javascript 代码
***优化 Web 应用的核心之一就是优化 Javascript***

我们必须先知道 Javascript 的运行原理，才能知道如何优化 Javascript 代码。

## Javascript 是怎么运行的？

现在世界最流行的浏览器是 Chrome(Chromium)[[1](#r1)]，而服务端最知名的 Javascript 开发环境是 Node.js，他们使用的都是 V8[[2](#r2)]，因此从 V8 的角度进行分析，无疑是个好的开始。

V8 由许多子模块构成，其中这 4 个模块是最重要的 [[3](#r3)]：
- Parser：负责将 Javascript 源码转换为 AST
- Ignition：负责将 AST 转换为 Bytecode，解释执行 Bytecode，同时收集优化编译所需的信息。
- TurboFan：利用 Ignitio 所收集的类型和范围分析，将 Bytecode 转换为优化后的机器代码。
- Orinoco：垃圾回收。

Javascript 是一种动态编程语言，这意味着可以在实例化对象后轻松地添加或删除属性。在 C++中可以根据属性类型轻松确定偏移量的长度，而在 Javascript 中这是不可能的，因为 Javascript 在运行时可以更改属性类型。我们可以使用类似字典的结构将对象属性值的位置存储在内存中，但这样的效率是非常低的，为了有接进 C++的速度，V8 改用了另一种方法：隐藏类 (hidden class)[[4](#r4)]。隐藏类是在运行时创建的，每当新增或者更改对象属性时都会产生一个新的隐藏类。和 C++中类成员偏移值与定义顺序有关一样，不同的属性顺序会生不同的隐藏类。为了复用隐藏类，应该始终以相同的顺序实例化对象属性。

我们知道 Javascript 函数可以接受任何类型的参数，但 TurboFan 可以根据函数调用的参数值类型对该函数进行优化，如果调用了不同的类型则会重新进行优化，但调用了超过 4 种类型后，TurboFan 则不会尝试优化该函数。使用 Typescript，并且不使用 any 类型，函数将有固定的参数类型，会 TurboFan 被优化，且在开发阶段更容易发现编码错误。

和其它现代语言一样，Javascript 用垃圾收集而不是手动管理的方式简化代码编写，即使对闭包中不再使用的变量未赋空值，也不会造成内存泄漏，但垃圾收集的能力任然是有限的，忽视内存管理可能会引发一些隐患。Orinoco 通过判断是否一个变量是否可达来判断是否可以回收变量，也就是说可达对象引用的对象不会被收集。现在考虑这样一种情形：
```js
let element = document.getElementById('launch-button');
function onClick(event) {
    // do something
    element.removeEventListener('click', onClick);
    element.parentNode.removeChild(element);
}
element.addEventListener('click', onClick);
```
此时我们保留了子元素`#launch-button`，考虑复用在其它位置，假设父元素里有一个巨大的 DOM 树，那么由于子元素对父元素的引用，这颗 DOM 树将保留在内存中。

尽管我们知道 Javascript 用事件循环提供了异步编程方式 Promise、async、await 等 [[5](#r5)]，但 Javascript 是单线程运行的（但 fetch 等 API 是浏览器委托其它线程进行的），单线程意味着可能会阻塞，考虑下面这段代码，我们测量 setTimeout 的时间消耗：
```js
console.time('wait1')
console.timeEnd('wait1')
console.time('wait2')
setTimeout(()=>console.timeEnd('wait2'),0);
queueMicrotask(()=>{for(let i=1e10;i;i--);console.log("for finishied")})
// wait1: 0.001708984375 ms
// for finishied
// wait2: 12122.828125 ms
```
我们想通过微任务（Promise 的底层实现）来实现异步任务，却阻塞了 wait2 的打印。考虑这样一种情况，我们切片处理一个 100MB 的文件并上传，页面将卡死，用户无法进行任何操作。那么怎么防止主进程卡死呢？答案不是异步而是多线程。Chrome 中多线程可以通过 Web Worker 来实现 [[6](#r6)]（Nodejs 中是 worker_threads 模块 [[7](#r7)])，我们通过 web worker 重写上一案例。
```js
//main.js
let worker = new Worker(URL.createObjectURL(new Blob([`
    self.addEventListener('message', function(e) {
        switch (e.data) {
        case 'start':
            for(let i=1e10;i;i--);
            self.postMessage("for finishied");
            break;
        }
    }, false);
`])));
worker.addEventListener('message', function(e) {
    console.log(e.data);
}, false);

console.time('wait1')
console.timeEnd('wait1')
console.time('wait2')
setTimeout(()=>console.timeEnd('wait2'),0);
worker.postMessage('start');
// wait1: 0.001708984375 ms
// wait2: 1.285888671875 ms
// for finishied
```
和预期中一样 wait2 没有被阻塞，这体现了多线程和异步的区别。

当获取了 14KB 数据包 [[9](#r9)] 或者完整文档，渲染引擎的第一步是运行预加载扫描程序请求高优先级的资源（CSS，Javascript，Web Font 等 [[10](#r10)]），同时解析 HTML 文档，并转换为 DOM 树 [[11](r11)]，当解析器找到非阻塞资源（例如图像）时 [[12](#r12)]，浏览器将请求这些资源并继续解析，遇到 CSS 文件时，解析可以并行继续进行，但是遇到没有 async 和 defer 属性的 script 标签则会暂停，先下载并执行 Javascript。等待获取 CSS 不会阻止 HTML 解析或下载，但是会阻止 Javascript，因为 Javascript 通常用于查询 CSS 属性对元素的影响。关键渲染路径中的第二步是处理 CSS 并构建 CSSOM 树，同时 Javascript 会被下载，然后 Javascript 被解释，编译，解析和执行。然后在解析步骤中创建的 CSSOM 和 DOM 树被合并到一个渲染树中，然后该渲染树用于计算每个可见元素的布局，然后将其绘制到屏幕上 [[13](#r13)]。
```
load HTML -----------> HTML Parser -------> DOM Tree (inline CSS) -> defer Javascript -> DOMContentLoaded
    |                   ^      |                        |                  ^
    |                   |      |                 +------|------------------+
    v                   |      |                 |      |
Preload Scanner      execute   +-?> CSS -> CSSOM Tree - + -> Render Tree -> Paint -+-> onload
    |                   ^      |              |  ^                 ^               |
    |                   +------?--------------+  |                 |        ALL Resource(Image...)
    |                   |      v                 |                 |
    +-?+-------------> Javascript                |                 v
    |  +- async? -> Immediately execute          |               Layout
    +----------------------?> CSS ---------------+
```
由于渲染时间与 js 和 css 的解析和执行有关，因此需要通过 tree shaking 等减少 css 和 js，同时延迟渲染非必需的 js 加载（defer）。得益于 HTTP2 的发展，加载多个 js 和单个 js 的速度是相近的，而多个 js 模块更有利于在多个不同的页面中复用代码，因此推荐合理分包（小于 30k 大于 1k）[[14](#r14)]。同时为了提高 First Paint 速度（衡量网站性能的关键要素），我们可以通过调整 script 标签位置，优化 Javascript 的加载过程 [[15](#r15)]，我们的文件结构将变成：
```html
<html>
<head>
    <link rel="stylesheet" href="reuse.css">
    <style> .page {}</style>
</head>
<body>
    <main></main>
    <script src="framework.js"></script>
    <script src="app.js"></script>
    <script src="others1.js" async defer></script>
    <script src="others2.js" async defer></script>
</body>
</html>
```

当我们引入一个 Javascript 函数库（如 loadash.js），我们会有很多函数从不执行。现代 JavaScript 引擎具有启发式功能，可以在进行完整解析之前预先解析大多数功能。预解析步骤仅检查语法错误，同时避免了完整解析的开销。但是如果我们调用某一函数，浏览器实际上将对该函数进行两次解析，第一次是预解析，第二次是完整解析。这意味着 JavaScript 代码的整体运行速度要慢得多，因为解析所花费的时间超过了需要的时间。不过大多数解析器都可以识别一种模式：将函数包装在括号中。对于解析器而言，这总是表明该函数将立即执行，它将急切地解析该函数​​[[16](#r16)]，因此我们可以通过 PIFE 帮助解析器 [[17](#r17)]。
```js
let add = (function add(a,b){return a+b});
!function(){/*do something*/}();
runIt((function (){}));
const data = JSON.parse('{"foo":42,"bar":1337}');
const data2 = ({"foo":42,"bar":1337});
```

如果不是某些特定任务需要使用闭包，在其它函数中创建函数是不明智的，因为闭包在处理速度和内存消耗方面对脚本性能具有负面影响。例如，在创建新的对象或者类时，方法通常应该关联于对象的原型，而不是定义到对象的构造器中。原因是这将导致每次构造器被调用时，方法都会被重新赋值一次（也就是说，对于每个对象的创建，方法都会被重新赋值）​​[[18](#r18)]。
```js
function MyObject(name, message) {
  this.name = name.toString();
  this.message = message.toString();
}
MyObject.prototype.getName = function() {
  return this.name;
};
MyObject.prototype.getMessage = function() {
  return this.message;
};
```

最后，我们应该使用 Chrome DevTools 和 Lighthouse 等工具分析页面瓶颈，用类似 JsPerf、measurethat 的网站​​[[19](#r19)]，或者手动测试 [[20](#r20)]，不断测试不同代码的实现，在代码可读性、健壮性和运行效率之间做出权衡，然后关注 Javascript 以及 V8 的发展，以跟随最新的优化技术。

## 总结
- 应该始终以相同的顺序实例化对象属性。
- 使用 Typescript，并且不使用 any 类型，让 javascript 更快。
- 留意内存问题，小心处理 DOM 和其它父子引用关系。
- 异步也会阻塞线程，密集计算情景考虑使用 Web Worker。
- 合理分包（1k~30k），并优化 Javascript 加载顺序。
- 通过声明一个将立即执行的函数来帮助解析器。
- 如非必要不要使用闭包，将类方式实现移动到外部。
- 高性能密集计算场景使用 for 而不是 foreach 或者 for in。
- 使用工具分析网页问题

## Reference
- <label id="r1">[1] [Browser Market Share Worldwide](https://gs.statcounter.com/browser-market-share)</label>
- <label id="r2">[2] [What is V8?](https://v8.dev/)</label>
- <label id="r3">[3] [An Introduction to Speculative Optimization in V8](https://benediktmeurer.de/2017/12/13/an-introduction-to-speculative-optimization-in-v8/)</label>
- <label id="r4">[4] [Google I/O 2012 - Breaking the Javascript Speed Limit with V8](https://www.youtube.com/watch?v=UJPdhx5zTaw&feature=youtu.be&t=11m34s)</label>
- <label id="r5">[5] [In depth: Microtasks and the Javascript runtime environment](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide/In_depth)</label>
- <label id="r6">[6] [Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)</label>
- <label id="r7">[7] [A complete guide to threads in Node.js](https://blog.logrocket.com/a-complete-guide-to-threads-in-node-js-4fa3898fe74f/)</label>
- <label id="r8">[8] [Using WebAssembly with Web Workers](https://www.sitepen.com/blog/using-webassembly-with-web-workers)</label>
- <label id="r9">[9] [rfc6928](https://tools.ietf.org/html/rfc6928)</label>
- <label id="r10">[10] [HTMLPreloadScanner.cpp](https://github.com/WebKit/webkit/blob/master/Source/WebCore/html/parser/HTMLPreloadScanner.cpp)</label>
- <label id="r11">[11] [Render-tree Construction, Layout, and Paint](https://developers.google.com/web/fundamentals/performance/critical-rendering-path/constructing-the-object-model)</label>
- <label id="r12">[12] [Eliminate render-blocking resources](https://web.dev/render-blocking-resources/)</label>
- <label id="r13">[13] [Populating the page: how browsers work](https://developer.mozilla.org/en-US/docs/Web/Performance/How_browsers_work)</label>
- <label id="r14">[14] [Parsing JavaScript in zero* time](https://www.youtube.com/watch?v=D1UJgiG4_NI&feature=youtu.be)</label>
- <label id="r15">[15] [Chrome First Paint](http://eux.baidu.com/blog/fe/Chrome%E7%9A%84First%20Paint)</label>
- <label id="r16">[16] [Blazingly fast parsing, part 2: lazy parsing](https://v8.dev/blog/preparser#pife)</label>
- <label id="r17">[17] [The cost of JavaScript in 2019](https://v8.dev/blog/cost-of-javascript-2019)</label>
- <label id="r18">[18] [Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures)</label>
- <label id="r19">[19] [Object.keys ForEach vs for-in hasOwnProperty](https://www.measurethat.net/Benchmarks/Show/9144/0/objectkeys-foreach-vs-for-in-hasownproperty#latest_results_block)</label>
- <label id="r20">[20] [performance testing: try...catch](https://gist.github.com/arex0/1c80b56c786e26277a55e752f51f6f3c)</label>
- <label id="r*">[*] [How Javascript works](https://blog.sessionstack.com/tagged/tutorial)</label>

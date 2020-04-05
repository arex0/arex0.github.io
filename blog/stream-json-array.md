---
title: "Javascript 流式解析JSON数组"
keywords: [Stream,Javascript,JSON]
description: "use stream api to read JSON Array"
created_time: "2020-04-04"
modified_time: "2020-04-04"
markdown: true
share: true
---

# Javascript 流式解析JSON数组
***更小的缓冲区，却拥有更快的响应速度***

### 前言
流将你希望通过网络接收的资源拆分成小块，然后按位处理它。

这正是浏览器在接收用于显示web页面的资源时做的事情——视频缓冲区和更多的内容可以逐渐播放，有时候随着内容的加载，你可以看到图像逐渐地显示。

以前，如果我们想要处理JSON数组，必须接收到所有的内容后，再使用`response.json()`或者`JSON.parse()`将它整个反序列化成一个大的数组放在内存中。但是如果我有一个非常大的，100MB甚至GB级别的JSON数组那么不仅需要等待下载完成，还需要将整个数组直接放在内存。

但是利用`Stream API`我们可以下载多少就处理多少数据，用更小的缓冲区实现了更快的速度。

### 开始

我们通常使用fetch来获取JSON
```js
fetch('/blog/list.json')
```
我们当然可以直接把它转化成流
```js
fetch(...).then(res=>res.body.getReader())
```
但是为了方便处理我们可以先用`TransformStream`将它转化成文本
```js
fetch(...)
.then(res=>res.body.pipeThrough(new TextDecoderStream()))
```
然后我们必须切割流，同样是用一个`TransformStream`，为了方便，这里的json是`NDJSON`格式的。同时我在这一步进行了反序列化。
```js
new TransformStream({
    transform(chunk, controller) {
        buffer += chunk
        const parts = buffer.split('\n')
        parts.slice(0, -1).forEach(part => controller.enqueue(JSON.parse(part)))
        buffer = parts[parts.length - 1]
    },
    flush(controller) {
        if (buffer) controller.enqueue(buffer)
    }
})
```
最后，我们读取并处理
```js
let rd = ReadableStream.getReader()
    rd.read().then(({value, done}) => {
        if (!done) {
            console.log(value)
            read(rd)
        }
    })
}
read()
```
#### 汇总
```js
let buffer = ''
function read(rd){
    rd.read().then(({value, done}) => {
        if (!done) {
            console.log(value)
            read(rd)
        }
    })
}
fetch('/blog/list.dn.json')
.then(res=>res.body.pipeThrough(new TextDecoderStream()))
.then(ts=>ts.pipeThrough(new TransformStream({
    transform(chunk, controller) {
        buffer += chunk
        const parts = buffer.split('\n')
        parts.slice(0, -1).forEach(part => controller.enqueue(JSON.parse(part)))
        buffer = parts[parts.length - 1]
    },
    flush(controller) {
        if (buffer) controller.enqueue(buffer)
    }
})))
.then(js=>js.getReader())
.then(read)
```
非常遗憾，firefox还不支持上面的代码，不过我相信firefox也很快会支持这个API的
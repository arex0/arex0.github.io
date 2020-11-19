---
title: "Javascript 中的函数"
keywords: [Javascript,Function]
description: "理解 Javascript 中的函数，才能写出正确的代码"
created: "2020-11-19"
modified: "2020-11-19"
markdown: true
share: true
---

# Javascript 中的函数
***提升的不是变量，是理解***

函数由称为函数体的一系列语句组成。在 JavaScript 中，函数是一等公民，可以作为值使用。它们可以像任何其他对象一样具有属性和方法，与其他对象的区别在于函数可以被调用，它们都可以认为是 Function 的实例对象。

定义函数有多种方法：
- `function name([param[, param[, ... param]]]) { statements }`
- `var myFunction = function name([param[, param[, ... param]]]) { statements }`
- `([param] [, param]) => { statements } param => expression`
- `new Function (arg1, arg2, ... argN, functionBody)`

new Function 这种函数构造方式和我们直接写 function 或者 eval 的 Scopes 是不同的，new Function 的 this 默认指向 windows，只能访问全局变量。new Function 和 eval 通过解释器生成，很难被优化，同时我们有很多方法避免使用它们，因此我们永远不要使用它们，也不会在文中讨论两者。

那么其它函数有声明方式有什么区别呢？

`function name([param[, param[, ... param]]]) { statements }`这种方式是最常见的方式，和其它方式最大的区别是，它具有变量提升。
```js
zero()  
if (true) {
   function zero() {
      console.log("This is zero.");
   }
}
```
这段代码非常愚蠢，即便是严格模式下，不同的浏览器具有不同的实现，具有重大缺陷和矛盾（变量提升与 ES6 规定之间的矛盾），永远不要在代码中使用它。

`var myFunction = function name([param[, param[, ... param]]]) { statements }`这种方式是最安全，容易理解，拥有全部功能的构建方式。提升的仅有标识符，而保留了赋值位置。

`([param] [, param]) => { statements } param => expression`和普通函数最大的不同是它没有自己的 this，因此它无法通过 new 访问，也无法访问 new.target。另一个区别是它无法访问 arguments，尽管我们可以通过 rest 参数来模拟它。

我们提及了变量提升，this 指向等特性。下面我们从原理的角度来看，function 为什么会有这些特性。
- javascript 的执行过程
- 函数的执行过程
- 变量提升
- Scopes
- this

## javascript 的执行过程
Javascript 是动态语言，通过解释器 Ignition（V8）来执行，Ignition 的基本执行流程为：
- 词法分析 + 语法分析 生成 ast
- 生成可执行代码
- 确定作用域
- 进入执行上下文
- 创建变量
- 建立作用域链
- 确定 this 指向
- 变量赋值
- 执行代码
- 解优化

## 函数的执行过程
为了能被解释器运行，函数在首次非优化编译阶段就被转换成字节码。字节码作为 SharedFunctionInfo 对象中的一个属性来与函数相关联，函数的代码入口地址被设置到内置的 InterpreterEntryTrampoline stub 中。在字节码的生成过程中，从函数的寄存器文件中为局部变量、Context 对象指针、表达式求值中的临时变量分配寄存器。在执行时，会先初始化合适的栈帧，寄存器文件的空间作为函数栈帧的一部分在函数的序幕中被分配出来。然后为函数的第一个字节码调度到解释器的字节码处理程序，从而在解释器中开始执行该函数。每个字节码处理程序的末尾都会根据下一个字节码，直接通过全局解释器表中的索引值调度到下一个字节码处理程序。

## 变量提升
函数内部声明的局部变量，在语义上被语法解析器提升到了函数的顶部。这样可以提前知道局部变量的个数，在 AST 遍历的初始阶段就可以在寄存器文件中为每个局部变量分配索引。语法解析器同样也可以提前知道内部 Context 需要的额外寄存器数量，并且在 AST 遍历的初始阶段分配出来。但在函数执行初始化栈帧时，才对变量进行赋值。可以说变量提升是解析器优化执行流程的副作用。

从变量的角度上看，变量提升的顺序为：
- 变量声明
- var 变量初始化 undefined
- 参数赋值
- 函数引用

## Scopes
解释器在 Context stack slot（函数栈帧的一部分）中跟踪当前 Context 对象。在一个新的 Context 被分配出来后，会分配一个 ContextScope 对象来跟踪嵌套的 Context 链表，同时 ContextPush 字节码也被生成了。这个字节码将当前 Context 对象移到分配的寄存器中，然后将新的 Context 存入当前 Context 寄存器中。在操作局部的 Context 分配的变量时，先找到与之关联的 ContextScope，然后找出 Context 对象目前所在的寄存器，然后可以根据这个寄存器指向的 Context 直接在正确的 Context slot 中加载出该变量。当 ContextScope 超出作用域时，会生成一个 ContextPop 字节码，它会将父 Context 恢复到当前 Context 寄存器中。

这分析了闭包的性能消耗，也解释了闭包的产生原因，闭包就是一个函数的 ContextScope 指向的 Context 链表，包括了其它 Context。

## this
函数除了显式形式参数，还有隐式接收者 this，可以认为是一个比较特殊的参数，默认指向 globalThis，作为成员函数时则将 this 指向对象，通过 new 调用时则新建了一个对象，this 指向这个对象。

箭头函数可以认为是始终的偏函数或者说 this 这个参数已经被 bind 了，因此无法修改。比较常见的用法就是嵌套函数用箭头函数保留 this 指向。

## Extra
不像 var、function 声明的变量，提升级别是函数级的，提升时会被初始化为 undefined，let、const 和 class 的提升为块级，并且没有初始化值。正是因为没有初始化值，任何访问变量的行为，包括类似 typeof 的操作都会导致 ReferenceError，直到他们进行了赋值才能访问，这一现象被称为暂时性死区。

var 和 function 的声明有很大的缺陷，可以在同级别多次声明同一个标识符，需要避免这种情况，否则代码将变得无法阅读，令人困惑。

## Reference
- [Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions)
- [An Introduction to Speculative Optimization in V8](https://ponyfoo.com/articles/an-introduction-to-speculative-optimization-in-v8)
- [Ignition：V8 解释器](https://zhuanlan.zhihu.com/p/41496446)
- [JavaScript 执行过程](https://juejin.im/post/6844903729968201736)
- [let](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let)

---
title: "Javascript 中的继承"
keywords: [Javascript]
description: "理解 Javascript 中 class 的本质更有利于我们理解 Javascript，以更好的使用它。"
created: "2020-11-06"
modified: "2020-11-19"
markdown: true
share: true
---

# Javascript 中的继承
***继承是双刃剑，弄清楚原理才不会弄伤自己***

```
+----------------------+            +---------------+
|        Object        |            |   Function    |
|                      |            |               |
| +------------------+ |            |               |
| |   Men Instance   | |            |               |
| +-------+----------+ |            |               |
|         |            |            |               |
|         | __proto__  |            |               |
|         v            |            |               |
| +------------------+ | construtor | +--------+    |
| |   Men.prototype  +--------------->|  Men   |    |
| +-------+----------+ |            | +-+------+    |
|         |            |            |   |           |
|         | __proto__  |            |   | __proto__ |
|         v            |            |   v           |
| +------------------+ | construtor | +--------+    |
| | Person.prototype +--------------->| Person |    |
| +-------+----------+ |            | +-+------+    |
+---------|------------+            +---|-----------+
          | __proto__                   | __proto__  
          v                             v            
+----------------+    __proto__  +------------------+
|Object.prototype|<--------------+Function.prototype|
+---------+-----++               +--------+---------+
          |     |                      ^  |          
__proto__ |     |   Fake     __proto__ |  |   Fake   
          |     |construtor            |  |construtor
          |     v                      |  v          
+------+  |   +--------+               | +--------+  
| null |<-+   | Object +---------------+-+Function|  
+------+      +--------+                 +--------+  
```

## 继承原理
在其它 OOP 语言中都有 class 的概念，Javascript 中的 class 模仿了相同的语法，但我们知道 Javascript 事实上是靠原型链来实现继承的，所以 class 只是一个语法糖，和其它语言中的继承完全不是一回事，为了更好的使用 Javascript 中的继承，我们必须对其原理有一定理解，我们下面几个角度来分析 Javascript 的继承。
- class 做了什么？
- super 做了什么？
- __proto__和 prototype 做了什么？
- new 和 Object.create 做了什么？

### class 做了什么？
class 的基本使用方法如下。
```js
class Person {
    constructor(name, age) {
        this.name = name
        this.age = age
    }
    sayName() { return this.name}
    static type = 'being'
    static intro() { console.log("") }
}

class Men extends Person {
    constructor(name, age) {
        super()
        this.gender = 'male'
    }
}
```
如果不使用 class 来实现，这段代码会变成（参考了 Babel 7.80 的编译结果）。
```js
let Person = function Person(name, age) {
    if (!(this instanceof Person)) throw new TypeError("Cannot call a class as a function");
    this.name = name;
    this.age = age;
}
Person.type = 'being';
Person.intro = function intro() {
    console.log("");
}
Person.prototype.sayName = function sayName() {
    return this.name;
}

let Men = function Men(name, age) {
    if (!(this instanceof Men)) throw new TypeError("Cannot call a class as a function");
    Person.apply(this, arguments);
    this.gender = "male";
}
Men.__proto__ = Person;
Men.prototype = Object.create(Person.prototype);
Men.prototype.constructor = Men;
```
可见 class 做了以下的事情
- 判断块级作用域是否已经声明过类名
- 将 class 的名字赋予 constructor 函数，并在块级作用域中声明函数
- 判断是否通过 new 调用
- 将可继承 / 公共成员赋予 prototype
- 将静态方法直接赋予函数
- 将 prototype 指向父类原型实例
- 修复 prototype 指向的构造函数
- 将构造函数的__proto__指向父类的构造函数。

### super 做了什么？
`super()` 这一步相当于 `Person.apply(this, arguments)`，是在 this 调用父类构造方法。

我们可以在 super 上以 `super.ƒ` 的形式调用父类公共方法和成员，要注意的是 super.IdentifierName 作为 setter 使用时，super 表示 this。
比较有趣的是 class 的 private 字段，如果在方法中使用了私有变量，子类调用此函数时，即便有同名成员，使用的不会是子类的成员，而是父类的私有成员，但公共成员却会使用子类的同名成员，并且不能通过 super.IdentifierName 作为 private 成员的 setter 使用。
```js
class Point {
    #x; y;

    setValue(v) {
        this.#x = this.y = v;
    }
    getValue() {
        console.log(this.#x, this.y);
    }
}

class ColorPoint extends Point {
    #x; y;

    constructor() {
        super();
        this.#x = this.y = 2;
        super.setValue(3);
        console.log(this.#x, this.y);
        super.getValue();
    }

    test() {
        this.getValue();
    }
}
(new ColorPoint()).test();
// 2 3
// 3 3
```
显然，我们原本的代码无法实现成员私有，Babel 的编译结果中对每个私有成员都用额外的变量存储起来，同时用 WeakMap 反向引用来避免垃圾收集失败。
```js
var _x = new WeakMap();
_x.set(this, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldGet(this, _x);
    _classPrivateFieldSet(this, _x, (this.y = v));
```

### __proto__和 prototype 做了什么？
我们在上面已经看到 prototype 在继承中扮演很重要的作用，在实际使用中，我们通过__proto__（即 `[[Prototype]]`）访问原型，从而访问原型中的方法，而原型的__proto__又可以访问父类的原型，以此实现原型链。相信大家都听过这样的言论，Function 是所有 class 的祖父，Function 的父类是 Object，Object 的父类是 null，这在原型链上是可验证的。
```
Men instance -> Men.prototype -> Person.prototype -> Object.prototype -> null
```
每个函数一旦创建则同时创建一个原型，并将函数作为此原型的构造函数。
```js
Men === Men.prototype.constructor
```
因此每个原型的构造函数生成的实例指向的原型就是这个原型。
```js
(new Men()).__proto__ === Men.prototype
```
class 是语法糖在这里可以验证，Person 作为构造函数，是 Function 的实例。
```js
Person.__proto__ === Function.prototype
```
但非常有趣的是，Men 也是构造函数，它指向的实例却是 Person。
```js
Men.__proto__ === Person
```
这里分析了一下，应该是为了表达 Men 是 Person 的子类做出的语义上的优化。不过这样做就有了一个有趣的特性，constructor 的位置不影响查找原型的构造函数。
```js
(new Men).__proto__.__proto__.constructor === (new Men).__proto__.constructor.__proto__
```

### new 和 Object.create 做了什么？
明白原型链后我们再来处理 new 和 Object.create 变的简单了许多。
```js
(new Men()).__proto__ === Object.create(Men.prototype).__proto__
// === Men.prototype
```
他们拥有相同的一个作用就是将生成对象的原型指向构造函数的原型
```js
new Men():
    create new Object() obj
    set obj.__proto__ to Men.prototype
    return Men.call(obj) || obj

Object.create(Men.prototype):
    create new Object() obj
    set obj.__proto__ to Men.prototype
    return obj;
```
因此我们也可以模拟实现
```js
function New(Class, ...Args){
    let obj = {};
    obj.__proto__ = Class.prototype;
    return Class.apply(obj, Args) || obj;
}

function Create(prototype){
    let obj = {};
    obj.__proto__ = prototype;
    return obj;
}
```

## 谁是本源？
```js
Function instanceof Object
Object instanceof Object
```
似乎先有 Object 再有 Function，但 Object 本身也是 Function 的实例，甚至 Function 本身就是自己的实例。
```js
Object instanceof Function
Object.__proto__ === Function.prototype
Function instanceof Function
Function.__proto__ === Function.prototype
```
这要怎么理解呢？

我们模拟一遍代码实现。
```js
let Function = function() { [native code] };
/* static function... */
Function.prototype = Object.create(Object.prototype);
Function.prototype.constructor = Function;
/* inherit function... */
Function.__proto__ = Function.prototype;

let Object = function Object() { [native code] };
/* static function... */
Object.prototype = Object.create(null);
Object.prototype.constructor = Object;
/* inherit function... */
Object.__proto__ = Function.prototype;
```
可见，上述代码有一处关键的矛盾：Function 的定义依赖于 Object.create，但 Object.create 作为函数依赖于 Function，这是不可能实现的。

### 破局者 Function.prototype
```js
Function.prototype
// ƒ () { [native code] }
```
按道理所有的 prototype 都是一个对象，但 Function 的 prototype 却是个函数，可见 `Function.prototype` 并非是由 `Object.create(Object.prototype)` 产生，并且因此不是所有的函数都由 Function 产生。
所以是先有 Function Prototype 然后才有的 Function，Function 的产生不再依赖 Object，跳出了谁是本源的问题。

> 1. 用 C/C++ 构造内部数据结构创建一个 OP 即 (Object.prototype) 以及初始化其内部属性但不包括行为。
> 2. 用 C/C++ 构造内部数据结构创建一个 FP 即 (Function.prototype) 以及初始化其内部属性但不包括行为。
> 3. 将 FP 的 [[Prototype]] 指向 OP。
> 4. 用 C/C++ 构造内部数据结构创建各种内置引用类型。
> 5. 将各内置引用类型的 [[Prototype]] 指向 FP。
> 6. 将 Function 的 prototype 指向 FP。
> 7. 将 Object 的 prototype 指向 OP。
> 8. 用 Function 实例化出 OP，FP，以及 Object 的行为并挂载。
> 9. 用 Object 实例化出除 Object 以及 Function 的其他内置引用类型的 prototype 属性对象。
> 10. 用 Function 实例化出除 Object 以及 Function 的其他内置引用类型的 prototype 属性对象的行为并挂载。

## Reference
- [从源码分析 ES6 Class 的实现机制](https://segmentfault.com/a/1190000017842257)
- [ES6 中的关键字 super 该如何理解？](https://www.zhihu.com/question/38292361/answer/105183980)
- [Inheritance and the prototype chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain)
- [Object.getPrototypeOf() vs .prototype](https://stackoverflow.com/a/38972040)
- [js 中__proto__和 prototype 的区别和关系？](https://www.zhihu.com/question/34183746/answer/123717347)
- [Understanding the difference between Object.create() and new SomeFunction()](https://stackoverflow.com/a/14593952)
- [Why in JavaScript both “Object instanceof Function” and “Function instanceof Object” return true?](https://stackoverflow.com/a/23623598)
- [深度解析原型中的各个难点](https://yuchengkai.cn/blog/2018-03-04.html#function-proto-function-prototype)
- [深入探究 Function & Object 鸡蛋问题](https://github.com/yygmind/blog/issues/35)

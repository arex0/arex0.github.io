---
title: "Javascript 中的克隆"
keywords: [Javascript,Clone]
description: "理解 Javascript 中 class 的本质更有利于我们理解 Javascript，以更好的使用它。而克隆是对我们理解的实践。"
created: "2020-11-15"
modified: "2020-11-15"
markdown: true
share: true
---

# Javascript 中的克隆
***我们拷贝的不是代码，是理解***
```
             Primitives Type                           Structural Types
+--------------------------------------+-------------------------------------------------+
| +--------+ +--------+ +--------+     | +--------+ +--------+ +--------+ +--------+     |
| | Number | | String | | Symbol | ··· | |Function| | Object | |  Array | | Person | ··· |
| +--------+ +--------+ +--------+     | +---+----+ +---+----+ +---+----+ +---+----+     |
+--+-----------------------------------+-----|----------|----------|----------|----------+
   |                                         |          |          |          |
   |                                         v          v          v          v
   | Shallow Copy       Memory Address +-----+----------+----------+----------+----------+
   |                                         ^          ^          ^          ^
   v                                         |          |          |          |
+--------------------------------------+-----|----------|----------|----------|----------+
| +--------+ +--------+ +--------+     | +---+----+ +---+----+ +---+----+ +---+----+     |
  | Number | | String | | Symbol | ··· | |Function| | Object | |  Array | | Person | ··· |
| +--------+ +--------+ +--------+     | +---+----+ +---+----+ +---+----+ +---+----+     |
+--+-----------------------------------+-----|----------|----------|----------|----------+
   |                                         |          |          |          |
   |                                         v          v          v          v
   | Deep Copy          Memory Address +-----++---------++---------++---------++---------+
   |                                          ^          ^          ^          ^
   v                                          |          |          |          |
+--------------------------------------+------|----------|----------|----------|---------+
| +--------+ +--------+ +--------+     | +----+---+ +----+---+ +----+---+ +----+---+     |
  | Number | | String | | Symbol | ··· | |Function| | Object | |  Array | | Person | ··· |
| +--------+ +--------+ +--------+     | +--------+ +--------+ +--------+ +--------+     |
+--------------------------------------+-------------------------------------------------+
```
不止是 Javascript，所有语言中都会涉及到拷贝，不过在真正面向对象的 Javascript 中，这一现象更加明显，甚至变成面试必问题，其原因和“URL 到渲染的过程”一样，拷贝也是一个非常吃原理理解程度的东西。对语言的理解不够深入，不跟随 Javascript 发展更新自己对语言的理解的话，不可能写出一个真正的深拷贝。

无论是哪种拷贝，我们拷贝过程都是基本一致的：
- 遍历属性
- 判断变量类型
- 创建新对象并拷贝

## Javascript 变量
在拷贝前我们需要先了解 Javascript 变量。事实上，拷贝的每个过程都需要我们对 Javascript 变量足够了解。

Javascript 中的变量分为三种类型：数据类型和结构类型和结构根基元。数据类型包括：`undefined`、`boolean`、`symbol`、`number`、`bigint`、`string`。结构类型包括：`object`和`function`。结构根基元：`null`。数据类型和结构根基元可以合称为原始类型。（注意区别`String`和`string`，etc.）

type | details
---- | -------
null | null 通常是在可以预期有对象但没有对象相关的地方进行检索，有且仅有值 null。
undefiend | 未分配值的变量有且仅有值 undefined。
boolean | boolean 值表示逻辑实体，并且可以具有两个值：true 和 false。
symbol | symbol 是一个具有独特的和不可变的原始值，并且可以被用作对象属性的键。
number | number 有 4 种值：双精度 64 位 IEEE 754，Infinity，-Infinity，NaN。number 能表示整数的最大的范围为`(-(2^53-1),2^53-1)`，可通过`Number.MAX_SAFE_INTEGER`获取，可以通过`Number.isSafeInteger()`判断数字是否可靠。
bigint | bigint 可以表示任意精度的整数，附加 n 到整数的末尾或通过调用构造函数来创建 bigint。除了不能转化为 number，bigint 和 number 表现基本一致。
string | string 表现的像 16 位无符号整数数组，但和其它语言中不同，一旦创建了 string，就无法对其进行修改。
object | object 可以看作是 property 的集合。property 拥有两种属性：数据属性和访问器属性。数据属性包括：`[[Value]]`、`[[Writable]]`、`[[Enumerable]]`、`[[Configurable]]`。访问器属性包括：`[[Get]]`、`[[Set]]`。object 中有一些比较特殊的对象，是语言内置的：globalThis、Function、Object、Boolean、Symbol、Error、error etc.、Number、BigInt、Math、Date、String、RegExp、Array、ArrayBuffer、TypedArray...、DataView、ShareArrayBuffer、JSON、Atomics、Map、WeakMap、Set、WeakSet、Promise、Generator、GeneratorFunction、AsyncFunction、Reflect、Proxy、Intl、WebAssembly。
function | function 包括函数表达式和箭头函数，function 通过原型链继承了 object 的全部属性和方法。由语言内置：eval()、isFinite()、isNaN()、parseFloat()、parseInt()、encodeURI(）、encodeURIComponent()、decodeURI()、decodeURIComponent()。

## 遍历属性
我们可以查看属性描述符的定义：
> - value: The value associated with the property (data descriptors only).
> - writable: true if and only if the value associated with the property may be changed (data descriptors only).
> - get: A function which serves as a getter for the property, or undefined if there is no getter (accessor descriptors only).
> - set: A function which serves as a setter for the property, or undefined if there is no setter (accessor descriptors only).
> - configurable: true if and only if the type of this property descriptor may be changed and if the property may be deleted from the corresponding object.
> - enumerable: true if and only if this property shows up during enumeration of the properties on the corresponding object.

可见`enumerable`属性决定了一个属性是否可迭代，那么只要设置为 false 就无法获取，设置 true 就可以迭代了吗？

事实并非如此，经过测试，属性可以分为几种情况：
- 内置的虚拟属性：不可迭代，无法直接获取。没有键名，没有属性描述符，只能通过开发者工具查看，例如`String.prototype`的`[[PrimitiveValue]]`属性。
- 内置的继承属性：不可迭代，仅通过键名获取。以字符串为键，没有属性描述符，可以通过开发者工具查看，无法通过特定函数获取，例如`Uint8Array.prototype`的`buffer`属性。
- Symbol 属性：不可迭代，可以获取。以`Symbol`为键，描述符中的`enumerable`值对其无作用，通过特定函数获取。
- 普通属性：可选迭代，可以获取。以字符串为键，描述符中的`enumerable`值决定属性是否会被`for in`及`Object.keys`获取，同样无论是否可以迭代都能通过特定函数获取。

常见的属性遍历方式包括：
- `for in`：迭代包括原型链上的可枚举的属性名。
- `Object.keys`：获取对象自身可枚举的属性名。
- `Object.getOwnPropertyNames`：获取对象自身包括可枚举、不可枚举的全部属性名。
- `Object.getOwnPropertySymbols`：获取对象 Symbol 的全部属性名。
- `Reflect.ownKeys`：获取对象自身包括可枚举、不可枚举、Symbol 的全部属性名。
- `Object.getOwnPropertyDescriptors`：获取对象自身包括可枚举、不可枚举、Symbol 的全部属性描述符。

上面说明的无法通过特定函数获取，指这些所有方法都无法获取。显然，对于原生对象，由于存在内置的属性，属性完全遍历是一件不可能的事情，我们只能遍历自定义的属性。
```js
function cloneProps(src, dest, wm, errors) {
    const props = Object.getOwnPropertyDescriptors(src)
    const keys = Object.keys(props)
    let p = keys.length, key = '', prop = null
    while (p--) {
        prop = props[key = keys[p]]
        prop.value = clone(prop.value, wm, errors)
        Object.defineProperty(dest, key, prop)
    }
}
```

## 判断变量类型
判断类型一种最基本的方式是使用`typeof`运算符来获取一个指示类型的字符串，对于原始类型将返回其类型名称的小写字符串，除了一个陷阱，`null`会返回`"object"`, 因此我们必须直接判断`value === null`。
```js
const primitives = {
    'undefined': true,
    'boolean': true,
    'symbol': true,
    'number': true,
    'bigint': true,
    'string': true,
    'object': false,
    'function': false,
}
function isPrimitive(v) {
    return (v === null) || primitives[typeof v]
}
```
为什么`typeof(Array)`不返回`"array"`？这其实透露出了 Javascript 中对象的本质，其实根本没有 Array 类型，更没有 Person 类型，一切对象都是`object`，只是靠原型链模拟了类的概念。不过，由于内置属性的存在，实际处理起来我们却不能只是当成普通的对象来处理。我们可以通过`(new Array).constructor === Array`这种方法来判断是否原生对象。为什么不用`instanceof`? 事实上，instanceof 慢的多，而且无法处理`(new class extends Array{}) instanceof Array`。
```js
switch (src.constructor) {
    case Function:
    /* Native Class... */
    default:
    /* Custom Class */
}
```
由于可以手动设置 constructor 的属性`Number.prototype.constructor = BigInt`，可以手动设置 toString 返回值`get [Symbol.toStringTag]() {return "fake";}`，因此，事实上类似的方法无法真正判断一个对象创建方式。不过 V8 引擎实际能够认识，创建来源是虚假/非正式的，
```js
let t = new Number(2);
Object.setPrototypeOf(t,BigInt.prototype);
t.toString();
// Uncaught TypeError: BigInt.prototype.toString requires that 'this' be a BigInt
```

## 创建新对象并拷贝
对于原始类型，我们可以直接复制，而对象则要分情况讨论。
```js
function clone(src, wm = new WeakMap, errors = []) {
    if (isPrimitive(src)) return src
    if (wm.has(src)) return wm.get(src)
    return cloneObject(src, wm, errors)
}
```

### Custom & Object
我们已经明白对象本质上是一个空 Object 拥有属性和原型链，所以对于自定义类型，我们只需要将属性拷贝至指定了__proto__的空 Object 即可。我在讨论对象是否可迭代时主要考虑的是是否有内置属性，对于普通的和自定义的 Object，所有属性都是可迭代的，可以直接用默认拷贝方法，因此不需要额外处理。
```js
function cloneObject(src, wm, errors) {
    const dest = cloneNative(src, wm, errors)
    wm.set(src, dest)
    cloneProps(src, dest, wm, errors)
    Object.isExtensible(src) || Object.preventExtensions(dest)
    Object.isSealed(src) && Object.seal(dest)
    Object.isFrozen(src) && Object.freeze(dest)
    return dest
}

function cloneNative(src, wm, errors) {
    const type = src.constructor
    switch (type) {
        case Boolean:
        /* Native Class... */
        default:// Custom & Object
            return Object.create(Object.getPrototypeOf(src))
    }
}
```
在这里，我默认不克隆原型链上的对象。当然，我们可以克隆自定义的原型链，只需要`clone(Object.getPrototypeOf(src), wm, errors)`，但我更倾向于将原型链视为对象的基本属性，这样我们可以使得克隆的对象的`instanceof`方法保持相同的结果。
### Array
Array 对象真的是非常令人困扰的对象，想当然的，你会认为`Object.create(Array.prototype)`可以产生一个 Array，甚至开发者工具都显示为 Array，但是事实并非如此，
```js
Array.isArray(Object.create(Array.prototype))// false
```
Array 内部实现了某些功能并未暴露出来，因此我们最简单的方法是新建一个数组。
```js
case Array:
    return new Array()
```
### Primitives Like & Date & RegExp
原始类型相关的对象、日期对象、正则对象，他们可以通过原始值直接生成，因此我们可以直接用构造函数拷贝。
```js
new type(src)
```
对于 RegExp 对象，事实上还有需要拷贝的 lastIndex 属性，但此属性是可迭代的，在后续我们执行 cloneProps 时会被拷贝，因此不再处理。

对于特殊的函数 BigInt、Symbol，它们并不能生成对象，但我们可以通过 Object(Symbol) 这种方式将原始值转化为对象。
```js
Object(src.valueOf())
```
当然通过 valueOf 方法事实上是引擎隐式转化时真正做的事情，因此我们对两者有统一的写法。
```js
case BigInt:
case Boolean:
case Date:
case Number:
case RegExp:
case String:
case Symbol:
    return Object(new type(src.valueOf()))
```
### Errors
对于所有的错误，本质上都是普通的 Error 对象提供了 name 属性，而普通错误对象可以直接拷贝 stack 属性。因此通过 new 指定 message 和 name、constructor，拷贝 stack 就实现任意错误的拷贝。
```js
const err = new type(src.message);
err.stack = error.stack
```
在草案中的 AggregateError 是错误的合集，增加了 errors 属性。
```js
err.errors = clone(src.errors, wm, errors)
```
同样，事实上对于错误类型我们不需要这样处理，因为 stack 属性和 errors 属性都是可迭代的，在后续我们执行 cloneProps 时会被拷贝，因此不再处理。
```js
case Error:
case EvalError:
case RangeError:
case ReferenceError:
case SyntaxError:
case TypeError:
case URIError:
case AggregateError:
    return new type(src.message)
```
### Map & Set
Map、Set 拥有相同的 api，因此可以以同种方法拷贝。
```js
case Map:
case Set:
    const kv = new type()
    src.forEach((value, key) => { kv.set(key, clone(value, wm, errors)) })
    return kv
```
但 WeakMap、WeakSet 却完全不能拷贝，因为它们都是不可迭代的。但拷贝失败不能毫无反应吧，因此我们产生一个错误事件。
```js
case WeakMap:
case WeakSet:
    const err = new Error('weakly referenced collection can not be cloned')
    err.target = src
    errors.push(err)
    return Object.create(null)
```
### Promise
Promise 通过链式调用实现状态拷贝功能。
```js
case Promise:
    return src.then()
```
### ArrayBuffer & TypedArray & DataView
ArrayBuffer 和 TypedArray 是类数组的对象，但所有的项都是可以值拷贝的。通过 subarray 我们可以获得原 ArrayBuffer 的引用，而 slice 可以获取副本。
```js
const b1 = new ArrayBuffer(8)
const b2 = b1.slice(0)
const a1 = new Int8Array(b1)
const a2 = new Int8Array(b2)
const a3 = a1.slice(0)
const a4 = a1.subarray(0)
a1[0] = 1
a2[0] // 0
a3[0] // 0
a4[0] // 1
```
因此我们可以直接用 slice 方法进行拷贝。
```js
case ArrayBuffer:
case SharedArrayBuffer:
case Int8Array:
case Uint8Array:
case Uint8ClampedArray:
case Int16Array:
case Uint16Array:
case Int32Array:
case Uint32Array:
case Float32Array:
case Float64Array:
case BigInt64Array:
case BigUint64Array:
    return src.slice(0)
```
DataView 构造函数接受 3 个参数 buffer、byteOffset、byteLength，通过拷贝 buffer 我们可以实现 DataView 对象的克隆。
```js
case DataView:
    return new DataView(src.buffer.slice(0), src.byteOffset, src.byteLength)
```
### Function & Generator
```js
const proto = Object.getPrototypeOf
const AsyncFunction = proto(async function () { }).constructor
const Generator = proto(function* () { }()).constructor
const AsyncGenerator = proto(async function* () { }()).constructor
const GeneratorFunction = proto(function* () { }).constructor
const AsyncGeneratorFunction = proto(async function* () { }).constructor
```
我们很难直接拷贝他们，事实上如果你查看官方实现的拷贝方法（web worker 相关），或者在网上搜寻“clone Generator”，你会得到结果，无法拷贝。

为什么他们这么难拷贝？如果你在开发者工具查看 Generator 的属性，你会看到：
- `[[GeneratorLocation]]`
- `[[GeneratorState]]`
- `[[GeneratorFunction]]`
- `[[GeneratorReceiver]]`
- `[[Scopes]]`

正是因为存在 js 中无法直接操作的属性，我们的拷贝才会变得如此困难。那么我要怎么拷贝，或者看上去像是拷贝？

参考 Promise 的拷贝方法，很容易想到，我们事实上完全不需要拷贝它，只需要包装一层即可。但 Function 的 toString 方法的返回值和原来不一样，我们可以通过修饰 Function.prototype.toString 来修正，但会有性能损失。同时 Function.prototype.toString 本身需要修正。
```js
// eval CSP
function genFunc(type, src) {
    switch(type){
        case Function:
            return function(){return src.apply(this,arguments)}
        case GeneratorFunction:
            return function*(){return src.apply(this,arguments)}
        case AsyncFunction:
            return async function(){return src.apply(this,arguments)}
        case AsyncGeneratorFunction:
            return async function*(){return src.apply(this,arguments)}
    }
}
```
```js
case Function:
case GeneratorFunction:
case AsyncFunction:
case AsyncGeneratorFunction:
    const p = Object.getPrototypeOf(src)
    const fn = genFunc(type, src)
    const toString = Function.prototype.toString
    if (type.prototype !== p) Object.setPrototypeOf(fn, Object.getPrototypeOf(src))
    const dToString = function () {
        return toString.apply((this === fn) ? src : (this === dToString) ? toString : this)
    }
    Function.prototype.toString = dToString
    return (src === toString) ? dToString : fn

case Generator:
    return (function* () {
        var value, done;
        do {
            ({ value, done } = src.next())
            yield value
        } while (!done)
    })()

case AsyncGenerator:
    return (async function* () {
        var value, done
        do {
            await ({ value, done } = src.next())
            yield value
        } while (!done)
    })()
```

为什么我们可以用 Function 判断对象是否函数，即便函数的原型指向的并不一定是 Function？因为事实上所有的 Function 都没有 constructor 属性，Function 的原型链最后指向的都是 Function.prototype，而其 constructor 属性指向 Function。

这种方法有仍有缺陷，我们只浅拷贝了 Generator，不是不想拷贝其底层状态，而是不能，因此他们表现为指向相同的 GeneratorFunction，并且拥有相同的状态。ES Discuss 中有相关提案，采用类似 fork 的机制但可惜并没有实现。

## 测试
将上述所有包含函数的代码块拷贝到一起，再将所有的 case 拷贝至`/* Native Class... */`位置，再补充上类型定义，我们得到了一个完整的 clone 实现。现在我们使用测试代码包括拷贝、原始类型、嵌套、循环、冻结及所有原生对象对 clone 进行测试：
<details>
<summary>code</summary>
<div markdown="block">

```js
const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", l = c.length;
function randomString(len) { return Array.prototype.map.call(crypto.getRandomValues(new Uint32Array(len)), i => c[i % l]).join('') }
function signature() { return randomString(32) }
const notCopied = (d, s) => {
    if (isPrimitive(s)) return d !== s
    const s1 = signature(), s2 = signature();
    d[s1] = true
    s[s2] = true
    const flag = s[s1] || d[s2] || (d[s1] !== s[s2])
    delete d[s1]
    delete s[s2]
    return flag
};

const tests = [
    {// null
        value: null,
        failed: (d, s) => d !== null
    },
    {// primitives
        value: {
            'undefined': undefined,
            'boolean': true,
            'symbol': Symbol('symbol'),
            'number': 0,
            'bigint': 0n,
            'string': 'string',
            'object': null,
        },
        failed: (d, s) => Object.keys(s).some(key => s[key] !== d[key])
    },
    {// multiply deeper
        value: { a: { b: { c: { d: 1 }, e: 2 }, f: 3 }, g: 4 },
        failed: (d, s) => (d.a.b.c === s.a.b.c) || (d.a.b.c.d !== 1) || (d.a.b.e !== 2) || (d.a.f !== 3) || (d.g !== 4)
    },
    {// loop
        value: (() => {
            let a = {}, b = { a };
            a.b = b;
            return a;
        })(),
        failed: (d, s) => (d.b !== d.b.a.b) || (d.b === s.b)
    },
    {// freeze
        value: {
            extensible: {},
            sealed: Object.seal({}),
            frozen: Object.freeze({}),
        },
        failed: d => !(Object.isExtensible(d.extensible) && Object.isSealed(d.sealed) && Object.isFrozen(d.frozen))
    },
    {// custom class
        value: (() => {
            class test { }
            class outer extends test { }
            return {
                test,
                outer
            }
        })(),
        failed: (d, s) => !(new d.outer instanceof s.test)
    },
    {// Array
        value: [1, 2, 3],
        failed: (d, s) => !(Array.isArray(d) && (d.toString() === s.toString()))
    },
    {// Primitives Like & Date & RegExp
        value: {
            bigInt: BigInt(1),
            boolean: new Boolean(true),
            date: new Date(1),
            number: new Number(1),
            regexp: new RegExp('abc', 'gim'),
            string: new String('def'),
            symbol: Symbol('ghi')
        },
        failed: (d, s) => !(
            d.bigInt.valueOf() === s.bigInt.valueOf() &&
            d.boolean.valueOf() === s.boolean.valueOf() &&
            d.date.valueOf() === s.date.valueOf() &&
            d.number.valueOf() === s.number.valueOf() &&
            d.string.valueOf() === s.string.valueOf() &&
            d.regexp.toString() === s.regexp.toString() &&
            d.symbol === s.symbol
        )
    },
    {// Error
        value: new AggregateError([1, 2, 3], 'errors'),
        failed: (d, s) => !((d.constructor === s.constructor) && (d.name === s.name) && (d.stack === s.stack) && (d.message === s.message) && (d.errors.toString() === s.errors.toString()))
    },
    {// Promise
        value: Promise.resolve(1),
        failed: d => { d.then(v => { if (v !== 1) throw Error('clone promise failed') }) }
    },
    {// ArrayBuffer & TypedArray & DataView
        value: new DataView(new ArrayBuffer(8)),
        failed: (d, s) => {
            s.setInt8(0, 7)
            return d.getInt8(0) || (d.byteOffset !== s.byteOffset) || (d.byteLength !== s.byteLength)
        }
    },
    {// Generator
        value: (function* () { yield 1; yield 2 })(),
        failed: d => (d.next().value !== 1) || (d.next().value !== 2)
    },
    {// Function native
        value: parseInt,
        failed: d => d('0x123n') !== parseInt('0x123n')
    },
    {// Function toString
        value: function () {/*function toString() { [native code] }*/ },
        failed: (d, s) => (d.toString() !== s.toString()) || (Function.prototype.toString.call(Function.prototype.toString) !== 'function toString() { [native code] }')
    }
]

function check(fn, tests) {
    console.time('Test')
    const origin = tests.map(test => test.value)
    const cloned = fn(origin)
    var i = -1, len = tests.length
    while (++i < len) {
        if ((origin[i] !== tests[i].value) ||
            notCopied(cloned[i], origin[i]) ||
            tests[i].failed?.(cloned[i], origin[i])
        ) console.log(`Failed test ${i}:`, tests[i], cloned[i])
    }
    console.timeEnd('Test')
}

check(clone, tests)
```

</div>
</details>

完整代码可在 [https://gist.github.com/arex0/037d0490703ce78aa9192ea5c4e4912a](https://gist.github.com/arex0/037d0490703ce78aa9192ea5c4e4912a) 找到。

## Extra
我们目前仅对 Javascript 中的对象进行了处理，事实上通过增加 case，我们还能够拷贝 DOM 和 CSS 中的对象，如 Blob、Node、Event 等，现在也能拷贝部分的对象，但例如`instanceof`的用例完全失效了。

不过事实上我们能做到的东西是有限的，比如一旦涉及到引擎内部实现的对象，我们就束手无策了，比如我们无法处理 Proxy 对象，没有办法获取 handler，甚至会陷入 Proxy 制造的陷阱，比如 handler.get 的输出并不能通过 PropertyDescriptor 获取。

在实际使用中，除了这种 clone 形式的拷贝，事实上，我们还可以考虑代理形式的，如 immutable.js，用 proxy 实现代理等等，能够拷贝更多的东西，速度也更快，当然这并不是拷贝，所以使用方法上会有所限制（比如 Proxy 后的对象 PropertyDescriptor 获取到的并不是真实的值）。

## Reference
- [JavaScript data types and data structures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures)
- [Standard built-in objects](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects)
- [Enumerability and ownership of properties](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Enumerability_and_ownership_of_properties)
- [The structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
- [Why in JavaScript both “Object instanceof Function” and “Function instanceof Object” return true?](https://stackoverflow.com/a/23623598)
- [如何写出一个惊艳面试官的深拷贝？](https://juejin.im/post/6844903929705136141)
- [Use ES6 Proxies where available for indexed access on Indexed](https://github.com/immutable-js-oss/immutable-js/issues/37)
- [Proposal: generator#clone() and generator#goto()](https://esdiscuss.org/topic/proposal-generator-clone-and-generator-goto)
- [How ECMAScript 5 still does not allow to subclass array](http://perfectionkills.com/how-ecmascript-5-still-does-not-allow-to-subclass-an-array/)
- [深入探究 Immutable.js 的实现机制](https://juejin.im/post/6844903679644958728)

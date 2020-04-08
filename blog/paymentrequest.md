---
title: "Payment Request API"
keywords: ["Payment Request",Javascript,API]
description: "use Payment Request API"
created_time: "2020-04-08"
modified_time: "2020-04-08"
markdown: true
share: true
---

# Payment Request API
***一致流畅的付款体验***
## 前言
`PaymentRequest API`的流程很简单
- 网站首先创建新的`PaymentRequest`（包括金额、货币，支付方式列表）
- 浏览器选择用户可用的支付方式
- 弹出支付请求
- 用户授权
- 交易执行

如果用户已经使用过此API，在用户看来，只有两个流程：
- 浏览器弹出请求弹窗
- 用户确认授权

如此丝滑顺畅，用户体验得到极大改善。

但是，如果你介意支付信息保存在各个网站的数据库的话，这个API唯一的缺陷是如果不使用Google Pay或支付宝之类的支付软件做中间桥梁，网站将能够获取用户输入的所有支付信息，包括卡号、姓名、有效期和银行卡验证码 (CVC)。

不过幸好，直接填写卡号进行交易不是网络支付的未来。而且还在讨论其他规范诸如：
- 基本信用转移付款 （基本信用转移）：一种在银行帐户之间转移资金的付款方式。
- 令牌化卡付款（令牌化卡）：一种付款方式，提供代表卡的令牌而不是原始卡号。
- 账本间付款方法 （interledger）：一种使用账本间协议转账的付款方法。
- SEPAmail基本付款（sepamail）：一种支持SEPAmail应用程序（例如RUBIS，GEMME或JADE）付款的付款方式。

## 开始
### 创建请求
创建一个`PaymentRequest`需要3个参数
```js
let request = new PaymentRequest(
    methodData, // required payment method data
    details,    // required information about transaction
    options,    // optional parameter for things like shipping, etc.
)
```
`methodData`,一个数组，包含支持的支付方法，比如银行卡，信用卡包括Visa，银联等信息，又或者Google Pay，支付宝等支付应用。

`details`包含支付内容，比如商品名字，价格，优惠名字，数额，以及总价。需要注意的是，这部分信息仅是为了展示给用户，浏览器不会计算总价，更不会确认价格。

`options`包含控制支付需要那些信息，比如必须要填写邮箱可以设置`requestPayerEmail`为`true`
### 支付方式
支付方式是一个数组，每个项只有两个字段，支付类型`supportedMethods`和支付方法所需信息`data`。
最基础的支付方式是`basic-card`,也就是储蓄卡和信用卡，支持的网络可以在此处查询到[https://www.w3.org/Payments/card-network-ids](https://www.w3.org/Payments/card-network-ids)
```js
const methodData = [
    {
        supportedMethods: 'basic-card',
        data:{
            supportedNetworks: ['unionpay'/*银联*/, 'visa', 'mastercard', 'amex', 'jcb', 'diners', 'discover', 'mir']，
            supportedTypes: ['credit', 'debit', 'prepaid']
        }
    }
]
```
另外的如支付宝，Google Pay等方式需要用特定付款方式标识符表示支付类型`supportedMethods`,如：
- Google Pay（https://google.com/pay）
- Apple Pay（https://apple.com/apple-pay）
- 三星付款（https://spay.samsung.com）

而支付方法所需信息`data`需要根据不同的支付类型填写不同的信息。
```js
const methodData = [
    {
        supportedMethods: 'https://google.com/pay',//google pay 目前只支持chrome
        data: {
            environment: 'TEST',
            apiVersion: 1,
            allowedPaymentMethods: ['CARD', 'TOKENIZED_CARD'],
            paymentMethodTokenizationParameters: {
                tokenizationType: 'PAYMENT_GATEWAY',
                // Check with your payment gateway on the parameters to pass.
                parameters: {}
            },
            cardRequirements: {
                allowedCardNetworks: ['AMEX', 'DISCOVER', 'MASTERCARD', 'VISA'],
                billingAddressRequired: true,
                billingAddressFormat: 'MIN'
            },
            phoneNumberRequired: true,
            emailRequired: true,
            shippingAddressRequired: true
        },
    },
    {
        supportedMethods: 'https://bobpay.xyz/pay',
        ...
    },
    {
        supportedMethods: 'https://www.alipay.com/webpay'
    }
]
```
如果你想用这个API个人收款，可以查看以下支付网关：
- [Stripe](https://stripe.com/docs/stripe-js/elements/payment-request-button)
- [Braintree](https://developers.braintreepayments.com/guides/payment-request/overview)
- [Bluesnap](https://developers.bluesnap.com/v8976-Basics/docs/payment-request-api)
- [WePay](https://developer.wepay.com/docs/mobile/payment-request-api)

### 支付内容
支付内容包括以下字段：
- `total`总价格（必填且不能为负）
- `displayItems`商品列表
- `modifiers`额外商品（如优惠，快递方式）包括`additionalDisplayItems`、`data`、`total`，`shippingOptions`运输选项。

也可以设置`id`字段，但一般来说使用浏览器自动构造的值。

一个简单的支付内容示例如下，`displayItems`数组中项目的顺序将决定它们在UI中的显示顺序。
```js
let details = {
    displayItems: [
        {
            label: 'buy me a coffee',
            amount: { currency: 'USD', value: 1 }
        },
        {
            label: 'first to buy',
            amount: {currency: 'USD', value: -1 },
        }
    ],
    total: {
        label: 'Total',
        amount: { currency: 'USD', value : 0 }
    }
}
```
其中`currency`表示货币类型，都是3个大写字母表示的货币代码，如`CNY`表示人民币，货币代码可以在此处查询到[ISO 4217](https://www.currency-iso.org/dam/downloads/lists/list_one.xml)。
对于不确定的项（快递费）可以加上`pending: true`，请求UI将会有所区分。
### 支付选项
支付选项控制交易收集哪些信息，包括以下字段：
- `requestPayerName`收集付款人的姓名，默认为false。
- `requestPayerEmail`收集付款人的电子邮件默认为false。
- `requestPayerPhone`收集付款人的电话号码，默认为false。
- `requestShipping`收集付款人的收货地址，默认为false。
- `shippingType`，运输使用哪个单词：`shipping`，`delivery`和`pickup`，默认为`shipping`。

### 发出请求
`request.show()`会弹出请求窗口，返回一个`Promise`，等待用户授权完毕后会返回一个`PaymentResponse`，其中包含用户提供的信息：
- `methodName`表示所选支付方式的字符串（例如 visa）
- `details`含有 methodName 信息的字典

如果在`options`中设置成需要还会包括以下信息：
- `shippingAddress`用户的收货地址
- `shippingOption`所选发货选项的 ID
- `payerEmail`付款人的电子邮件地址
- `payerPhone`付款人的电话号码
- `payerName`付款人的姓名

```json
{ // example response
  "methodName": "basic-card",
  "details": {
    "cardholderName": "Larry Page",
    "cardNumber": "4111111111111111",
    "expiryMonth": "12",
    "expiryYear": "2020",
    "cardSecurityCode": "111",
    "billingAddress": { ... }
  },
  "payerName": "Larry Page",
  "payerPhone": "212-555-1212",
  "payerEmail": "user@example.com"
}
```
接下来我们需要利用这些信息完成我们的交易,最后调用`PaymentResponse.complete("success")`结束支付。
```js
request.show().then(function(paymentResponse) {
    return fetch('/pay', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentResponse)
    }).then(res => {
            if (res.status === 200) {
                return res.json()
            } else {
                throw 'Payment Error'
            }
        }).then(res => {
            paymentResponse.complete("success").then(() => {
                // Success UI
            }
        }, err => {
            paymentResponse.complete("fail").then(() => {
                // Error UI
        }
    })
}).catch(function(err) {
    console.error("Uh oh, something bad happened", err.message)
})
```
### 支付控制
在支付过程中我们可能需要对请求过程进行控制
#### 判断用户金额是否足够
```js
request.canMakePayment()
.then(function(result) {
    if (result) {
        // Display PaymentRequest dialog on interaction with the existing checkout button
        document.getElementById('buyButton').addEventListener('click', onBuyClicked)
    }
})
.catch(function(err) {
    console.log('canMakePayment() error! ' + err.name + ' error: ' + err.message)
})
```
#### 超时取消
```js
let paymentTimeout = window.setTimeout(function() {
    window.clearTimeout(paymentTimeout)
    request.abort().then(function() {
        console.log('Payment timed out after 5 minutes.')
    }).catch(function() {
        console.log('Unable to abort.')
    })
}, 5 * 60 * 1000)  /* 5 minutes */
```
#### 支付失败重试
```js
async function handlePayment() {
    const payRequest = new PaymentRequest(methodData, details, options)
    try {
        let payResponse = await payRequest.show()
        while (payResponse has errors) {
            /* let the user edit the payment information,
                wait until they submit */
            await response.retry()
        }
        await payResponse.complete("success")
    } catch(err) {
        /* handle the exception */
    }
}
```
#### 改变地区切换价格
```js
request.addEventListener('shippingaddresschange', e => {
    e.updateWith(((details, addr) => {
        if (addr.country === 'US') {
            let shippingOption = {
                id: '',
                label: '',
                amount: {currency: 'USD', value: '0.00'},
                selected: true
            }
            if (addr.region === 'US') {
                shippingOption.id = 'us'
                shippingOption.label = 'Standard shipping in US'
                shippingOption.amount.value = '0.00'
                details.total.amount.value = '55.00'
            } else {
                shippingOption.id = 'others'
                shippingOption.label = 'International shipping'
                shippingOption.amount.value = '10.00'
                details.total.amount.value = '65.00'
            }
            if (details.displayItems.length === 2) {
                details.displayItems.splice(1, 0, shippingOption)
            } else {
                details.displayItems.splice(1, 1, shippingOption)
            }
            details.shippingOptions = [shippingOption]
        } else {
            details.shippingOptions = []
        }
        return Promise.resolve(details)
    })(details, request.shippingAddress))
})
```
#### 更新运输价格
```js
paymentRequest.addEventListener('shippingaddresschange', (event) => {
    const paymentRequest = event.target
    console.log(paymentRequest.shippingAddress)

    event.updateWith({
        total: {
            label: 'Total',
            amount: {
                currency: 'USD',
                value: '0',
            },
        },
        shippingOptions: [
            {
                id: 'economy',
                label: 'Economy Shipping (5-7 Days)',
                amount: {
                    currency: 'USD',
                    value: '0',
                },
            }, {
                id: 'express',
                label: 'Express Shipping (2-3 Days)',
                amount: {
                    currency: 'USD',
                    value: '5',
                },
            }, {
                id: 'next-day',
                label: 'Next Day Delivery',
                amount: {
                    currency: 'USD',
                    value: '12',
                },
            },
        ],
    })
})
```
## 兼容
在`Payment Request API`还未普及时，我们需要做一些兼容避免客户流失，同时用户没有支持的支付手段也应该做兼容。
```js
if (window.PaymentRequest) {
    let request = new PaymentRequest(...)
    request.show().then(function(paymentResponse) {
        // Handle successful payment
    }).catch(function(error) {
        if (error.code == DOMException.NOT_SUPPORTED_ERR) {// 没有支持的应用时推荐支付应用
            window.location.href = 'https://bobpay.xyz/#download'
        } else {
            window.location.href = 'https://paypal.me/arex0'
        }
    })
}else{
    // NO Payment Request API
    window.location.href = 'https://paypal.me/arex0'
}
```
## 总结
`Payment Request API`是一种开放的跨浏览器标准，通过允许商家在单个API调用中请求和接受任何付款来替代传统的结帐流程。它极大地改善了购买过程中的用户工作流程，提供了更一致的用户体验，并使商家可以轻松利用不同的付款方式。

付款请求API既不是新的付款方式，也不与付款处理程序直接集成。重要的是，浏览器充当中介，存储了快速结帐所需的所有信息，因此用户只需单击一下即可确认并付款。

`Payment Request API`是未来网络支付方法的趋势，现在我们就可以开始使用它。
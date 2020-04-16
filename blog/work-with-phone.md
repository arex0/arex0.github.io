---
title: "让手机成为工作的助力"
keywords: [Phone,Notification,Work]
description: "Make phone help your work"
created: "2020-04-16"
modified: "2020-04-16"
markdown: true
share: true
---

# 让手机成为工作的助力
***Don't waste time on cumbersome phone applications***

## 前言
手机越来越强大，无论是娱乐还是工作我们都需要它，现在手机就像人类新的器官一样，所以我们需要想办法充分利用这个器官保证我们工作。
## 开始
### 与电脑协同
对于开发人员，手机也是相当重要的一部分，我认为很多开发人员都遇到过需要频繁在Linux和手机切换的情况，更一般的，我们需要查看手机的通知，又或者我们需要在电脑和手机互相传输文件。不断在两个设备进行切换令人感到疲惫，接下来我们尝试使用两个开源软件帮助我们在Linux上控制手机(以Debian XFCE环境为例)，用`KDE Connect`在桌面接收通知，然后用`Scrcpy`在桌面控制手机。
#### KDE Connect
`KDE Connect`是一个能够方便手机与电脑进行连接的应用，与苹果的 AirDrop 和华为的 Huawei Share 有些类似，但它比这两款工具更强大，也更适合开发人员。它具有以下功能:
- 文件互传
- 报告电量
- 通知同步(双向)
- 来电通知
- 剪切板同步
- 桌面SMS
- 找到手机(响铃)
- 远程输入(键盘鼠标/幻灯片遥控器)
- 远程命令(电脑预置)

`KDE Connect`需要在电脑和手机都安装客户端，通过wifi连接。

`KDE Connect`依赖于`KDE Plasma`但我们可以用[indicator-kdeconnect](https://github.com/Bajoja/indicator-kdeconnect/)来解决。
```shell
wget https://github.com/Bajoja/indicator-kdeconnect/releases/download/0.9.2/indicator-kdeconnect_0.9.2_amd64.deb
sudo apt install python-nautilus, python-nemo python-caja
sudo dpkg -i indicator-kdeconnect_0.9.2_amd64.deb
sudo apt install kdeconnect
```

`KDE Connect`的使用很简单，在安装完两端的软件后，在手机端选择“根据IP添加”和桌面进行配对，根据个人喜好进行设置即可使用。
建议手机只开启“通知同步”和“电话通知”功能，若需要，也可开启“执行命令”功能，在需要时才使用`Scrcpy`开启其它功能以节约电量。
#### Scrcpy
`Scrcpy`可以视为开源免费版的 Vysor 替代品，可以将安卓手机的画面投屏到电脑桌面显示上并进行操控。它支持鼠标控制、键盘输入、电脑剪切板复制粘贴、拖放文件传输到手机、以及拖放 APK 文件进行安装。
`Scrcpy`仅需要在电脑上安装客户端，在手机开启usb调试即可使用，支持通过usb和wifi两种方式连接。
`Scrcpy`在Linux只有终端界面且依赖于adb。

`Scrcpy`安装很简单
```shell
sudo apt install scrcpy
```
`scrcpy --help`可以查看支持的功能，比较实用的如`scrcpy -r file.mp4`可以进行录屏。

`scrcpy`有两种链接方式，都很简单
- USB连接，连接USB后，桌面直接运行`scrcpy`即可
- Wifi连接，先进行adb远程连接`adb connect IP:PORT`


>补充:
>必须先开启手机的调试模式
>在USB连接情况下，用以下命令设置adb端口`adb tcpip PORT`

`scrcpy`支持快捷键

功能 | 快捷键
----- | ------
切换全屏模式 | Ctrl+F
将窗口调整为1:1(完美像素) | Ctrl+G
调整窗口大小以删除黑色边框 | Ctrl+X/双击黑色背景
HOME键 | Ctrl+H/鼠标中键
BACK键 | Ctrl+B/鼠标右键
任务管理键 | Ctrl+S
菜单键 | Ctrl+M
音量+键 | Ctrl+↑
设备音量-键 | Ctrl+↓
设备电源键 | Ctrl+P
点亮手机屏幕 | 鼠标右键
复制内容到设备 | Ctrl+V
启用/禁用 FPS 计数器(stdout) | Ctrl+i
安装APK | 将 apk 文件拖入投屏
传输文件到设备 | 将文件拖入投屏(非apk)

### 时间规划
手机往往在我们起床时就会打开，因此利用手机来做时间规划非常合适。
#### Google Tasks
这是一款非常简洁的APP，添加任务，时间，生成列表。由于是G家的，和系统软件如日历协同情况很好。
#### Loop 循环习惯记录
也很简洁的用于打卡每日任务的软件，用桌面微件快速提示任务和打卡，还有简易的统计数据。
### 用干净的软件
#### 无广告
一些APP会放置广告，甚至不可跳过的广告，即使可以跳过也会耽误你几秒钟，即使不是全屏的广告也会分散你的精力。
#### 无后台
大量后台的软件会浪费你的电量，造成手机卡顿，不仅让你关键时刻不能使用，还会消耗很多额外的精力。最好使用类似Google Pay的能够规范软件后台行为的软件，又或者支持“绿色应用公约”的软件。
##### 绿色守护
国内软件都是老流氓了，不仅需要大量权限，后台还非常频繁，但是又没有Play版，那要怎么办呢，下载绿色守护将某些不必要的后台关闭。

## 总结
手机就像人类新的器官，和我们需要管理身体状况一样，我们也需要花时间调整手机。使用合适的软件将它与工作连接起来，拒绝垃圾软件消耗我们的精力，让它成为我们的助力，而不是烦恼。
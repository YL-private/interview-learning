# 响应式原理

Vue2中的双向绑定是通过ES5的getter和setter以及Object.defineProperty结合发布订阅模式的方式实现的。当你将一个普通的JavaScript对象传入Vue实例的data选项时，Vue将遍历此对象的所有属性，并使用Object.defineProperty为这些属性添加getter和setter。每一个属性被加上了getter和setter之后，它就被视为了一个依赖，当其被访问时，getter会被触发，当在数据变动时，setter会被触发，发布消息给订阅者，触发相应的监听回调来渲染视图，也就是说数据和视图同步，数据发生变化，视图跟着变化，视图变化，数据也随之发生改变。

## 发布订阅模式

发布者(Publisher)：创建并发送消息的对象，不关心谁会收到这条消息。
订阅者(Subscriber)：对特定类型的消息感兴趣的接收者，订阅了某个主题后，当该主题有新消息发布时，就会收到通知。
调度中心(Broker/Channel)：中间人角色，负责接收来自发布者的消息，并将这些消息推送给所有订阅了该主题的订阅者。

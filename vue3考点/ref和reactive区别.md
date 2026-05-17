# ref和reactive的区别

1.ref适合基础数据类型，也能存对象，reactive只能存引用类型，如对象和数组，基础数据类型无效。
2.ref使用时必须.value解包，reactive不用，ref在模板上使用时编译器会自动解包。
3.ref解构不会丢失响应式，reactive会丢失，解构时必须用toRefs/toRef保留响应式。
4.ref可以直接整个变量重新赋值，reactive不能直接整体替换，会丢失响应式。

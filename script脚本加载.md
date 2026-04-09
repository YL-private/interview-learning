# script脚本加载情况

详解见[这篇文章](https://juejin.cn/post/6894629999215640583?searchId=202409251709241B66FBB596063E92B124)

```javascript
// script标签    JS执行顺序           是否阻塞解析 HTML
<script>        在HTML中的顺序       阻塞
<script async>  网络请求返回顺序     可能阻塞，也可能不阻塞
<script defer>  在 HTML 中的顺序     不阻塞
```

1. 带async
当浏览器遇到带有 async 属性的 script 时，请求该脚本的网络请求是异步的，不会阻塞浏览器解析 HTML，一旦网络请求回来之后，如果此时 HTML 还没有解析完，浏览器会暂停解析，先让 JS 引擎执行代码，执行完毕后再进行解析

2. 带defer
当浏览器遇到带有 defer 属性的 script 时，获取该脚本的网络请求也是异步的，不会阻塞浏览器解析 HTML，一旦网络请求回来之后，如果此时 HTML 还没有解析完，浏览器不会暂停解析并执行 JS 代码，而是等待 HTML 解析完毕再执行 JS 代码

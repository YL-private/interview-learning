# rem根据不同设备设置根字体大小

1.js动态设置根字体

```javascript
// 设计稿宽度 750px
const DESIGN_WIDTH = 750;
// 基准根字体
const BASE_FONT = 100;

function setRem() {
  // 获取当前屏幕宽度
  const width = document.documentElement.clientWidth;
  // 限制最大最小宽度，防止平板/电脑端变形
  const w = Math.min(Math.max(width, 320), 750);
  // 计算根字体
  const fontSize = w / DESIGN_WIDTH * BASE_FONT;
  // 设置到 html
  document.documentElement.style.fontSize = fontSize + 'px';
}

// 初始执行
setRem();
// 窗口大小变化重新计算
window.addEventListener('resize', setRem);
```

2.css媒体查询

```javascript
/* 320px */
@media screen and (min-width:320px) { html{font-size: 42.666667px;} }
/* 375px */
@media screen and (min-width:375px) { html{font-size: 50px;} }
/* 414px */
@media screen and (min-width:414px) { html{font-size: 55.2px;} }
/* 750px */
@media screen and (min-width:750px) { html{font-size: 100px;} }
```

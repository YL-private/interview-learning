## css3变量
1. CSS 变量通常在 :root 伪类中定义，这样它们可以在整个文档中使用。:root 表示文档的根元素（通常是html元素）。
例如：
<style>

  :root {
  --primary-color: #3498db;
  --secondary-color: #2ecc71;
  --font-size: 16px;
}
</style>

2. 变量的作用域
  CSS 变量的作用域是层级化的。你可以在任何选择器中定义变量，它们将只在该选择器及其子元素中生效。
3. 默认值
var() 函数还可以接受一个默认值，当引用的变量未定义时，将使用这个默认值。例如：var(--undefined-color, black);
4. CSS 变量可以通过 JavaScript 动态更新，这使得它们非常适合用于主题切换或响应式设计。
// 防抖：在一定时间内，如果多次触发同一个事件，则只执行最后一次
function debounce(func, delay) {
  let timer = null
  return function(...args) {
    // 剩余参数语法 ...args 只能放在形参的最末尾
    // 语法结构：...xxx 其中xxx 即 args 类型为数组
    // 内容：包含所有传递过来的变量 并将他们变为数组args
    if(timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      func.apply(this, args) // 或fn.call(this, ...args); ...args 此时是扩展运算符
    }, delay);
  }
}
debounce(function() {
  console.log(1111)
}, 1000)()
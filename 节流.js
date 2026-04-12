// 节流：在一定时间内，如果多次触发同一个事件，则只执行第一次
function throttle(func, delay) {
  let timer = null
  return function(...args) {
    if(timer) {
      return false // 定时器创建已创建但未执行时返回false
    }
    timer = setTimeout(() => {
      func.apply(this, args)
      clearTimeout(timer) // 定时器执行之后清除定时器，此时可再次执行函数
    }, delay);
  }
}
## el，template，render 属性优先性

当 Vue 选项对象中有 render 渲染函数时，Vue 构造函数将直接使用渲染函数渲染 DOM 树，当选项对象中没有 render 渲染函数时，Vue 构造函数首先通过将 template 模板编译生成渲染函数，然后再渲染 DOM 树，而当 Vue 选项对象中既没有 render 渲染函数，也没有 template 模板时，会通过 el 属性获取挂载元素的 outerHTML 来作为模板，并编译生成渲染函数。换言之，在进行 DOM 树的渲染时，render 渲染函数的优先级最高，template 次之且需编译成渲染函数，而挂载点 el 属性对应的元素若存在，则在前两者均不存在时，其 outerHTML 才会用于编译与渲染。

## template的三种写法

<script>
  //第一种（使用模板字符串）
  new Vue({
      el: "#app1",
      template: '<div>\
                      <h1>{{message}}</h1>\
                  </div>',
      data: {
          message: '字符串拼接'
      }
  })

  //第二种（使用script元素）
  new Vue({
      el: "#app2",
      template: '#tem',
      data: {
          message: '使用script元素'
      }
  })

  //第三种（使用template元素）
  new Vue({
      el: "#app3",
      template: '#tem_t',
      data: {
          message: '使用template元素'
      }
  })
</script>

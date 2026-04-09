## 基本用法

<script>
  <keep-alive>
    <component></component>
  </keep-alive>
</script>

## 生命周期

1. activated
   当 keep-alive 包含的组件再次渲染的时候触发
2. deactivated
   当 keep-alive 包含的组件销毁的时候触发

## 三个参数

include 包含的组件(可以为字符串，数组，以及正则表达式,只有匹配的组件会被缓存)

exclude 排除的组件(以为字符串，数组，以及正则表达式,任何匹配的组件都不会被缓存)

max 缓存组件的最大值(类型为字符或者数字,可以控制缓存组件的个数)

## 配合 router 使用

<script>
  // routes 配置
export default [
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: {
      keepAlive: true // 需要被缓存
    }
  }, {
    path: '/profile',
    name: 'profile',
    component: Profile,
    meta: {
      keepAlive: false // 不需要被缓存
    }
  }
]
</script>

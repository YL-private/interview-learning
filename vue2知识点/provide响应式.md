1. 返回函数
<script>
provide() {
  test: () => {
    return this.test
  }
}
</script>
2. 返回对象
<script>
provide() {
  test: () => {
    return {
      test: this.test
    }
  }
}
</script>
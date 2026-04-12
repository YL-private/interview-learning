let foo = [1,2,3,1,4,3,6] 
// 使用Set去重
let newFoo1 = Array.from(new Set(foo))
console.log(newFoo1); // [1,2,3,4,6]
// 使用Map去重
let newFoo2 = Array.from(new Map(foo.map(item => [item, item])).keys())
console.log(newFoo2); // [1,2,3,4,6]
// 使用reduce去重
let newFoo3 = foo.reduce((acc, item) => {
  if (!acc.includes(item)) {
    acc.push(item)
  }
  return acc
}, [])
console.log(newFoo3); // [1,2,3,4,6]
/**
 * symbol是一种基础数据类型，表示独一无二的值
 * symbol类型的真实值无法获取，也就是说symbol类型没有对应的字面量
 * symbol的意义在于区分彼此和不重复，不在于真实值 
 */ 

const foo1 = Symbol('foo')
const foo2 = Symbol('foo')
console.log(foo1 == foo2) // false

let mySymbol = Symbol();
let myWarppedSymbol = Object(mySymbol);
console.log(myWarppedSymbol); // "object"

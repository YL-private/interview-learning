function doSomething(){
  for(var i= 0; 4 > i; i++) 
    {
      var k = 100
      aMrg +=','+ (k+ i)
    }
}
var k= 1, aMrg = k;
doSomething();
aMrg += k;
console.log(aMrg); // 1,100,101,102,1031

var msg = 'hello'
function great(name, attr){
  name = 'david'
  var greating = msg + name + '!'
  var msg ='您好'
  for (var i = 0; i < 10; i++){
    var next = msg +'您的id是' + i * 2 + i
  }
  console.log(arguments[0]) // undefined
  console.log(arguments[1]) // undefined
  console.log(greating) // undefineddavid!
  console.log(next) // 您好您的id是189
}
great()
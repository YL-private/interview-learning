// 千分位分割
let num = 1234567890;
let reg = /\d{1,3}(?=(\d{3})+$)/g; // 限制逗号前面为1~3位，逗号后面为3位数倍数结尾
let res = String(num).replace(reg, '$&,'); 
console.log(res); // 1,234,567,890

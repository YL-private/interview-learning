/**
 *  参数	              描述
    string	  必需。要被解析的字符串。
    radix	    可选。表示要解析的数字的基数。该值介于 2 ~ 36 之间(就是几进制)。
 */

parseInt("10") // 10
parseInt("34 45 66") // 34
parseInt(" 60 ") // 60
parseInt("40 years") // 40
parseInt("He was 40") // NaN
parseInt("10",10) // 10
parseInt("010") // 10
parseInt("10",8) // 8
parseInt("0x10") // 16
parseInt("10",16) // 16
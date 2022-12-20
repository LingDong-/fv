# fv

*An experimental approach to expressing vector math in js (tagged template literals)*

`fv` is a tiny library (~4k) that allows you to write vector math like this:

```js
let a = [1,2,3],
    b = [4,5,6],
    c = [7,8];

let v = fv`( ${a} + ${b} )*0.5 - ${c}.xyx`

console.log(v); // [ -4.5, -4.5, -2.5 ]
```

## Features

- operator overloading for vectors: `+`, `-`, `*`, `\`, `%` etc.
- swizzling (e.g. `v.xyxy`, `u.zzz`, `b.y`)
- common glsl functions, `dot`, `cross`, `length`, `mix` etc. common math functions, `sin`, `cos`, `floor`, `fract` (elementwise).
- register your own functions and operators
- works with any dimension (2d, 3d, 4d, nd, mixed...). no special "class" for vectors: just use any array.
- not a feature: extra overhead

## Why

JavaScript does not support operator overloading, so the syntax is often a bit cumbersome when it comes to vector math. Current options are:

- p5.js / three.js style: `u.clone().subtract(v)`
- lambda lover style: `u.map((x,i)=>(x-v[i]))` 
- caveman style: `[u[0]-v[0], u[1]-v[1], u[2]-v[2]]`
- paper.js style: invent a new language that compiles to js
  
In comparison, in numpy, GLSL or C++ (with a proper library) you could simply do:

- `u-v`

`fv` wants to make vector math look more like that, while keeping things lightweight and unintrusive.

## Usage

In browser:

```html
<script src="fv.js"></script>
```

In node.js:

```js
const fv = require("./fv");
```

Arithmetic with vectors and scalars:

```js
fv`((${a} - ${b}) * (${c} / 2)) + 1.5`
```

Many ways to say a vector:

```js
fv`${a} + (1,2,3) - ${[4,5,6]} * vec(7,8,9)`

fv`(10 11 12) / (${13},14,${15})`
```

Swizzling:

```js
fv`${a}.y * ${b}.zzz + vec(${c}.xy, 3, 5)`
```

glsl functions:

```js
fv`mix(length(${a}) + dot(${b}, ${c}), ${d}, sin(${e}))`
```

(For a full list, see source code)

Define your own operators and functions:

```js
fv.new_fn('sum',(a)=>(a[0].reduce((z,x)=>(z+x),0)))

fv.new_op('<<',(a)=>(a[0].map((x,i)=>(x<<a[1][i]))),6);

fv`sum( ${a} << ${b} )`;
```

The last argument to `new_op` is the precedence (0-7). Lower that number, higher the precedence (evaluated sooner). 

All functions and operators, by default, pad the arguments to the highest dimension. (e.g. (1,2,3)+(4,5) is equivalent to (1,2,3)+(4,5,0), while (1,2,3)*2 is (2,4,6)). You can prevent this from happening to your custom functions like this:

```js
let f = _=>42
f.no_auto_dim = true;
fv.new_fn('test', f);
```

If you're not a fan of template literals, and instead prefer the style of `printf` and `%` in C. You can also do this:

```js
fv.fmt(`((% - %) * (% / 2)) + 1.5`, a, b, c);
```

Which is the same as the first example.

You can inspect the AST of cached templates by printing `fv.cache`, which looks like this:

```js
// console.log(fv.cache);
{
  '((% - %) * (% / 2)) + 1.5': {
    __op: '+',
    __xs: [
      {
        __op: '*',
        __xs: [
          { __op: '-', __xs: [ { __var: 0 }, { __var: 1 } ] },
          { __op: '/', __xs: [ { __var: 2 }, 2 ] }
        ]
      },
      1.5
    ]
  }
}

```


## How it works

JavaScript tagged template literal allows you to define a function specifying exactly how the template and the variables will be processed, which doesn't necessarily involve returning a string. So you could do something like this:

```js

function myTag(strings, a, b){
  if (strings[1].trim() == '/'){
    return a / b;
  }
}
console.log( myTag`${1} / ${2}` ) // 0.5
```

`fv` takes advantage of this feature, and implements a tiny expression parser for the template string. The syntax tree gets cached, so if a formula is evaluated over and over again (with different variables) as the program runs, the tree is only compiled once. 

## Cost

While the caching (thanks @leomcelroy for the hint) mostly eliminates the parsing overhead, fv is probably still slower than the conventional ways. Which is unfortunate, since performance is very important for vector operations, as they're often run billions of times in a program and make up the basis of complex algorithms. 

So, maybe try it for prototyping stuff, but don't use it for low-level library kind of stuff?

## Bugs

I hacked this thing together in a rush of excitement, mostly as a proof-of-concept, and haven't used it for any project yet. So if you found a way to break it please kindly report : )
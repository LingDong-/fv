const fv = require('./fv');

let a = [1,2,3];
let b = [4,5,6];
let c = [7,8];

console.log(fv`((${a} + ${b}) * 2.2) + ${c} ** 3 - (1,0,1)`);

console.log(fv` dot(${a}+1, dot(${b}.xyx, 3) + ${[3,2,1]} )* length(${c}) `);

console.log(fv`dot(${a}+1, dot(${b},3) + ${[3,2,1]} )* length(${c})`);

console.log(fv`cross(${a}, ${b}) + sin(${a})`);

console.log(fv`max(${a}, ${b}, ${c})`);

console.log(fv`${a}.xyxy + ${b}.zyxx + 1`);

console.log(fv` dot(${a}+1, dot(${b}.xyx,3) + ${[3,2,1]} )* length(${c}) `);

fv.new_fn('sum',(a)=>(a[0].reduce((z,x)=>(z+x),0)))

fv.new_op('<<',(a)=>(a[0].map((x,i)=>(x<<a[1][i]))),6);

console.log(fv`sum(2 + ${a} << ${b} )`);

console.log(fv`floor(${Math.PI}) + fract(${Math.PI})`)

console.log(fv`${b}.x + ${a}.y + (1,2,3,4).w`)

console.log(fv`distance(${a}, ${b})`)

console.log(fv.fmt("dot(%-1, dot(%.xyx, 3) + % ) * length(%)", a,b,c,a));

console.log(fv`${a}.xyx * ${b}.zzz + vec(${c}.x, 3, 5)`)

console.log(fv`(1,2) * (1,2,3)`)

console.log(fv`${a} + (1,2,3) - ${[4,5,6]} * vec(7,8,9) / (10 11 12) % (${13},${14},${15})`)

console.dir(fv.cache,{depth:null});


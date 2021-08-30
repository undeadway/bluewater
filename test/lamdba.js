require("coralian");

try {
    const bluewater = require("../src/index");

    const lamdba = bluewater.lambda("test");

    // let insertData = [
    //     {a: {type: 'interger', value: 1}, b: {type: 'interger', value: 2}, c: {type: 'interger', value: 3}},
    //     {a: {type: 'interger', value: 2}, b: {type: 'interger', value: 3}, c: {type: 'interger', value: 5}},
    //     {a: {type: 'interger', value: 3}, b: {type: 'interger', value: 5}, c: {type: 'interger', value: 7}},
    //     {a: {type: 'interger', value: 4}, b: {type: 'interger', value: 7}, c: {type: 'interger', value: 9}},
    //     {a: {type: 'interger', value: 5}, b: {type: 'interger', value: 11}, c: {type: 'interger', value: 11}},
    //     {a: {type: 'interger', value: 6}, b: {type: 'interger', value: 13}, c: {type: 'interger', value: 13}}
    // ]

    // lamdba.insert(insertData, (res) => {
    //     console.log("result:", res);
    // });

    lamdba
    .like("A", 1, "%A")
    .select(["B",  "C"], (res) => {
        console.log("result:", res);
    });

    // lamdba
    // .lessThan("A", 20)
    // .select(["B",  "C"], (res) => {
    //     console.log("result:", res);
    // });

    // lamdba
    // .overThan("C", 20)
    // .select(["A",  "C"], (res) => {
    //     console.log("result:", res);
    // });

    // lamdba
    // .between("C", 20, 30)
    // .select(["A",  "C"], (res) => {
    //     console.log("result:", res);
    // });

    // lamdba
    // .equal("A", 3)
    // .update({"C": 50, "B": 50}, (res) => {
    //     console.log("result:", es);
    // })
} catch (e) {
    console.log(e);
}
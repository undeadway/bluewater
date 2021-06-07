require("coralian");

try {
    const bluewater = require("../src/index");

    const lamdba = bluewater.lambda("test");

    lamdba
    .like("A", 1, "%A")
    .select(["B",  "C", "D"], (res) => {
        console.log(res);
    });

    lamdba
    .lessThan("A", 20)
    .select(["B",  "C", "D"], (res) => {
        console.log(res);
    });

    lamdba
    .overThan("C", 20)
    .select(["A",  "C", "D"], (res) => {
        console.log(res);
    });

    lamdba
    .between("C", 20, 30)
    .select(["A",  "C", "D"], (res) => {
        console.log(res);
    });

    lamdba
    .update({"A": 100}, (res) => {
        console.log(res);
    })
} catch (e) {
    console.log(e);
}
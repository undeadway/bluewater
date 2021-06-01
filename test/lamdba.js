require("coralian");
const bluewater = require("../src/index");

bluewater.lambda("test")
.like("A", 1, "%A")
.select(["B",  "C", "D"], (res) => {
    console.log(res);
});

bluewater.lambda("test")
.lessthan("A", 20)
.select(["B",  "C", "D"], (res) => {
    console.log(res);
});

bluewater.lambda("test")
.overthan("C", 20)
.select(["A",  "C", "D"], (res) => {
    console.log(res);
});

bluewater.lambda("test")
.between("C", 20, 30)
.select(["A",  "C", "D"], (res) => {
    console.log(res);
});
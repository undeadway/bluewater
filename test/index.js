require("coralian");
const bluewater = require("../src/index");

const condition = {
    test: "abc",
    c2: "111",
    orderBy: "column1 DESC, column2 ASC"
}

const queue = [{
    name: "testLike",
    condition
}]

// bluewater().execute(
//     queue,
//     (res) => {
//         console.log(res);
//     }
// );

bluewater().testLike({
    condition,
    success: (res) => {
        console.log(res);
    },
    fail: (err) => {
        console.log(err);
    }
});
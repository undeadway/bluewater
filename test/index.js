require("coralian");
const bluewater = require("../src/index");

const condition = {
    test: "abc"
}

const queue = [{
    name: "testLike",
    condition
}]

// bluewater().transaction(
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
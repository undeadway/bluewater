require("coralian");
const bluewater = require("../src/index");


bluewater().testLike({
    condition: {
        test: "abc"
    },
    success: (res) => {
        console.log(res[0].rows);
    }
});
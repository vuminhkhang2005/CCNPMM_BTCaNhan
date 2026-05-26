require("dotenv").config();

const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes/api");
const connection = require("./config/database");

const app = express();
const port = process.env.PORT || 8888;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.send("Running shoe storefront API");
});

app.use("/v1/api", apiRoutes);

(async () => {
    try {
        await connection();
        app.listen(port, () => {
            console.log(`Backend Nodejs App listening on port ${port}`);
        });
    } catch (error) {
        console.log(">>> Error connect to DB: ", error);
    }
})();

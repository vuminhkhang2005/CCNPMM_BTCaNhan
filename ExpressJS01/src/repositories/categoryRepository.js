const Category = require("../models/category");

const countAll = () => Category.countDocuments();

const findAll = () => Category.find({});

const insertMany = (categories) => Category.insertMany(categories);

module.exports = {
    countAll,
    findAll,
    insertMany,
};

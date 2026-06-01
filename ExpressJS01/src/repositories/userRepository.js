const User = require("../models/user");

const findByEmail = (email) => User.findOne({ email });

const create = (data) => User.create(data);

const findAllWithoutPassword = () => User.find({}).select("-password");

const countFavoritesByProductId = (productId) => User.countDocuments({ favoriteProducts: Number(productId) });

const save = (user) => user.save();

module.exports = {
    findByEmail,
    create,
    findAllWithoutPassword,
    countFavoritesByProductId,
    save,
};

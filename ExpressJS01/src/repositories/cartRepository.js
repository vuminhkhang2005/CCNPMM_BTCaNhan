const Cart = require("../models/cart");

const findByUserId = (userId) => Cart.findOne({ userId });

const create = (data) => Cart.create(data);

const findOrCreateByUserId = async (userId) => {
    let cart = await findByUserId(userId);
    if (!cart) {
        cart = await create({ userId, items: [] });
    }

    return cart;
};

const save = (cart) => cart.save();

module.exports = {
    findByUserId,
    create,
    findOrCreateByUserId,
    save,
};

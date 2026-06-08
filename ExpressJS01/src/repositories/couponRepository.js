const Coupon = require("../models/coupon");

const countAll = () => Coupon.countDocuments();

const insertMany = (coupons) => Coupon.insertMany(coupons);

const create = (data) => Coupon.create(data);

const findAvailableForEmail = (email) => {
    const now = new Date();
    return Coupon.find({
        active: true,
        $or: [{ ownerEmail: "" }, { ownerEmail: email }],
        $and: [
            {
                $or: [
                    { expiresAt: { $exists: false } },
                    { expiresAt: null },
                    { expiresAt: { $gt: now } }
                ]
            },
            {
                $or: [
                    { usageLimit: 0 },
                    { usageLimit: { $exists: false } },
                    { usageLimit: null },
                    { $expr: { $lt: ["$usedCount", "$usageLimit"] } }
                ]
            }
        ]
    }).sort({ ownerEmail: -1, value: -1 });
};

const findByCodeForEmail = (code, email) => Coupon.findOne({
    code: code.toString().trim().toUpperCase(),
    active: true,
    $or: [{ ownerEmail: "" }, { ownerEmail: email }],
});

const save = (coupon) => coupon.save();

module.exports = {
    countAll,
    insertMany,
    create,
    findAvailableForEmail,
    findByCodeForEmail,
    save,
};

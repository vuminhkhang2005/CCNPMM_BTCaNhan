const Product = require("../models/product");

const buildMongoQuery = (query = {}) => {
    const mongoQuery = {};

    const keyword = query.keyword ? query.keyword.trim().toLowerCase() : "";
    if (keyword) {
        mongoQuery.$or = [
            { name: { $regex: keyword, $options: "i" } },
            { description: { $regex: keyword, $options: "i" } },
            { tags: { $in: [new RegExp(keyword, "i")] } },
        ];
    }

    if (query.category) {
        mongoQuery.category = query.category.trim().toLowerCase();
    }

    const minPrice = Number(query.minPrice) || 0;
    const maxPrice = Number(query.maxPrice);
    mongoQuery.price = { $gte: minPrice };
    if (!isNaN(maxPrice)) {
        mongoQuery.price.$lte = maxPrice;
    }

    const minRating = Number(query.minRating);
    if (!isNaN(minRating) && minRating > 0) {
        mongoQuery.rating = { $gte: minRating };
    }

    const stockStatus = query.stockStatus ? query.stockStatus.trim().toLowerCase() : "";
    if (stockStatus === "in-stock") {
        mongoQuery.stock = { $gt: 10 };
    } else if (stockStatus === "low-stock") {
        mongoQuery.stock = { $gt: 0, $lte: 10 };
    } else if (stockStatus === "out-stock") {
        mongoQuery.stock = 0;
    }

    const promotion = query.promotion ? query.promotion.trim().toLowerCase() : "";
    if (promotion === "sale") {
        mongoQuery.discount = { $gt: 0 };
    } else if (promotion === "new") {
        mongoQuery.isNew = true;
    } else if (promotion === "best-seller") {
        mongoQuery.bestSeller = true;
    }

    return mongoQuery;
};

const getMongoSort = (sortStr = "") => {
    const sort = sortStr.trim().toLowerCase();
    switch (sort) {
        case "price-asc":
            return { price: 1 };
        case "price-desc":
            return { price: -1 };
        case "sold-desc":
            return { sold: -1 };
        case "rating-desc":
            return { rating: -1 };
        case "newest":
            return { isNew: -1, id: 1 };
        default:
            return { bestSeller: -1, isNew: -1 };
    }
};

const countByFilters = (query = {}) => Product.countDocuments(buildMongoQuery(query));

const countAll = () => Product.countDocuments();

const insertMany = (products) => Product.insertMany(products);

const findByFilters = ({ query = {}, skip = 0, limit = 8 }) => Product.find(buildMongoQuery(query))
    .sort(getMongoSort(query.sort))
    .skip(skip)
    .limit(limit);

const findAllByFilters = (query = {}) => Product.find(buildMongoQuery(query))
    .sort(getMongoSort(query.sort));

const findRanking = (type = "best-seller") => {
    const sortObj = type === "most-viewed"
        ? { viewCount: -1, sold: -1 }
        : { sold: -1, viewCount: -1 };

    return Product.find({})
        .sort(sortObj)
        .limit(10);
};

const findBySlug = (slug) => Product.findOne({ slug });

const findByIdNumber = (id) => Product.findOne({ id: Number(id) });

const findByIds = (ids = []) => Product.find({ id: { $in: ids.map(Number) } });

const findSimilar = ({ category, excludedSlug, limit = 4 }) => Product.find({
    category,
    slug: { $ne: excludedSlug },
})
    .sort({ rating: -1, sold: -1 })
    .limit(limit);

const save = (product) => product.save();

module.exports = {
    countByFilters,
    countAll,
    insertMany,
    findByFilters,
    findAllByFilters,
    findRanking,
    findBySlug,
    findByIdNumber,
    findByIds,
    findSimilar,
    save,
};

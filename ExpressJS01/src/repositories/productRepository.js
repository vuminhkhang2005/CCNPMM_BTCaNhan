const Product = require("../models/product");
const { prepareProductForStorage } = require("../utils/productVariants");

const buildMongoQuery = (query = {}) => {
    const mongoQuery = {};

    const keyword = query.keyword ? query.keyword.trim() : "";
    if (keyword) {
        mongoQuery.$or = [
            { name: { $regex: keyword, $options: "i" } },
            { description: { $regex: keyword, $options: "i" } },
            { tags: { $regex: keyword, $options: "i" } },
        ];
    }

    if (query.category) {
        mongoQuery.category = query.category.trim().toLowerCase();
    }

    const priceFilter = {};
    let hasPriceFilter = false;

    if (query.minPrice !== undefined && query.minPrice !== null && String(query.minPrice).trim() !== "") {
        const minPrice = Number(query.minPrice);
        if (!isNaN(minPrice)) {
            priceFilter.$gte = minPrice;
            hasPriceFilter = true;
        }
    }

    if (query.maxPrice !== undefined && query.maxPrice !== null && String(query.maxPrice).trim() !== "") {
        const maxPrice = Number(query.maxPrice);
        if (!isNaN(maxPrice)) {
            priceFilter.$lte = maxPrice;
            hasPriceFilter = true;
        }
    }

    if (hasPriceFilter) {
        mongoQuery.price = priceFilter;
    }

    if (query.minRating !== undefined && query.minRating !== null && String(query.minRating).trim() !== "") {
        const minRating = Number(query.minRating);
        if (!isNaN(minRating) && minRating > 0) {
            mongoQuery.rating = { $gte: minRating };
        }
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

const insertMany = (products) => Product.insertMany(products.map(prepareProductForStorage));

const findAll = () => Product.find({});

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

const reserveVariantStock = ({ productId, variantId, quantity }) => Product.updateOne(
    {
        id: Number(productId),
        variants: {
            $elemMatch: {
                variantId,
                stock: { $gte: Number(quantity) },
                isActive: { $ne: false },
            },
        },
    },
    {
        $inc: {
            "variants.$.stock": -Number(quantity),
            stock: -Number(quantity),
            sold: Number(quantity),
        },
    },
);

const releaseVariantStock = ({ productId, variantId, quantity }) => Product.updateOne(
    {
        id: Number(productId),
        "variants.variantId": variantId,
    },
    {
        $inc: {
            "variants.$.stock": Number(quantity),
            stock: Number(quantity),
            sold: -Number(quantity),
        },
    },
);

module.exports = {
    countByFilters,
    countAll,
    insertMany,
    findAll,
    findByFilters,
    findAllByFilters,
    findRanking,
    findBySlug,
    findByIdNumber,
    findByIds,
    findSimilar,
    reserveVariantStock,
    releaseVariantStock,
    save,
};

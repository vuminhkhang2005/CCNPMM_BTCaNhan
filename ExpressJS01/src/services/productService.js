const Product = require("../models/product");
const Category = require("../models/category");
const seedData = require("../config/seed");

// Load static fallback arrays from seed config
const staticCategories = [
    { id: "road", name: "Road running", description: "Cushioned and durable shoes for city roads." },
    { id: "trail", name: "Trail running", description: "Grippy shoes for dirt, rocks, climbs, and off-road routes." },
    { id: "race", name: "Race day", description: "Lightweight, responsive shoes for race day speed." },
    { id: "daily", name: "Daily trainer", description: "Versatile shoes for daily training and commuting." },
];

const staticProducts = [
    {
        id: 1,
        slug: "aero-pace-elite",
        name: "Aero Pace Elite",
        category: "race",
        price: 2890000,
        originalPrice: 3490000,
        discount: 17,
        promotion: "17% off until the end of the week",
        isNew: true,
        bestSeller: true,
        stock: 18,
        sold: 426,
        viewCount: 1870,
        rating: 4.9,
        reviewCount: 142,
        tags: ["carbon", "race", "lightweight", "speed"],
        colors: ["White", "Orange red", "Black"],
        sizes: [39, 40, 41, 42, 43],
        images: [
            "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&w=1000&q=80",
        ],
        description: "Aero Pace Elite is made for runners who want a light, fast, responsive shoe for tempo sessions and race day.",
        highlights: ["Full-length carbon plate", "High rebound foam", "Breathable upper", "Reliable road grip"],
    },
    {
        id: 2,
        slug: "cloudflow-daily-3",
        name: "Cloudflow Daily 3",
        category: "daily",
        price: 1890000,
        originalPrice: 2190000,
        discount: 14,
        promotion: "Free premium running socks",
        isNew: true,
        bestSeller: false,
        stock: 34,
        sold: 238,
        viewCount: 1128,
        rating: 4.7,
        reviewCount: 96,
        tags: ["daily", "cushioned", "training", "breathable"],
        colors: ["Green", "Gray", "White"],
        sizes: [38, 39, 40, 41, 42, 43, 44],
        images: [
            "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=1000&q=80",
        ],
        description: "A daily training shoe that balances cushioning, durability, and an all-day wearable weight.",
        highlights: ["Soft EVA midsole", "Easy fit", "Built for 5K to 15K runs", "Slip-resistant outsole"],
    },
    {
        id: 3,
        slug: "terra-grip-pro",
        name: "Terra Grip Pro",
        category: "trail",
        price: 2490000,
        originalPrice: 2990000,
        discount: 17,
        promotion: "Free shipping for orders over 2,000,000 VND",
        isNew: false,
        bestSeller: true,
        stock: 9,
        sold: 319,
        viewCount: 1446,
        rating: 4.8,
        reviewCount: 118,
        tags: ["trail", "grip", "water resistant", "terrain"],
        colors: ["Earth brown", "Black", "Moss"],
        sizes: [40, 41, 42, 43],
        images: [
            "https://images.unsplash.com/photo-1543508282-6319a3e2621f?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=1000&q=80",
        ],
        description: "Terra Grip Pro has deep lugs and a secure upper for dirt, rock, climbs, and weekend trail routes.",
        highlights: ["5mm terrain lugs", "Reinforced toe cap", "Light water-resistant lining", "Stable on descents"],
    },
    {
        id: 4,
        slug: "stride-lite-road",
        name: "Stride Lite Road",
        category: "road",
        price: 1590000,
        originalPrice: 1790000,
        discount: 11,
        promotion: "Extra 100K off today",
        isNew: false,
        bestSeller: true,
        stock: 42,
        sold: 512,
        viewCount: 2214,
        rating: 4.6,
        reviewCount: 210,
        tags: ["road", "essential", "cushioned", "durable"],
        colors: ["Gray", "Blue", "White"],
        sizes: [38, 39, 40, 41, 42, 43, 44],
        images: [
            "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?auto=format&fit=crop&w=1000&q=80",
        ],
        description: "An approachable pick for new runners, focused on comfort, durability, and value.",
        highlights: ["Balanced weight", "Stable cushioning", "Durable rubber outsole", "Great for daily training"],
    },
    {
        id: 5,
        slug: "pulse-max-cushion",
        name: "Pulse Max Cushion",
        category: "road",
        price: 2290000,
        originalPrice: 2290000,
        discount: 0,
        promotion: "New arrival",
        isNew: true,
        bestSeller: false,
        stock: 27,
        sold: 154,
        viewCount: 968,
        rating: 4.7,
        reviewCount: 74,
        tags: ["road", "max cushion", "soft ride", "recovery"],
        colors: ["Cream", "Navy", "Black"],
        sizes: [39, 40, 41, 42, 43, 44],
        images: [
            "https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&w=1000&q=80",
        ],
        description: "Pulse Max Cushion prioritizes a soft feel under every step, ideal for long runs and recovery days.",
        highlights: ["Thick soft midsole", "Strong impact absorption", "Soft upper", "Long-run friendly"],
    },
    {
        id: 6,
        slug: "velocity-knit-2",
        name: "Velocity Knit 2",
        category: "daily",
        price: 1390000,
        originalPrice: 1690000,
        discount: 18,
        promotion: "Shoe and drawstring bag combo",
        isNew: false,
        bestSeller: false,
        stock: 0,
        sold: 187,
        viewCount: 735,
        rating: 4.4,
        reviewCount: 61,
        tags: ["daily", "knit", "breathable", "value"],
        colors: ["Black", "White"],
        sizes: [39, 40, 41, 42],
        images: [
            "https://images.unsplash.com/photo-1543508282-5c1f427f023f?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1000&q=80",
        ],
        description: "A breathable knit upper and flexible ride for runners who want a lightweight daily shoe.",
        highlights: ["Breathable knit upper", "Soft collar", "Flexible sole", "Accessible price"],
    },
    {
        id: 7,
        slug: "summit-rock-x",
        name: "Summit Rock X",
        category: "trail",
        price: 2690000,
        originalPrice: 3190000,
        discount: 16,
        promotion: "12-month outsole warranty",
        isNew: true,
        bestSeller: false,
        stock: 13,
        sold: 92,
        viewCount: 1264,
        rating: 4.6,
        reviewCount: 48,
        tags: ["trail", "rock plate", "protection", "mountain"],
        colors: ["Black", "Clay orange", "Moss green"],
        sizes: [40, 41, 42, 43, 44],
        images: [
            "https://images.unsplash.com/photo-1579338559194-a162d19bf842?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1605034313761-73ea4a0cfbf3?auto=format&fit=crop&w=1000&q=80",
        ],
        description: "Summit Rock X uses a rock plate to protect your feet on loose stones and technical trails.",
        highlights: ["Protective rock plate", "High-grip outsole", "Secure upper", "Stable on rocky routes"],
    },
    {
        id: 8,
        slug: "flash-race-carbon",
        name: "Flash Race Carbon",
        category: "race",
        price: 3290000,
        originalPrice: 3890000,
        discount: 15,
        promotion: "0% installment available",
        isNew: false,
        bestSeller: true,
        stock: 6,
        sold: 287,
        viewCount: 2035,
        rating: 4.9,
        reviewCount: 132,
        tags: ["carbon", "race", "marathon", "speed"],
        colors: ["White", "Neon blue"],
        sizes: [40, 41, 42, 43],
        images: [
            "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=1000&q=80",
        ],
        description: "Flash Race Carbon is tuned for marathon speed with a propulsive feel and a locked-in upper.",
        highlights: ["Carbon plate", "Ultralight foam", "Secure upper", "Built for tempo and racing"],
    },
    {
        id: 9,
        slug: "urban-glide-flex",
        name: "Urban Glide Flex",
        category: "daily",
        price: 1490000,
        originalPrice: 1890000,
        discount: 21,
        promotion: "Weekend training deal",
        isNew: false,
        bestSeller: true,
        stock: 29,
        sold: 351,
        viewCount: 1318,
        rating: 4.5,
        reviewCount: 83,
        tags: ["daily", "city", "flexible", "value"],
        colors: ["Black", "Silver", "Olive"],
        sizes: [38, 39, 40, 41, 42, 43],
        images: [
            "https://images.unsplash.com/photo-1521093470119-a3acdc43374a?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1516478177764-9fe5bd7e9717?auto=format&fit=crop&w=1000&q=80",
        ],
        description: "Urban Glide Flex is a lightweight daily trainer for short runs, gym sessions, and city movement.",
        highlights: ["Flexible outsole", "Breathable mesh", "Lightweight feel", "Great everyday value"],
    },
    {
        id: 10,
        slug: "road-pro-stability",
        name: "Road Pro Stability",
        category: "road",
        price: 2190000,
        originalPrice: 2490000,
        discount: 12,
        promotion: "Free gait consultation",
        isNew: false,
        bestSeller: false,
        stock: 16,
        sold: 176,
        viewCount: 1562,
        rating: 4.7,
        reviewCount: 69,
        tags: ["road", "stability", "support", "daily"],
        colors: ["Navy", "White", "Gray"],
        sizes: [39, 40, 41, 42, 43, 44],
        images: [
            "https://images.unsplash.com/photo-1605348532760-6753d2c43329?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=1000&q=80",
        ],
        description: "Road Pro Stability adds guidance and support for runners who want a smoother daily road ride.",
        highlights: ["Guidance rail support", "Stable platform", "Durable heel rubber", "Comfortable long-run fit"],
    },
    {
        id: 11,
        slug: "tempo-surge-one",
        name: "Tempo Surge One",
        category: "race",
        price: 2590000,
        originalPrice: 2990000,
        discount: 13,
        promotion: "Race week bundle",
        isNew: true,
        bestSeller: false,
        stock: 22,
        sold: 205,
        viewCount: 1742,
        rating: 4.8,
        reviewCount: 77,
        tags: ["race", "tempo", "speed", "responsive"],
        colors: ["Lime", "White", "Black"],
        sizes: [39, 40, 41, 42, 43],
        images: [
            "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1570464197285-9949814674a7?auto=format&fit=crop&w=1000&q=80",
        ],
        description: "Tempo Surge One is a snappy trainer for intervals, threshold sessions, and fast 10K efforts.",
        highlights: ["Responsive midsole", "Light lockdown", "Fast transitions", "Tempo-ready grip"],
    },
    {
        id: 12,
        slug: "forest-trail-lite",
        name: "Forest Trail Lite",
        category: "trail",
        price: 1990000,
        originalPrice: 2390000,
        discount: 17,
        promotion: "Trail starter pack",
        isNew: false,
        bestSeller: true,
        stock: 25,
        sold: 268,
        viewCount: 1194,
        rating: 4.6,
        reviewCount: 91,
        tags: ["trail", "light", "forest", "grip"],
        colors: ["Forest green", "Black", "Sand"],
        sizes: [39, 40, 41, 42, 43, 44],
        images: [
            "https://images.unsplash.com/photo-1600185365778-7875a359b924?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1595341888016-a392ef81b7de?auto=format&fit=crop&w=1000&q=80",
        ],
        description: "Forest Trail Lite keeps the weight low while giving new trail runners confident grip.",
        highlights: ["Light trail upper", "Multi-surface lugs", "Protective overlays", "Comfortable heel hold"],
    },
    {
        id: 13,
        slug: "recovery-soft-step",
        name: "Recovery Soft Step",
        category: "daily",
        price: 1290000,
        originalPrice: 1590000,
        discount: 19,
        promotion: "Recovery day special",
        isNew: true,
        bestSeller: false,
        stock: 31,
        sold: 143,
        viewCount: 889,
        rating: 4.4,
        reviewCount: 52,
        tags: ["daily", "recovery", "soft", "walking"],
        colors: ["Cream", "Gray", "Blue"],
        sizes: [38, 39, 40, 41, 42, 43],
        images: [
            "https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1000&q=80",
        ],
        description: "Recovery Soft Step gives a mellow ride for easy days, walks, and post-race recovery.",
        highlights: ["Soft foam", "Relaxed fit", "Easy walking comfort", "Lightweight upper"],
    },
    {
        id: 14,
        slug: "road-sprint-neo",
        name: "Road Sprint Neo",
        category: "road",
        price: 1790000,
        originalPrice: 2090000,
        discount: 14,
        promotion: "Buy today and save",
        isNew: false,
        bestSeller: true,
        stock: 19,
        sold: 304,
        viewCount: 1699,
        rating: 4.6,
        reviewCount: 103,
        tags: ["road", "speed", "daily", "light"],
        colors: ["Red", "White", "Black"],
        sizes: [39, 40, 41, 42, 43, 44],
        images: [
            "https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80",
        ],
        description: "Road Sprint Neo blends daily comfort with a quick toe-off for uptempo city runs.",
        highlights: ["Light road build", "Quick toe-off", "Breathable mesh", "Durable outsole"],
    },
];

// Helper functions for static search/filtering
const getPositiveNumber = (val, defaultValue) => {
    const num = parseInt(val, 10);
    return isNaN(num) || num <= 0 ? defaultValue : num;
};

const normalize = (value = "") => value.toString().trim().toLowerCase();
const getCategoryInfo = (categoryId) => staticCategories.find((cat) => cat.id === categoryId);
const attachCategory = (product) => ({ ...product, categoryInfo: getCategoryInfo(product.category) });

const paginateArray = (items, page = 1, limit = 8) => {
    const safePage = getPositiveNumber(page, 1);
    const safeLimit = getPositiveNumber(limit, 8);
    const total = items.length;
    const totalPages = Math.max(Math.ceil(total / safeLimit), 1);
    const start = (safePage - 1) * safeLimit;
    const data = items.slice(start, start + safeLimit);

    return {
        data,
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages,
            hasMore: safePage < totalPages,
        },
    };
};

const filterProductsArray = (query = {}) => {
    const keyword = normalize(query.keyword);
    const category = normalize(query.category);
    const promotion = normalize(query.promotion);
    const stockStatus = normalize(query.stockStatus);
    const sort = normalize(query.sort);
    const minPrice = Number(query.minPrice) || 0;
    const maxPrice = Number(query.maxPrice) || Infinity;
    const minRating = Number(query.minRating) || 0;

    const filtered = staticProducts.filter((product) => {
        const catInfo = getCategoryInfo(product.category);
        const searchableText = normalize([
            product.name,
            product.description,
            catInfo?.name,
            product.tags.join(" "),
        ].join(" "));

        const matchesKeyword = !keyword || searchableText.includes(keyword);
        const matchesCategory = !category || product.category === category;
        const matchesPrice = product.price >= minPrice && product.price <= maxPrice;
        const matchesRating = product.rating >= minRating;
        const matchesStock = !stockStatus
            || (stockStatus === "in-stock" && product.stock > 10)
            || (stockStatus === "low-stock" && product.stock > 0 && product.stock <= 10)
            || (stockStatus === "out-stock" && product.stock === 0);
        const matchesPromotion = !promotion
            || (promotion === "sale" && product.discount > 0)
            || (promotion === "new" && product.isNew)
            || (promotion === "best-seller" && product.bestSeller);

        return matchesKeyword && matchesCategory && matchesPrice && matchesRating && matchesStock && matchesPromotion;
    });

    return filtered.sort((a, b) => {
        switch (sort) {
            case "price-asc":
                return a.price - b.price;
            case "price-desc":
                return b.price - a.price;
            case "sold-desc":
                return b.sold - a.sold;
            case "rating-desc":
                return b.rating - a.rating;
            case "newest":
                return Number(b.isNew) - Number(a.isNew) || b.id - a.id;
            default:
                return Number(b.bestSeller) - Number(a.bestSeller) || Number(b.isNew) - Number(a.isNew);
        }
    });
};

const getProductsService = async (query = {}) => {
    if (!global.dbConnected) {
        // Fallback static memory logic
        const filteredProducts = filterProductsArray(query);
        const { data, pagination } = paginateArray(filteredProducts, query.page, query.limit || 8);

        return {
            EC: 0,
            EM: "Products loaded successfully (Fallback Memory)",
            products: data.map(attachCategory),
            categories: staticCategories,
            pagination,
            total: pagination.total,
        };
    }

    // Active MongoDB Mongoose queries
    try {
        const mongoQuery = buildMongoQuery(query);
        const sortObj = getMongoSort(query.sort);

        const page = getPositiveNumber(query.page, 1);
        const limit = getPositiveNumber(query.limit, 8);
        const skip = (page - 1) * limit;

        const total = await Product.countDocuments(mongoQuery);
        const totalPages = Math.max(Math.ceil(total / limit), 1);

        const products = await Product.find(mongoQuery)
            .sort(sortObj)
            .skip(skip)
            .limit(limit);

        const categories = await Category.find({});

        const mappedProducts = products.map((prod) => {
            const categoryInfo = categories.find((cat) => cat.id === prod.category);
            return { ...prod.toObject(), categoryInfo };
        });

        return {
            EC: 0,
            EM: "Products loaded successfully",
            products: mappedProducts,
            categories,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasMore: page < totalPages,
            },
            total,
        };
    } catch (error) {
        console.error(">>> Error at getProductsService:", error);
        throw error;
    }
};

const getProductsByCategoryService = async (query = {}) => {
    if (!global.dbConnected) {
        const sort = normalize(query.sort) || "category";
        const filtered = filterProductsArray({ ...query, sort: sort === "category" ? "" : sort })
            .sort((a, b) => {
                if (a.category !== b.category) {
                    return a.category.localeCompare(b.category);
                }
                return b.sold - a.sold || a.id - b.id;
            });

        const groupProductsByCategory = (items) => staticCategories
            .map((category) => ({
                ...category,
                products: items.filter((product) => product.category === category.id).map(attachCategory),
            }))
            .filter((category) => category.products.length > 0);

        const { data, pagination } = paginateArray(filtered, query.page, query.limit || 8);

        return {
            EC: 0,
            EM: "Products by category loaded successfully (Fallback Memory)",
            categories: groupProductsByCategory(data),
            pagination,
        };
    }

    try {
        const mongoQuery = buildMongoQuery(query);
        const sortObj = getMongoSort(query.sort);

        const products = await Product.find(mongoQuery).sort(sortObj);
        const categories = await Category.find({});

        const categoryGroups = categories.map((cat) => {
            const catProducts = products
                .filter((prod) => prod.category === cat.id)
                .map((prod) => ({ ...prod.toObject(), categoryInfo: cat }));
            return {
                ...cat.toObject(),
                products: catProducts
            };
        }).filter((group) => group.products.length > 0);

        const page = getPositiveNumber(query.page, 1);
        const limit = getPositiveNumber(query.limit, 8);
        const skip = (page - 1) * limit;

        const total = categoryGroups.length;
        const totalPages = Math.max(Math.ceil(total / limit), 1);
        const paginatedGroups = categoryGroups.slice(skip, skip + limit);

        return {
            EC: 0,
            EM: "Products by category loaded successfully",
            categories: paginatedGroups,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasMore: page < totalPages,
            },
        };
    } catch (error) {
        console.error(">>> Error at getProductsByCategoryService:", error);
        throw error;
    }
};

const getProductRankingService = async (query = {}) => {
    if (!global.dbConnected) {
        const type = normalize(query.type) === "most-viewed" ? "most-viewed" : "best-seller";
        const sortedProducts = [...staticProducts]
            .sort((a, b) => (
                type === "most-viewed"
                    ? b.viewCount - a.viewCount || b.sold - a.sold
                    : b.sold - a.sold || b.viewCount - a.viewCount
            ))
            .slice(0, 10);
        const { data, pagination } = paginateArray(sortedProducts, query.page, query.limit || 4);

        return {
            EC: 0,
            EM: "Product ranking loaded successfully (Fallback Memory)",
            type,
            products: data.map(attachCategory),
            pagination,
        };
    }

    try {
        const type = query.type === "most-viewed" ? "most-viewed" : "best-seller";
        const sortObj = type === "most-viewed"
            ? { viewCount: -1, sold: -1 }
            : { sold: -1, viewCount: -1 };

        const page = getPositiveNumber(query.page, 1);
        const limit = getPositiveNumber(query.limit, 4);
        const skip = (page - 1) * limit;

        const total = 10;
        const totalPages = Math.max(Math.ceil(total / limit), 1);

        const products = await Product.find({})
            .sort(sortObj)
            .limit(10);

        const paginatedProducts = products.slice(skip, skip + limit);
        const categories = await Category.find({});

        const mappedProducts = paginatedProducts.map((prod) => {
            const categoryInfo = categories.find((cat) => cat.id === prod.category);
            return { ...prod.toObject(), categoryInfo };
        });

        return {
            EC: 0,
            EM: "Product ranking loaded successfully",
            type,
            products: mappedProducts,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasMore: page < totalPages,
            },
        };
    } catch (error) {
        console.error(">>> Error at getProductRankingService:", error);
        throw error;
    }
};

const getProductCategoriesService = async () => {
    if (!global.dbConnected) {
        return {
            EC: 0,
            EM: "Categories loaded successfully (Fallback Memory)",
            categories: staticCategories,
        };
    }

    try {
        const categories = await Category.find({});
        return {
            EC: 0,
            EM: "Categories loaded successfully",
            categories,
        };
    } catch (error) {
        console.error(">>> Error at getProductCategoriesService:", error);
        throw error;
    }
};

const getProductDetailService = async (slug) => {
    if (!global.dbConnected) {
        const product = staticProducts.find((item) => item.slug === slug);
        if (!product) {
            return { EC: 1, EM: "Product not found" };
        }
        product.viewCount = (product.viewCount || 0) + 1;

        const similarProducts = staticProducts
            .filter((item) => item.category === product.category && item.slug !== product.slug)
            .sort((a, b) => b.rating - a.rating || b.sold - a.sold)
            .slice(0, 4)
            .map(attachCategory);

        return {
            EC: 0,
            EM: "Product detail loaded successfully (Fallback Memory)",
            product: attachCategory(product),
            similarProducts,
        };
    }

    try {
        const product = await Product.findOne({ slug });
        if (!product) {
            return { EC: 1, EM: "Product not found" };
        }

        product.viewCount = (product.viewCount || 0) + 1;
        await product.save();

        const categories = await Category.find({});
        const categoryInfo = categories.find((cat) => cat.id === product.category);

        const similarProducts = await Product.find({
            category: product.category,
            slug: { $ne: product.slug }
        })
            .sort({ rating: -1, sold: -1 })
            .limit(4);

        const mappedSimilar = similarProducts.map((prod) => {
            const catInfo = categories.find((cat) => cat.id === prod.category);
            return { ...prod.toObject(), categoryInfo: catInfo };
        });

        return {
            EC: 0,
            EM: "Product detail loaded successfully",
            product: { ...product.toObject(), categoryInfo },
            similarProducts: mappedSimilar,
        };
    } catch (error) {
        console.error(">>> Error at getProductDetailService:", error);
        throw error;
    }
};

// Internal MongoDB Query Builders
const buildMongoQuery = (query = {}) => {
    const mongoQuery = {};

    const keyword = query.keyword ? query.keyword.trim().toLowerCase() : "";
    if (keyword) {
        mongoQuery.$or = [
            { name: { $regex: keyword, $options: "i" } },
            { description: { $regex: keyword, $options: "i" } },
            { tags: { $in: [new RegExp(keyword, "i")] } }
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

module.exports = {
    getProductsService,
    getProductsByCategoryService,
    getProductRankingService,
    getProductCategoriesService,
    getProductDetailService,
};

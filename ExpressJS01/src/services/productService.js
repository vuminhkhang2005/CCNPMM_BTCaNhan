const categories = [
    { id: "road", name: "Road running", description: "Cushioned and durable shoes for city roads." },
    { id: "trail", name: "Trail running", description: "Grippy shoes for dirt, rocks, climbs, and off-road routes." },
    { id: "race", name: "Race day", description: "Lightweight, responsive shoes for race day speed." },
    { id: "daily", name: "Daily trainer", description: "Versatile shoes for daily training and commuting." },
];

const products = [
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
];

const normalize = (value = "") => value.toString().trim().toLowerCase();
const getCategoryInfo = (categoryId) => categories.find((category) => category.id === categoryId);
const attachCategory = (product) => ({ ...product, categoryInfo: getCategoryInfo(product.category) });

const getProductsService = (query = {}) => {
    const keyword = normalize(query.keyword);
    const category = normalize(query.category);
    const promotion = normalize(query.promotion);
    const stockStatus = normalize(query.stockStatus);
    const sort = normalize(query.sort);
    const minPrice = Number(query.minPrice) || 0;
    const maxPrice = Number(query.maxPrice) || Infinity;
    const minRating = Number(query.minRating) || 0;

    let filteredProducts = products.filter((product) => {
        const categoryInfo = getCategoryInfo(product.category);
        const searchableText = normalize([
            product.name,
            product.description,
            categoryInfo?.name,
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

    filteredProducts = filteredProducts.sort((a, b) => {
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

    return {
        EC: 0,
        EM: "Products loaded successfully",
        products: filteredProducts.map(attachCategory),
        categories,
        total: filteredProducts.length,
    };
};

const getProductCategoriesService = () => ({
    EC: 0,
    EM: "Categories loaded successfully",
    categories,
});

const getProductDetailService = (slug) => {
    const product = products.find((item) => item.slug === slug);
    if (!product) {
        return { EC: 1, EM: "Product not found" };
    }

    const similarProducts = products
        .filter((item) => item.category === product.category && item.slug !== product.slug)
        .sort((a, b) => b.rating - a.rating || b.sold - a.sold)
        .slice(0, 4)
        .map(attachCategory);

    return {
        EC: 0,
        EM: "Product detail loaded successfully",
        product: attachCategory(product),
        similarProducts,
    };
};

module.exports = {
    getProductsService,
    getProductCategoriesService,
    getProductDetailService,
};

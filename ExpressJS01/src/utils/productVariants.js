const normalizeSkuPart = (value) => String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeKeyPart = (value) => String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getVariantId = ({ productId, slug, color, size }) => [
    normalizeKeyPart(slug || `product-${productId}`),
    normalizeKeyPart(color),
    normalizeKeyPart(size),
].filter(Boolean).join("-");

const getVariantSku = ({ productId, slug, color, size }) => [
    normalizeSkuPart(slug || `P${productId}`),
    normalizeSkuPart(color),
    normalizeSkuPart(size),
].filter(Boolean).join("-");

const getUniqueValues = (values = []) => Array.from(new Set(
    values.filter((value) => value !== undefined && value !== null && String(value).trim() !== ""),
));

const distributeStock = (stock, count, index) => {
    if (!count) return 0;
    const safeStock = Math.max(Number(stock) || 0, 0);
    const base = Math.floor(safeStock / count);
    const remainder = safeStock % count;
    return base + (index < remainder ? 1 : 0);
};

const normalizeVariant = (product, variant, index) => {
    const color = String(variant.color || "").trim();
    const size = Number(variant.size);
    const productImages = Array.isArray(product.images) ? product.images : [];
    const fallbackImage = productImages[index % Math.max(productImages.length, 1)] || productImages[0] || "";
    const variantImages = getUniqueValues([
        ...(Array.isArray(variant.images) ? variant.images : []),
        variant.image,
    ]);
    const images = variantImages.length ? variantImages : [fallbackImage].filter(Boolean);

    return {
        variantId: variant.variantId || getVariantId({
            productId: product.id,
            slug: product.slug,
            color,
            size,
        }),
        sku: variant.sku || getVariantSku({
            productId: product.id,
            slug: product.slug,
            color,
            size,
        }),
        color,
        size,
        price: Number(variant.price || product.price || 0),
        stock: Math.max(Number(variant.stock) || 0, 0),
        image: variant.image || images[0] || "",
        images,
        isActive: variant.isActive !== false,
    };
};

const buildProductVariants = (product = {}) => {
    if (Array.isArray(product.variants) && product.variants.length > 0) {
        return product.variants
            .map((variant, index) => normalizeVariant(product, variant, index))
            .filter((variant) => variant.color && !Number.isNaN(variant.size));
    }

    const colors = getUniqueValues(product.colors || []);
    const sizes = getUniqueValues(product.sizes || []).map(Number).filter((size) => !Number.isNaN(size));
    const totalVariants = colors.length * sizes.length;

    return colors.flatMap((color, colorIndex) => sizes.map((size, sizeIndex) => {
        const variantIndex = colorIndex * sizes.length + sizeIndex;
        const image = product.images?.[colorIndex] || product.images?.[0] || "";

        return normalizeVariant(product, {
            color,
            size,
            stock: distributeStock(product.stock, totalVariants, variantIndex),
            image,
            images: [image].filter(Boolean),
        }, variantIndex);
    }));
};

const getProductStock = (variants = []) => variants
    .filter((variant) => variant.isActive !== false)
    .reduce((sum, variant) => sum + Number(variant.stock || 0), 0);

const prepareProductForStorage = (product = {}) => {
    const variants = buildProductVariants(product);
    const activeVariants = variants.filter((variant) => variant.isActive !== false);
    const colors = getUniqueValues(activeVariants.map((variant) => variant.color));
    const sizes = getUniqueValues(activeVariants.map((variant) => variant.size)).sort((a, b) => Number(a) - Number(b));
    const images = getUniqueValues([
        ...activeVariants.map((variant) => variant.image),
        ...activeVariants.flatMap((variant) => variant.images || []),
        ...(product.images || []),
    ]);

    return {
        ...product,
        variants,
        colors,
        sizes,
        images,
        stock: getProductStock(variants),
    };
};

const findVariant = (product = {}, { variantId, color, size } = {}) => {
    const variants = buildProductVariants(product);
    const normalizedVariantId = String(variantId || "").trim();

    if (normalizedVariantId) {
        return variants.find((variant) => variant.variantId === normalizedVariantId);
    }

    return variants.find((variant) => (
        variant.color === color
        && Number(variant.size) === Number(size)
    ));
};

module.exports = {
    buildProductVariants,
    findVariant,
    getProductStock,
    prepareProductForStorage,
};

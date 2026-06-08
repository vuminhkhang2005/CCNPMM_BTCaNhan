const couponService = require("./couponService");
const orderRepository = require("../repositories/orderRepository");
const productRepository = require("../repositories/productRepository");
const reviewRepository = require("../repositories/reviewRepository");
const userRepository = require("../repositories/userRepository");

if (!global.mockReviews) {
    global.mockReviews = [];
}

const serviceResponse = (statusCode, data) => ({ statusCode, data });

const normalizeRating = (rating) => {
    const value = Number(rating);
    if (Number.isNaN(value)) return 0;
    return Math.min(Math.max(value, 1), 5);
};

const findMockReviewableOrderItem = ({ email, slug, orderId }) => {
    const orders = global.mockOrders || [];
    const order = orders.find((item) => {
        const matchesOrder = !orderId || item._id === orderId;
        return matchesOrder
            && item.userEmail === email
            && Number(item.status) === 9
            && !item.cancelRequested
            && item.items?.some((orderItem) => orderItem.slug === slug);
    });

    if (!order) return null;

    return {
        order,
        item: order.items.find((orderItem) => orderItem.slug === slug),
    };
};

const getProductReviewsService = async (slug) => {
    try {
        if (!global.dbConnected) {
            const reviews = global.mockReviews
                .filter((review) => review.productSlug === slug)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return serviceResponse(200, {
                EC: 0,
                EM: "Reviews loaded successfully (Memory Fallback)",
                reviews,
            });
        }

        const product = await productRepository.findBySlug(slug);
        if (!product) {
            return serviceResponse(404, { EC: 1, EM: "Product not found" });
        }

        const reviews = await reviewRepository.findByProductId(product.id);
        return serviceResponse(200, {
            EC: 0,
            EM: "Reviews loaded successfully",
            reviews,
        });
    } catch (error) {
        console.error(">>> Error at getProductReviewsService:", error);
        return serviceResponse(500, { EC: -1, EM: "System error" });
    }
};

const createReviewService = async (email, slug, payload = {}) => {
    try {
        const rating = normalizeRating(payload.rating);
        const comment = payload.comment?.toString().trim();
        if (!rating || !comment) {
            return serviceResponse(400, { EC: 1, EM: "Rating and comment are required" });
        }

        if (!global.dbConnected) {
            const reviewableOrderItem = findMockReviewableOrderItem({ email, slug, orderId: payload.orderId });
            if (!reviewableOrderItem) {
                return serviceResponse(403, { EC: 2, EM: "You can only review products from successful, non-cancelled orders (Memory Fallback)" });
            }

            const existingReview = global.mockReviews.find((review) => (
                review.userEmail === email
                && review.productId === Number(reviewableOrderItem.item.productId)
                && review.orderId === reviewableOrderItem.order._id
            ));
            if (existingReview) {
                return serviceResponse(409, { EC: 3, EM: "This purchased item has already been reviewed (Memory Fallback)" });
            }

            const user = global.mockUsers?.find((item) => item.email === email);
            const rewardCoupon = await couponService.createReviewRewardCoupon(email);
            if (user) {
                user.points = Number(user.points || 0) + couponService.REVIEW_REWARD_POINTS;
            }

            const review = {
                _id: Date.now().toString(16),
                userEmail: email,
                userName: user?.name || email,
                productId: Number(reviewableOrderItem.item.productId),
                productSlug: slug,
                productName: reviewableOrderItem.item.name,
                orderId: reviewableOrderItem.order._id,
                rating,
                comment,
                rewardPoints: couponService.REVIEW_REWARD_POINTS,
                rewardCouponCode: rewardCoupon.code,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            global.mockReviews.push(review);

            return serviceResponse(201, {
                EC: 0,
                EM: "Review submitted. Reward points and coupon were added. (Memory Fallback)",
                review,
                reward: {
                    points: couponService.REVIEW_REWARD_POINTS,
                    coupon: rewardCoupon,
                },
            });
        }

        const [user, product] = await Promise.all([
            userRepository.findByEmail(email),
            productRepository.findBySlug(slug),
        ]);

        if (!user) {
            return serviceResponse(404, { EC: 4, EM: "User not found" });
        }
        if (!product) {
            return serviceResponse(404, { EC: 5, EM: "Product not found" });
        }

        const reviewableOrder = await orderRepository.findReviewableOrderWithProduct({
            userId: user._id,
            productId: product.id,
            orderId: payload.orderId,
        });
        if (!reviewableOrder) {
            return serviceResponse(403, { EC: 2, EM: "You can only review products from successful, non-cancelled orders" });
        }

        const existingReview = await reviewRepository.findByUserProductOrder({
            userEmail: email,
            productId: product.id,
            orderId: reviewableOrder._id,
        });
        if (existingReview) {
            return serviceResponse(409, { EC: 3, EM: "This purchased item has already been reviewed" });
        }

        const rewardCoupon = await couponService.createReviewRewardCoupon(email);
        const review = await reviewRepository.create({
            userId: user._id,
            userEmail: email,
            userName: user.name,
            productId: product.id,
            productSlug: product.slug,
            productName: product.name,
            orderId: reviewableOrder._id,
            rating,
            comment,
            rewardPoints: couponService.REVIEW_REWARD_POINTS,
            rewardCouponCode: rewardCoupon.code,
        });

        user.points = Number(user.points || 0) + couponService.REVIEW_REWARD_POINTS;
        await userRepository.save(user);

        const stats = await reviewRepository.averageRatingByProductId(product.id);
        product.rating = Number(Number(stats.average || 0).toFixed(1));
        product.reviewCount = stats.count;
        await productRepository.save(product);

        return serviceResponse(201, {
            EC: 0,
            EM: "Review submitted. Reward points and coupon were added.",
            review,
            reward: {
                points: couponService.REVIEW_REWARD_POINTS,
                coupon: rewardCoupon,
            },
        });
    } catch (error) {
        console.error(">>> Error at createReviewService:", error);
        return serviceResponse(500, { EC: -1, EM: "System error" });
    }
};

module.exports = {
    createReviewService,
    getProductReviewsService,
};

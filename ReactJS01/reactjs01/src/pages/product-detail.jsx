import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Alert, Button, Empty, Input, Rate, Select, Spin, Tag, notification } from "antd";
import { ArrowLeftOutlined, HeartFilled, HeartOutlined, MinusOutlined, PlusOutlined, ShoppingCartOutlined, StarFilled, TagOutlined, UserOutlined } from "@ant-design/icons";
import { AuthContext } from "../components/context/auth";
import { CartContext } from "../components/context/cart";
import useLockedAsyncAction from "../hooks/useLockedAsyncAction";
import { createProductReviewApi, getProductDetailApi, getProductReviewsApi, toggleFavoriteApi } from "../util/api";

const formatCurrency = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
}).format(value);

const getInitialQuantity = (variant) => (Number(variant?.stock || 0) > 0 ? 1 : 0);

const COLOR_HEX = {
  black: "#1c1917",
  blue: "#2563eb",
  "clay orange": "#c2410c",
  cream: "#f5f0df",
  "earth brown": "#7c4a2d",
  "forest green": "#166534",
  gray: "#9ca3af",
  green: "#16a34a",
  lime: "#84cc16",
  moss: "#5f6f3a",
  "moss green": "#4d6b3c",
  navy: "#1e3a8a",
  "neon blue": "#0ea5e9",
  olive: "#6b7d2f",
  "orange red": "#ea580c",
  red: "#dc2626",
  sand: "#d6b985",
  silver: "#cbd5e1",
  white: "#ffffff",
};

const getColorHex = (color = "") => COLOR_HEX[color.toLowerCase()] || "#d6d3d1";

const SimilarProductCard = ({ product }) => (
  <article className="overflow-hidden rounded-md border border-stone-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md">
    <Link to={`/products/${product.slug}`} className="block">
      <div className="aspect-[4/3] overflow-hidden bg-stone-100">
        <img src={product.images?.[0]} alt={product.name} className="h-full w-full object-cover" />
      </div>
      <div className="space-y-3 p-4">
        <p className="text-xs font-bold uppercase text-emerald-700">{product.categoryInfo?.name}</p>
        <h3 className="line-clamp-2 text-base font-black text-stone-950">{product.name}</h3>
        <div className="flex items-center justify-between gap-3">
          <span className="font-black text-stone-950">{formatCurrency(product.price)}</span>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-600"><StarFilled /> {product.rating}</span>
        </div>
      </div>
    </Link>
  </article>
);

const ProductDetailPage = () => {
  const { slug } = useParams();
  const { auth } = useContext(AuthContext);
  const { addToCart } = useContext(CartContext);
  const [product, setProduct] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [reviewableOrders, setReviewableOrders] = useState([]);
  const [reviewOrderId, setReviewOrderId] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [activeImage, setActiveImage] = useState("");
  const { loading: favoriteLoading, run: runToggleFavorite } = useLockedAsyncAction();
  const { loading: reviewSubmitting, run: runSubmitReview } = useLockedAsyncAction();
  const { loading: addingToCart, run: runAddToCart } = useLockedAsyncAction();
  const variants = useMemo(() => product?.variants || [], [product]);
  const colorOptions = useMemo(() => {
    const colorMap = new Map();
    variants.forEach((variant) => {
      const current = colorMap.get(variant.color) || { color: variant.color, stock: 0 };
      colorMap.set(variant.color, {
        color: variant.color,
        stock: current.stock + Number(variant.stock || 0),
      });
    });
    return Array.from(colorMap.values());
  }, [variants]);
  const sizeOptions = useMemo(() => variants
    .filter((variant) => variant.color === selectedColor)
    .sort((a, b) => Number(a.size) - Number(b.size)), [variants, selectedColor]);
  const selectedVariant = useMemo(() => variants.find((variant) => (
    variant.color === selectedColor && Number(variant.size) === Number(selectedSize)
  )), [variants, selectedColor, selectedSize]);
  const displayImages = useMemo(() => {
    const images = selectedVariant?.images?.length
      ? selectedVariant.images
      : [selectedVariant?.image || product?.images?.[0]].filter(Boolean);
    return images.length ? images : product?.images || [];
  }, [product, selectedVariant]);
  const heroImage = displayImages.includes(activeImage) ? activeImage : displayImages[0];

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const fetchProduct = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getProductDetailApi(slug);
        if (res?.EC === 0) {
          const firstVariant = (res.product.variants || []).find((variant) => Number(variant.stock) > 0)
            || res.product.variants?.[0];
          setProduct(res.product);
          setSimilarProducts(res.similarProducts);
          setQuantity(getInitialQuantity(firstVariant));
          setSelectedColor(firstVariant?.color || res.product.colors?.[0] || "");
          setSelectedSize(firstVariant?.size || res.product.sizes?.[0] || "");
          setActiveImage(firstVariant?.image || firstVariant?.images?.[0] || res.product.images?.[0] || "");
          setReviews(res.reviews || []);
          setIsFavorite(Boolean(res.isFavorite));
          setCanReview(Boolean(res.canReview));
          setReviewableOrders(res.reviewableOrders || []);
          setReviewOrderId(res.reviewableOrders?.[0]?._id || "");
        } else {
          setError(res?.EM || "Product not found");
        }
      } catch (requestError) {
        setError(requestError?.message || "Could not load product details");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [auth.isAuthenticated, slug]);

  const decreaseQuantity = () => setQuantity((value) => Math.max(1, value - 1));
  const increaseQuantity = () => {
    if (!selectedVariant) return;
    setQuantity((value) => Math.min(Number(selectedVariant.stock || 0), value + 1));
  };

  const refreshReviews = async () => {
    const res = await getProductReviewsApi(slug);
    if (res?.EC === 0) {
      setReviews(res.reviews || []);
    }
  };

  const handleToggleFavorite = async () => {
    if (!product) return;

    await runToggleFavorite(async () => {
      try {
        const res = await toggleFavoriteApi(product.slug, {
          productId: product.id,
          product,
        });
        if (res?.EC === 0) {
          setIsFavorite(Boolean(res.isFavorite));
          notification.success({
            message: "Favorites",
            description: res.EM,
          });
        } else {
          notification.error({
            message: "Favorites",
            description: res?.EM || "Could not update favorite product.",
          });
        }
      } catch (error) {
        console.error(">>> Error updating favorite:", error);
        notification.error({
          message: "Favorites",
          description: "System error occurred while updating favorite product.",
        });
      }
    });
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      notification.warning({
        message: "Review",
        description: "Please enter your comment.",
      });
      return;
    }

    await runSubmitReview(async () => {
      try {
        const res = await createProductReviewApi(slug, {
          orderId: reviewOrderId,
          rating: reviewRating,
          comment: reviewComment,
        });
        if (res?.EC === 0) {
          notification.success({
            message: "Review submitted",
            description: `You received ${res.reward?.points || 0} points and coupon ${res.reward?.coupon?.code || ""}.`,
          });
          setReviewComment("");
          setReviewRating(5);
          setCanReview(false);
          setReviewableOrders([]);
          await refreshReviews();
        } else {
          notification.error({
            message: "Review failed",
            description: res?.EM || "Could not submit review.",
          });
        }
      } catch (error) {
        console.error(">>> Error submitting review:", error);
        notification.error({
          message: "Review failed",
          description: "System error occurred while submitting review.",
        });
      }
    });
  };
  const handleAddToCart = async () => {
    if (!selectedVariant) {
      notification.warning({
        message: "Product Selection",
        description: "Please select an available shoe color and size.",
      });
      return;
    }

    if (Number(selectedVariant.stock || 0) <= 0) {
      notification.warning({
        message: "Product Selection",
        description: "This color and size is out of stock.",
      });
      return;
    }
    await runAddToCart(async () => {
      await addToCart({
        productId: product.id,
        variantId: selectedVariant.variantId,
        sku: selectedVariant.sku,
        slug: product.slug,
        name: product.name,
        price: selectedVariant.price || product.price,
        color: selectedVariant.color,
        size: Number(selectedVariant.size),
        quantity: Number(quantity),
        image: selectedVariant.image || selectedVariant.images?.[0] || product.images?.[0],
      });
    });
  };


  if (!auth.isAuthenticated) {
    return (
      <div className="mx-auto min-h-[calc(100vh-70px)] max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-md border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-black text-stone-950">Login is required to view product details</h1>
          <p className="mt-3 text-stone-500">The detail page, stock data, and similar products are protected by JWT.</p>
          <Link to="/login" className="mt-6 inline-flex rounded-md bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800">Login</Link>
        </div>
      </div>
    );
  }

  if (loading) return <div className="grid min-h-[calc(100vh-70px)] place-items-center"><Spin /></div>;

  if (error || !product) {
    return (
      <div className="mx-auto min-h-[calc(100vh-70px)] max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-md border border-stone-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-3xl font-black text-stone-950">{error || "Product not found"}</h1>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-md bg-stone-950 px-5 py-3 text-sm font-bold text-white hover:bg-stone-800"><ArrowLeftOutlined /> Back home</Link>
        </div>
      </div>
    );
  }

  const selectedStock = Number(selectedVariant?.stock || 0);
  const isOutOfStock = !selectedVariant || selectedStock <= 0;
  const variantPrice = selectedVariant?.price || product.price;
  const selectedSku = selectedVariant?.sku || "";
  const stats = [
    { label: "Rating", value: `${product.rating} / 5` },
    { label: "Sold", value: product.sold },
    { label: "Buyers", value: product.stats?.buyerCount || 0 },
    { label: "Total stock", value: product.stock || 0 },
  ];

  return (
    <div className="min-h-[calc(100vh-70px)] bg-[#f7f7f4] pb-12">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-stone-700 hover:text-emerald-700">
            <ArrowLeftOutlined /> Back to product list
          </Link>
          {selectedSku && (
            <span className="rounded-md border border-stone-200 px-3 py-1 text-xs font-bold text-stone-500">
              SKU {selectedSku}
            </span>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(420px,0.98fr)]">
          <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
              <div className="grid aspect-square max-h-[640px] place-items-center bg-[#efeee9]">
                {heroImage ? (
                  <img src={heroImage} alt={`${product.name} ${selectedColor}`} className="h-full w-full object-contain p-5 sm:p-8" />
                ) : (
                  <div className="text-sm font-bold text-stone-400">No image</div>
                )}
              </div>
            </div>

            {displayImages.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
                {displayImages.map((image) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setActiveImage(image)}
                    className={`aspect-square overflow-hidden rounded-md border bg-white transition ${
                      heroImage === image ? "border-emerald-700 ring-2 ring-emerald-700/20" : "border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    <img src={image} alt={`${product.name} thumbnail`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-5">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800">
                  <TagOutlined /> {product.categoryInfo?.name}
                </span>
                {product.isNew && <span className="rounded-md bg-sky-50 px-3 py-1 text-sm font-bold text-sky-700">New</span>}
                {product.bestSeller && <span className="rounded-md bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700">Best seller</span>}
              </div>

              <div>
                <h1 className="text-3xl font-black leading-tight text-stone-950 sm:text-5xl">{product.name}</h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">{product.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 overflow-hidden rounded-md border border-stone-200 bg-white sm:grid-cols-4">
              {stats.map((item) => (
                <div key={item.label} className="border-b border-r border-stone-100 p-4 last:border-r-0 sm:border-b-0">
                  <p className="text-xs font-bold uppercase text-stone-400">{item.label}</p>
                  <p className="mt-1 text-lg font-black text-stone-950">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-100 pb-5">
                <div>
                  <div className="flex flex-wrap items-end gap-3">
                    <p className="text-3xl font-black text-stone-950 sm:text-4xl">{formatCurrency(variantPrice)}</p>
                    {product.originalPrice > product.price && (
                      <p className="pb-1 text-base font-semibold text-stone-400 line-through">{formatCurrency(product.originalPrice)}</p>
                    )}
                    {product.discount > 0 && <span className="mb-1 rounded-md bg-rose-600 px-3 py-1 text-sm font-black text-white">-{product.discount}%</span>}
                  </div>
                  {product.promotion && <p className="mt-2 text-sm font-bold text-emerald-700">{product.promotion}</p>}
                </div>
                <div className={isOutOfStock ? "rounded-md bg-rose-50 px-3 py-2 text-sm font-black text-rose-700" : "rounded-md bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700"}>
                  {isOutOfStock ? "Out of stock" : `${selectedStock} left`}
                </div>
              </div>

              <div className="space-y-5 py-5">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-stone-950">Color</p>
                    <p className="text-sm font-semibold text-stone-500">{selectedColor || "Not selected"}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {colorOptions.map(({ color, stock }) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          const nextVariant = variants.find((variant) => variant.color === color && Number(variant.stock) > 0)
                            || variants.find((variant) => variant.color === color);
                          setSelectedColor(color);
                          setSelectedSize(nextVariant?.size || "");
                          setQuantity(getInitialQuantity(nextVariant));
                          setActiveImage(nextVariant?.image || nextVariant?.images?.[0] || product.images?.[0] || "");
                        }}
                        className={`flex h-12 items-center justify-between rounded-md border px-3 text-sm font-bold transition ${
                          selectedColor === color
                            ? "border-emerald-700 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-700/15"
                            : "border-stone-200 bg-white text-stone-700 hover:border-stone-400"
                        }`}
                      >
                        <span className="inline-flex min-w-0 items-center gap-2">
                          <span
                            className="h-5 w-5 shrink-0 rounded-full border border-stone-300"
                            style={{ backgroundColor: getColorHex(color) }}
                          />
                          <span className="truncate">{color}</span>
                        </span>
                        <span className="shrink-0 text-xs text-stone-400">{stock}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-stone-950">Size</p>
                    <p className="text-sm font-semibold text-stone-500">{selectedSize || "Not selected"}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {sizeOptions.map((variant) => (
                      <button
                        key={variant.variantId}
                        type="button"
                        disabled={Number(variant.stock) <= 0}
                        onClick={() => {
                          setSelectedSize(variant.size);
                          setQuantity(getInitialQuantity(variant));
                          setActiveImage(variant.image || variant.images?.[0] || product.images?.[0] || "");
                        }}
                        className={`min-h-14 rounded-md border px-3 py-2 text-center transition ${
                          Number(selectedSize) === Number(variant.size)
                            ? "border-emerald-700 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-700/15"
                            : "border-stone-200 bg-white text-stone-700 hover:border-stone-400"
                        } disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400`}
                      >
                        <span className="block text-base font-black">{variant.size}</span>
                        <span className="block text-xs font-semibold">{Number(variant.stock) > 0 ? `${variant.stock} left` : "Sold out"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-stone-100 pt-5 sm:flex-row">
                <div className="inline-flex h-12 overflow-hidden rounded-md border border-stone-300 bg-white">
                  <button type="button" onClick={decreaseQuantity} disabled={quantity <= 1 || isOutOfStock} className="grid w-12 place-items-center text-stone-700 disabled:cursor-not-allowed disabled:text-stone-300"><MinusOutlined /></button>
                  <span className="grid w-16 place-items-center border-x border-stone-300 text-sm font-black text-stone-950">{quantity}</span>
                  <button type="button" onClick={increaseQuantity} disabled={quantity >= selectedStock || isOutOfStock} className="grid w-12 place-items-center text-stone-700 disabled:cursor-not-allowed disabled:text-stone-300"><PlusOutlined /></button>
                </div>
                <button type="button" onClick={handleAddToCart} disabled={isOutOfStock || addingToCart} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300">
                  {addingToCart ? <Spin size="small" /> : <ShoppingCartOutlined />} {addingToCart ? "Adding..." : "Add to cart"}
                </button>
                <Button
                  type={isFavorite ? "primary" : "default"}
                  danger={isFavorite}
                  loading={favoriteLoading}
                  icon={isFavorite ? <HeartFilled /> : <HeartOutlined />}
                  onClick={handleToggleFavorite}
                  className="h-12 min-w-32 font-bold"
                >
                  {isFavorite ? "Favorited" : "Favorite"}
                </Button>
              </div>
            </div>

            <div className="rounded-md border border-stone-200 bg-white p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-stone-950">Highlights</h2>
                  <p className="mt-1 text-sm font-semibold text-stone-500">{product.categoryInfo?.description}</p>
                </div>
                <span className="rounded-md bg-stone-100 px-3 py-1 text-sm font-bold text-stone-600">{product.stats?.favoriteCount || 0} favorites</span>
              </div>
              <ul className="grid gap-2 text-sm font-semibold text-stone-700 sm:grid-cols-2">
                {product.highlights.map((item) => <li key={item} className="rounded-md bg-stone-50 px-3 py-2">{item}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-md border border-stone-200 bg-white p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <h2 className="text-2xl font-black text-stone-950">Reviews</h2>
                <p className="mt-1 text-sm font-semibold text-stone-500">{product.reviewCount} ratings recorded</p>
              </div>
              <Tag color="gold">{reviews.length} comments</Tag>
            </div>
            {reviews.length === 0 ? (
              <Empty description="No comments yet" />
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <article key={review._id || `${review.userEmail}-${review.createdAt}`} className="rounded-md border border-stone-200 bg-white p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-stone-900">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-stone-100 text-stone-500"><UserOutlined /></span>
                        <span>{review.userName || review.userEmail}</span>
                      </div>
                      <Rate disabled value={Number(review.rating)} />
                    </div>
                    <p className="text-sm leading-6 text-stone-700">{review.comment}</p>
                    <p className="mt-3 text-xs font-semibold text-stone-400">{new Date(review.createdAt).toLocaleString("vi-VN")}</p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="rounded-md border border-stone-200 bg-white p-5 lg:self-start">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-stone-950">Review reward</h3>
                <p className="mt-1 text-sm font-bold text-emerald-700">50 points + coupon</p>
              </div>
              <StarFilled className="mt-1 text-lg text-amber-500" />
            </div>

            {canReview ? (
              <div className="mt-5 space-y-4">
                {reviewableOrders.length > 1 && (
                  <Select
                    value={reviewOrderId}
                    onChange={setReviewOrderId}
                    className="w-full"
                    options={reviewableOrders.map((order) => ({
                      value: order._id,
                      label: `Order ${order._id.slice(-8).toUpperCase()}`,
                    }))}
                  />
                )}
                <Rate value={reviewRating} onChange={setReviewRating} />
                <Input.TextArea
                  rows={4}
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  placeholder="Share your experience after using this product..."
                />
                <Button type="primary" block loading={reviewSubmitting} onClick={handleSubmitReview}>
                  Submit review
                </Button>
              </div>
            ) : (
              <Alert
                className="mt-5"
                type="info"
                showIcon
                message="Review locked"
                description="Available after an order is received."
              />
            )}
          </aside>
        </section>

        {similarProducts.length > 0 && (
          <section className="mt-10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-black text-stone-950">Similar products</h2>
              <Link to="/" className="text-sm font-bold text-emerald-700 hover:text-emerald-900">View all</Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {similarProducts.map((item) => <SimilarProductCard key={item.id} product={item} />)}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default ProductDetailPage;

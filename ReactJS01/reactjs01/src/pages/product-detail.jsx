import { useContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { notification, Spin } from "antd";
import { ArrowLeftOutlined, MinusOutlined, PlusOutlined, ShoppingCartOutlined, StarFilled, TagOutlined } from "@ant-design/icons";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { AuthContext } from "../components/context/auth";
import { getProductDetailApi } from "../util/api";

const formatCurrency = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
}).format(value);

const SimilarProductCard = ({ product }) => (
  <article className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
    <Link to={`/products/${product.slug}`} className="block">
      <div className="aspect-[4/3] overflow-hidden bg-stone-100">
        <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
      </div>
      <div className="space-y-2 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{product.categoryInfo?.name}</p>
        <h3 className="text-lg font-black text-stone-950">{product.name}</h3>
        <div className="flex items-center justify-between gap-3">
          <span className="font-black text-stone-950">{formatCurrency(product.price)}</span>
          <span className="text-sm font-bold text-amber-600"><StarFilled /> {product.rating}</span>
        </div>
      </div>
    </Link>
  </article>
);

const ProductDetailPage = () => {
  const { slug } = useParams();
  const { auth } = useContext(AuthContext);
  const [product, setProduct] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const fetchProduct = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getProductDetailApi(slug);
        if (res?.EC === 0) {
          setProduct(res.product);
          setSimilarProducts(res.similarProducts);
          setQuantity(res.product.stock > 0 ? 1 : 0);
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
    if (!product) return;
    setQuantity((value) => Math.min(product.stock, value + 1));
  };
  const handleAddToCart = () => {
    notification.success({ message: "Cart", description: `Selected ${quantity} x ${product.name}` });
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

  const isOutOfStock = product.stock <= 0;

  return (
    <div className="min-h-[calc(100vh-70px)] pb-12">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-900"><ArrowLeftOutlined /> Back to product list</Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:px-8">
        <div className="min-w-0">
          <Swiper modules={[Navigation, Pagination, Autoplay]} navigation={product.images.length > 1} pagination={{ clickable: true }} autoplay={product.images.length > 1 ? { delay: 3200, disableOnInteraction: false } : false} loop={product.images.length > 1} className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
            {product.images.map((image) => (
              <SwiperSlide key={image}>
                <div className="grid h-[520px] max-h-[65vh] place-items-center bg-stone-100">
                  <img src={image} alt={product.name} className="h-full w-full object-contain" />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        <div className="space-y-6">
          <div>
            <p className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800"><TagOutlined /> {product.categoryInfo?.name}</p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-stone-950">{product.name}</h1>
            <p className="mt-4 text-base leading-7 text-stone-600">{product.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-3 py-1 text-amber-700"><StarFilled /> {product.rating} ({product.reviewCount} reviews)</span>
            <span className="rounded-md bg-stone-100 px-3 py-1 text-stone-700">Sold {product.sold}</span>
            <span className={isOutOfStock ? "rounded-md bg-rose-50 px-3 py-1 text-rose-700" : "rounded-md bg-emerald-50 px-3 py-1 text-emerald-700"}>{isOutOfStock ? "Out of stock" : `${product.stock} in stock`}</span>
          </div>
          <div className="border-y border-stone-200 py-5">
            <div className="flex flex-wrap items-end gap-4">
              <p className="text-4xl font-black text-stone-950">{formatCurrency(product.price)}</p>
              {product.originalPrice > product.price && <p className="pb-1 text-lg font-semibold text-stone-400 line-through">{formatCurrency(product.originalPrice)}</p>}
              {product.discount > 0 && <span className="mb-1 rounded-md bg-rose-600 px-3 py-1 text-sm font-black text-white">-{product.discount}%</span>}
            </div>
            <p className="mt-3 text-sm font-bold text-emerald-700">{product.promotion}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-bold text-stone-900">Colors</p>
              <div className="flex flex-wrap gap-2">{product.colors.map((color) => <span key={color} className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700">{color}</span>)}</div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-stone-900">Size</p>
              <div className="flex flex-wrap gap-2">{product.sizes.map((size) => <span key={size} className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700">{size}</span>)}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex h-12 overflow-hidden rounded-md border border-stone-300 bg-white">
              <button type="button" onClick={decreaseQuantity} disabled={quantity <= 1 || isOutOfStock} className="grid w-12 place-items-center text-stone-700 disabled:cursor-not-allowed disabled:text-stone-300"><MinusOutlined /></button>
              <span className="grid w-14 place-items-center border-x border-stone-300 text-sm font-black text-stone-950">{quantity}</span>
              <button type="button" onClick={increaseQuantity} disabled={quantity >= product.stock || isOutOfStock} className="grid w-12 place-items-center text-stone-700 disabled:cursor-not-allowed disabled:text-stone-300"><PlusOutlined /></button>
            </div>
            <button type="button" onClick={handleAddToCart} disabled={isOutOfStock} className="inline-flex h-12 items-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"><ShoppingCartOutlined /> Add to cart</button>
          </div>

          <div className="rounded-md border border-stone-200 bg-white p-5">
            <h2 className="text-xl font-black text-stone-950">Highlights</h2>
            <ul className="mt-4 grid gap-2 text-sm font-semibold text-stone-700 sm:grid-cols-2">{product.highlights.map((item) => <li key={item} className="rounded-md bg-stone-50 px-3 py-2">{item}</li>)}</ul>
            <p className="mt-4 text-sm leading-6 text-stone-500">Category: <span className="font-bold text-stone-800">{product.categoryInfo?.name}</span> - {product.categoryInfo?.description}</p>
          </div>
        </div>
      </section>

      {similarProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-2xl font-black text-stone-950">Similar products</h2><Link to="/" className="text-sm font-bold text-emerald-700 hover:text-emerald-900">View all</Link></div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{similarProducts.map((item) => <SimilarProductCard key={item.id} product={item} />)}</div>
        </section>
      )}
    </div>
  );
};

export default ProductDetailPage;

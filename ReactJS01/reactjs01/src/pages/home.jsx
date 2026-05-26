import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { notification, Spin } from "antd";
import { FireOutlined, FilterOutlined, LogoutOutlined, ReloadOutlined, SearchOutlined, ShoppingCartOutlined, StarFilled, ThunderboltOutlined } from "@ant-design/icons";
import { AuthContext } from "../components/context/auth";
import { getProductsApi } from "../util/api";

const initialFilters = {
  keyword: "",
  category: "",
  promotion: "",
  stockStatus: "",
  minPrice: "",
  maxPrice: "",
  minRating: "",
  sort: "",
};

const formatCurrency = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
}).format(value);

const cleanParams = (filters) => Object.fromEntries(
  Object.entries(filters).filter(([, value]) => value !== "" && value !== null && value !== undefined),
);

const ProductCard = ({ product }) => (
  <article className="group overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
    <Link to={`/products/${product.slug}`} className="block">
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {product.discount > 0 && <span className="rounded-md bg-rose-600 px-2 py-1 text-xs font-bold text-white">-{product.discount}%</span>}
          {product.isNew && <span className="rounded-md bg-sky-600 px-2 py-1 text-xs font-bold text-white">New</span>}
          {product.bestSeller && <span className="rounded-md bg-amber-500 px-2 py-1 text-xs font-bold text-stone-950">Best seller</span>}
        </div>
      </div>
    </Link>
    <div className="space-y-3 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{product.categoryInfo?.name}</p>
        <Link to={`/products/${product.slug}`} className="mt-1 block text-lg font-bold text-stone-950 hover:text-emerald-700">{product.name}</Link>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xl font-extrabold text-stone-950">{formatCurrency(product.price)}</p>
          {product.originalPrice > product.price && <p className="text-sm text-stone-400 line-through">{formatCurrency(product.originalPrice)}</p>}
        </div>
        <div className="text-right text-sm text-stone-500">
          <p className="font-semibold text-amber-600"><StarFilled /> {product.rating}</p>
          <p>Sold {product.sold}</p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-stone-100 pt-3 text-sm">
        <span className={product.stock > 0 ? "font-semibold text-emerald-700" : "font-semibold text-rose-600"}>
          {product.stock > 0 ? `Stock ${product.stock}` : "Out of stock"}
        </span>
        <Link to={`/products/${product.slug}`} className="inline-flex items-center gap-2 rounded-md bg-stone-950 px-3 py-2 text-xs font-bold !text-white hover:bg-emerald-700">
          <ShoppingCartOutlined /> Detail
        </Link>
      </div>
    </div>
  </article>
);

const ProductLane = ({ title, icon, products }) => {
  if (!products.length) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <h2 className="mb-4 inline-flex items-center gap-2 text-2xl font-bold text-stone-950">{icon}{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const { auth, setAuth } = useContext(AuthContext);
  const [filters, setFilters] = useState(initialFilters);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    setAuth({ isAuthenticated: false, user: { email: "", name: "", role: "" } });
    navigate("/");
  };

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await getProductsApi(cleanParams(filters));
        if (res?.EC === 0) {
          setProducts(res.products);
          setCategories(res.categories);
        } else {
          notification.error({ message: "Products", description: res?.EM || res?.message || "Could not load products" });
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [auth.isAuthenticated, filters]);

  const stats = useMemo(() => ({
    totalSold: products.reduce((sum, product) => sum + product.sold, 0),
    totalStock: products.reduce((sum, product) => sum + product.stock, 0),
    bestSellerCount: products.filter((product) => product.bestSeller).length,
  }), [products]);

  const promoProducts = useMemo(() => products.filter((product) => product.discount > 0).slice(0, 3), [products]);
  const newestProducts = useMemo(() => products.filter((product) => product.isNew).slice(0, 3), [products]);
  const bestSellerProducts = useMemo(() => products.filter((product) => product.bestSeller).slice(0, 3), [products]);
  const updateFilter = (name, value) => setFilters((prev) => ({ ...prev, [name]: value }));

  if (!auth.isAuthenticated) {
    return (
      <section className="mx-auto grid min-h-[calc(100vh-70px)] max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8 lg:py-16">
        <div className="flex flex-col justify-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-wide text-emerald-700">RunGear Store</p>
          <h1 className="max-w-3xl text-4xl font-black leading-tight text-stone-950 sm:text-5xl">Login to view the latest running shoe deals.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">A member account unlocks the storefront, search, filters, product details, and stock information.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login" className="rounded-md bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800">Login</Link>
            <Link to="/register" className="rounded-md border border-stone-300 bg-white px-5 py-3 text-sm font-bold text-stone-800 hover:border-emerald-600 hover:text-emerald-700">Create account</Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
          <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80" alt="Running shoes" className="h-full min-h-80 w-full object-cover" />
        </div>
      </section>
    );
  }

  return (
    <div className="min-h-[calc(100vh-70px)] pb-12">
      <section className="bg-stone-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div className="flex flex-col justify-center py-6">
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-300">Member home</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight sm:text-5xl">Pick the right shoes for your next run.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-stone-300">Deals, new arrivals, best sellers, and advanced filters are connected to the Express API.</p>
            <div className="mt-7 grid max-w-2xl gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-white/10 bg-white/5 p-4"><p className="text-2xl font-black">{stats.bestSellerCount}</p><p className="text-sm text-stone-300">Best sellers</p></div>
              <div className="rounded-md border border-white/10 bg-white/5 p-4"><p className="text-2xl font-black">{stats.totalSold}</p><p className="text-sm text-stone-300">Units sold</p></div>
              <div className="rounded-md border border-white/10 bg-white/5 p-4"><p className="text-2xl font-black">{stats.totalStock}</p><p className="text-sm text-stone-300">Available stock</p></div>
            </div>
          </div>
          <aside className="grid content-between gap-4 rounded-md bg-white p-5 text-stone-900">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Signed-in member</p>
              <h2 className="mt-2 text-2xl font-black">{auth.user.name || "Member"}</h2>
              <p className="mt-1 text-sm text-stone-500">{auth.user.email}</p>
              <p className="mt-3 inline-flex rounded-md bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800">Role: {auth.user.role || "USER"}</p>
            </div>
            <button type="button" onClick={handleLogout} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-stone-950 px-4 py-3 text-sm font-bold text-white hover:bg-stone-800"><LogoutOutlined /> Logout</button>
          </aside>
        </div>
      </section>

      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-xl font-black text-stone-950"><FilterOutlined /> Search and filter products</h2>
            <button type="button" onClick={() => setFilters(initialFilters)} className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-bold text-stone-700 hover:border-emerald-600 hover:text-emerald-700"><ReloadOutlined /> Reset filters</button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="relative">
              <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input value={filters.keyword} onChange={(event) => updateFilter("keyword", event.target.value)} className="h-11 w-full rounded-md border border-stone-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" placeholder="Search name, tag, description..." />
            </label>
            <select value={filters.category} onChange={(event) => updateFilter("category", event.target.value)} className="h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
              <option value="">All categories</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <select value={filters.promotion} onChange={(event) => updateFilter("promotion", event.target.value)} className="h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
              <option value="">All promotions</option><option value="sale">On sale</option><option value="new">New arrivals</option><option value="best-seller">Best sellers</option>
            </select>
            <select value={filters.stockStatus} onChange={(event) => updateFilter("stockStatus", event.target.value)} className="h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
              <option value="">All stock levels</option><option value="in-stock">In stock</option><option value="low-stock">Low stock</option><option value="out-stock">Out of stock</option>
            </select>
            <input type="number" value={filters.minPrice} onChange={(event) => updateFilter("minPrice", event.target.value)} className="h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" placeholder="Min price" />
            <input type="number" value={filters.maxPrice} onChange={(event) => updateFilter("maxPrice", event.target.value)} className="h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" placeholder="Max price" />
            <select value={filters.minRating} onChange={(event) => updateFilter("minRating", event.target.value)} className="h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
              <option value="">All ratings</option><option value="4.5">4.5 stars and up</option><option value="4.7">4.7 stars and up</option><option value="4.9">4.9 stars and up</option>
            </select>
            <select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)} className="h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
              <option value="">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="sold-desc">Best selling</option><option value="rating-desc">Top rated</option><option value="newest">Newest</option>
            </select>
          </div>
        </div>
      </section>

      {loading ? <div className="grid min-h-80 place-items-center"><Spin /></div> : (
        <>
          <ProductLane title="Deals" icon={<ThunderboltOutlined className="text-rose-600" />} products={promoProducts} />
          <ProductLane title="New arrivals" icon={<FireOutlined className="text-sky-600" />} products={newestProducts} />
          <ProductLane title="Best sellers" icon={<StarFilled className="text-amber-500" />} products={bestSellerProducts} />
          <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-black text-stone-950">All products</h2>
              <p className="text-sm font-semibold text-stone-500">{products.length} results</p>
            </div>
            {products.length > 0 ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : (
              <div className="rounded-md border border-dashed border-stone-300 bg-white p-10 text-center"><p className="text-lg font-bold text-stone-900">No matching products</p><p className="mt-2 text-sm text-stone-500">Try another keyword or remove some filters.</p></div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default HomePage;

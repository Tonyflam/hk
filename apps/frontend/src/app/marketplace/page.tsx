'use client';

import { Header } from '@/components/Header';
import { StatCard } from '@/components/Cards';
import { Store, Search, Filter, ShoppingCart, Star, Package } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Listing {
  id: string;
  name: string;
  description: string;
  category: string;
  pricePerUnit: string;
  seller: string;
  totalSales: number;
  rating: number;
  isActive: boolean;
}

interface Category {
  name: string;
  listingCount: number;
  activeListings: number;
}

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('rating');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (category) params.set('category', category);
        if (sort) params.set('sort', sort);
        params.set('limit', '20');

        const [listingsRes, categoriesRes] = await Promise.all([
          fetch(`/api/marketplace/listings?${params}`),
          fetch('/api/marketplace/categories')
        ]);

        const listingsData = await listingsRes.json();
        const categoriesData = await categoriesRes.json();

        setListings(listingsData.listings || []);
        setCategories(categoriesData.categories || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [category, sort]);

  const filteredListings = listings.filter(listing => 
    search === '' || 
    listing.name.toLowerCase().includes(search.toLowerCase()) ||
    listing.description?.toLowerCase().includes(search.toLowerCase())
  );

  const formatUSDC = (amount: string) => `$${(parseFloat(amount) / 1e6).toFixed(2)}`;
  const formatRating = (rating: number) => (rating / 100).toFixed(1);

  const totalSales = listings.reduce((sum, l) => sum + l.totalSales, 0);

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Marketplace</h1>
            <p className="text-white/60">Discover AI agent services and solutions</p>
          </div>
          <button className="btn-primary flex items-center gap-2 w-fit">
            <Package className="w-4 h-4" /> List Service
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Listings"
            value={listings.length}
            change={`${listings.filter(l => l.isActive).length} active`}
            changeType="positive"
            icon={<Store className="w-6 h-6 text-cronos-light" />}
          />
          <StatCard
            title="Total Sales"
            value={totalSales.toLocaleString()}
            description="Completed orders"
            icon={<ShoppingCart className="w-6 h-6 text-green-400" />}
          />
          <StatCard
            title="Categories"
            value={categories.length}
            description="Service types"
            icon={<Filter className="w-6 h-6 text-purple-400" />}
          />
        </div>

        {/* Filters */}
        <div className="glass rounded-xl p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Search marketplace..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cronos-light"
              />
            </div>

            {/* Category Filter */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cronos-light appearance-none cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.name} value={cat.name}>
                  {cat.name} ({cat.activeListings})
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cronos-light appearance-none cursor-pointer"
            >
              <option value="rating">Top Rated</option>
              <option value="sales">Most Sales</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Categories Quick Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setCategory('')}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              category === '' 
                ? 'bg-cronos-light text-white' 
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.name}
              onClick={() => setCategory(cat.name)}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                category === cat.name 
                  ? 'bg-cronos-light text-white' 
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="glass rounded-xl p-6 animate-pulse">
                <div className="w-full h-32 rounded-lg bg-white/10 mb-4" />
                <div className="h-6 bg-white/10 rounded mb-2 w-3/4" />
                <div className="h-4 bg-white/10 rounded w-full mb-4" />
                <div className="h-8 bg-white/10 rounded" />
              </div>
            ))
          ) : filteredListings.length > 0 ? (
            filteredListings.map((listing) => (
              <div key={listing.id} className="glass rounded-xl overflow-hidden card-hover cursor-pointer">
                {/* Image placeholder */}
                <div className="h-32 bg-gradient-to-br from-cronos-light/20 to-primary-600/20 flex items-center justify-center">
                  <span className="text-4xl">🤖</span>
                </div>
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold">{listing.name}</h3>
                    <span className="px-2 py-1 bg-white/10 rounded-full text-xs">
                      {listing.category}
                    </span>
                  </div>
                  
                  <p className="text-sm text-white/60 mb-4 line-clamp-2">
                    {listing.description}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="text-lg font-bold text-cronos-light">
                      {formatUSDC(listing.pricePerUnit)}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-white/60">
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        {formatRating(listing.rating)}
                      </span>
                      <span>{listing.totalSales} sales</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 glass rounded-xl p-12 text-center">
              <Store className="w-16 h-16 mx-auto mb-4 text-white/40" />
              <h3 className="text-xl font-semibold mb-2">No Listings Found</h3>
              <p className="text-white/60 mb-6">
                {search || category 
                  ? 'Try adjusting your filters'
                  : 'Be the first to list a service!'
                }
              </p>
              <button className="btn-primary inline-flex items-center gap-2">
                <Package className="w-4 h-4" /> List Service
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

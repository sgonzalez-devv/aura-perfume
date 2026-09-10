'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, X, AlertTriangle, Package, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Product {
  id: string
  name: string
  brand: string
  sku: string
  category: string
  concentration: string
  size_ml: number
  gender: string
  purchase_price: number
  selling_price: number
  stock_quantity: number
  min_stock_alert: number
  is_active: boolean
}

interface Supplier {
  id: string
  name: string
}

function formatDOP(amount: number) {
  return `DOP $${(amount || 0).toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const PAGE_SIZE = 12

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [productSuppliers, setProductSuppliers] = useState<Record<string, Array<{ supplier_id: string; name: string; is_primary: boolean }>>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const router = useRouter()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: prods }, { data: prodSupps }] = await Promise.all([
      supabase.from('products').select('id, name, brand, sku, category, concentration, size_ml, gender, purchase_price, selling_price, stock_quantity, min_stock_alert, is_active').order('name'),
      supabase.from('product_suppliers').select('product_id, supplier_id, is_primary, suppliers(name)'),
    ])
    setProducts(prods || [])

    const map: Record<string, Array<{ supplier_id: string; name: string; is_primary: boolean }>> = {}
    for (const row of (prodSupps || []) as unknown as Array<{ product_id: string; supplier_id: string; is_primary: boolean; suppliers: { name: string } | null }>) {
      if (!map[row.product_id]) map[row.product_id] = []
      map[row.product_id].push({ supplier_id: row.supplier_id, name: row.suppliers?.name || '', is_primary: row.is_primary })
    }
    setProductSuppliers(map)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = products.filter(p => {
    const q = searchQuery.toLowerCase()
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    const matchG = !filterGender || p.gender === filterGender
    const matchC = !filterCategory || p.category === filterCategory
    return matchQ && matchG && matchC
  })

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)))
  const genders = Array.from(new Set(products.map(p => p.gender).filter(Boolean)))

  const inStock = filtered.filter(p => p.is_active && p.stock_quantity > 0)
  const outOfStock = filtered.filter(p => !p.is_active || p.stock_quantity === 0)

  const totalPages = Math.ceil(inStock.length / PAGE_SIZE)
  const pagedInStock = inStock.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function ProductCard({ p }: { p: Product }) {
    const stock = p.stock_quantity
    const min = p.min_stock_alert || 0
    const stockColor = stock === 0 ? 'text-red-600 bg-red-50 border-red-200'
      : stock <= min ? 'text-red-600 bg-red-50 border-red-200'
      : stock <= min * 2 ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
      : 'text-green-600 bg-green-50 border-green-200'
    const stockLabel = stock === 0 ? 'Sin stock' : `${stock} uds.`
    const cardSuppliers = productSuppliers[p.id] || []
    const primarySupplier = cardSuppliers.find(s => s.is_primary) || cardSuppliers[0]
    const altCount = cardSuppliers.length - 1
    const margin = p.selling_price && p.purchase_price
      ? (((p.selling_price - p.purchase_price) / p.selling_price) * 100).toFixed(1)
      : null

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${stockColor}`}>
            {stock <= min && stock > 0 && <AlertTriangle className="w-3 h-3 inline mr-1" />}
            {stockLabel}
          </span>
          {p.category && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-medium border border-purple-100">
              {p.category}
            </span>
          )}
          {p.gender && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
              {p.gender}
            </span>
          )}
        </div>

        {/* Name */}
        <div>
          <h3 className="font-bold text-gray-800 text-base leading-tight">{p.name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {p.brand}
            {p.size_ml ? ` · ${p.size_ml}ml` : ''}
            {p.concentration ? ` · ${p.concentration}` : ''}
          </p>
          {p.sku && <p className="text-xs text-gray-400 mt-1">SKU: {p.sku}</p>}
        </div>

        {/* Suppliers */}
        {cardSuppliers.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {primarySupplier && (
              <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-blue-50 text-blue-700 border border-blue-100">
                {primarySupplier.name}
              </span>
            )}
            {altCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-gray-100 text-gray-500">
                +{altCount} alt.
              </span>
            )}
          </div>
        )}

        {/* Prices */}
        {(p.purchase_price > 0 || p.selling_price > 0) && (
          <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            <div>
              <span className="text-gray-400">Costo </span>
              <span className="font-semibold text-gray-700">{formatDOP(p.purchase_price)}</span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div>
              <span className="text-gray-400">Venta </span>
              <span className="font-semibold text-gray-700">{formatDOP(p.selling_price)}</span>
            </div>
            {margin && (
              <>
                <div className="w-px h-4 bg-gray-200" />
                <div>
                  <span className="font-semibold" style={{ color: '#059669' }}>{margin}%</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Stock bar */}
        {min > 0 && (
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Stock</span>
              <span>Mín. {min}</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${stock === 0 ? 'bg-red-400' : stock <= min ? 'bg-red-400' : stock <= min * 2 ? 'bg-yellow-400' : 'bg-green-400'}`}
                style={{ width: `${Math.min(100, (stock / Math.max(stock, min * 3)) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Vender shortcut */}
        <div className="pt-1 border-t border-gray-50">
          <button
            onClick={() => router.push('/dashboard/finances')}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: '#f5f3ff', color: '#7c3aed' }}
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Registrar venta
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Inventario
        </h1>
        <p className="text-gray-500 mt-1 text-sm">{products.length} productos registrados</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: products.length, color: '#7c3aed' },
          { label: 'Con stock', value: products.filter(p => p.is_active && p.stock_quantity > 0).length, color: '#059669' },
          { label: 'Stock bajo', value: products.filter(p => p.is_active && p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_alert).length, color: '#d97706' },
          { label: 'Sin stock', value: products.filter(p => !p.is_active || p.stock_quantity === 0).length, color: '#dc2626' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-card">
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, marca o SKU..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100"
            />
          </div>
          <select value={filterGender} onChange={e => { setFilterGender(e.target.value); setCurrentPage(1) }}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-400 bg-white text-gray-700">
            <option value="">Todos los géneros</option>
            {genders.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setCurrentPage(1) }}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-400 bg-white text-gray-700">
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(searchQuery || filterGender || filterCategory) && (
            <button onClick={() => { setSearchQuery(''); setFilterGender(''); setFilterCategory(''); setCurrentPage(1) }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
              <X className="w-4 h-4" /> Limpiar
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="w-8 h-8 animate-spin" style={{ color: '#7c3aed' }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <>
          {/* In stock */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-bold text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>Con Stock</h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                {inStock.length}
              </span>
            </div>
            {inStock.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border-2 border-dashed border-gray-200">
                <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-gray-400 text-sm">No hay productos con stock disponible</p>
                <p className="mt-1 text-xs text-gray-400">Agrega productos desde <strong>Lista de Compras</strong></p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {pagedInStock.map(p => <ProductCard key={p.id} p={p} />)}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <button onClick={() => setCurrentPage(pg => Math.max(1, pg - 1))} disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600">Página {currentPage} de {totalPages}</span>
                    <button onClick={() => setCurrentPage(pg => Math.min(totalPages, pg + 1))} disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Out of stock */}
          {outOfStock.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-base font-bold text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>Sin Stock / Inactivos</h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                  {outOfStock.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 opacity-75">
                {outOfStock.map(p => <ProductCard key={p.id} p={p} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

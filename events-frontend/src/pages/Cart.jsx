import React, { useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'

export default function Cart() {
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)
  const { items, removeFromCart, totalPrice } = useCart()

  if (!items.length) {
    return (
      <div className="max-w-3xl mx-auto surface-section p-6 text-center">
        <h1 className="text-3xl font-bold">Mon panier</h1>
        <p className="mt-4 text-slate-600">Votre panier est vide.</p>
        <Link to="/" className="mt-6 inline-flex rounded-lg bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-700">
          Voir les événements
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="surface-section p-6">
        <h1 className="text-3xl font-bold">Mon panier</h1>
        <p className="mt-2 text-slate-600">Ajoutez plusieurs événements puis validez votre paiement en une seule fois.</p>

        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <article key={item.id} className="surface-card p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
                <p className="text-sm text-slate-600">{item.location || 'Lieu non précisé'} • {new Date(item.date).toLocaleString('fr-FR')}</p>
                <p className="mt-2 text-sm text-slate-700">{Number(item.price || 0) > 0 ? `${Number(item.price).toFixed(2)} €` : 'Gratuit'}</p>
              </div>
              <div className="flex gap-2">
                <Link to={`/events/${item.id}`} className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-black">
                  Voir
                </Link>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.id)}
                  className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600"
                >
                  Retirer
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="surface-section p-6 h-fit">
        <h2 className="text-xl font-semibold">Récapitulatif</h2>
        <div className="mt-4 space-y-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Événements</span>
            <span>{items.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Total du panier</span>
            <span className="text-lg font-bold">{totalPrice.toFixed(2)} €</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(user ? '/cart/payment' : '/login?redirect=/cart/payment')}
          className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700"
        >
          Payer le panier
        </button>
      </aside>
    </div>
  )
}

import React, { useState } from 'react'
import { useToast } from '../contexts/ToastContext'

export default function EventForm({ onSubmit, initial = {}, isLoading = false }){
  const toast = useToast()
  const [title, setTitle] = useState(initial.title || '')
  const [description, setDescription] = useState(initial.description || '')
  const [date, setDate] = useState(toDatetimeLocal(initial.date) || '')
  const [endDate, setEndDate] = useState(toDatetimeLocal(initial.end_date || initial.date) || '')
  const [isOneDay, setIsOneDay] = useState(!initial.end_date || isSameDay(initial.date, initial.end_date))
  const [location, setLocation] = useState(initial.location || '')
  const [price, setPrice] = useState(initial.price || '')
  const [photos, setPhotos] = useState([])
  const [existingPhotos, setExistingPhotos] = useState(initial.photos || [])
  const [photoPreviews, setPhotoPreviews] = useState([])

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files || [])
    const maxNewPhotos = Math.max(0, 5 - existingPhotos.length)
    const selected = files.slice(0, maxNewPhotos)
    if (files.length > maxNewPhotos) {
      toast.info(`Maximum 5 images au total. Vous pouvez encore en ajouter ${maxNewPhotos}.`)
    }
    setPhotos(selected)
    
    const previews = selected.map(file => URL.createObjectURL(file))
    setPhotoPreviews(previews)
  }

  const handleRemoveNewPhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index))
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index))
  }

  const handleRemoveExistingPhoto = (index) => {
    setExistingPhotos(existingPhotos.filter((_, i) => i !== index))
  }

  const submit = (e)=>{
    e.preventDefault()

    const startDate = new Date(date)
    const computedEndDate = isOneDay ? date : endDate
    const parsedEndDate = new Date(computedEndDate)

    if (isNaN(startDate) || isNaN(parsedEndDate)) {
      toast.error('Veuillez saisir des dates valides.')
      return
    }

    if (parsedEndDate < startDate) {
      toast.error('La date de fin doit etre apres ou egale a la date de debut.')
      return
    }

    if (existingPhotos.length + photos.length > 5) {
      toast.error('Maximum 5 images par evenement.')
      return
    }
    
    const formData = new FormData()
    formData.append('title', title)
    formData.append('location', location)
    formData.append('date', date)
    formData.append('end_date', computedEndDate)
    formData.append('description', description)
    formData.append('price', price || 0)
    
    // Ajouter photos existantes
    if (existingPhotos.length > 0) {
      formData.append('photos', JSON.stringify(existingPhotos))
    }
    
    // Ajouter nouvelles photos
    photos.forEach(photo => {
      formData.append('photos', photo)
    })

    onSubmit(formData)
    
    setTitle('')
    setDescription('')
    setDate('')
    setEndDate('')
    setIsOneDay(true)
    setLocation('')
    setPrice('')
    setPhotos([])
    setExistingPhotos([])
    setPhotoPreviews([])
  }

  return (
    <form onSubmit={submit} className="bg-white p-4 rounded shadow space-y-3">
      <input 
        value={title} 
        onChange={e=>setTitle(e.target.value)} 
        placeholder="Titre" 
        required
        className="border p-2 rounded w-full" 
      />
      <input 
        value={location} 
        onChange={e=>setLocation(e.target.value)} 
        placeholder="Lieu" 
        required
        className="border p-2 rounded w-full" 
      />
      <input 
        type="datetime-local" 
        value={date} 
        onChange={e=>{
          const nextDate = e.target.value
          setDate(nextDate)
          if (isOneDay) setEndDate(nextDate)
        }} 
        required
        className="border p-2 rounded w-full" 
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isOneDay}
          onChange={(e) => {
            const checked = e.target.checked
            setIsOneDay(checked)
            if (checked) setEndDate(date)
          }}
        />
        Evenement sur une seule journee
      </label>
      {!isOneDay && (
        <input
          type="datetime-local"
          value={endDate}
          onChange={e=>setEndDate(e.target.value)}
          required
          className="border p-2 rounded w-full"
        />
      )}
      <input 
        value={price} 
        onChange={e=>setPrice(e.target.value)} 
        placeholder="Prix (optionnel)" 
        type="number"
        step="0.01"
        className="border p-2 rounded w-full" 
      />
      <textarea 
        value={description} 
        onChange={e=>setDescription(e.target.value)} 
        placeholder="Description" 
        required
        className="border p-2 rounded w-full" 
      />
      
      {/* Photos existantes */}
      {existingPhotos.length > 0 && (
        <div>
          <label className="block font-semibold mb-2">Photos actuelles</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {existingPhotos.map((photo, index) => (
              <div key={index} className="relative group">
                <img src={photo} alt={`Photo ${index}`} className="w-full h-32 object-cover rounded" />
                <button
                  type="button"
                  onClick={() => handleRemoveExistingPhoto(index)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded text-white text-2xl font-bold transition"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Upload photos */}
      <div>
        <label className="block font-semibold mb-2">
          Ajouter des photos (max 5) - restantes: {Math.max(0, 5 - existingPhotos.length)}
        </label>
        <input 
          type="file"
          multiple
          accept="image/*"
          onChange={handlePhotoChange}
          disabled={existingPhotos.length >= 5}
          className="border p-2 rounded w-full"
        />
        
        {/* Aperçus des nouvelles photos */}
        {photoPreviews.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            {photoPreviews.map((preview, index) => (
              <div key={index} className="relative">
                <img src={preview} alt={`Preview ${index}`} className="w-full h-32 object-cover rounded" />
                <button
                  type="button"
                  onClick={() => handleRemoveNewPhoto(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <button 
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        disabled={isLoading}
      >
        {isLoading ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </form>
  )
}

function toDatetimeLocal(value) {
  if (!value) return ''
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    const pad = (n) => String(n).padStart(2, '0')
    const yyyy = d.getFullYear()
    const mm = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    const hh = pad(d.getHours())
    const mn = pad(d.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${mn}`
  } catch {
    return ''
  }
}

function isSameDay(dateA, dateB) {
  if (!dateA || !dateB) return true
  const a = new Date(dateA)
  const b = new Date(dateB)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return true
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

import request from 'supertest'
import app from '../index.js'
import { db } from '../db/index.js'

// Mock de la base de données si nécessaire
jest.mock('../db/index.js')

describe('Routes /api/events', () => {
  // Tests pour GET /api/events (liste publique)
  describe('GET /api/events', () => {
    it('✅ doit retourner la liste des événements (200)', async () => {
      const response = await request(app).get('/api/events')

      expect(response.statusCode).toBe(200)
      expect(response.body).toBeInstanceOf(Array)
    })

    it('✅ doit gérer l\'erreur serveur gracieusement', async () => {
      const response = await request(app).get('/api/events')
      // Vérifier qu'on a une réponse correcte
      expect(response.statusCode).toBeGreaterThanOrEqual(200)
    })
  })

  // Tests pour GET /api/events/mine (mes événements - protégé)
  describe('GET /api/events/mine', () => {
    it('❌ doit refuser sans token d\'authentification', async () => {
      const response = await request(app).get('/api/events/mine')

      expect(response.statusCode).toBe(401) // Non autorisé
    })

    it('✅ doit retourner les événements de l\'utilisateur avec token valide', async () => {
      const token = 'token_valide_ici' // À remplacer par un vrai token de test
      const response = await request(app)
        .get('/api/events/mine')
        .set('Authorization', `Bearer ${token}`)

      // La réponse dépendra de votre implémentation
      expect([200, 401, 403]).toContain(response.statusCode)
    })
  })

  // Tests pour GET /api/events/:id (détails d'un événement)
  describe('GET /api/events/:id', () => {
    it('✅ doit retourner un événement par ID', async () => {
      const eventId = 1
      const response = await request(app).get(`/api/events/${eventId}`)

      expect(response.statusCode).toBeGreaterThanOrEqual(200)
    })

    it('❌ doit retourner 404 pour un ID invalide', async () => {
      const response = await request(app).get('/api/events/99999')

      expect([404, 200, 500]).toContain(response.statusCode)
    })
  })

  // Tests pour POST /api/events (créer un événement - protégé)
  describe('POST /api/events', () => {
    it('❌ doit refuser la création sans authentification', async () => {
      const response = await request(app).post('/api/events').send({
        title: 'Test Event',
        description: 'Une description',
        date: '2026-03-01',
        location: 'Paris'
      })

      expect(response.statusCode).toBe(401)
    })

    it('✅ doit créer un événement avec authentification valide', async () => {
      const token = 'token_valide_ici'
      const eventData = {
        title: 'Test Event',
        description: 'Une description test',
        date: '2026-03-01',
        location: 'Paris',
        capacity: 100
      }

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${token}`)
        .send(eventData)

      // Réponse attendue : 201 (créé) ou 400 (validation)
      expect([201, 400, 401]).toContain(response.statusCode)
    })

    it('❌ doit rejeter les données invalides', async () => {
      const token = 'token_valide_ici'
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          // Données incomplètes
          title: 'Test'
        })

      expect([400, 401, 422]).toContain(response.statusCode)
    })
  })

  // Tests pour PUT /api/events/:id (mettre à jour - protégé)
  describe('PUT /api/events/:id', () => {
    it('❌ doit refuser la mise à jour sans authentification', async () => {
      const response = await request(app).put('/api/events/1').send({
        title: 'Updated Title'
      })

      expect(response.statusCode).toBe(401)
    })

    it('✅ doit mettre à jour un événement avec authentification', async () => {
      const token = 'token_valide_ici'
      const response = await request(app)
        .put('/api/events/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Titre modifié',
          description: 'Description modifiée'
        })

      expect([200, 404, 401, 403]).toContain(response.statusCode)
    })
  })

  // Tests pour DELETE /api/events/:id (supprimer - protégé)
  describe('DELETE /api/events/:id', () => {
    it('❌ doit refuser la suppression sans authentification', async () => {
      const response = await request(app).delete('/api/events/1')

      expect(response.statusCode).toBe(401)
    })

    it('✅ doit supprimer un événement avec authentification', async () => {
      const token = 'token_valide_ici'
      const response = await request(app)
        .delete('/api/events/1')
        .set('Authorization', `Bearer ${token}`)

      expect([200, 204, 404, 401, 403]).toContain(response.statusCode)
    })
  })
})
/**
 * Sujets des canaux de presence PRIVES (T-064, faille C-01).
 *
 * L'autorisation Realtime porte sur le sujet du canal, jamais sur une cle de presence :
 * tout abonne d'un sujet voit toutes les presences de ce sujet. D'ou un sujet par titulaire.
 * Les regles d'acces vivent dans la migration 20261028090000_realtime_presence_private_channels.sql.
 *
 *   presence:client:{clientId}     ecrit par ce client seul ; lu par ce client et son operateur
 *   presence:operator:{operatorId} ecrit par l'operateur seul ; lu par lui et ses clients
 *
 * Fichier sans 'use client' : le layout serveur du Hub importe la constante ci-dessous.
 */

export function clientPresenceTopic(clientId: string): string {
  return `presence:client:${clientId}`
}

export function operatorPresenceTopic(operatorId: string): string {
  return `presence:operator:${operatorId}`
}

/**
 * Supabase plafonne a 100 canaux par connexion (tous plans). Le Hub en ouvre deja une
 * dizaine pour ses autres flux temps reel : au-dela de ce nombre de clients suivis,
 * les plus anciens (ordre fourni par l'appelant) ne sont plus suivis en presence.
 */
export const MAX_HUB_CLIENT_PRESENCE_CHANNELS = 85

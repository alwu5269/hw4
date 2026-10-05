import type { Outfit } from './components/SittingDan'

export const DRESS_DAN_EVENT = 'dress-dan' // window event sent by the "Put it on Dan" link on product pages

export function dressDan(outfit: Outfit) {
  window.dispatchEvent(new CustomEvent<Outfit>(DRESS_DAN_EVENT, { detail: outfit }))
}

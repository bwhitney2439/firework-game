export interface Venue {
  id: string;
  name: string;
  /** Most fireworks in one show, free batch included. */
  fireworkCap: number;
  /** People watching. Only for display. */
  crowd: number;
  /** A bigger crowd pays more: money for each pop is multiplied by this. */
  moneyMultiplier: number;
  /** Price to move up to this venue. Zero for the first venue. */
  price: number;
}

/** Venue tiers, smallest first. Each one is bought in order. */
export const venues: Venue[] = [
  {
    id: "back-garden",
    name: "Back garden",
    fireworkCap: 15,
    crowd: 12,
    moneyMultiplier: 1,
    price: 0,
  },
  {
    id: "village-green",
    name: "Village green",
    fireworkCap: 25,
    crowd: 150,
    moneyMultiplier: 1.5,
    price: 300,
  },
  {
    id: "town-park",
    name: "Town park",
    fireworkCap: 40,
    crowd: 2000,
    moneyMultiplier: 2.5,
    price: 1200,
  },
  {
    id: "city-stadium",
    name: "City stadium",
    fireworkCap: 60,
    crowd: 40000,
    moneyMultiplier: 4,
    price: 5000,
  },
];

export function venueById(id: string): Venue | undefined {
  return venues.find((venue) => venue.id === id);
}

/** The venue after this one, or undefined at the top tier. */
export function nextVenue(venue: Venue): Venue | undefined {
  return venues[venues.indexOf(venue) + 1];
}

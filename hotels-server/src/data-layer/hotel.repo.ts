import crypto from 'node:crypto';

// 1. Define the Interfaces based on the object
export interface Location {
  latitude: number;
  longitude: number;
}

export interface Metadata {
  path: string;
}

export interface Hotel {
  id: string;
  type: string;
  name: string;
  created: number;
  modified: number;
  address1: string;
  airportCode: string;
  amenityMask: number;
  city: string;
  confidenceRating: number;
  countryCode: string;
  deepLink: string;
  highRate: number;
  hotelId: number;
  hotelInDestination: boolean;
  hotelRating: number;
  location: Location;
  locationDescription: string;
  lowRate: number;
  metadata: Metadata;
  postalCode: number | string;
  propertyCategory: number;
  proximityDistance: number;
  proximityUnit: string;
  rateCurrencyCode: string;
  shortDescription: string;
  stateProvinceCode: string;
  thumbNailUrl: string;
  tripAdvisorRating: number;
  tripAdvisorRatingUrl: string;
}

// 2. Define Data Transfer Objects (DTOs) for strict typing
// When creating a hotel, the class will handle id, created, and modified automatically
export type CreateHotelDTO = Omit<Hotel, 'id' | 'created' | 'modified'>;

// When updating, all fields are optional
export type UpdateHotelDTO = Partial<CreateHotelDTO>;


// 3. Create the CRUD Class
export class HotelRepository {
  // Using a Map for O(1) lookups, updates, and deletions
  private hotels: Map<string, Hotel> = new Map();

  constructor(initialData: Hotel[] = []) {
    initialData.forEach(hotel => this.hotels.set(hotel.id, hotel));
  }

  /**
   * CREATE: Adds a new hotel to the collection
   */
  create(data: CreateHotelDTO): Hotel {
    const now = Date.now();
    const newHotel: Hotel = {
      ...data,
      id: crypto.randomUUID(),
      created: now,
      modified: now,
    };
    
    this.hotels.set(newHotel.id, newHotel);
    return newHotel;
  }

  /**
   * READ: Returns all hotels
   */
  findAll(): Hotel[] {
    return Array.from(this.hotels.values());
  }

  /**
   * READ: Returns a single hotel by ID
   */
  findById(id: string): Hotel | undefined {
    return this.hotels.get(id);
  }

  /**
   * UPDATE: Updates an existing hotel and updates the 'modified' timestamp
   */
  update(id: string, data: UpdateHotelDTO): Hotel | null {
    const existingHotel = this.hotels.get(id);
    
    if (!existingHotel) {
      return null; // Or throw an Error('Hotel not found')
    }

    const updatedHotel: Hotel = {
      ...existingHotel,
      ...data,
      modified: Date.now(), // Automatically update timestamp
    };

    this.hotels.set(id, updatedHotel);
    return updatedHotel;
  }

  /**
   * DELETE: Removes a hotel from the collection
   */
  delete(id: string): boolean {
    return this.hotels.delete(id);
  }
}
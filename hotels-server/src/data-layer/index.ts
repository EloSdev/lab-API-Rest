import { CityReppository } from "./city.repo.js";
import { HotelRepository } from "./hotel.repo.js";
import { cities, hotels } from "./mock-data.js";

const cityRepo = new CityReppository(cities);
const hotelRepo = new HotelRepository(hotels);

export const repositories = {
  cityRepo,
  hotelRepo,
};
export interface City {
    id: string;
    name: String;
}

export class CityReppository {
    private readonly cityCollection: City[] = [];

    constructor(initialData: City[]) {
        this.cityCollection = initialData;
    }

    findAll(): City[] {
        return [...this.cityCollection];
    }
}
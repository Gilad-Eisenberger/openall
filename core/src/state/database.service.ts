import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

@Injectable()
export class DatabaseService {
    constructor(
        @InjectDataSource('apps')
        private readonly appsDataSource: DataSource,
    ) { }

    public async query(query: string) {

        const result = await this.appsDataSource.query(query);

        return result;
    }
}
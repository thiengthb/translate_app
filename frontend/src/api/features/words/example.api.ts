import { createBaseApiService } from "@/api/base-service.api";
import type { ExampleDTO, ExampleFilter } from "@/types";

export const exampleApi = Object.assign(
    {},
    createBaseApiService<ExampleDTO, ExampleFilter>({ path: "/examples" })
);
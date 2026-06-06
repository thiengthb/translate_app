import { createBaseApiService } from "@/api/base-service.api";
import type { ScenarioStubDTO, ScenarioStubFilter } from "@/types";

export const scenarioStubApi = Object.assign(
    {},
    createBaseApiService<ScenarioStubDTO, ScenarioStubFilter>({ path: "/scenario-stubs" })
);
